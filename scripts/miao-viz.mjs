#!/usr/bin/env node

import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { build } from 'esbuild'

const outdir = mkdtempSync(join(tmpdir(), 'miao-viz-'))
const outfile = join(outdir, 'cli.cjs')

await build({
  entryPoints: ['packages/miao-viz-cli/src/cli.ts'],
  outfile,
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node20',
  logLevel: 'silent',
  external: []
})

await import(pathToFileURL(outfile).href)
