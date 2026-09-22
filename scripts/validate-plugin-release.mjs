#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const repoRoot = resolve(import.meta.dirname, '..')
const readJson = (path) => JSON.parse(readFileSync(resolve(repoRoot, path), 'utf8'))
const codex = readJson('.codex-plugin/plugin.json')
const claude = readJson('.claude-plugin/plugin.json')
const marketplace = readJson('.claude-plugin/marketplace.json')
const cli = readJson('packages/miao-viz-cli/package.json')
const compatibility = readJson('skills/miao-vision/cli-compatibility.json')
const mediaCompatibility = readJson('skills/miao-vision/media-compatibility.json')
const errors = []

const expectedPluginVersion = codex.version
for (const [label, version] of [
  ['Claude plugin', claude.version],
  ['CLI compatibility pluginVersion', compatibility.pluginVersion],
  ['Claude marketplace plugin', marketplace.plugins[0]?.version]
]) {
  if (version !== expectedPluginVersion) errors.push(`${label} version ${version ?? '(missing)'} must equal ${expectedPluginVersion}.`)
}
if (cli.version !== compatibility.recommendedCliVersion) {
  errors.push(`CLI version ${cli.version} must equal recommended CLI version ${compatibility.recommendedCliVersion}.`)
}
if (compatibility.releaseTag !== `skill-v${expectedPluginVersion}`) {
  errors.push(`Release tag ${compatibility.releaseTag} must equal skill-v${expectedPluginVersion}.`)
}
if (!Array.isArray(compatibility.capabilityProbes) || compatibility.capabilityProbes.length === 0) {
  errors.push('At least one CLI capability probe is required.')
}
for (const path of [
  '.codex-plugin/plugin.json',
  '.claude-plugin/plugin.json',
  'skills/miao-vision/SKILL.md',
  'skills/miao-vision/cli-compatibility.json',
  'skills/miao-vision/media-compatibility.json',
  'skills/miao-vision/references/media-image.md',
  'skills/miao-vision/references/media-video.md',
  'skills/miao-vision/references/media-setup.md',
  'skills/miao-vision/scripts/ai-media-runtime.mjs',
  'skills/miao-vision/scripts/run-ai-media.mjs',
  'LICENSE'
]) {
  if (!existsSync(resolve(repoRoot, path))) errors.push(`Missing plugin file: ${path}.`)
}

if (mediaCompatibility.schemaVersion !== 1 || mediaCompatibility.minimumNodeMajor !== 22) {
  errors.push('Media compatibility must use schemaVersion 1 and Node.js 22 minimum.')
}
if (mediaCompatibility.credentialEnvironmentVariable !== 'AI_GATEWAY_API_KEY') {
  errors.push('Media compatibility must use only AI_GATEWAY_API_KEY.')
}
if (!mediaCompatibility.image?.model || !mediaCompatibility.video?.models?.standard || !mediaCompatibility.video?.models?.high) {
  errors.push('Media compatibility must define the fixed image and video models.')
}

const metadata = JSON.stringify({ codex, claude, marketplace })
if (metadata.includes('maishou-dev')) errors.push('Plugin metadata contains the misspelled repository owner maishou-dev.')

if (errors.length > 0) {
  for (const error of errors) console.error(error)
  process.exit(1)
}
console.log(`Plugin release metadata is consistent at ${expectedPluginVersion}.`)
