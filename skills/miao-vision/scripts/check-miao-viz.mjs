#!/usr/bin/env node

import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const skillRoot = resolve(import.meta.dirname, '..')
const privateExecutable = resolve(skillRoot, 'bin', process.platform === 'win32' ? 'miao-viz.exe' : 'miao-viz')
const executable = existsSync(privateExecutable) ? privateExecutable : 'miao-viz'

const result = spawnSync(executable, ['spec', 'catalog'], {
  encoding: 'utf8'
})

if (result.error?.code === 'ENOENT') {
  console.error(`No miao-viz CLI found at ${privateExecutable} or on PATH.`)
  console.error('Run scripts/install-miao-viz.sh (macOS/Linux) or scripts/install-miao-viz.ps1 (Windows).')
  process.exit(1)
}

if (result.status !== 0) {
  console.error(result.stderr || result.stdout || 'miao-viz spec catalog failed.')
  process.exit(result.status ?? 1)
}

process.stdout.write(result.stdout)
