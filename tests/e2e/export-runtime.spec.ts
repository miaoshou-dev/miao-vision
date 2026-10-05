import { test, expect } from '@playwright/test'
import { spawn } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { McpProcessClient } from '../../packages/miao-vision-pi/extensions/mcp-client.mjs'

test('Viewer shows export setup requirements and preserves specific API errors', async ({ page, request }) => {
  const root = mkdtempSync(join(tmpdir(), 'miao-export-ui-'))
  const moduleRoot = join(root, 'host'), packageRoot = join(moduleRoot, 'node_modules/playwright')
  mkdirSync(packageRoot, { recursive: true })
  writeFileSync(join(packageRoot, 'package.json'), JSON.stringify({ name: 'playwright', version: '1.57.0', main: 'index.cjs' }))
  writeFileSync(join(packageRoot, 'index.cjs'), "throw new Error('broken host dependency')")
  const artifact = join(root, 'report.html'); writeFileSync(artifact, '<h1>Export fixture</h1>')
  const child = spawn(process.execPath, [resolve('packages/miao-viz-cli/dist/cli.cjs'), 'review', 'mcp', '--port', '0', '--artifact-root', root], {
    cwd: root, env: { ...process.env, MIAO_VIZ_PLAYWRIGHT_ROOT: moduleRoot }, stdio: ['pipe', 'pipe', 'pipe']
  })
  const client = new McpProcessClient(child)
  try {
    await client.initialize()
    const opened = await client.callTool('open_miao_vision_viewer', {})
    const url = /http:\/\/127\.0\.0\.1:\d+\//.exec(opened.content[0].text)![0]
    await request.post(`${url}api/runs`, { data: { runId: 'export-fixture', title: '导出环境测试', kind: 'report' } })
    const event = await request.post(`${url}api/runs/export-fixture/events`, { data: { type: 'artifact.updated', runId: 'export-fixture', sequence: 0,
      timestamp: new Date().toISOString(), kind: 'report', primaryPath: artifact, verified: false, deliveryStatus: 'ready' } })
    expect(event.ok(), await event.text()).toBeTruthy()
    const metadata = await (await request.get(`${url}api/runs/export-fixture/export`)).json()
    expect(metadata.value.runtime).toMatchObject({ ok: false, code: 'EXPORT_MODULE_LOAD_FAILED' })
    await page.goto(url)
    await page.locator('#exportToggle').click()
    await expect(page.getByRole('button', { name: 'PNG · 需要设置' })).toBeVisible()
    const response = page.waitForResponse(res => res.url().endsWith('/export/png'))
    await page.getByRole('button', { name: 'PNG · 需要设置' }).click()
    expect(await (await response).json()).toMatchObject({ ok: false, code: 'EXPORT_MODULE_LOAD_FAILED', detail: 'broken host dependency', nextActions: [{ safeToRetry: true }] })
  } finally { await client.close(); rmSync(root, { recursive: true, force: true }) }
})
