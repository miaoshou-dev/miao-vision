import { existsSync } from 'node:fs'
import { spawn, spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
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
  const result = spawnSync(process.execPath, [script, '--require-recommended', '--print-path'], { encoding: 'utf8' })
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || 'Compatible miao-viz CLI was not found.').trim()
    throw new Error(detail)
  }
  const executable = result.stdout.trim()
  if (!executable) throw new Error('Miao Vision CLI checker returned an empty executable path.')
  const version = spawnSync(executable, ['--version'], { encoding: 'utf8' })
  return { executable, version: version.status === 0 ? version.stdout.trim() : 'unknown' }
}

export async function startManagedMcp(cwd) {
  const cli = resolveCli()
  const child = spawn(cli.executable, ['review', 'mcp', '--port', '0', '--artifact-root', cwd], {
    cwd,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: process.env
  })
  const client = new McpProcessClient(child)
  try {
    const initialized = await client.initialize()
    const opened = await client.callTool('open_miao_vision_viewer', {})
    const text = opened?.content?.find?.(item => item?.type === 'text')?.text ?? ''
    const url = /https?:\/\/127\.0\.0\.1:\d+\//.exec(text)?.[0]
    if (!url) throw new Error('Miao Vision MCP did not return a Viewer URL.')
    return { client, url, cliVersion: initialized?.serverInfo?.version ?? cli.version }
  } catch (error) {
    await client.close()
    throw error
  }
}
