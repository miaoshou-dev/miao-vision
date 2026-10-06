#!/usr/bin/env node

import { cpSync, mkdirSync, rmSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const repoRoot = resolve(import.meta.dirname, '..')
const distRoot = resolve(repoRoot, 'dist/plugins')
const bundleRoot = resolve(distRoot, 'miao-vision-plugin')
const zipPath = resolve(distRoot, 'miao-vision-plugin.zip')

mkdirSync(distRoot, { recursive: true })
rmSync(bundleRoot, { recursive: true, force: true })
rmSync(zipPath, { force: true })
mkdirSync(bundleRoot, { recursive: true })

for (const path of ['.codex-plugin', '.claude-plugin/plugin.json', 'LICENSE', 'README.md']) {
  cpSync(resolve(repoRoot, path), resolve(bundleRoot, path), { recursive: true })
}
const skillSource = resolve(repoRoot, 'skills/miao-vision')
cpSync(skillSource, resolve(bundleRoot, 'skills/miao-vision'), {
  recursive: true,
  filter: (path) => {
    const child = relative(skillSource, path)
    return child !== 'bin' &&
      !child.startsWith(`bin${process.platform === 'win32' ? '\\' : '/'}`) &&
      !child.endsWith('.test.mjs') &&
      !child.endsWith('.d.mts')
  }
})

const zip = spawnSync('zip', ['-qr', zipPath, 'miao-vision-plugin'], {
  cwd: distRoot,
  encoding: 'utf8'
})

if (zip.error) {
  console.error(`Failed to run zip: ${zip.error.message}`)
  process.exit(1)
}
if (zip.status !== 0) {
  console.error(zip.stderr || zip.stdout || 'zip failed')
  process.exit(zip.status ?? 1)
}

console.log(`Created ${zipPath}`)
