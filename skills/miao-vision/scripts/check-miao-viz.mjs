#!/usr/bin/env node

import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const skillRoot = resolve(import.meta.dirname, '..')
const privateExecutable = resolve(skillRoot, 'bin', process.platform === 'win32' ? 'miao-viz.exe' : 'miao-viz')
function readVersion(executable) {
  const result = spawnSync(executable, ['--version'], { encoding: 'utf8' })
  if (result.error?.code === 'ENOENT') return null
  if (result.status !== 0) return { executable, version: null, error: result.stderr || result.stdout }
  return { executable, version: result.stdout.trim() }
}

function supportsRequiredCapabilities(candidate) {
  const result = spawnSync(candidate.executable, ['deck', 'instantiate', '--help'], { encoding: 'utf8' })
  return result.status === 0 && result.stdout.includes('deck instantiate')
}

const candidates = [
  ...(existsSync(privateExecutable) ? [privateExecutable] : []),
  'miao-viz'
]
const inspected = candidates.map(readVersion).filter(Boolean)
const selected = inspected.find((candidate) => candidate.version && supportsRequiredCapabilities(candidate))

if (!selected) {
  const found = inspected.map(({ executable, version }) => `${executable} (${version || 'unknown version'})`).join(', ')
  console.error('The installed miao-viz CLI does not provide the capabilities required by this Miao Vision skill.')
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
