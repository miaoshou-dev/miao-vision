import { z } from 'zod'

/**
 * Visualization Types
 */
export type VizType =
  // Basic Charts
  | 'line' | 'bar' | 'area' | 'scatter' | 'pie' | 'histogram'
  // Statistical
  | 'boxplot' | 'bubble' | 'radar' | 'heatmap'
  // Flow / Hierarchy
  | 'sankey' | 'treemap' | 'funnel' | 'waterfall'
  // Metrics
  | 'gauge' | 'progress' | 'sparkline' | 'delta' | 'bigvalue'
  // Infographics
  | 'infographic-list' | 'infographic-flow' | 'infographic-hierarchy'
  | 'infographic-comparison' | 'infographic-kpi'
  // Tables
  | 'table' | 'pivot'

/**
 * Field Encoding Config
 */
export interface FieldEncoding {
  field: string
  type?: 'quantitative' | 'nominal' | 'temporal' | 'ordinal'
  aggregate?: 'sum' | 'avg' | 'count' | 'min' | 'max'
  format?: string
}

/**
 * Visualization Specification (The Contract)
 */
export interface VizSpec {
  type: VizType
  data: {
    source: string // The SQL block name or Data Source ID
    transform?: any[] // Optional transforms
  }
  encoding: {
    x?: FieldEncoding
    y?: FieldEncoding
    color?: FieldEncoding
    size?: FieldEncoding
    label?: FieldEncoding
    value?: FieldEncoding
    icon?: FieldEncoding
    description?: FieldEncoding
    [key: string]: FieldEncoding | undefined
  }
  style?: Record<string, any>
}

/**
 * Visualization Instance (The Runtime Object)
 */
export interface VizInstance {
  id: string
  type: VizType
  provider: string
  element: HTMLElement | SVGElement
  destroy(): void
  update(data: any[]): Promise<void>
}

/**
 * Visualization Provider Interface
 */
export interface IVizProvider {
  /** Supported types */
  readonly supportedTypes: VizType[]

  /** Check if type is supported */
  supports(type: VizType): boolean

  /** Render the visualization */
  render(
    container: HTMLElement,
    spec: VizSpec,
    data: Record<string, unknown>[]
  ): Promise<VizInstance>
}

/**
 * AI Hints for Component Selection
 */
export interface AIHints {
  suitableFor: {
    dataTypes: ('numeric' | 'categorical' | 'temporal')[]
    cardinalityRange?: { min?: number; max?: number }
    rowCountRange?: { min?: number; max?: number }
  }
  avoid: string[]
  semantics: {
    purpose: string
    alternatives: string[]
  }
  priority: number
}
