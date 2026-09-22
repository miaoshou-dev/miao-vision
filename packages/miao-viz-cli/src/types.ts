import type { DeckClaimArgs } from './deck-types'
import type { QueryRecipe } from './query-recipe'

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
  | 'dot'
  | 'bullet'
  | 'range'
  | 'pareto'
  | 'combo-bar-line'

export type VisualIntentFamily =
  | 'summary'
  | 'comparison'
  | 'ranking'
  | 'trend'
  | 'change'
  | 'composition'
  | 'distribution'
  | 'relationship'
  | 'flow'
  | 'target-attainment'
  | 'uncertainty'
  | 'geo'

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
  role?: 'measure' | 'dimension' | 'time' | 'id' | 'status' | 'score' | 'flag' | 'text' | 'geo' | 'unknown'
  semanticTags?: string[]
  confidence?: number
  rationale?: string[]
  qualityFlags?: string[]
  chartUsage?: {
    asMeasure: 'recommended' | 'allowed' | 'discouraged' | 'forbidden'
    asDimension: 'recommended' | 'allowed' | 'discouraged' | 'forbidden'
    asDetailKey: 'recommended' | 'allowed' | 'discouraged' | 'forbidden'
  }
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
  unit?: string
}

export interface AgentReferenceLayer {
  id?: string
  type: 'line' | 'band'
  axis: 'x' | 'y'
  value?: number | string
  from?: number | string
  to?: number | string
  field?: string
  aggregate?: 'sum' | 'avg' | 'count' | 'min' | 'max'
  label?: string
  evidence?: string
  provenance?: AgentProvenance
}

export type AgentAnnotationSelector =
  | { op: 'first' | 'last' | 'max' | 'min'; field: string; orderBy?: string }
  | { op: 'threshold'; field: string; comparison: 'gt' | 'gte' | 'lt' | 'lte'; value: number }
  | { op: 'value'; field: string; value: string | number }
  | { op: 'max-change'; mode: 'previous'; field: string; orderBy: string }
  | { op: 'max-change'; mode: 'between-fields'; startField: string; endField: string }

export interface AgentChartAnnotation {
  type: 'point' | 'rule'
  selector: AgentAnnotationSelector
  text: string
  evidence?: string
  priority?: number
  provenance?: AgentProvenance
}

export interface AgentFacetSpec {
  row?: AgentFieldEncoding
  column?: AgentFieldEncoding
  maxPanels?: number
  scales?: 'shared' | 'independent'
}

export interface AgentColorScale {
  type: 'qualitative' | 'sequential' | 'diverging' | 'status' | 'focus-context'
  domain?: Array<string | number>
  semantic?: 'unfavorable-neutral-favorable' | 'favorable-neutral-unfavorable'
  focus?: Array<string | number>
}

export interface AgentChartPlacement {
  span: 4 | 6 | 8 | 12
  emphasis?: 'primary' | 'supporting'
}

