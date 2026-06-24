#!/usr/bin/env node

import { mkdirSync, copyFileSync, cpSync } from 'node:fs'
import { resolve } from 'node:path'
import { build } from 'esbuild'

const packageRoot = resolve(import.meta.dirname, '..')
const distDir = resolve(packageRoot, 'dist')
const srcDir = resolve(packageRoot, 'src')

mkdirSync(distDir, { recursive: true })

await build({
  entryPoints: [resolve(srcDir, 'cli.ts')],
  outfile: resolve(distDir, 'cli.cjs'),
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node20',
  logLevel: 'info'
})

copyFileSync(resolve(srcDir, 'types.ts'), resolve(distDir, 'types.ts'))
cpSync(resolve(packageRoot, 'examples'), resolve(distDir, 'examples'), { recursive: true })
