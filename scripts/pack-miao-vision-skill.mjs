#!/usr/bin/env node

import { mkdirSync, rmSync, cpSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const repoRoot = resolve(import.meta.dirname, '..')
const source = resolve(repoRoot, 'skills/miao-vision')
const distRoot = resolve(repoRoot, 'dist/skills')
const distSkill = resolve(distRoot, 'miao-vision-skill')
const zipPath = resolve(distRoot, 'miao-vision-skill.zip')

mkdirSync(distRoot, { recursive: true })
rmSync(distSkill, { recursive: true, force: true })
rmSync(zipPath, { force: true })
cpSync(source, distSkill, { recursive: true })

const zip = spawnSync('zip', ['-qr', zipPath, 'miao-vision-skill'], {
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
