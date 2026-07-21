import type { VizType } from './types'

export interface InteractionCapabilities {
  filter: boolean
  select: boolean
  drilldown: boolean
  sort: boolean
  dynamicMetric: boolean
}

const NONE: InteractionCapabilities = { filter: false, select: false, drilldown: false, sort: false, dynamicMetric: false }

export const INTERACTION_CAPABILITIES: Partial<Record<VizType, InteractionCapabilities>> = {
  bigvalue: { filter: true, select: false, drilldown: false, sort: false, dynamicMetric: true },
  bar: { filter: true, select: true, drilldown: true, sort: false, dynamicMetric: false },
  line: { filter: true, select: false, drilldown: false, sort: false, dynamicMetric: false },
  area: { filter: true, select: false, drilldown: false, sort: false, dynamicMetric: false },
  scatter: { filter: true, select: false, drilldown: false, sort: false, dynamicMetric: false },
  pie: { filter: true, select: true, drilldown: true, sort: false, dynamicMetric: false },
  table: { filter: true, select: true, drilldown: true, sort: true, dynamicMetric: false }
}

export function interactionCapabilities(type: VizType): InteractionCapabilities {
  return INTERACTION_CAPABILITIES[type] ?? NONE
}
