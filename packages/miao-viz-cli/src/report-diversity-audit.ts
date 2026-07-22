import type { AnalyzeContext } from './context-schema'
import type { AgentChartSpec, AgentReportSpec } from './types'

export interface VisualDiversityIssue {
  code: 'LOW_VISUAL_VARIETY' | 'REPEATED_CHART_TYPE' | 'REDUNDANT_VIEW' | 'EXCESSIVE_KPI_SHARE' | 'UNBALANCED_REPORT_DENSITY' | 'COLOR_ENCODING_CONFLICT'
  path: string
  message: string
  suggestion: string
  patchHint?: object
}

function family(chart: AgentChartSpec): string {
  if (['bigvalue', 'progress', 'gauge', 'bullet', 'delta'].includes(chart.type)) return 'summary'
  if (['bar', 'dot'].includes(chart.type)) return 'comparison'
  if (['line', 'area', 'range', 'sparkline'].includes(chart.type)) return 'trend'
  if (['histogram', 'boxplot'].includes(chart.type)) return 'distribution'
  return chart.type
}

function signature(chart: AgentChartSpec): string {
  const encodings = Object.entries(chart.encoding ?? {}).map(([channel, encoding]) => `${channel}:${encoding?.field ?? ''}:${encoding?.aggregate ?? ''}`).sort()
  const transforms = (chart.data?.transform ?? []).map(transform => JSON.stringify(transform)).sort()
  return JSON.stringify([encodings, transforms])
}

export function collectVisualDiversityIssues(spec: AgentReportSpec, context?: AnalyzeContext): VisualDiversityIssue[] {
  const issues: VisualDiversityIssue[] = []
  if (spec.charts.length >= 3 && new Set(spec.charts.map(family)).size === 1) issues.push({
    code: 'LOW_VISUAL_VARIETY', path: '/charts', message: 'All charts belong to the same visual family.',
    suggestion: 'First merge redundant views; otherwise add a reference, annotation, or an applicable variant.'
  })
  for (let index = 2; index < spec.charts.length; index++) {
    const run = spec.charts.slice(index - 2, index + 1).map(chart => `${chart.type}.${chart.variant ?? 'standard'}`)
    if (new Set(run).size === 1) issues.push({ code: 'REPEATED_CHART_TYPE', path: `/charts/${index - 2}`, message: `Three adjacent charts repeat ${run[0]}.`, suggestion: 'Merge equivalent views or use an applicable variant.' })
  }
  const seen = new Map<string, number>()
  spec.charts.forEach((chart, index) => {
    const key = signature(chart)
    const previous = seen.get(key)
    if (previous !== undefined) issues.push({ code: 'REDUNDANT_VIEW', path: `/charts/${index}`, message: `Chart duplicates the fields and transforms of /charts/${previous}.`, suggestion: 'Merge the views or add a benchmark/annotation that answers a distinct question.' })
    else seen.set(key, index)
  })
  if (spec.charts.length >= 5) {
    const summaryCount = spec.charts.filter(chart => family(chart) === 'summary').length
    const intents = context?.intent.visualTasks?.map(task => task.family) ?? []
    const threshold = intents.some(intent => intent === 'summary' || intent === 'target-attainment') ? 0.75 : 0.6
    const hasSupport = spec.charts.some(chart => family(chart) !== 'summary')
    if (summaryCount / spec.charts.length > threshold || !hasSupport) issues.push({ code: 'EXCESSIVE_KPI_SHARE', path: '/charts', message: `${summaryCount} of ${spec.charts.length} charts are summary views.`, suggestion: 'Keep the most decision-relevant KPIs and add at least one supporting analytical view.' })
  }
  const dimensions = spec.charts.map(chart => [Number(chart.style?.width ?? 720), Number(chart.style?.height ?? 420)].join('x'))
  if (spec.charts.length >= 4 && new Set(dimensions).size === 1) issues.push({ code: 'UNBALANCED_REPORT_DENSITY', path: '/charts', message: 'Every chart uses the same visual footprint.', suggestion: 'Promote the primary view or compact supporting views after removing redundancy.' })
  const mappings = new Map<string, string>()
  spec.charts.forEach((chart, index) => {
    const map = chart.style?.colorMapping
    if (!map || typeof map !== 'object' || Array.isArray(map)) return
    for (const [category, color] of Object.entries(map)) {
      if (typeof color !== 'string') continue
      const previous = mappings.get(category)
      if (previous && previous !== color) issues.push({ code: 'COLOR_ENCODING_CONFLICT', path: `/charts/${index}/style/colorMapping/${category}`, message: `Category '${category}' changes from ${previous} to ${color}.`, suggestion: 'Use one stable category color throughout the report.' })
      else mappings.set(category, color)
    }
  })
  return issues
}
