#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import {
  existingCandidates,
  isCompatibleVersion,
  isRecommendedVersion,
  readCompatibility,
  selectPreferredCandidate,
  skillRoot
} from './cli-runtime.mjs'

const compatibility = readCompatibility()

function readVersion(executable) {
  const result = spawnSync(executable, ['--version'], { encoding: 'utf8' })
  if (result.error?.code === 'ENOENT') return null
  if (result.status !== 0) return { executable, version: null, error: result.stderr || result.stdout }
  return { executable, version: result.stdout.trim() }
}

function supportsRequiredCapabilities(candidate) {
  return compatibility.capabilityProbes.every((probe) => {
    const result = spawnSync(candidate.executable, probe.args, { encoding: 'utf8' })
    return result.status === 0 && (!probe.stdoutIncludes || result.stdout.includes(probe.stdoutIncludes))
  })
}

const candidateIndex = process.argv.indexOf('--candidate')
if (candidateIndex !== -1 && !process.argv[candidateIndex + 1]) {
  console.error('--candidate requires an executable path.')
  process.exit(2)
}
const candidates = candidateIndex === -1 ? existingCandidates() : [process.argv[candidateIndex + 1]]
const inspected = candidates.map(readVersion).filter(Boolean)
const compatible = inspected.filter((candidate) =>
  candidate.version &&
  isCompatibleVersion(candidate.version, compatibility) &&
  supportsRequiredCapabilities(candidate)
)
const selected = selectPreferredCandidate(compatible, compatibility)
const requireRecommended = process.argv.includes('--require-recommended')

if (!selected || (requireRecommended && !isRecommendedVersion(selected.version, compatibility))) {
  const found = inspected.map(({ executable, version }) => `${executable} (${version || 'unknown version'})`).join(', ')
  console.error(requireRecommended && selected
    ? 'The recommended miao-viz CLI is not installed.'
    : 'The installed miao-viz CLI does not provide the capabilities required by this Miao Vision skill.')
  console.error(found ? `Found: ${found}.` : 'No miao-viz CLI was found.')
  console.error(`Required CLI range: >=${compatibility.minimumCliVersion} <${compatibility.maximumCliVersionExclusive}.`)
  console.error(`Recommended CLI version: ${compatibility.recommendedCliVersion}.`)
  console.error('Run scripts/install-miao-viz.sh (macOS/Linux) or scripts/install-miao-viz.ps1 (Windows).')
  process.exit(1)
}

if (candidateIndex === -1 && selected.executable === candidates.at(-1)) {
  console.error(`Using legacy skill-local CLI at ${selected.executable}. Reinstall to migrate it to the shared Miao Vision home.`)
}

if (process.argv.includes('--print-path')) {
  process.stdout.write(`${selected.executable}\n`)
  process.exit(0)
}

const result = spawnSync(selected.executable, ['spec', 'catalog'], {
  encoding: 'utf8'
})

if (result.status !== 0) {
  console.error(result.stderr || result.stdout || 'miao-viz spec catalog failed.')
  process.exit(result.status ?? 1)
}

process.stdout.write(result.stdout)
