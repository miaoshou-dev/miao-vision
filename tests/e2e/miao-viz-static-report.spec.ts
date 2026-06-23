import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { chromium, expect, test } from '@playwright/test'

const inputPath = resolve('packages/miao-viz-cli/examples/sales.csv')
const specPath = resolve('packages/miao-viz-cli/examples/sales-dashboard.yaml')
const systemChromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

function runMiaoViz(args: string[]): string {
  return execFileSync('npm', ['run', '--silent', 'miao-viz', '--', ...args], {
    encoding: 'utf8',
    cwd: resolve('.')
  })
}

function canLaunchSystemChromeHeadless(): boolean {
  try {
    execFileSync(systemChromePath, ['--headless', '--disable-gpu', '--dump-dom', 'about:blank'], {
      encoding: 'utf8',
      timeout: 5000,
      stdio: 'ignore'
    })
    return true
  } catch {
    return false
  }
}

function renderSalesReport(): string {
  const outDir = mkdtempSync(join(tmpdir(), 'miao-viz-e2e-'))
  const htmlPath = join(outDir, 'sales-report.html')

  const output = runMiaoViz([
    'render',
    '--input', inputPath,
    '--spec', specPath,
    '--theme', 'editorial',
    '--output', htmlPath
  ])
  const parsed = JSON.parse(output) as { ok: boolean; value: { output: string[] } }
  expect(parsed.ok).toBe(true)
  expect(parsed.value.output).toContain(htmlPath)

  return htmlPath
}

test.describe('miao-viz CLI static report flow', () => {
  test('profiles local data for AI/VizSpec generation', () => {
    const output = runMiaoViz(['profile', inputPath])
    const parsed = JSON.parse(output) as {
      ok: boolean
      value: {
        rows: number
        columns: Array<{ name: string; role?: string; type: string }>
        quality?: { completeness: number }
        hints?: Array<{ type: string }>
        insights?: Array<{ title: string }>
      }
    }

    expect(parsed.ok).toBe(true)
    expect(parsed.value.rows).toBeGreaterThan(0)
    expect(parsed.value.columns.some(column => column.name === 'sales' && column.role === 'measure')).toBe(true)
    expect(parsed.value.columns.some(column => column.name === 'order_date' && column.role === 'time')).toBe(true)
    expect(parsed.value.quality?.completeness).toBeGreaterThan(0.9)
    expect(parsed.value.hints?.some(hint => hint.type === 'time-series')).toBe(true)
  })

  test('renders a static HTML report artifact', () => {
    const htmlPath = renderSalesReport()
    const html = readFileSync(htmlPath, 'utf8')
    expect(html).toContain('id="miao-viz-spec"')
    expect(html).toContain('Sales Dashboard')
    expect(html).toContain('<svg')
    expect(html).toContain('Total Sales')
    expect(html).toContain('Monthly Sales Trend')
    expect(html).toContain('Sales by Region')
  })

  test('opens the generated HTML artifact in a browser', async () => {
    test.skip(
      !canLaunchSystemChromeHeadless(),
      'System Chrome cannot launch in headless mode in this local environment.'
    )

    const htmlPath = renderSalesReport()
    const browser = await chromium.launch({ channel: 'chrome' })
    const page = await browser.newPage()

    try {
      await page.goto(pathToFileURL(htmlPath).toString())

      await expect(page.locator('#miao-viz-spec')).toBeAttached()
      await expect(page.getByRole('heading', { name: 'Sales Dashboard' })).toBeVisible()
      await expect(page.getByText('Total Sales')).toBeVisible()
      await expect(page.getByText('Monthly Sales Trend')).toBeVisible()
      await expect(page.getByText('Sales by Region')).toBeVisible()

      const svgCount = await page.locator('svg').count()
      expect(svgCount).toBeGreaterThanOrEqual(2)
    } finally {
      await browser.close()
    }
  })
})
