#!/usr/bin/env node

import { spawnSync } from 'node:child_process'

const result = spawnSync('miao-viz', ['spec', 'catalog'], {
  encoding: 'utf8'
})

if (result.error?.code === 'ENOENT') {
  console.error('miao-viz is not installed or not available on PATH.')
  console.error('Install it with:')
  console.error('npm install -g @miao-vision/cli')
  process.exit(1)
}

if (result.status !== 0) {
  console.error(result.stderr || result.stdout || 'miao-viz spec catalog failed.')
  process.exit(result.status ?? 1)
}

process.stdout.write(result.stdout)
