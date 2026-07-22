import type { AgentChartSpec } from './types'
import type { VisualIntentFamily, VizType } from './types'
import type { AnalyzeContext } from './context-schema'

export interface ValidationIssue {
  code: string
  severity: 'error' | 'warning'
  message: string
  chartId?: string
  patchHint?: object
}

export interface ChartRule {
  code: string
  severity: 'error' | 'warning'
  /** @deprecated Use expressionHint for documentation-only expressions. */
  expression: string
  expressionHint?: string
  message: string
  validate?: (chart: AgentChartSpec, ctx?: AnalyzeContext) => ValidationIssue | null
}

export interface ChartCatalogItem {
  id: string
  displayName: string
  compactFor?: string
  requires?: string
  transformRecipe?: string
  avoid?: string
  insightPattern?: string
  requiredEncodings: string[]
  allowedTransforms: string[]
  rules: ChartRule[]
  bestFor: string[]
  antiPatterns: string[]
  minDataPoints?: number
  intents?: VisualIntentFamily[]
  variants?: Array<{
    id: string
    requiredEncodings?: string[]
    requires: string
    bestFor: string[]
    avoid?: string[]
  }>
  fallback?: Array<{ chartType: VizType; variant?: string; reason: string }>
}