export interface AgentQualityEncoding {
  sampleSizeField?: string
  estimatedField?: string
  incompleteField?: string
  lowSampleThreshold?: number
  missingRateThreshold?: number
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

export type AgentDataPolicyMode = 'minimal' | 'detail-safe' | 'full'

export interface AgentInteractionDataPolicy {
  mode: AgentDataPolicyMode
  detailFields?: string[]
  excludeFields?: string[]
}

export interface AgentCurrentViewSummary {
  id: string
  label: string
  recipe: QueryRecipe
  format?: 'currency' | 'integer' | 'number' | 'percentage' | 'text'
}

export interface AgentReportInteractions {
  globalFilters?: AgentGlobalFilter[]
  dataPolicy?: AgentInteractionDataPolicy
  currentView?: { summaries: AgentCurrentViewSummary[] }
}

export type AgentInsightType = 'total' | 'rank' | 'share' | 'trend' | 'delta' | 'correlation' | 'distribution' | 'data_quality'
export type AgentInsightCheck = 'evidence_ref_exists' | 'value_match' | 'rank_position' | 'delta_formula' | 'trend_periods' | 'share_formula' | 'benchmark_present' | 'sample_size' | 'caveat_present'
export type AgentProvenanceExemption = 'decorative' | 'methodology'

export interface AgentProvenanceDetail {
  evidence?: string[]
  derivedFrom?: string[]
  check?: AgentInsightCheck
  claimArgs?: DeckClaimArgs
  exemption?: AgentProvenanceExemption
}

export type AgentProvenance = string | AgentProvenanceDetail

export type AgentInsight =
  | string
  | {
      text: string
      type?: AgentInsightType
      evidence?: string[]
      derivedFrom?: string[]
      check?: AgentInsightCheck
      claimArgs?: DeckClaimArgs
      caveat?: string
      severity?: 'info' | 'warning'
      provenance?: AgentProvenance
    }

export interface AgentChartStyle {
  width?: number
  height?: number
  xDomainMin?: number
  xDomainMax?: number
  yDomainMin?: number
  yDomainMax?: number
  barMode?: 'stacked'
  divergingSort?: 'asc' | 'desc' | 'none'
  rowHeight?: number
  showGrid?: boolean
  showValueLabels?: boolean
  positiveColor?: string
  negativeColor?: string
  valueDecimals?: number
  valueSuffix?: string
  axisTitle?: string
  [key: string]: unknown
}

export interface AgentChartSpec {
  id?: string
  type: VizType
  variant?: string
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
  references?: AgentReferenceLayer[]
  annotations?: AgentChartAnnotation[]
  facet?: AgentFacetSpec
  colorScale?: AgentColorScale
  placement?: AgentChartPlacement
  quality?: AgentQualityEncoding
  style?: AgentChartStyle
  provenance?: AgentProvenance
}

export interface AgentReportSpec {
  specVersion?: 1
  layout?: { preset: 'narrative' | 'executive' | 'analytical' | 'mosaic' | 'poster'; maxColumns?: 12 }
  poster?: AgentPosterSpec
  title?: string
  description?: string
  theme?: 'standard-white' | 'magazine' | 'standard-dark' | 'minimal' | 'nyt' | 'bloomberg' | 'tableau'
  locale?: 'en' | 'zh-CN'
  interactions?: AgentReportInteractions
  insights?: AgentInsight[]
  charts: AgentChartSpec[]
}

export interface AgentPosterSpec {
  chartId: string
  secondaryChartId?: string
  template?: 'data-poster-ranking' | 'data-poster-share' | 'data-poster-comparison' | 'data-poster-trend' | 'data-poster-flow' | 'data-poster-geo' | 'content-poster-timeline'
  share?: { normalize: '100%'; categoryField?: string; seriesField?: string; valueField?: string }
  geo?: { resourcePath?: string; nameField?: string; coverageThreshold?: number }
  timeline?: { roles: { order: string; timeLabel: string; title: string; description: string; era?: string; mediaPath?: string; source?: string } }
  composition?: string
  theme?: string
  themeOverride?: {
    mood?: string
    palette?: string
    density?: 'compact' | 'balanced' | 'airy'
  }
  selection?: {
    source: 'user' | 'auto'
    rationale?: string[]
    confidence?: number
  }
  slots?: PosterSlotSpec[]
  canvas?: { width?: number; height?: number }
  hero: { eyebrow?: string; title: string; subtitle?: string }
  footer: { source: string; date?: string }
  chart?: { sort?: 'asc' | 'desc'; maxItems?: number; yDomain?: [number, number]; valueFormat?: string }
  callouts?: AgentPosterCallout[]
}

export type PosterSlotRole = 'hero' | 'insight' | 'primary-visual' | 'ranking' | 'footer'
export type PosterSlotBlock = 'hero' | 'callout' | 'chart' | 'decorative' | 'footer'
export interface PosterSlotSpec {
  id: string
  role: PosterSlotRole
  block: PosterSlotBlock
  chartId?: string
  calloutIndex?: number
}

export type AgentPosterCallout =
  | { type: 'formula'; title: string; body: string }
  | { type: 'note'; text: string }
  | { type: 'threshold'; title: string; body: string }

export interface RenderJob {
  input: string
  spec: AgentReportSpec
  profile: DataProfile
  formats: AgentOutputFormat[]
  output: string
}
