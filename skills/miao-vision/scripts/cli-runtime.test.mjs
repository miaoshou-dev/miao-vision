import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { cliCandidates, cliInvocation, compareVersions, isCompatibleVersion, isRecommendedVersion, selectPreferredCandidate } from './cli-runtime.mjs'

test('resolves only the first executable on PATH and ignores legacy homes', () => {
  const root = mkdtempSync(join(tmpdir(), 'miao-path-'))
  try {
    const first = join(root, 'first'), second = join(root, 'second')
    mkdirSync(first); mkdirSync(second)
    for (const dir of [first, second]) { writeFileSync(join(dir, 'miao-viz'), '#!/bin/sh\n'); chmodSync(join(dir, 'miao-viz'), 0o755) }
    assert.deepEqual(cliCandidates({ env: { PATH: `${first}:${second}`, MIAO_VISION_HOME: '/legacy' }, platform: 'linux' }), [join(first, 'miao-viz')])
    assert.deepEqual(cliCandidates({ env: {}, platform: 'linux' }), [])
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('Windows npm shim resolves to its Node entry without a shell', () => {
  const root = mkdtempSync(join(tmpdir(), 'miao-win-'))
  try {
    const entry = join(root, 'node_modules/@miao-vision/cli/dist/cli.cjs')
    mkdirSync(join(root, 'node_modules/@miao-vision/cli/dist'), { recursive: true })
    writeFileSync(entry, '')
    writeFileSync(join(root, 'miao-viz.cmd'), '')
    const [candidate] = cliCandidates({ env: { Path: root }, platform: 'win32' })
    assert.equal(candidate, join(root, 'miao-viz.cmd'))
    assert.deepEqual(cliInvocation(candidate, ['--version'], 'win32'), { command: process.execPath, args: [entry, '--version'] })
  } finally { rmSync(root, { recursive: true, force: true }) }
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
  const { recommendedCliVersion } = JSON.parse(readFileSync(new URL('../cli-compatibility.json', import.meta.url), 'utf8'))
  try {
    const executable = join(directory, 'miao-viz')
    writeFileSync(executable, `#!/bin/sh
case "$1" in
  --version) printf '${recommendedCliVersion}\\n' ;;
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
  --version) printf '0.9.5\\n' ;;
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

test('compatible global CLI is accepted but missing Viewer capability is rejected', { skip: process.platform === 'win32' }, () => {
  const root = mkdtempSync(join(tmpdir(), 'miao-capabilities-'))
  const executable = join(root, 'miao-viz')
  const script = new URL('./check-miao-viz.mjs', import.meta.url).pathname
  try {
    writeFileSync(executable, `#!/bin/sh
case "$1" in
 --version) echo '0.9.5';;
 review) exit 1;;
 *) echo "$*";;
esac
`)
    chmodSync(executable, 0o755)
    const compatible = spawnSync(process.execPath, [script, '--candidate', executable, '--print-path'], { encoding: 'utf8' })
    assert.equal(compatible.status, 0, compatible.stderr)
    assert.equal(compatible.stdout.trim(), executable)
    assert.match(compatible.stderr, /compatible global CLI/)
    const viewer = spawnSync(process.execPath, [script, '--candidate', executable, '--viewer', '--print-path'], { encoding: 'utf8' })
    assert.equal(viewer.status, 1)
    assert.match(viewer.stderr, /capabilities required/)
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('global installation uses the pinned version and reports npm failure without sudo', { skip: process.platform === 'win32' }, () => {
  const root = mkdtempSync(join(tmpdir(), 'miao-install-'))
  const record = join(root, 'args')
  const installer = new URL('./install-miao-viz.sh', import.meta.url).pathname
  const { recommendedCliVersion } = JSON.parse(readFileSync(new URL('../cli-compatibility.json', import.meta.url), 'utf8'))
  try {
    const npm = join(root, 'npm')
    writeFileSync(npm, `#!/bin/sh\nprintf '%s\\n' "$*" > '${record}'\nexit 17\n`)
    chmodSync(npm, 0o755)
    const result = spawnSync('/bin/sh', [installer], { encoding: 'utf8', env: { ...process.env, PATH: `${root}:${process.env.PATH}` } })
    assert.equal(result.status, 1)
    assert.equal(readFileSync(record, 'utf8').trim(), `install -g @miao-vision/cli@${recommendedCliVersion}`)
    assert.match(result.stderr, /no sudo was attempted/)
  } finally { rmSync(root, { recursive: true, force: true }) }
})
