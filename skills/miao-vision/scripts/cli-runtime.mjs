import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
export const skillRoot = resolve(scriptDir, '..')
export const compatibilityPath = resolve(skillRoot, 'cli-compatibility.json')

export function readCompatibility(path = compatibilityPath) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

export function executableName(platform = process.platform) {
  return platform === 'win32' ? 'miao-viz.exe' : 'miao-viz'
}

export function defaultMiaoVisionHome(env = process.env, home = homedir()) {
  return env.MIAO_VISION_HOME ? resolve(env.MIAO_VISION_HOME) : resolve(home, '.miao-vision')
}

export function cliCandidates({
  env = process.env,
  home = homedir(),
  platform = process.platform,
  root = skillRoot
} = {}) {
  const name = executableName(platform)
  const configuredHome = env.MIAO_VISION_HOME ? resolve(env.MIAO_VISION_HOME) : null
  const defaultHome = resolve(home, '.miao-vision')
  const candidates = [
    ...(configuredHome ? [resolve(configuredHome, 'bin', name)] : []),
    ...(!configuredHome || configuredHome !== defaultHome ? [resolve(defaultHome, 'bin', name)] : []),
    name,
    resolve(root, 'bin', name)
  ]
  return [...new Set(candidates)]
}

export function parseVersion(value) {
  const match = String(value).trim().match(/^v?(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/)
  return match ? match.slice(1).map(Number) : null
}

export function compareVersions(left, right) {
  const a = parseVersion(left)
  const b = parseVersion(right)
  if (!a || !b) return null
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return a[index] < b[index] ? -1 : 1
  }
  return 0
}

export function isCompatibleVersion(version, compatibility) {
  const minimum = compareVersions(version, compatibility.minimumCliVersion)
  const maximum = compareVersions(version, compatibility.maximumCliVersionExclusive)
  return minimum !== null && maximum !== null && minimum >= 0 && maximum < 0
}

export function isRecommendedVersion(version, compatibility) {
  return compareVersions(version, compatibility.recommendedCliVersion) === 0
}

export function selectPreferredCandidate(candidates, compatibility) {
  return candidates.find((candidate) => isRecommendedVersion(candidate.version, compatibility)) ?? candidates[0]
}

export function existingCandidates(options) {
  return cliCandidates(options).filter((candidate) => candidate === executableName(options?.platform) || existsSync(candidate))
}
