export type InfographicVisualType =
  | 'kpi-strip'
  | 'metric-bars'
  | 'process-flow'
  | 'concept-contrast'
  | 'timeline-path'
  | 'part-to-whole'
  | 'before-after'
  | 'tradeoff-matrix'
  | 'ranked-list-chart'
  | 'system-diagram'
  | 'callout-diagram'
  | 'icon-cluster'

export interface KpiItemData {
  label: string
  value: number
  unit?: string
  delta?: string
}

export interface KpiStripData {
  items: KpiItemData[]
}

export interface MetricBarItemData {
  label: string
  value: number
  unit?: string
}

export interface MetricBarsData {
  items: MetricBarItemData[]
}

export interface ProcessFlowItemData {
  label?: string
  text: string
}

export interface ProcessFlowData {
  items: ProcessFlowItemData[]
}

export interface ConceptContrastItemData {
  label: string
  text: string
  [dimension: string]: string
}

export interface ConceptContrastData {
  items: ConceptContrastItemData[]
}

export interface TimelinePathItemData {
  label?: string
  text: string
}

export interface TimelinePathData {
  items: TimelinePathItemData[]
}

export interface PartToWholeItemData {
  label: string
  value: number
  text: string
}

export interface PartToWholeData {
  items: PartToWholeItemData[]
}

export interface BeforeAfterItemData {
  label?: string
  value?: string
  text?: string
}

export interface BeforeAfterData {
  before: BeforeAfterItemData[]
  after: BeforeAfterItemData[]
  items: BeforeAfterItemData[]
  beforeLabel?: string
  afterLabel?: string
}

export interface TradeoffMatrixData {
  items: Array<{ label: string; text: string; detail?: string }>
  xLabel?: string
  yLabel?: string
}

export interface RankedListChartData {
  items: Array<{ label: string; value: number; text: string }>
}

export interface SystemDiagramData {
  nodes: Array<{
    label: string
    zone?: string
    color?: string
  }>
  edges: Array<{
    from: number
    to: number
  }>
}

export interface CalloutDiagramData {
  items: Array<{
    label: string
    text: string
    detail?: string
  }>
}

export interface IconClusterData {
  items: Array<{
    label: string
    text: string
  }>
}

export type VisualData =
  | KpiStripData
  | MetricBarsData
  | ProcessFlowData
  | ConceptContrastData
  | TimelinePathData
  | PartToWholeData
  | BeforeAfterData
  | TradeoffMatrixData
  | RankedListChartData
  | SystemDiagramData
  | CalloutDiagramData
  | IconClusterData

export type VisualDataMap = {
  'kpi-strip': KpiStripData
  'metric-bars': MetricBarsData
  'process-flow': ProcessFlowData
  'concept-contrast': ConceptContrastData
  'timeline-path': TimelinePathData
  'part-to-whole': PartToWholeData
  'before-after': BeforeAfterData
  'tradeoff-matrix': TradeoffMatrixData
  'ranked-list-chart': RankedListChartData
  'system-diagram': SystemDiagramData
  'callout-diagram': CalloutDiagramData
  'icon-cluster': IconClusterData
}

export type TypedInfographicVisual = {
  [K in InfographicVisualType]: {
    type: K
    data: VisualDataMap[K]
    caption?: string
  }
}[InfographicVisualType]
