export type AgentColumnType = 'string' | 'number' | 'boolean' | 'date' | 'unknown'
export type AgentOutputFormat = 'html' | 'svg' | 'png' | 'pdf'
export type VizType =
  | 'line'
  | 'bar'
  | 'area'
  | 'scatter'
  | 'pie'
  | 'histogram'
  | 'boxplot'
  | 'bubble'
  | 'radar'
  | 'heatmap'
  | 'sankey'
  | 'treemap'
  | 'funnel'
  | 'waterfall'
  | 'gauge'
  | 'progress'
  | 'sparkline'
  | 'delta'
  | 'bigvalue'
  | 'infographic-list'
  | 'infographic-flow'
  | 'infographic-hierarchy'
  | 'infographic-comparison'
  | 'infographic-kpi'
  | 'table'
  | 'pivot'
  | 'calendar'

export interface AgentError {
  ok: false
  code: string
  message: string
  [key: string]: unknown
}

export interface AgentOk<T> {
  ok: true
  value: T
}

export type AgentResult<T> = AgentOk<T> | AgentError

export interface LoadedDataset {
  file: string
  rows: Record<string, unknown>[]
  columns: string[]
  sheet?: string
}

export interface HistogramBucket {
  bucket: string
  count: number
}

export interface ValueDistribution {
  value: string
  count: number
  sharePct: number
}

export interface TemporalProfile {
  span: string
  granularity: 'day' | 'month' | 'quarter' | 'year'
  isMonotonic: boolean
  gapCount: number
}

export interface ColumnProfile {
  name: string
  type: AgentColumnType
  role?: 'measure' | 'dimension' | 'time' | 'id' | 'flag' | 'unknown'
  total: number
  nonNullCount: number
  nullCount: number
  nullRate: number
  fillRate: number
  uniqueRate: number
  samples: unknown[]
  distinctCount: number
  // numeric
  min?: number
  max?: number
  sum?: number
  mean?: number
  median?: number
  p25?: number
  p75?: number
  stddev?: number
  skewness?: number
  skewnessReliable?: boolean      // rows >= 30
  coefficientOfVariation?: number
  outlierCount?: number
  outlierReliable?: boolean       // rows >= 20
  histogram?: HistogramBucket[]
  histogramReliable?: boolean     // rows >= 20
  // string
  topValue?: unknown
  topSharePct?: number
  distribution?: ValueDistribution[]
  // date
  temporal?: TemporalProfile
}

export interface DataQualityProfile {
  completeness: number
  nullRate: number
  avgUniqueRate: number
  highNullColumns: string[]
  likelyIdColumns: string[]
  duplicateProneDimensions: string[]
}

export interface ProfileInsight {
  type: 'info' | 'warning' | 'suggestion' | 'trend'
  title: string
  description: string
  fields?: string[]
}

export type ProfileHint =
  | { type: 'kpi'; field: string; label: string }
  | { type: 'time-series'; xField: string; yFields: string[] }
  | { type: 'ranking'; groupField: string; measureField: string }
  | { type: 'share'; labelField: string; valueField: string }
  | { type: 'distribution'; field: string; skewed: boolean }
  | { type: 'correlation'; a: string; b: string; r: number }

export interface DataProfile {
  file: string
  rows: number
  columns: ColumnProfile[]
  sheet?: string
  quality?: DataQualityProfile
  correlations?: Array<{ a: string; b: string; r: number; n: number; reliable: boolean }>
  hints?: ProfileHint[]
  insights?: ProfileInsight[]
}

export interface AgentFieldEncoding {
  field: string
  type?: 'quantitative' | 'nominal' | 'temporal' | 'ordinal'
  aggregate?: 'sum' | 'avg' | 'count' | 'min' | 'max'
  format?: string
}

export interface AgentDataTransform {
  type: 'derive-month' | 'aggregate' | 'sort' | 'limit' | 'filter'
  field?: string
  as?: string
  groupBy?: string[]
  measures?: Array<{
    field: string
    op: 'sum' | 'avg' | 'count' | 'min' | 'max'
    as: string
  }>
  order?: 'asc' | 'desc'
  value?: unknown
}

export type AgentGlobalFilterType = 'select' | 'range'
export type AgentInteractionSelectMode = 'filter' | 'detail'
export type AgentDrilldownPreset = 'category-detail'

export interface AgentGlobalFilter {
  field: string
  type: AgentGlobalFilterType
  multiSelect?: boolean
}

export interface AgentChartInteraction {
  tooltip?: boolean
  select?: AgentInteractionSelectMode
}

export interface AgentReportInteractions {
  globalFilters?: AgentGlobalFilter[]
}

export type AgentInsight =
  | string
  | {
      text: string
      evidence?: string[]
      caveat?: string
      severity?: 'info' | 'warning'
    }

export interface AgentChartSpec {
  id?: string
  type: VizType
  title?: string
  sortable?: boolean
  interaction?: AgentChartInteraction
  drilldownPreset?: AgentDrilldownPreset
  drilldownChart?: string
  data?: {
    source?: string
    transform?: AgentDataTransform[]
  }
  encoding?: {
    x?: AgentFieldEncoding
    y?: AgentFieldEncoding
    color?: AgentFieldEncoding
    size?: AgentFieldEncoding
    label?: AgentFieldEncoding
    value?: AgentFieldEncoding
    [key: string]: AgentFieldEncoding | undefined
  }
  style?: Record<string, unknown>
}

export interface AgentReportSpec {
  title?: string
  description?: string
  theme?: 'standard-white' | 'magazine' | 'standard-dark' | 'minimal' | 'nyt' | 'bloomberg' | 'tableau'
  interactions?: AgentReportInteractions
  insights?: AgentInsight[]
  charts: AgentChartSpec[]
}

export interface RenderJob {
  input: string
  spec: AgentReportSpec
  profile: DataProfile
  formats: AgentOutputFormat[]
  output: string
}
