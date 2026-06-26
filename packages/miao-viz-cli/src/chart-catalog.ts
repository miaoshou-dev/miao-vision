import type { AgentChartSpec } from './types'
import type { AnalyzeContext } from './context-schema'

export interface ValidationIssue {
  code: string
  severity: 'error' | 'warning'
  message: string
  chartId?: string
  patchHint?: object
}

export interface ChartRule {
  code: string
  severity: 'error' | 'warning'
  // Human-readable expression for LLM consumption in catalog --for-llm
  expression: string
  message: string
  validate?: (chart: AgentChartSpec, ctx?: AnalyzeContext) => ValidationIssue | null
}

export interface ChartCatalogItem {
  id: string
  displayName: string
  requiredEncodings: string[]
  // filter is excluded from all charts — renderer has no executor (spec-validator.ts:288)
  allowedTransforms: string[]
  rules: ChartRule[]
  bestFor: string[]
  antiPatterns: string[]
  minDataPoints?: number
}

export const CHART_CATALOG: ChartCatalogItem[] = [
  {
    id: 'bar',
    displayName: 'Bar Chart',
    requiredEncodings: ['x', 'y'],
    allowedTransforms: ['aggregate', 'sort', 'limit', 'derive-month'],
    bestFor: ['ranking by category', 'comparison across dimensions', 'top-N with limit'],
    antiPatterns: ['time series with many periods (use line)', 'more than 12 categories without top-N limit'],
    rules: [
      {
        code: 'X_MUST_BE_DIMENSION',
        severity: 'error',
        expression: 'encoding.x.type === "temporal"',
        message: 'Bar chart x-axis must be a dimension (nominal/ordinal), not temporal. Use line or area for time series.',
        validate: (chart) => {
          if (chart.encoding?.x?.type === 'temporal') {
            return {
              code: 'X_MUST_BE_DIMENSION',
              severity: 'error',
              message: `Bar chart${chart.id ? ` '${chart.id}'` : ''}: x.type='temporal' is invalid. Use line/area for time series, or set x.type='nominal'/'ordinal'.`,
              chartId: chart.id
            }
          }
          return null
        }
      },
      {
        code: 'TOO_MANY_CATEGORIES',
        severity: 'warning',
        expression: 'ctx.fields[encoding.x.field].distinctCount > 12',
        message: 'More than 12 bar categories. Add a limit transform (top 10) or switch to table.',
        validate: (chart, ctx) => {
          if (!ctx) return null
          const xField = chart.encoding?.x?.field
          if (!xField) return null
          const field = ctx.fields.find(f => f.name === xField)
          if (field?.distinctCount !== undefined && field.distinctCount > 12) {
            return {
              code: 'TOO_MANY_CATEGORIES',
              severity: 'warning',
              message: `Bar chart${chart.id ? ` '${chart.id}'` : ''}: '${xField}' has ${field.distinctCount} distinct values (>12). Add { type: 'limit', value: 10 } or use table.`,
              chartId: chart.id
            }
          }
          return null
        }
      }
    ]
  },

  {
    id: 'line',
    displayName: 'Line Chart',
    requiredEncodings: ['x', 'y'],
    allowedTransforms: ['aggregate', 'sort', 'derive-month'],
    bestFor: ['time series trends', 'continuous data over ordered axis'],
    antiPatterns: ['nominal x-axis (use bar)', 'fewer than 3 data points (use bigvalue)'],
    minDataPoints: 3,
    rules: [
      {
        code: 'X_MUST_BE_TEMPORAL',
        severity: 'error',
        expression: 'encoding.x.type === "nominal"',
        message: "Line chart x-axis must be temporal or ordinal, not nominal. A nominal x gives undefined line order.",
        validate: (chart) => {
          if (chart.encoding?.x?.type === 'nominal') {
            return {
              code: 'X_MUST_BE_TEMPORAL',
              severity: 'error',
              message: `Line chart${chart.id ? ` '${chart.id}'` : ''}: x.type='nominal' is invalid — line order is undefined. Use x.type='temporal' or 'ordinal', or switch to bar chart.`,
              chartId: chart.id
            }
          }
          return null
        }
      },
      {
        code: 'MISSING_SORT_TRANSFORM',
        severity: 'warning',
        expression: 'no sort transform present',
        message: "Line chart without a sort transform — x-axis order may be wrong. Add { type: 'sort', field: <xField>, order: 'asc' }.",
        validate: (chart) => {
          const transforms = chart.data?.transform ?? []
          const hasSort = transforms.some(t => t.type === 'sort')
          if (!hasSort && chart.encoding?.x?.field) {
            const xField = chart.encoding.x.field
            return {
              code: 'MISSING_SORT_TRANSFORM',
              severity: 'warning',
              message: `Line chart${chart.id ? ` '${chart.id}'` : ''}: no sort transform. Add { type: 'sort', field: '${xField}', order: 'asc' } to ensure correct time order.`,
              chartId: chart.id,
              patchHint: { type: 'sort', field: xField, order: 'asc' }
            }
          }
          return null
        }
      }
    ]
  },

  {
    id: 'area',
    displayName: 'Area Chart',
    requiredEncodings: ['x', 'y'],
    allowedTransforms: ['aggregate', 'sort', 'derive-month'],
    bestFor: ['cumulative trends', 'filled time series with visual mass'],
    antiPatterns: ['nominal x-axis (use bar)', 'negative values (area fill misleads)'],
    minDataPoints: 3,
    rules: [
      {
        code: 'X_MUST_BE_TEMPORAL',
        severity: 'error',
        expression: 'encoding.x.type === "nominal"',
        message: "Area chart x-axis must be temporal or ordinal, not nominal.",
        validate: (chart) => {
          if (chart.encoding?.x?.type === 'nominal') {
            return {
              code: 'X_MUST_BE_TEMPORAL',
              severity: 'error',
              message: `Area chart${chart.id ? ` '${chart.id}'` : ''}: x.type='nominal' is invalid. Use x.type='temporal' or 'ordinal'.`,
              chartId: chart.id
            }
          }
          return null
        }
      },
      {
        code: 'MISSING_SORT_TRANSFORM',
        severity: 'warning',
        expression: 'no sort transform present',
        message: "Area chart without a sort transform — x-axis order may be wrong. Add { type: 'sort', field: <xField>, order: 'asc' }.",
        validate: (chart) => {
          const transforms = chart.data?.transform ?? []
          const hasSort = transforms.some(t => t.type === 'sort')
          if (!hasSort && chart.encoding?.x?.field) {
            const xField = chart.encoding.x.field
            return {
              code: 'MISSING_SORT_TRANSFORM',
              severity: 'warning',
              message: `Area chart${chart.id ? ` '${chart.id}'` : ''}: no sort transform. Add { type: 'sort', field: '${xField}', order: 'asc' }.`,
              chartId: chart.id,
              patchHint: { type: 'sort', field: xField, order: 'asc' }
            }
          }
          return null
        }
      }
    ]
  },

  {
    id: 'pie',
    displayName: 'Pie Chart',
    requiredEncodings: ['label', 'value'],
    allowedTransforms: ['aggregate', 'sort', 'limit'],
    bestFor: ['part-to-whole proportions', 'share distribution with ≤7 categories'],
    antiPatterns: ['more than 7 slices (use bar)', 'values that do not sum to a meaningful whole'],
    rules: [
      {
        code: 'TOO_MANY_SLICES',
        severity: 'warning',
        expression: 'ctx.fields[encoding.label.field].distinctCount > 7',
        message: 'Pie chart has more than 7 slices. Use bar chart or add a top-N limit transform.',
        validate: (chart, ctx) => {
          if (!ctx) return null
          const labelField = chart.encoding?.label?.field
          if (!labelField) return null
          const field = ctx.fields.find(f => f.name === labelField)
          if (field?.distinctCount !== undefined && field.distinctCount > 7) {
            return {
              code: 'TOO_MANY_SLICES',
              severity: 'warning',
              message: `Pie chart${chart.id ? ` '${chart.id}'` : ''}: '${labelField}' has ${field.distinctCount} values (>7). Use bar chart instead.`,
              chartId: chart.id
            }
          }
          return null
        }
      }
    ]
  },

  {
    id: 'scatter',
    displayName: 'Scatter Chart',
    requiredEncodings: ['x', 'y'],
    allowedTransforms: ['sort', 'limit'],
    bestFor: ['correlation between two measures', 'distribution of two quantitative variables'],
    antiPatterns: ['one categorical axis (use bar)', 'time series (use line)'],
    rules: []
  },

  {
    id: 'histogram',
    displayName: 'Histogram',
    requiredEncodings: ['x'],
    allowedTransforms: ['derive-month'],
    bestFor: ['distribution of a single numeric field', 'frequency across value bins'],
    antiPatterns: ['categorical fields (use bar)', 'fewer than 20 rows (distribution unreliable)'],
    minDataPoints: 20,
    rules: []
  },

  {
    id: 'heatmap',
    displayName: 'Heatmap',
    requiredEncodings: ['x', 'y', 'value'],
    allowedTransforms: ['aggregate'],
    bestFor: ['matrix of two dimensions vs one measure', 'calendar-style density maps'],
    antiPatterns: ['only one dimension (use bar)', 'sparse matrix with many nulls'],
    rules: []
  },

  {
    id: 'table',
    displayName: 'Data Table',
    requiredEncodings: [],
    allowedTransforms: ['aggregate', 'sort', 'limit', 'derive-month'],
    bestFor: ['high-cardinality dimension detail', 'multi-measure comparison', 'data export'],
    antiPatterns: ['too many columns (>8) without pinning', 'as the only chart in a report'],
    rules: []
  },

  {
    id: 'bigvalue',
    displayName: 'Big Value (KPI Card)',
    requiredEncodings: ['value'],
    allowedTransforms: ['aggregate'],
    bestFor: ['single top-level KPI', 'summary metric with optional delta'],
    antiPatterns: ['more than 4 bigvalue cards per report (use kpigrid)', 'showing a dimension value without a measure'],
    rules: []
  }
]

export function getCatalogItem(chartType: string): ChartCatalogItem | undefined {
  return CHART_CATALOG.find(c => c.id === chartType)
}
