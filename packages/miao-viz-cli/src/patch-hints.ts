import type { AgentError, AgentReportSpec } from './types'
import { getCatalogItem } from './chart-catalog'
import { findChartIndex, findLastChartIndexById } from './spec-utils'

export interface JsonPatch {
  op: 'add' | 'remove' | 'replace'
  path: string
  value?: unknown
}

// Generate RFC 6902 patches for hard errors that have a unique, machine-derivable fix.
// Returns undefined when no automatic patch is possible.
export function generatePatchHints(
  error: AgentError,
  spec: AgentReportSpec,
  catalogCharts?: string[]
): JsonPatch[] | undefined {
  const detail = error.detail as Record<string, unknown> | undefined

  switch (error.code) {
    case 'UNSUPPORTED_TRANSFORM': {
      const chartId = detail?.['chartId'] as string | undefined
      const chartIndex = findChartIndex(spec, chartId)
      if (chartIndex < 0) return undefined
      const transforms = spec.charts[chartIndex].data?.transform ?? []
      const tIdx = transforms.findIndex(t => t.type === 'filter')
      if (tIdx < 0) return undefined
      return [{ op: 'remove', path: `/charts/${chartIndex}/data/transform/${tIdx}` }]
    }

    case 'BLOCKED_CHART_STRICT': {
      const chartType = detail?.['chartType'] as string | undefined
      const chartIdx = findChartIndex(spec, chartType)
      if (chartIdx < 0 || !catalogCharts?.length) return undefined
      const suggestion = catalogCharts[0]
      return [{ op: 'replace', path: `/charts/${chartIdx}/type`, value: suggestion }]
    }

    case 'DUPLICATE_CHART_ID': {
      const dupId = detail?.['chartId'] as string | undefined
      if (!dupId) return undefined
      const lastIdx = findLastChartIndexById(spec, dupId)
      if (lastIdx < 0) return undefined
      return [{ op: 'replace', path: `/charts/${lastIdx}/id`, value: `${dupId}_2` }]
    }

    case 'MISSING_ENCODING': {
      const chartType = detail?.['chartType'] as string | undefined
      const required = detail?.['requiredEncodings'] as string[] | undefined
      const chartIdx = findChartIndex(spec, chartType)
      if (chartIdx < 0 || !required?.length) return undefined
      const existing = Object.keys(spec.charts[chartIdx].encoding ?? {})
      const missing = required.filter(enc => !existing.includes(enc))
      return missing.map(enc => ({
        op: 'add' as const,
        path: `/charts/${chartIdx}/encoding/${enc}`,
        value: { field: '?', type: 'quantitative' }
      }))
    }

    case 'X_MUST_BE_TEMPORAL': {
      // line/area x.type='nominal' → change to 'temporal'
      const chartId = detail?.['chartId'] as string | undefined
      const chartIdx = findChartIndex(spec, chartId)
      if (chartIdx < 0) return undefined
      return [{ op: 'replace', path: `/charts/${chartIdx}/encoding/x/type`, value: 'temporal' }]
    }

    case 'X_MUST_BE_DIMENSION': {
      // bar x.type='temporal' → change to 'nominal'
      const chartId = detail?.['chartId'] as string | undefined
      const chartIdx = findChartIndex(spec, chartId)
      if (chartIdx < 0) return undefined
      return [{ op: 'replace', path: `/charts/${chartIdx}/encoding/x/type`, value: 'nominal' }]
    }

    default:
      return undefined
  }
}

// Collect RFC 6902 patches for warning-level catalog issues that have a machine-derivable fix.
// Only covers rules where the catalog rule returns a patchHint.
export function collectWarningPatches(spec: AgentReportSpec): JsonPatch[] {
  const patches: JsonPatch[] = []
  for (let i = 0; i < spec.charts.length; i++) {
    const chart = spec.charts[i]
    const catalogItem = getCatalogItem(chart.type)
    if (!catalogItem) continue
    for (const rule of catalogItem.rules) {
      if (rule.severity !== 'warning' || !rule.validate) continue
      const issue = rule.validate(chart)
      if (issue?.patchHint) {
        patches.push({
          op: 'add',
          path: `/charts/${i}/data/transform/-`,
          value: issue.patchHint
        })
      }
    }
  }
  return patches
}
