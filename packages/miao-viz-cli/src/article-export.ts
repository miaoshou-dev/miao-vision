import { writeFileSync } from 'node:fs'
import { mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { agentError } from './errors'
import type { AgentResult } from './types'

type PlaywrightModule = { chromium: import('playwright-core').BrowserType<import('playwright-core').Browser> }
let playwrightModule: PlaywrightModule | null = null

async function loadPlaywright(): Promise<AgentResult<PlaywrightModule>> {
  if (playwrightModule) return { ok: true, value: playwrightModule }

  for (const mod of ['playwright', 'playwright-core', '@playwright/test']) {
    try {
      const pw = await import(mod)
      playwrightModule = pw as PlaywrightModule
      return { ok: true, value: pw as PlaywrightModule }
    } catch {}
  }

  return agentError(
    'MISSING_PLAYWRIGHT',
    'Playwright is required for PNG/PDF export. Install it with: npm install --save-dev @playwright/test && npx playwright install chromium',
    { installHint: 'npm install --save-dev @playwright/test && npx playwright install chromium' }
  )
}

export async function exportInfographicToFile(
  html: string,
  format: 'png' | 'pdf',
  outputPath: string
): Promise<AgentResult<string>> {
  const loaded = await loadPlaywright()
  if (!loaded.ok) return loaded
  const pw: PlaywrightModule = loaded.value

  const dir = mkdtempSync(join(tmpdir(), 'miao-viz-export-'))
  const tempHtml = join(dir, 'source.html')
  writeFileSync(tempHtml, html, 'utf8')

  try {
    const browser = await pw.chromium.launch()
    const page = await browser.newPage({ viewport: { width: 1120, height: 800 } })
    await page.goto(`file://${tempHtml}`, { waitUntil: 'networkidle' })

    if (format === 'png') {
      await page.screenshot({ path: outputPath, fullPage: true })
    } else {
      await page.pdf({ path: outputPath, format: 'A4', printBackground: true })
    }

    await browser.close()
    return { ok: true, value: outputPath }
  } catch (error) {
    return agentError(
      'EXPORT_FAILED',
      error instanceof Error ? error.message : 'Export failed for an unknown reason.',
      { format, outputPath }
    )
  }
}
