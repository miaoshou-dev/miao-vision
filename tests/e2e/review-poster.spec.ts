import { test, expect } from '@playwright/test'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import * as YAML from 'yaml'
import { startReviewServer } from '../../packages/miao-viz-cli/src/review/review-server'

test('poster modules select their preview and the hero title saves to Spec and HTML', async ({ page }) => {
  const root = mkdtempSync(join(tmpdir(), 'review-poster-e2e-'))
  const context = join(root, 'context.json'), profile = join(root, 'profile.json')
  const spec = join(root, 'poster.yaml'), html = join(root, 'poster.html')
  const input = join(process.cwd(), 'test_data/poster-ranking.csv')
  const cli = async (args: string[]) => (await promisify(execFile)(process.execPath, ['scripts/miao-viz.mjs', ...args])).stdout
  await cli(['data', 'analyze', input, '--intent', 'rank countries by Buffett indicator', '--output', context])
  writeFileSync(profile, await cli(['data', 'profile', input]))
  await cli(['spec', 'template', 'instantiate', 'data-poster-ranking', '--context', context, '--output', spec])
  const posterSpec = YAML.parse(readFileSync(spec, 'utf8'))
  posterSpec.poster.hero.subtitle = '测试海报副标题'
  posterSpec.poster.callouts = [{ type: 'note', text: '测试海报文案' }]
  writeFileSync(spec, YAML.stringify(posterSpec))
  await cli(['spec', 'validate', '--spec', spec, '--profile', profile, '--context', context, '--verify', '--strict'])
  const server = await startReviewServer({ port: 0, artifactRoot: root })
  try {
    await cli(['render', 'report', '--input', input, '--spec', spec, '--context', context, '--output', html, '--review-url', server.url, '--review-run-id', 'poster-edit'])
    await page.goto(server.url)
    await page.locator('[data-screen="edit"]').click()
    const frame = page.frameLocator('#editReport iframe')
    await expect(page.locator('#targets')).toContainText('海报标题')
    await frame.locator('.poster-hero h1').click()
    await expect(page.locator('#directTitleEdit')).toBeVisible()
    await expect(frame.locator('.poster-hero h1')).toHaveAttribute('data-miao-review-selected', '')
    await expect(page.locator('#saveTitle')).toBeEnabled()
    await page.locator('#directTitle').fill('修改后的海报标题')
    await page.locator('#saveTitle').click()
    await expect(frame.locator('h1')).toHaveText('修改后的海报标题')
    expect(YAML.parse(readFileSync(spec, 'utf8')).poster.hero.title).toBe('修改后的海报标题')
    expect(readFileSync(html, 'utf8')).toContain('<h1>修改后的海报标题</h1>')
    await page.locator('#targets .target').filter({ hasText: '海报副标题' }).click()
    await expect(frame.locator('.poster-subtitle')).toHaveAttribute('data-miao-review-selected', '')
    await page.locator('#targets .target').filter({ hasText: '海报来源' }).click()
    await expect(frame.locator('.poster-footer span').first()).toHaveAttribute('data-miao-review-selected', '')
    await page.locator('#targets .target').filter({ hasText: '海报文案' }).click()
    await expect(frame.locator('.poster-note')).toHaveAttribute('data-miao-review-selected', '')
    await page.screenshot({ path: join(root, 'viewer.png'), fullPage: true })
  } finally { await server.close() }
})
