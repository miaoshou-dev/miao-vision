import type { VizType } from '@/core/viz/types'

export type AgentColumnType = 'string' | 'number' | 'boolean' | 'date' | 'unknown'
export type AgentOutputFormat = 'html' | 'svg' | 'png' | 'pdf'

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

export interface ColumnProfile {
  name: string
  type: AgentColumnType
  nullRate: number
  samples: unknown[]
  distinctCount: number
  min?: number
  max?: number
}

export interface DataProfile {
  file: string
  rows: number
  columns: ColumnProfile[]
  sheet?: string
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

export interface AgentChartSpec {
  type: VizType
  title?: string
  data?: {
    source?: string
    transform?: AgentDataTransform[]
  }
  encoding: {
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
  charts: AgentChartSpec[]
}

export interface RenderJob {
  input: string
  spec: AgentReportSpec
  profile: DataProfile
  formats: AgentOutputFormat[]
  output: string
}
