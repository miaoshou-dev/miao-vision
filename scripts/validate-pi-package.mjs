#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

const repoRoot = resolve(import.meta.dirname, '..')
const sourceRoot = resolve(repoRoot, 'packages/miao-vision-pi')
const manifest = JSON.parse(readFileSync(resolve(sourceRoot, 'package.json'), 'utf8'))
const plugin = JSON.parse(readFileSync(resolve(repoRoot, '.codex-plugin/plugin.json'), 'utf8'))
const compatibility = JSON.parse(readFileSync(resolve(repoRoot, 'skills/miao-vision/cli-compatibility.json'), 'utf8'))
const errors = []

if (manifest.name !== '@miao-vision/pi') errors.push('Pi package name must be @miao-vision/pi.')
if (manifest.version !== plugin.version || manifest.version !== compatibility.pluginVersion) errors.push('Pi, Codex, and compatibility plugin versions must match.')
if (!manifest.keywords?.includes('pi-package')) errors.push('Pi package must include the pi-package keyword.')
if (JSON.stringify(manifest.pi) !== JSON.stringify({ extensions: ['./extensions/index.ts'], skills: ['./skills'] })) errors.push('Pi resource manifest is invalid.')
for (const peer of ['@earendil-works/pi-coding-agent', '@earendil-works/pi-ai', 'typebox']) {
  if (manifest.peerDependencies?.[peer] !== '*') errors.push(`${peer} must be a host-provided * peer dependency.`)
  if (manifest.peerDependenciesMeta?.[peer]?.optional !== true) errors.push(`${peer} must be marked optional so the development workspace does not install the Pi host.`)
}
for (const path of ['extensions/index.ts', 'extensions/extension.mjs', 'extensions/mcp-client.mjs', 'extensions/runtime.mjs', 'README.md']) {
  if (!existsSync(resolve(sourceRoot, path))) errors.push(`Missing Pi package source: ${path}`)
}

const outputRoot = resolve(repoRoot, 'dist/pi-package')
if (existsSync(outputRoot)) {
  for (const path of ['package.json', 'LICENSE', 'README.md', 'extensions/index.ts', 'skills/miao-vision/SKILL.md']) {
    if (!existsSync(resolve(outputRoot, path))) errors.push(`Missing packed Pi file: ${path}`)
  }
  const forbidden = []
  const walk = directory => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) walk(path)
      else if (entry.name.endsWith('.test.mjs') || entry.name === 'plugin.json' || entry.name === 'marketplace.json') forbidden.push(path)
    }
  }
  walk(outputRoot)
  if (forbidden.length) errors.push(`Packed Pi package contains forbidden files: ${forbidden.join(', ')}`)
}

if (errors.length) {
  for (const error of errors) console.error(error)
  process.exit(1)
}
console.log(`Pi package metadata is valid at ${manifest.version}.`)
