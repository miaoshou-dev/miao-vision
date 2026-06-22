import { execFileSync } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import * as XLSX from 'xlsx'
import { describe, expect, it } from 'vitest'
import { loadDataset } from './data-loader'
import { profileDataset } from './data-profiler'
import { renderStaticHtml } from './html-export'
import { validateReportSpec } from './spec-validator'
import type { AgentReportSpec } from './types'

const csvPath = 'test_data/agent-sales.csv'
const tsvPath = 'test_data/agent-sales.tsv'
const jsonPath = 'test_data/agent-sales.json'

describe('agent data loader and profiler', () => {
  it('loads CSV, TSV, JSON, and XLSX files', () => {
    const csv = loadDataset(csvPath)
    const tsv = loadDataset(tsvPath)
    const json = loadDataset(jsonPath)
    const xlsx = loadDataset(createXlsxFixture())

    expect(csv.ok && csv.value.rows).toHaveLength(4)
    expect(tsv.ok && tsv.value.rows).toHaveLength(4)
    expect(json.ok && json.value.rows).toHaveLength(4)
    expect(xlsx.ok && xlsx.value.rows).toHaveLength(4)
  })

  it('profiles compact column metadata', () => {
    const dataset = loadDataset(csvPath)
    expect(dataset.ok).toBe(true)
    if (!dataset.ok) return

    const profile = profileDataset(dataset.value)
    expect(profile.rows).toBe(4)
    expect(profile.columns.find(column => column.name === 'sales')?.type).toBe('number')
    expect(profile.columns.find(column => column.name === 'region')?.distinctCount).toBe(3)
  })
})

describe('agent spec validation and HTML rendering', () => {
  it('validates field references and renders static HTML', () => {
    const dataset = loadDataset(csvPath)
    expect(dataset.ok).toBe(true)
    if (!dataset.ok) return

    const profile = profileDataset(dataset.value)
    const spec: AgentReportSpec = {
      title: 'Sales Dashboard',
      charts: [
        {
          type: 'bar',
          title: 'Sales by Region',
          data: {
            transform: [
              {
                type: 'aggregate',
                groupBy: ['region'],
                measures: [{ field: 'sales', op: 'sum', as: 'total_sales' }]
              }
            ]
          },
          encoding: {
            x: { field: 'region' },
            y: { field: 'total_sales' }
          }
        },
        {
          type: 'line',
          title: 'Monthly Sales',
          data: {
            transform: [
              { type: 'derive-month', field: 'order_date', as: 'order_month' },
              {
                type: 'aggregate',
                groupBy: ['order_month'],
                measures: [{ field: 'sales', op: 'sum', as: 'total_sales' }]
              },
              { type: 'sort', field: 'order_month', order: 'asc' }
            ]
          },
          encoding: {
            x: { field: 'order_month' },
            y: { field: 'total_sales' }
          }
        }
      ]
    }

    const validation = validateReportSpec(spec, profile)
    expect(validation.ok).toBe(true)

    const html = renderStaticHtml(spec, profile, dataset.value.rows)
    expect(html).toContain('id="miao-viz-spec"')
    expect(html).toContain('<svg')
    expect(html).toContain('Sales by Region')
  })

  it('returns structured field errors', () => {
    const dataset = loadDataset(csvPath)
    expect(dataset.ok).toBe(true)
    if (!dataset.ok) return

    const profile = profileDataset(dataset.value)
    const validation = validateReportSpec({
      title: 'Broken',
      charts: [{
        type: 'bar',
        encoding: {
          x: { field: 'missing' },
          y: { field: 'sales' }
        }
      }]
    }, profile)

    expect(validation.ok).toBe(false)
    if (validation.ok === false) {
      expect(validation.code).toBe('FIELD_NOT_FOUND')
      expect(validation.availableFields).toContain('sales')
    }
  })
})

describe('miao-viz CLI', () => {
  it('prints profile JSON', () => {
    const output = execFileSync('npm', ['run', '--silent', 'miao-viz', '--', 'profile', csvPath], {
      encoding: 'utf8'
    })
    const parsed = JSON.parse(output) as { ok: boolean; value: { rows: number } }
    expect(parsed.ok).toBe(true)
    expect(parsed.value.rows).toBe(4)
  })
})

function createXlsxFixture(): string {
  const dir = mkdtempSync(join(tmpdir(), 'miao-agent-test-'))
  const file = join(dir, 'sales.xlsx')
  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.json_to_sheet([
    { order_date: '2025-01-01', region: 'East', category: 'A', sales: 100 },
    { order_date: '2025-01-02', region: 'West', category: 'B', sales: 120 },
    { order_date: '2025-02-01', region: 'East', category: 'A', sales: 140 },
    { order_date: '2025-02-02', region: 'North', category: 'C', sales: 90 }
  ])
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders')
  XLSX.writeFile(workbook, file)
  return file
}
