import type { ChartCatalogItem } from './chart-catalog-types'
import { CHART_CATALOG as CORE_CATALOG } from './chart-catalog-core'
import { EXTENDED_CATALOG } from './chart-catalog-ext'
import { P0_CHART_CATALOG } from './chart-catalog-p0'
import { P1_CHART_CATALOG } from './chart-catalog-p1'

export { type ValidationIssue, type ChartRule, type ChartCatalogItem } from './chart-catalog-types'
function withBaselineRule(item: ChartCatalogItem): ChartCatalogItem {
  if (item.rules.length > 0) return item
  const codePrefix = item.id.toUpperCase().replace(/-/g, '_')
  return {
    ...item,
    rules: [{
      code: `${codePrefix}_MINIMUM_DATA`, severity: 'warning',
      expression: `rows >= ${item.minDataPoints ?? 1} and required encodings exist`,
      message: `${item.displayName} requires its declared encodings and enough readable data.`,
      validate: (chart, ctx) => {
        const required = item.variants?.find(variant => variant.id === (chart.variant ?? 'standard'))?.requiredEncodings ?? item.requiredEncodings
        const missing = required.filter(encoding => !chart.encoding?.[encoding]?.field)
        if (missing.length > 0) return { code: `${codePrefix}_MISSING_ENCODING`, severity: 'warning', message: `${item.displayName}: missing encoding(s): ${missing.join(', ')}.`, chartId: chart.id }
        if (item.minDataPoints && ctx && ctx.fields.length === 0) return { code: `${codePrefix}_MINIMUM_DATA`, severity: 'warning', message: `${item.displayName}: insufficient profiled data.`, chartId: chart.id }
        return null
      }
    }, {
      code: `${codePrefix}_DATA_COMPATIBILITY`, severity: 'warning', expression: 'numeric encodings use measures and disallowed negative values are rejected',
      message: `${item.displayName} fields must match the declared data roles and sign constraints.`,
      validate: (chart, ctx) => {
        if (!ctx) return null
        const numericChannels = ['y', 'value', 'size', 'start', 'end', 'lower', 'upper', 'target']
        for (const channel of numericChannels) {
          const fieldName = chart.encoding?.[channel]?.field
          const field = ctx.fields.find(candidate => candidate.name === fieldName)
          if (field && !['measure', 'score'].includes(field.role)) return { code: `${codePrefix}_ROLE_MISMATCH`, severity: 'warning', message: `${item.displayName}: encoding.${channel} field '${fieldName}' is not a measure.`, chartId: chart.id }
          if (field?.min !== undefined && field.min < 0 && ['progress', 'gauge', 'funnel', 'treemap', 'pie', 'bullet'].includes(item.id)) return { code: `${codePrefix}_NEGATIVE_VALUE`, severity: 'warning', message: `${item.displayName}: '${fieldName}' contains negative values, which this chart cannot represent reliably.`, chartId: chart.id }
        }
        return null
      }
    }, {
      code: `${codePrefix}_ORDER_OR_DENSITY`, severity: 'warning', expression: 'ordered charts are sorted and dense graphs stay under readable limits',
      message: `${item.displayName} must preserve order and readable density.`,
      validate: chart => {
        const transforms = chart.data?.transform ?? []
        if (['sparkline', 'waterfall', 'funnel', 'infographic-flow'].includes(item.id) && !transforms.some(transform => transform.type === 'sort')) return { code: `${codePrefix}_MISSING_SORT`, severity: 'warning', message: `${item.displayName}: add an explicit sort transform.`, chartId: chart.id, patchHint: { type: 'sort', field: chart.encoding?.x?.field, order: 'asc' } }
        return null
      }
    }]
  }
}

export const CHART_CATALOG: ChartCatalogItem[] = [...CORE_CATALOG, ...EXTENDED_CATALOG, ...P0_CHART_CATALOG, ...P1_CHART_CATALOG].map(withBaselineRule)

export function getCatalogItem(chartType: string): ChartCatalogItem | undefined {
  return CHART_CATALOG.find(c => c.id === chartType)
}
