import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { exportRuntimeStatus, launchExportBrowser, resolvePlaywright } from './export-runtime.mjs'
import { setupExport } from './setup-export.mjs'

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'export-runtime-'))
  return { root, options: { cwd: join(root, 'work'), home: root, env: {} }, clean: () => rmSync(root, { recursive: true, force: true }) }
}
function install(root, { broken = false, browser = false, failLaunch = false, installerFails = false } = {}) {
  const dir = join(root, 'node_modules/playwright')
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'playwright', version: '1.57.0', main: 'index.cjs' }))
  const browserPath = join(root, 'chromium')
  if (browser) writeFileSync(browserPath, '')
  writeFileSync(join(dir, 'index.cjs'), broken ? "require('missing-runtime-dependency')" : `module.exports = {chromium:{executablePath:()=>${JSON.stringify(browserPath)},launch:async()=>{${failLaunch ? "throw Error('permission denied')" : `if (!require("node:fs").existsSync(${JSON.stringify(browserPath)})) throw Error("Executable doesn\'t exist"); return {close:async()=>{}}`}}}}`)
  writeFileSync(join(dir, 'cli.js'), installerFails ? 'process.exit(3)' : '')
}

test('host wins over shared, shared works from empty workspaces, workspace is last', () => {
  const f = fixture()
  try {
    const host = join(f.root, '.claude'), shared = join(f.root, '.miao-vision/playwright')
    install(f.options.cwd); install(shared); install(host)
    assert.equal(resolvePlaywright({ ...f.options, host: 'claude-code' }).root, host)
    assert.equal(resolvePlaywright(f.options).root, shared)
    assert.equal(resolvePlaywright({ ...f.options, home: join(f.root, 'other-home') }).root, f.options.cwd)
  } finally { f.clean() }
})

test('missing dependency and Chromium are distinct; diagnostics do not install', () => {
  const f = fixture()
  try {
    assert.equal(exportRuntimeStatus(f.options).code, 'EXPORT_PLAYWRIGHT_MISSING')
    assert.equal(existsSync(join(f.root, '.miao-vision')), false)
    install(f.options.cwd)
    assert.equal(exportRuntimeStatus(f.options).code, 'EXPORT_BROWSER_MISSING')
    writeFileSync(join(f.options.cwd, 'chromium'), '')
    assert.equal(exportRuntimeStatus(f.options).ok, true)
  } finally { f.clean() }
})

test('broken host modules do not silently fall back to shared modules', () => {
  const f = fixture()
  try {
    const host = join(f.root, 'host')
    install(host, { broken: true }); install(join(f.root, '.miao-vision/playwright'))
    assert.throws(() => resolvePlaywright({ ...f.options, hostRoot: host }), error => error.result.code === 'EXPORT_MODULE_LOAD_FAILED')
  } finally { f.clean() }
})

test('browser launch failure carries structured diagnostics', async () => {
  const f = fixture()
  try {
    install(f.options.cwd, { failLaunch: true })
    await assert.rejects(launchExportBrowser(f.options), error => error.result.code === 'EXPORT_BROWSER_LAUNCH_FAILED' && error.result.detail === 'permission denied')
  } finally { f.clean() }
})

test('setup check is read-only and concurrent setup is rejected', async () => {
  const f = fixture()
  try {
    assert.equal((await setupExport(f.options)).code, 'EXPORT_PLAYWRIGHT_MISSING')
    assert.equal(existsSync(join(f.root, '.miao-vision')), false)
    mkdirSync(join(f.root, '.miao-vision/playwright.lock'), { recursive: true })
    await assert.rejects(setupExport({ ...f.options, install: true }), /Another export setup/)
  } finally { f.clean() }
})

test('failed browser installation preserves host dependencies and releases lock', async () => {
  const f = fixture()
  try {
    install(f.options.cwd, { installerFails: true })
    const manifest = join(f.options.cwd, 'node_modules/playwright/package.json')
    const before = readFileSync(manifest, 'utf8')
    await assert.rejects(setupExport({ ...f.options, install: true }), /failed/)
    assert.equal(readFileSync(manifest, 'utf8'), before)
    assert.equal(existsSync(join(f.root, '.miao-vision/playwright.lock')), false)
  } finally { f.clean() }
})

test('aborted setup preserves dependencies and releases lock', async () => {
  const f = fixture()
  try {
    install(f.options.cwd)
    const abort = new AbortController(); abort.abort()
    await assert.rejects(setupExport({ ...f.options, install: true, signal: abort.signal }))
    assert.equal(existsSync(join(f.options.cwd, 'node_modules/playwright/package.json')), true)
    assert.equal(existsSync(join(f.root, '.miao-vision/playwright.lock')), false)
  } finally { f.clean() }
})

test('repeated setup accepts the returned shared root without deduplication failure', async () => {
  const f = fixture()
  try {
    const shared = join(f.root, '.miao-vision/playwright')
    install(shared, { browser: true })
    const options = { ...f.options, env: { MIAO_VIZ_PLAYWRIGHT_ROOT: shared }, install: true }
    const first = await setupExport(options)
    assert.equal(first.source, 'shared')
    assert.equal((await setupExport({ ...options, hostRoot: first.root })).ok, true)
  } finally { f.clean() }
})

test('in-flight installer cancellation releases lock and preserves installed dependencies', async () => {
  const f = fixture()
  try {
    install(f.options.cwd)
    const cli = join(f.options.cwd, 'node_modules/playwright/cli.js')
    const marker = join(f.root, 'started')
    writeFileSync(cli, `require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'started');setInterval(()=>{},1000)`)
    const abort = new AbortController()
    const setup = setupExport({ ...f.options, install: true, signal: abort.signal })
    const rejection = assert.rejects(setup, /cancelled/)
    for (let n = 0; n < 100 && !existsSync(marker); n++) await new Promise(resolve => setTimeout(resolve, 10))
    assert.equal(existsSync(marker), true)
    abort.abort()
    await rejection
    assert.equal(existsSync(join(f.root, '.miao-vision/playwright.lock')), false)
    assert.equal(existsSync(cli), true)
  } finally { f.clean() }
})
