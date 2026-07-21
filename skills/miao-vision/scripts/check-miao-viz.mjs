#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const skillRoot = resolve(import.meta.dirname, '..')
const privateExecutable = resolve(skillRoot, 'bin', process.platform === 'win32' ? 'miao-viz.exe' : 'miao-viz')
const requiredVersion = readFileSync(resolve(skillRoot, 'VERSION'), 'utf8').trim()

function parseVersion(value) {
  const match = value.trim().match(/^(\d+)\.(\d+)\.(\d+)/)
  return match ? match.slice(1).map(Number) : null
}

function isCompatible(actual, required) {
  const left = parseVersion(actual)
  const right = parseVersion(required)
  if (!left || !right || left[0] !== right[0]) return false
  for (let index = 1; index < left.length; index += 1) {
    if (left[index] !== right[index]) return left[index] > right[index]
  }
  return true
}

function readVersion(executable) {
  const result = spawnSync(executable, ['--version'], { encoding: 'utf8' })
  if (result.error?.code === 'ENOENT') return null
  if (result.status !== 0) return { executable, version: null, error: result.stderr || result.stdout }
  return { executable, version: result.stdout.trim() }
}

const candidates = [
  ...(existsSync(privateExecutable) ? [privateExecutable] : []),
  'miao-viz'
]
const inspected = candidates.map(readVersion).filter(Boolean)
const selected = inspected.find(({ version }) => version && isCompatible(version, requiredVersion))

if (!selected) {
  const found = inspected.map(({ executable, version }) => `${executable} (${version || 'unknown version'})`).join(', ')
  console.error(`Miao Vision skill requires miao-viz ${requiredVersion} or a newer compatible version.`)
  console.error(found ? `Found: ${found}.` : 'No miao-viz CLI was found.')
  console.error('Run scripts/install-miao-viz.sh (macOS/Linux) or scripts/install-miao-viz.ps1 (Windows).')
  process.exit(1)
}

const result = spawnSync(selected.executable, ['spec', 'catalog'], {
  encoding: 'utf8'
})

if (result.status !== 0) {
  console.error(result.stderr || result.stdout || 'miao-viz spec catalog failed.')
  process.exit(result.status ?? 1)
}

process.stdout.write(result.stdout)
