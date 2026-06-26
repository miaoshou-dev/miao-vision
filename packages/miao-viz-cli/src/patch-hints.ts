import type { AgentError, AgentReportSpec } from './types'

export interface JsonPatch {
  op: 'add' | 'remove' | 'replace'
  path: string
  value?: unknown
}

// Generate RFC 6902 patches for errors that have a unique, machine-derivable fix.
// Returns undefined when no automatic patch is possible.
export function generatePatchHints(
  error: AgentError,
  spec: AgentReportSpec,
  catalogCharts?: string[]
): JsonPatch[] | undefined {
  const detail = error.detail as Record<string, unknown> | undefined

  switch (error.code) {
    case 'UNSUPPORTED_TRANSFORM': {
      // Remove the filter transform entry
      const chartId = detail?.['chartId'] as string | undefined
      const chartIndex = spec.charts.findIndex(c => (c.id ?? c.type) === chartId)
      if (chartIndex < 0) return undefined
      const transforms = spec.charts[chartIndex].data?.transform ?? []
      const tIdx = transforms.findIndex(t => t.type === 'filter')
      if (tIdx < 0) return undefined
      return [{ op: 'remove', path: `/charts/${chartIndex}/data/transform/${tIdx}` }]
    }

    case 'BLOCKED_CHART_STRICT': {
      // Replace blocked chart type with the first allowed catalog type
      const chartType = detail?.['chartType'] as string | undefined
      const chartIdx = spec.charts.findIndex(c => c.type === chartType)
      if (chartIdx < 0 || !catalogCharts?.length) return undefined
      const suggestion = catalogCharts[0]
      return [{ op: 'replace', path: `/charts/${chartIdx}/type`, value: suggestion }]
    }

    case 'DUPLICATE_CHART_ID': {
      // Rename the last occurrence of the duplicate id
      const dupId = detail?.['chartId'] as string | undefined
      if (!dupId) return undefined
      let lastIdx = -1
      for (let i = spec.charts.length - 1; i >= 0; i--) {
        if (spec.charts[i].id === dupId) { lastIdx = i; break }
      }
      if (lastIdx < 0) return undefined
      return [{ op: 'replace', path: `/charts/${lastIdx}/id`, value: `${dupId}_2` }]
    }

    case 'MISSING_ENCODING': {
      // Annotate which encoding is missing; the LLM must fill in the field name
      const chartType = detail?.['chartType'] as string | undefined
      const required = detail?.['requiredEncodings'] as string[] | undefined
      const chartIdx = spec.charts.findIndex(c => c.type === chartType)
      if (chartIdx < 0 || !required?.length) return undefined
      const existing = Object.keys(spec.charts[chartIdx].encoding ?? {})
      const missing = required.filter(enc => !existing.includes(enc))
      return missing.map(enc => ({
        op: 'add' as const,
        path: `/charts/${chartIdx}/encoding/${enc}`,
        value: { field: '?', type: 'quantitative' }
      }))
    }

    default:
      return undefined
  }
}
