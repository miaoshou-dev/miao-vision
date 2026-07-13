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
      const chartId = detail?.['chartId'] as string | undefined ?? error.chartId as string | undefined
      const transformType = detail?.['transformType'] as string | undefined ?? error.transformType as string | undefined
      const chartIndex = findChartIndex(spec, chartId)
      if (chartIndex < 0 || !transformType) return undefined
      const transforms = spec.charts[chartIndex].data?.transform ?? []
      const tIdx = transforms.findIndex(t => t.type === transformType)
      if (tIdx < 0) return undefined
      return [{ op: 'remove', path: `/charts/${chartIndex}/data/transform/${tIdx}` }]
    }

    case 'BLOCKED_CHART_STRICT': {
      const chartType = detail?.['chartType'] as string | undefined ?? error.chartType as string | undefined
      const chartIdx = findChartIndex(spec, chartType)
      if (chartIdx < 0 || !catalogCharts?.length) return undefined
      const suggestion = preferredChartReplacement(spec.charts[chartIdx], catalogCharts)
      return [{ op: 'replace', path: `/charts/${chartIdx}/type`, value: suggestion }]
    }

    case 'ID_AS_MEASURE': {
      return undefined
    }

    case 'DUPLICATE_CHART_ID': {
      const dupId = detail?.['chartId'] as string | undefined ?? error.chartId as string | undefined
      if (!dupId) return undefined
      const lastIdx = findLastChartIndexById(spec, dupId)
      if (lastIdx < 0) return undefined
      return [{ op: 'replace', path: `/charts/${lastIdx}/id`, value: nextChartId(spec, dupId) }]
    }

    case 'MISSING_ENCODING': {
      return undefined
    }

    case 'X_MUST_BE_TEMPORAL': {
      // line/area x.type='nominal' → change to 'temporal'
      const chartId = detail?.['chartId'] as string | undefined ?? error.chartId as string | undefined
      const chartIdx = findChartIndex(spec, chartId)
      if (chartIdx < 0) return undefined
      return [{ op: 'replace', path: `/charts/${chartIdx}/encoding/x/type`, value: 'temporal' }]
    }

    case 'X_MUST_BE_DIMENSION': {
      // bar x.type='temporal' → change to 'nominal'
      const chartId = detail?.['chartId'] as string | undefined ?? error.chartId as string | undefined
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

function nextChartId(spec: AgentReportSpec, base: string): string {
  const used = new Set(spec.charts.map(chart => chart.id).filter((id): id is string => Boolean(id)))
  let suffix = 2
  while (used.has(`${base}_${suffix}`)) suffix += 1
  return `${base}_${suffix}`
}

function strictVerifyPatches(error: AgentError, spec: AgentReportSpec): JsonPatch[] | undefined {
  const issues = error.issues as Array<{ code?: string; message?: string; insightType?: string; requiredEvidence?: string[] }> | undefined
  if (!issues?.length) return undefined
  const patches: JsonPatch[] = []
  for (const issue of issues) {
    if (issue.code !== 'INSIGHT_REQUIRED_EVIDENCE_MISSING_STRICT') continue
    const type = issue.insightType ?? issue.message?.match(/INSIGHT_REQUIRED_EVIDENCE_MISSING: ([a-z_]+) insight/)?.[1]
    const missing = issue.requiredEvidence ?? issue.message?.match(/requires evidence ([^:]+):/)?.[1]
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

function preferredChartReplacement(chart: AgentReportSpec['charts'][number], catalogCharts: string[]): string {
  const xType = chart.encoding?.x?.type
  const chartType = chart.type
  const preferred = chartType === 'line' && xType === 'temporal'
    ? ['table', 'bigvalue', 'bar']
    : chartType === 'line'
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
