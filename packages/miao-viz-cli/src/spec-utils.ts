import type { AgentReportSpec, VizType } from './types'

// Find chart index by id, falling back to type match.
// If chartId is undefined and only one chart exists, returns 0.
export function findChartIndex(spec: AgentReportSpec, chartId: string | undefined): number {
  if (!chartId) return spec.charts.length === 1 ? 0 : -1
  const byId = spec.charts.findIndex(c => c.id === chartId)
  if (byId >= 0) return byId
  return spec.charts.findIndex(c => c.type === chartId)
}

// Find the last chart index matching the given id (for duplicate-id repair).
export function findLastChartIndexById(spec: AgentReportSpec, id: string): number {
  for (let i = spec.charts.length - 1; i >= 0; i--) {
    if (spec.charts[i].id === id) return i
  }
  return -1
}

// Collect all unique chart types used in a spec.
export function collectUsedChartTypes(spec: AgentReportSpec): Set<VizType> {
  return new Set(spec.charts.map(c => c.type))
}

// Count charts of a given type.
export function countChartsByType(spec: AgentReportSpec, type: VizType): number {
  return spec.charts.filter(c => c.type === type).length
}
