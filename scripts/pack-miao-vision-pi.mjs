#!/usr/bin/env node

import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { relative, resolve } from 'node:path'

const repoRoot = resolve(import.meta.dirname, '..')
const sourceRoot = resolve(repoRoot, 'packages/miao-vision-pi')
const outputRoot = resolve(repoRoot, 'dist/pi-package')
const skillSource = resolve(repoRoot, 'skills/miao-vision')

rmSync(outputRoot, { recursive: true, force: true })
mkdirSync(outputRoot, { recursive: true })
for (const path of ['package.json', 'README.md']) cpSync(resolve(sourceRoot, path), resolve(outputRoot, path))
cpSync(resolve(repoRoot, 'LICENSE'), resolve(outputRoot, 'LICENSE'))
cpSync(resolve(sourceRoot, 'extensions'), resolve(outputRoot, 'extensions'), {
  recursive: true,
  filter: path => !path.endsWith('.test.mjs')
})
cpSync(skillSource, resolve(outputRoot, 'skills/miao-vision'), {
  recursive: true,
  filter: path => {
    const child = relative(skillSource, path)
    return child !== 'bin' && !child.startsWith('bin/') && !child.endsWith('.test.mjs')
  }
})

const manifestPath = resolve(outputRoot, 'package.json')
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
manifest.pi = { extensions: ['./extensions/index.ts'], skills: ['./skills'] }
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`Created ${outputRoot}`)
