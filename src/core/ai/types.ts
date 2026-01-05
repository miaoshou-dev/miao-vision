/**
 * AI Module Types
 *
 * Defines interfaces for LLM providers and AI-powered features.
 *
 * @module core/ai/types
 */

/**
 * Supported LLM providers
 */
export type LLMProviderType = 'deepseek' | 'openai' | 'anthropic' | 'ollama'

/**
 * Chat message role
 */
export type MessageRole = 'system' | 'user' | 'assistant'

/**
 * Chat message
 */
export interface ChatMessage {
  role: MessageRole
  content: string
}

/**
 * LLM completion options
 */
export interface CompletionOptions {
  /** Model identifier */
  model?: string
  /** Temperature (0-2, lower = more deterministic) */
  temperature?: number
  /** Maximum tokens to generate */
  maxTokens?: number
  /** Stop sequences */
  stop?: string[]
  /** Enable streaming response */
  stream?: boolean
}

/**
 * LLM completion response
 */
export interface CompletionResponse {
  /** Generated content */
  content: string
  /** Model used */
  model: string
  /** Token usage */
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  /** Finish reason */
  finishReason?: 'stop' | 'length' | 'content_filter' | 'error'
}

/**
 * Streaming chunk
 */
export interface StreamChunk {
  /** Partial content */
  content: string
  /** Is this the final chunk */
  done: boolean
}

/**
 * LLM Provider interface
 */
export interface LLMProvider {
  /** Provider name */
  readonly name: LLMProviderType

  /** Check if provider is configured */
  isConfigured(): boolean

  /** Complete a chat conversation */
  complete(
    messages: ChatMessage[],
    options?: CompletionOptions
  ): Promise<CompletionResponse>

  /** Stream a chat completion */
  stream(
    messages: ChatMessage[],
    options?: CompletionOptions
  ): AsyncGenerator<StreamChunk, void, unknown>
}

/**
 * Provider configuration
 */
export interface ProviderConfig {
  apiKey?: string
  baseUrl?: string
  model?: string
  /** Default temperature */
  temperature?: number
  /** Default max tokens */
  maxTokens?: number
}

/**
 * AI generation context
 */
export interface AIContext {
  /** Available data sources (SQL query names with results) */
  dataSources: Array<{
    name: string
    columns: Array<{ name: string; type: string }>
    rowCount: number
    sample?: Record<string, unknown>[]
  }>
  /** Current cursor position context */
  cursorContext?: {
    textBefore: string
    textAfter: string
  }
}

/**
 * Chart generation request
 */
export interface ChartGenerationRequest {
  /** User's natural language description */
  prompt: string
  /** Available context */
  context: AIContext
  /** Preferred chart type (optional) */
  chartType?: string
}

/**
 * Chart generation result
 */
export interface ChartGenerationResult {
  success: boolean
  /** Generated chart configuration (YAML string) */
  chartConfig?: string
  /** Chart type used */
  chartType?: string
  /** Explanation of why this chart was chosen */
  explanation?: string
  /** Error message if failed */
  error?: string
}

// ============================================================================
// Report Generation Types
// ============================================================================

/**
 * Data source information for report generation
 */
export interface DataSourceInfo {
  /** Table/query name */
  name: string
  /** Column definitions */
  columns: Array<{ name: string; type: string }>
  /** Total row count */
  rowCount: number
  /** Sample data (first few rows) */
  sample?: Record<string, unknown>[]
}

/**
 * Report section types
 */
export type ReportSectionType =
  | 'kpi'        // Key Performance Indicators (BigValue cards)
  | 'trend'      // Time series analysis (Line/Area chart)
  | 'ranking'    // Top N analysis (Bar chart)
  | 'comparison' // Category comparison (Bar/Pie chart)
  | 'distribution' // Data distribution (Histogram)
  | 'table'      // Data table
  | 'insight'    // Text-only analysis and recommendations

/**
 * KPI section configuration
 */
export interface KPISectionConfig {
  metrics: Array<{
    name: string
    column: string
    aggregation: 'sum' | 'avg' | 'count' | 'max' | 'min'
    format?: 'number' | 'currency' | 'percent'
  }>
}

/**
 * Trend section configuration
 */
export interface TrendSectionConfig {
  timeColumn: string
  valueColumn: string
  granularity: 'day' | 'week' | 'month' | 'quarter' | 'year'
  chartType?: 'line' | 'area'
}

/**
 * Ranking section configuration
 */
export interface RankingSectionConfig {
  dimensionColumn: string
  valueColumn: string
  aggregation: 'sum' | 'avg' | 'count'
  limit: number
  order: 'asc' | 'desc'
}

/**
 * Comparison section configuration
 */
export interface ComparisonSectionConfig {
  dimensionColumn: string
  valueColumn: string
  aggregation: 'sum' | 'avg' | 'count'
  chartType?: 'bar' | 'pie'
}

/**
 * Distribution section configuration
 */
export interface DistributionSectionConfig {
  column: string
  bins?: number
}

/**
 * Table section configuration
 */
export interface TableSectionConfig {
  columns?: string[]
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

/**
 * Insight section configuration
 */
export interface InsightSectionConfig {
  focus?: string[]  // What aspects to focus on
}

/**
 * Report section definition
 */
export interface ReportSection {
  type: ReportSectionType
  title: string
  description?: string
  dataSource: string
  config:
    | KPISectionConfig
    | TrendSectionConfig
    | RankingSectionConfig
    | ComparisonSectionConfig
    | DistributionSectionConfig
    | TableSectionConfig
    | InsightSectionConfig
}

/**
 * Report plan - output of the planning phase
 */
export interface ReportPlan {
  title: string
  description?: string
  sections: ReportSection[]
}

/**
 * Report style presets
 */
export type ReportStyle =
  | 'professional'  // Formal, data-driven
  | 'concise'       // Dashboard-like, minimal text
  | 'visual'        // Heavy on charts, light on text
  | 'narrative'     // Story-driven with detailed explanations

/**
 * Color palette presets for charts
 */
export type ChartPalette =
  | 'vibrant'     // Modern vibrant colors
  | 'business'    // Professional business colors
  | 'ocean'       // Blue/cyan tones
  | 'sunset'      // Warm red/orange/yellow
  | 'forest'      // Green tones
  | 'categorical' // Distinct category colors
  | 'pastel'      // Soft pastel colors
  | 'darkMode'    // Optimized for dark backgrounds

/**
 * Report generation request
 */
export interface ReportGenerationRequest {
  /** Selected data sources */
  dataSources: DataSourceInfo[]
  /** User's description of what they want */
  prompt: string
  /** Report style preference */
  style?: ReportStyle
  /** Color palette for charts */
  palette?: ChartPalette
  /** Language for the report */
  language?: 'zh' | 'en'
}

/**
 * Section generation progress
 */
export interface SectionProgress {
  sectionIndex: number
  sectionTitle: string
  markdown: string
  isComplete: boolean
}

/**
 * Report generation result
 */
export interface ReportGenerationResult {
  success: boolean
  /** Complete markdown content */
  markdown?: string
  /** Report plan that was used */
  plan?: ReportPlan
  /** Error message if failed */
  error?: string
}
