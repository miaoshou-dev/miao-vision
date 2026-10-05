import { existsSync } from 'node:fs'
import { spawn, spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { McpProcessClient } from './mcp-client.mjs'

const extensionDir = dirname(fileURLToPath(import.meta.url))

export function resolveCheckScript() {
  const candidates = [
    resolve(extensionDir, '../skills/miao-vision/scripts/check-miao-viz.mjs'),
    resolve(extensionDir, '../../../skills/miao-vision/scripts/check-miao-viz.mjs')
  ]
  return candidates.find(existsSync)
}

export function resolveCli() {
  const script = resolveCheckScript()
  if (!script) throw new Error('Bundled Miao Vision CLI checker was not found. Reinstall @miao-vision/pi.')
  const result = spawnSync(process.execPath, [script, '--viewer', '--print-path'], { encoding: 'utf8' })
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || 'Compatible miao-viz CLI was not found.').trim()
    throw new Error(detail)
  }
  const executable = result.stdout.trim()
  if (!executable) throw new Error('Miao Vision CLI checker returned an empty executable path.')
  // Windows npm shims must be launched through the installed Node entry.
  const call = process.platform === 'win32' && /\.(cmd|bat)$/i.test(executable)
    ? { command: process.execPath, args: [resolve(dirname(executable), 'node_modules/@miao-vision/cli/dist/cli.cjs'), '--version'] }
    : { command: executable, args: ['--version'] }
  const version = spawnSync(call.command, call.args, { encoding: 'utf8' })
  return { executable, version: version.status === 0 ? version.stdout.trim() : 'unknown' }
}

export async function startManagedMcp(cwd) {
  const cli = resolveCli()
  const helpers = await runtimeHelpers()
  const invocation = helpers.cli.cliInvocation(cli.executable, ['review', 'mcp', '--port', '0', '--artifact-root', cwd])
  const child = spawn(invocation.command, invocation.args, {
    cwd,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, MIAO_VIZ_PLAYWRIGHT_ROOT: resolve(extensionDir, '..') }
  })
  const client = new McpProcessClient(child)
  try {
    const initialized = await client.initialize()
    const opened = await client.callTool('open_miao_vision_viewer', {})
    const text = opened?.content?.find?.(item => item?.type === 'text')?.text ?? ''
    const url = /https?:\/\/127\.0\.0\.1:\d+\//.exec(text)?.[0]
    if (!url) throw new Error('Miao Vision MCP did not return a Viewer URL.')
    return { client, url, cliPath: cli.executable, exportRuntime: helpers.exports.exportRuntimeStatus({ cwd, hostRoot: resolve(extensionDir, '..') }), cliVersion: initialized?.serverInfo?.version ?? cli.version }
  } catch (error) {
    await client.close()
    throw error
  }
}

async function runtimeHelpers() {
  const checker = resolveCheckScript()
  if (!checker) throw new Error('Bundled runtime helpers were not found. Reinstall @miao-vision/pi.')
  const base = dirname(checker)
  return {
    cli: await import(pathToFileURL(resolve(base, 'cli-runtime.mjs')).href),
    exports: await import(pathToFileURL(resolve(base, 'export-runtime.mjs')).href),
    setup: await import(pathToFileURL(resolve(base, 'setup-export.mjs')).href)
  }
}

export async function exportStatus(cwd) {
  const helpers = await runtimeHelpers()
  return helpers.exports.exportRuntimeStatus({ cwd, hostRoot: resolve(extensionDir, '..') })
}

export async function setupExport(cwd) {
  const helpers = await runtimeHelpers()
  return helpers.setup.setupExport({ cwd, hostRoot: resolve(extensionDir, '..'), install: true })
}
