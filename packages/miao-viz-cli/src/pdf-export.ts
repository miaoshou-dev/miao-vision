import { existsSync, mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { tmpdir } from 'node:os'
import { agentError } from './errors'
import { PRINT_DIAGNOSTIC_SCRIPT, hardLayoutIssues } from './print-readiness'
import type { AgentResult } from './types'
import type { PdfExportOptions, PdfLayoutIssue } from './pdf-export-types'

import { launchExportBrowser, ExportRuntimeError } from '../../../skills/miao-vision/scripts/export-runtime.mjs'

export async function exportHtmlToPdf(
  html: string,
  outputPath: string,
  options: PdfExportOptions
): Promise<AgentResult<{ output: string; warnings: PdfLayoutIssue[]; tempDir?: string }>> {
  const tempDir = mkdtempSync(join(tmpdir(), 'miao-viz-pdf-'))
  const htmlPath = join(tempDir, 'source.html')
  writeFileSync(htmlPath, html, 'utf8')
  let browser: import('playwright-core').Browser | undefined
  try {
    browser = await launchExportBrowser()
    const page = await browser.newPage({ viewport: options.mode === 'deck' ? { width: 1280, height: 720 } : options.mode === 'poster' ? { width: 1080, height: 1350 } : { width: 1120, height: 900 } })
    const timeout = options.timeout ?? 30_000
    await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'networkidle', timeout })
    await page.emulateMedia({ media: 'print' })
    await page.waitForFunction(() => document.documentElement.dataset.miaoRenderReady === 'true', undefined, { timeout })
    await page.evaluate(() => document.fonts.ready)
    const issues = await page.evaluate(
      ({ source, mode }) => (0, eval)(`${source}(${JSON.stringify(mode)})`),
      { source: PRINT_DIAGNOSTIC_SCRIPT, mode: options.mode }
    ) as PdfLayoutIssue[]
    const hard = hardLayoutIssues(issues)
    if (hard.length) {
      return agentError(hard[0].code, hard[0].message, { issues, suggestion: hard[0].suggestion })
    }
    if (options.keepTemp) {
      await page.screenshot({ path: join(tempDir, 'page.png'), fullPage: true })
      writeFileSync(join(tempDir, 'layout-diagnostics.json'), `${JSON.stringify(issues, null, 2)}\n`)
    }
    const margin = options.margin ?? (options.mode === 'deck' || options.mode === 'poster' ? '0' : '12mm')
    await page.pdf(options.mode === 'deck'
      ? { path: outputPath, width: '13.333in', height: '7.5in', margin: { top: '0', right: '0', bottom: '0', left: '0' }, printBackground: true, preferCSSPageSize: true }
      : options.mode === 'poster'
        ? { path: outputPath, width: '1080px', height: '1350px', margin: { top: '0', right: '0', bottom: '0', left: '0' }, printBackground: true, preferCSSPageSize: true }
      : { path: outputPath, format: options.pageSize ?? 'A4', landscape: options.orientation === 'landscape', margin: { top: margin, right: margin, bottom: margin, left: margin }, printBackground: true })
    if (!existsSync(outputPath) || statSync(outputPath).size === 0) {
      return agentError('PDF_OUTPUT_FAILED', 'PDF output was not created or is empty.', { outputPath })
    }
    return { ok: true, value: { output: outputPath, warnings: issues.filter(issue => issue.code === 'PDF_CONTENT_DENSE'), ...(options.keepTemp ? { tempDir } : {}) } }
  } catch (error) {
    if (error instanceof ExportRuntimeError) return error.result
    const timeout = error instanceof Error && /timeout/i.test(error.message)
    return agentError(timeout ? 'PDF_RENDER_TIMEOUT' : 'PDF_OUTPUT_FAILED', error instanceof Error ? error.message : 'PDF export failed.', { outputPath })
  } finally {
    await browser?.close().catch(() => {})
    if (!options.keepTemp) rmSync(tempDir, { recursive: true, force: true })
  }
}
