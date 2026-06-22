import type { VizType } from './types'

export const VIZ_TYPE_TO_REGISTRY_KEY: Partial<Record<VizType, string>> = {
  table: 'datatable',
  calendar: 'calendar-heatmap'
}

export const DIRECT_REGISTRY_VIZ_TYPES: VizType[] = [
  'bar',
  'line',
  'pie',
  'area',
  'scatter',
  'bubble',
  'histogram',
  'boxplot',
  'radar',
  'heatmap',
  'sankey',
  'treemap',
  'funnel',
  'waterfall',
  'gauge',
  'progress',
  'sparkline',
  'delta',
  'bigvalue'
]

export const INFOGRAPHIC_VIZ_TYPES: VizType[] = [
  'infographic-list',
  'infographic-flow',
  'infographic-hierarchy',
  'infographic-comparison',
  'infographic-kpi'
]

export function getRegistryKeyForVizType(vizType: string): string {
  if (vizType in VIZ_TYPE_TO_REGISTRY_KEY) {
    return VIZ_TYPE_TO_REGISTRY_KEY[vizType as VizType] ?? vizType
  }

  if (INFOGRAPHIC_VIZ_TYPES.includes(vizType as VizType)) {
    return 'infographic'
  }

  return vizType
}

export function getSupportedRegistryVizTypes(): VizType[] {
  return [
    ...DIRECT_REGISTRY_VIZ_TYPES,
    'table',
    'calendar',
    ...INFOGRAPHIC_VIZ_TYPES
  ]
}
