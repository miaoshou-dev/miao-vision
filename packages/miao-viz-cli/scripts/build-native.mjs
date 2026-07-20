#!/usr/bin/env node

import { chmodSync, createHash, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const packageRoot = resolve(import.meta.dirname, '..')
const repoRoot = resolve(packageRoot, '../..')
const outputDir = resolve(repoRoot, 'dist/native')
const entrypoint = resolve(packageRoot, 'src/cli.ts')

const targets = [
  ['bun-darwin-arm64', 'miao-viz-darwin-arm64'],
  ['bun-darwin-x64', 'miao-viz-darwin-x64'],
  ['bun-linux-arm64', 'miao-viz-linux-arm64'],
  ['bun-linux-x64', 'miao-viz-linux-x64'],
  ['bun-windows-x64', 'miao-viz-windows-x64.exe']
]

mkdirSync(outputDir, { recursive: true })

for (const [target, filename] of targets) {
  const output = resolve(outputDir, filename)
  const result = spawnSync('bun', ['build', entrypoint, '--compile', `--target=${target}`, `--outfile=${output}`], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: 'inherit'
  })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
  if (!filename.endsWith('.exe')) chmodSync(output, 0o755)
}

const checksums = targets.map(([, filename]) => {
  const digest = createHash('sha256').update(readFileSync(resolve(outputDir, filename))).digest('hex')
  return `${digest}  ${filename}`
})
writeFileSync(resolve(outputDir, 'miao-viz-checksums.txt'), `${checksums.join('\n')}\n`)
