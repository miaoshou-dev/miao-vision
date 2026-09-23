import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { cliCandidates, compareVersions, isCompatibleVersion, isRecommendedVersion, selectPreferredCandidate } from './cli-runtime.mjs'

test('resolves custom, default, PATH, then legacy candidates', () => {
  assert.deepEqual(cliCandidates({
    env: { MIAO_VISION_HOME: '/custom/miao' },
    home: '/users/test',
    platform: 'linux',
    root: '/skill'
  }), [
    '/custom/miao/bin/miao-viz',
    '/users/test/.miao-vision/bin/miao-viz',
    'miao-viz',
    '/skill/bin/miao-viz'
  ])
})

test('does not duplicate the default home candidate', () => {
  assert.deepEqual(cliCandidates({
    env: {},
    home: '/users/test',
    platform: 'win32',
    root: '/skill'
  }), [
    '/users/test/.miao-vision/bin/miao-viz.exe',
    'miao-viz.exe',
    '/skill/bin/miao-viz.exe'
  ])
})

test('compares semantic versions and enforces the compatibility range', () => {
  const compatibility = {
    minimumCliVersion: '0.2.0',
    maximumCliVersionExclusive: '0.3.0'
  }
  assert.equal(compareVersions('0.2.0', '0.2.0'), 0)
  assert.equal(compareVersions('0.2.1', '0.2.0'), 1)
  assert.equal(isCompatibleVersion('0.2.0', compatibility), true)
  assert.equal(isCompatibleVersion('0.2.9', compatibility), true)
  assert.equal(isCompatibleVersion('0.1.30', compatibility), false)
  assert.equal(isCompatibleVersion('0.3.0', compatibility), false)
  assert.equal(isCompatibleVersion('unknown', compatibility), false)
})

test('distinguishes the recommended CLI from older compatible releases', () => {
  const compatibility = { recommendedCliVersion: '0.8.2' }
  assert.equal(isRecommendedVersion('0.8.2', compatibility), true)
  assert.equal(isRecommendedVersion('0.6.3', compatibility), false)
  assert.equal(isRecommendedVersion('invalid', compatibility), false)
})

test('prefers the recommended CLI over an earlier candidate', () => {
  const older = { executable: '/shared/miao-viz', version: '0.6.3' }
  const recommended = { executable: 'miao-viz', version: '0.8.2' }
  const compatibility = { recommendedCliVersion: '0.8.2' }
  assert.equal(selectPreferredCandidate([older, recommended], compatibility), recommended)
  assert.equal(selectPreferredCandidate([older], compatibility), older)
})

test('checks a specified executable independently of PATH', { skip: process.platform === 'win32' }, () => {
  const directory = mkdtempSync(join(tmpdir(), 'miao-viz-check-'))
  try {
    const executable = join(directory, 'miao-viz')
    writeFileSync(executable, `#!/bin/sh
case "$1" in
  --version) printf '0.8.2\\n' ;;
  *) printf '%s\\n' "$*" ;;
esac
`)
    chmodSync(executable, 0o755)
    const script = new URL('./check-miao-viz.mjs', import.meta.url)
    const result = spawnSync(process.execPath, [script.pathname, '--candidate', executable, '--require-recommended', '--print-path'], { encoding: 'utf8' })
    assert.equal(result.status, 0, result.stderr)
    assert.equal(result.stdout.trim(), executable)
    writeFileSync(executable, `#!/bin/sh
case "$1" in
  --version) printf '0.6.3\\n' ;;
  *) printf '%s\\n' "$*" ;;
esac
`)
    const older = spawnSync(process.execPath, [script.pathname, '--candidate', executable, '--require-recommended', '--print-path'], { encoding: 'utf8' })
    assert.equal(older.status, 1)
    assert.match(older.stderr, /recommended miao-viz CLI is not installed/)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
