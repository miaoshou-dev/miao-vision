import { execFileSync } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import * as XLSX from 'xlsx'
import { describe, expect, it } from 'vitest'
import { loadDataset } from './data-loader'
import { profileDataset, profileSummary } from './data-profiler'
import { queryDataset } from './data-query'
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
    expect(profile.columns.find(column => column.name === 'sales')?.role).toBe('measure')
    expect(profile.columns.find(column => column.name === 'sales')?.p25).toBe(97.5)
    expect(profile.columns.find(column => column.name === 'region')?.role).toBe('dimension')
    expect(profile.columns.find(column => column.name === 'region')?.distinctCount).toBe(3)
    expect(profile.quality?.completeness).toBe(1)
    expect(profile.hints?.some(hint => hint.type === 'time-series')).toBe(true)
    expect(profile.insights?.some(insight => insight.title.includes('Strong relationship'))).toBe(true)
  })

  it('returns summary and targeted reliable profiles for agent context control', () => {
    const dataset = loadDataset(csvPath)
    expect(dataset.ok).toBe(true)
    if (!dataset.ok) return

    const summary = profileSummary(dataset.value)
    expect(summary.columns).toEqual([
      { name: 'order_date', type: 'date' },
      { name: 'region', type: 'string' },
      { name: 'category', type: 'string' },
      { name: 'sales', type: 'number' },
      { name: 'orders', type: 'number' }
    ])

    const profile = profileDataset(dataset.value, { columns: ['sales', 'region'], reliableOnly: true })
    expect(profile.columns.map(column => column.name)).toEqual(['region', 'sales'])
    expect(profile.columns.find(column => column.name === 'sales')?.skewness).toBeUndefined()
    expect(profile.columns.find(column => column.name === 'sales')?.histogram).toBeUndefined()
    expect(profile.insights?.some(insight => insight.description.includes('non-empty values'))).not.toBe(true)
  })

  it('queries real aggregate values for grounded insights', () => {
    const dataset = loadDataset(csvPath)
    expect(dataset.ok).toBe(true)
    if (!dataset.ok) return

    const result = queryDataset(dataset.value.rows, {
      groupby: 'region',
      measure: 'sum(sales) as total_sales',
      orderby: 'total_sales desc',
      limit: 2
    })

    if ('ok' in result && result.ok === false) return
    expect(result.rows).toEqual([
      { region: 'East', total_sales: 240 },
      { region: 'West', total_sales: 120 }
    ])
    expect(result.sql).toContain('SUM(sales) AS total_sales')
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
    expect(html).toContain('class="chart-block"')
  })

  it('renders editorial theme with correct structure', () => {
    const dataset = loadDataset(csvPath)
    expect(dataset.ok).toBe(true)
    if (!dataset.ok) return

    const profile = profileDataset(dataset.value)
    const spec: AgentReportSpec = {
      title: 'Editorial Test',
      description: 'Checking editorial theme output.',
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
          encoding: { x: { field: 'region' }, y: { field: 'total_sales' } }
        },
        {
          type: 'bigvalue',
          title: 'Total Sales',
          encoding: { value: { field: 'sales' } }
        }
      ]
    }

    const html = renderStaticHtml(spec, profile, dataset.value.rows, 'editorial')
    expect(html).toContain('--mv-paper')
    expect(html).toContain('class="report-hero"')
    expect(html).toContain('class="chart-card"')
    expect(html).toContain('class="chart-label"')
    expect(html).toContain('class="chart-caption"')
    expect(html).toContain('id="miao-viz-spec"')
    expect(html).toContain('<svg')
    expect(html).not.toContain('class="chart-block"')
  })

  it('spec theme field survives parse and drives output', () => {
    const dataset = loadDataset(csvPath)
    expect(dataset.ok).toBe(true)
    if (!dataset.ok) return

    const profile = profileDataset(dataset.value)
    const spec: AgentReportSpec = {
      title: 'Theme via Spec',
      theme: 'editorial',
      charts: [{ type: 'bar', encoding: { x: { field: 'region' }, y: { field: 'sales' } } }]
    }
    const html = renderStaticHtml(spec, profile, dataset.value.rows)
    expect(html).toContain('--mv-paper')
    expect(html).toContain('class="report-hero"')
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

  it('accepts profile flags before the file path', () => {
    const summaryOutput = execFileSync('npm', ['run', '--silent', 'miao-viz', '--', 'profile', '--summary', csvPath], {
      encoding: 'utf8'
    })
    const summary = JSON.parse(summaryOutput) as { ok: boolean; value: { columns: Array<{ name: string }> } }
    expect(summary.ok).toBe(true)
    expect(summary.value.columns.map(column => column.name)).toContain('sales')

    const targetedOutput = execFileSync('npm', [
      'run',
      '--silent',
      'miao-viz',
      '--',
      'profile',
      '--columns',
      'sales,region',
      '--reliable-only',
      csvPath
    ], { encoding: 'utf8' })
    const targeted = JSON.parse(targetedOutput) as { ok: boolean; value: { columns: Array<{ name: string; skewness?: number }> } }
    expect(targeted.ok).toBe(true)
    expect(targeted.value.columns.map(column => column.name)).toEqual(['region', 'sales'])
    expect(targeted.value.columns.find(column => column.name === 'sales')?.skewness).toBeUndefined()
  })

  it('prints query JSON', () => {
    const output = execFileSync('npm', [
      'run',
      '--silent',
      'miao-viz',
      '--',
      'query',
      csvPath,
      '--groupby',
      'region',
      '--measure',
      'sum(sales) as total_sales',
      '--orderby',
      'total_sales desc',
      '--limit',
      '1'
    ], { encoding: 'utf8' })
    const parsed = JSON.parse(output) as { ok: boolean; value: { rows: Array<Record<string, unknown>> } }
    expect(parsed.ok).toBe(true)
    expect(parsed.value.rows).toEqual([{ region: 'East', total_sales: 240 }])
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
