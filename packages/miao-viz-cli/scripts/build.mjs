#!/usr/bin/env node

import { mkdirSync, copyFileSync, cpSync } from 'node:fs'
import { resolve } from 'node:path'
import { build } from 'esbuild'

const packageRoot = resolve(import.meta.dirname, '..')
const repoRoot = resolve(packageRoot, '../..')
const distDir = resolve(packageRoot, 'dist')

mkdirSync(distDir, { recursive: true })

await build({
  entryPoints: [resolve(repoRoot, 'src/agent/cli.ts')],
  outfile: resolve(distDir, 'cli.cjs'),
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node20',
  logLevel: 'info'
})

copyFileSync(resolve(repoRoot, 'src/agent/types.ts'), resolve(distDir, 'types.ts'))
cpSync(resolve(packageRoot, 'examples'), resolve(distDir, 'examples'), { recursive: true })
