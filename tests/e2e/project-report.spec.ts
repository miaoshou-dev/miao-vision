import { test, expect } from '@playwright/test'
import { mkdtempSync, writeFileSync, readFileSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { projectConfigSchema } from '../../packages/miao-viz-cli/src/project-config'
import { normalizeProjectSnapshot } from '../../packages/miao-viz-cli/src/project-snapshot'
import { isAgentError } from '../../packages/miao-viz-cli/src/errors'
import { renderProjectReportHtml } from '../../packages/miao-viz-cli/src/project-report-html'
import { exportHtmlToPdf } from '../../packages/miao-viz-cli/src/pdf-export'

function fixture() {
  const config = projectConfigSchema.parse(JSON.parse(readFileSync('test_data/project_reports/config.json', 'utf8')))
  const rows = Array.from({ length: 40 }, (_, i) => ({ task_id: `T${i}`, title: `${i} · 很长的任务标题，包含完整说明用于检查移动端及打印可读性`, status: i === 39 ? 'blocked' : 'todo', due_date: i === 38 ? null : '2026-10-16', start_date: i === 37 ? null : '2026-10-08', completed_at: null, owner: i === 0 ? null : '负责人', stage: '开发', is_milestone: i === 39, next_action: '确认交付', action_due_date: null, blocker: i === 39 ? '等待反馈' : null }))
  const snapshot = normalizeProjectSnapshot(rows, config, { start: '2026-10-08', end: '2026-10-14' })
  if (isAgentError(snapshot)) throw new Error(snapshot.message)
  const html = renderProjectReportHtml(snapshot, undefined, snapshot.tasks)
  const dir = mkdtempSync(join(tmpdir(), 'project-browser-')), path = join(dir, 'report.html')
  writeFileSync(path, html)
  return { html, path, dir }
}
test('project report Gantt remains complete on desktop, mobile and print', async ({ page }) => {
  const f = fixture(), errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(pathToFileURL(f.path).href)
  expect(await page.locator('.gantt-task').first().getAttribute('data-task-id')).toBe('T39')
  await expect(page.locator('.project-gantt').first().locator('.gantt-task')).toHaveCount(15)
  await expect(page.locator('.gantt-due-point').first()).toBeAttached()
  await expect(page.locator('.gantt-baseline').first()).toBeAttached()
  await page.getByText('完整排期 · 39 项', { exact: true }).click()
  expect(await page.locator('.project-schedule-page .gantt-task').count()).toBe(39)
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: join(f.dir, 'mobile.png'), fullPage: true })
  await page.emulateMedia({ media: 'print' })
  await expect(page.locator('details').first()).toHaveAttribute('open', '')
  await expect(page.locator('.project-schedule-page')).toHaveCount(4)
  expect(await page.locator('.project-schedule-page').first().evaluate(el => getComputedStyle(el).breakInside)).toBe('avoid')
  expect(errors).toEqual([])
})
test('project PDF exporter includes full schedule with no horizontal overflow', async () => {
  const f = fixture(), path = join(f.dir, 'report.pdf')
  const result = await exportHtmlToPdf(f.html, path, { mode: 'report', orientation: 'landscape' })
  expect(result, JSON.stringify(result)).toMatchObject({ ok: true })
  expect(statSync(path).size).toBeGreaterThan(1000)
  const pdf = readFileSync(path).toString('latin1')
  expect(pdf.slice(0, 4)).toBe('%PDF')
  expect((pdf.match(/\/Type\s*\/Page\b/g) ?? []).length).toBeGreaterThanOrEqual(4)
})
