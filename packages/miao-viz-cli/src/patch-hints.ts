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
      const suggestion = preferredChartReplacement(chartType, catalogCharts)
      return [{ op: 'replace', path: `/charts/${chartIdx}/type`, value: suggestion }]
    }

    case 'ID_AS_MEASURE': {
      const chartId = detail?.['chartId'] as string | undefined
      const field = detail?.['field'] as string | undefined
      const chartIdx = findChartIndex(spec, chartId)
      if (chartIdx < 0 || !field) return undefined
      const chart = spec.charts[chartIdx]
      const patches: JsonPatch[] = []
      for (const [channel, encoding] of Object.entries(chart.encoding ?? {})) {
        if (encoding?.field === field) {
          patches.push({ op: 'replace', path: `/charts/${chartIdx}/encoding/${channel}/field`, value: '?' })
        }
      }
      return patches.length ? patches : undefined
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

    case 'STRICT_VERIFY_FAILED':
      return strictVerifyPatches(error, spec)

    default:
      return undefined
  }
}

function strictVerifyPatches(error: AgentError, spec: AgentReportSpec): JsonPatch[] | undefined {
  const issues = error.issues as Array<{ code?: string; message?: string }> | undefined
  if (!issues?.length) return undefined
  const patches: JsonPatch[] = []
  for (const issue of issues) {
    if (issue.code !== 'INSIGHT_REQUIRED_EVIDENCE_MISSING_STRICT' || !issue.message) continue
    const type = issue.message.match(/INSIGHT_REQUIRED_EVIDENCE_MISSING: ([a-z_]+) insight/)?.[1]
    const missing = issue.message.match(/requires evidence ([^:]+):/)?.[1]
      ?.split(',')
      .map(s => s.trim())
      .filter(Boolean)
    if (!type || !missing?.length) continue
    const insightIdx = (spec.insights ?? []).findIndex(insight => typeof insight !== 'string' && insight.type === type)
    if (insightIdx < 0) continue
    const insight = spec.insights?.[insightIdx]
    if (!insight || typeof insight === 'string') continue
    if (!insight.evidence) {
      patches.push({ op: 'add', path: `/insights/${insightIdx}/evidence`, value: missing })
    } else {
      for (const evidenceId of missing.filter(id => !insight.evidence?.includes(id))) {
        patches.push({ op: 'add', path: `/insights/${insightIdx}/evidence/-`, value: evidenceId })
      }
    }
  }
  return patches.length ? patches : undefined
}

function preferredChartReplacement(chartType: string | undefined, catalogCharts: string[]): string {
  const preferred = chartType === 'line'
    ? ['bar', 'table', 'bigvalue']
    : chartType === 'pie'
      ? ['bar', 'table']
      : ['bar', 'table', 'bigvalue']
  return preferred.find(type => catalogCharts.includes(type)) ?? catalogCharts[0]
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
