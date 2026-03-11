/**
 * Infographic Agent Types
 *
 * Type definitions for the three-phase Article → Infographic pipeline.
 *
 * Phase 1: ArticleOutliner - Understand article structure
 * Phase 2: NarrativePlanner - Plan visual narrative
 * Phase 3: InfographicGenerator - Generate final output
 *
 * @module core/ai/agents/infographic/types
 */

// ============================================================================
// Input Types
// ============================================================================

/**
 * Input for the Infographic Agent
 */
export interface InfographicInput {
  /** Article text content */
  article: string
  /** User intent/preference (optional) */
  intent?: string
  /** Visual style preference */
  style?: InfographicStyle
  /** Language preference */
  language?: 'zh' | 'en'
  /** Maximum sections to generate */
  maxSections?: number
}

/**
 * Visual style presets
 */
export type InfographicStyle =
  | 'minimal'     // Clean, few sections, essential info only
  | 'detailed'    // Comprehensive, multiple sections
  | 'storytelling' // Narrative flow, visual journey
  | 'dashboard'   // KPI-focused, metrics prominent

// ============================================================================
// Phase 1: Article Outline Types
// ============================================================================

/**
 * Article type classification
 */
export type ArticleType =
  | 'narrative'      // Story, case study, journey
  | 'argumentative'  // Opinion, thesis + evidence
  | 'explanatory'    // Concept explanation, how-it-works
  | 'procedural'     // Step-by-step, tutorial
  | 'comparative'    // A vs B, pros/cons
  | 'informational'  // Facts, data, news

/**
 * Relationship between points
 */
export type PointRelation =
  | 'leads_to'    // Causal: A leads to B
  | 'contrasts'   // Opposition: A vs B
  | 'parallels'   // Similar: A is like B
  | 'supports'    // Evidence: A supports B
  | 'contains'    // Hierarchy: A contains B
  | 'follows'     // Sequence: A then B

/**
 * A logical point/argument in the article
 */
export interface ArticlePoint {
  /** Point identifier */
  id: string
  /** Main assertion/statement */
  point: string
  /** Supporting evidence/details */
  support: string[]
  /** Relationship to next point */
  relationToNext?: PointRelation
  /** Importance score 1-10 */
  importance: number
}

/**
 * A concept/entity extracted from article
 */
export interface ArticleConcept {
  /** Concept name */
  name: string
  /** Related concepts */
  relatesTo: string[]
  /** Type of relationship */
  relationship: 'causes' | 'contains' | 'contrasts' | 'enables' | 'exemplifies'
}

/**
 * Article outline - output of Phase 1
 */
export interface ArticleOutline {
  /** One-sentence theme */
  theme: string
  /** Article type classification */
  type: ArticleType
  /** Main points/arguments */
  structure: ArticlePoint[]
  /** Key concepts and relationships */
  concepts: ArticleConcept[]
  /** Key data points found (numbers, percentages, etc.) */
  dataPoints: ExtractedDataPoint[]
  /** Detected language */
  language: 'zh' | 'en'
  /** Confidence in analysis */
  confidence: number
}

/**
 * Extracted data point from article
 */
export interface ExtractedDataPoint {
  /** Label/context */
  label: string
  /** Value (numeric or string) */
  value: string | number
  /** Unit if applicable */
  unit?: string
  /** Change indicator */
  change?: string
  /** Source quote from article */
  sourceQuote?: string
}

// ============================================================================
// Phase 2: Narrative Plan Types
// ============================================================================

/**
 * Visual metaphor for the infographic
 */
export type VisualMetaphor =
  | 'journey'        // Path, timeline, progression
  | 'pyramid'        // Hierarchy, importance levels
  | 'balance'        // Comparison, weighing options
  | 'cycle'          // Circular process, feedback
  | 'network'        // Connections, relationships
  | 'funnel'         // Narrowing, filtering
  | 'tree'           // Branching, categorization
  | 'stack'          // Layers, building blocks

/**
 * Section role in the narrative
 */
export type SectionRole =
  | 'hook'        // Opening attention grabber
  | 'context'     // Background information
  | 'main_point'  // Core argument/content
  | 'evidence'    // Supporting data/facts
  | 'contrast'    // Counter-point or comparison
  | 'conclusion'  // Summary, takeaway

/**
 * Visual type for a section
 */
export type VisualType =
  | 'icon-statement'        // Icon + text statement
  | 'list-horizontal'       // Horizontal item list
  | 'list-vertical'         // Vertical item list
  | 'list-grid'             // Grid layout
  | 'flow-linear'           // Linear process flow
  | 'flow-cycle'            // Circular process
  | 'compare-binary'        // A vs B comparison
  | 'compare-table'         // Feature comparison table
  | 'hierarchy-pyramid'     // Pyramid structure
  | 'hierarchy-tree'        // Tree structure
  | 'chart-bar'             // Bar chart (only if numeric data)
  | 'chart-pie'             // Pie chart (only if percentage data)
  | 'chart-line'            // Line chart (only if temporal data)
  | 'mind-map'              // Radial mind map
  | 'kpi-cards'             // KPI metric cards

/**
 * A section in the narrative plan
 */
export interface NarrativeSection {
  /** Section identifier */
  id: string
  /** Role in the narrative */
  role: SectionRole
  /** Section title (concise) */
  title: string
  /** Core message (1-2 sentences) */
  message: string
  /** Visual type to use */
  visualType: VisualType
  /** Why this visual type was chosen */
  visualPurpose: string
  /** Content elements for this section */
  elements: NarrativeElement[]
  /** Source point IDs from outline */
  sourcePointIds: string[]
}

/**
 * An element within a narrative section
 */
export interface NarrativeElement {
  /** Element label/title */
  label: string
  /** Optional value */
  value?: string | number
  /** Optional description */
  description?: string
  /** Optional icon hint */
  iconHint?: string
}

/**
 * Narrative flow direction
 */
export type FlowDirection = 'top_to_bottom' | 'left_to_right' | 'radial'

/**
 * Narrative plan - output of Phase 2
 */
export interface NarrativePlan {
  /** Title for the infographic */
  title: string
  /** Subtitle (optional) */
  subtitle?: string
  /** Primary visual metaphor */
  visualMetaphor: VisualMetaphor
  /** Reading/flow direction */
  flowDirection: FlowDirection
  /** Ordered sections */
  sections: NarrativeSection[]
  /** Color palette suggestion */
  palette: 'vibrant' | 'business' | 'warm' | 'cool' | 'monochrome'
  /** Theme suggestion */
  theme: 'dark-vibrant' | 'light-clean' | 'gradient-modern'
}

// ============================================================================
// Phase 3: Infographic Output Types
// ============================================================================

/**
 * Final infographic section spec
 */
export interface InfographicSection {
  /** Section ID */
  id: string
  /** Template ID from registry */
  templateId: string
  /** Section heading */
  heading?: {
    title: string
    subtitle?: string
  }
  /** Insight text above chart */
  insight?: {
    text: string
    highlight?: string
  }
  /** Data items */
  items: InfographicItem[]
  /** Footnote */
  footnote?: {
    text: string
    source?: string
  }
  /** Layout hints */
  layout?: {
    width?: number
    height?: number
    position?: 'full' | 'half' | 'third'
  }
}

/**
 * Individual item in an infographic section
 */
export interface InfographicItem {
  /** Display label */
  label: string
  /** Value (optional) */
  value?: string | number
  /** Description (optional) */
  desc?: string
  /** Icon name (optional) */
  icon?: string
  /** Trend indicator (optional) */
  trend?: 'up' | 'down' | 'flat'
  /** Color override (optional) */
  color?: string
  /** Additional fields for specific templates */
  [key: string]: unknown
}

/**
 * Complete infographic output - final result
 */
export interface InfographicOutput {
  /** Infographic title */
  title: string
  /** Theme name */
  theme: string
  /** Color palette */
  palette: string
  /** Layout configuration */
  layout: {
    direction: FlowDirection
    maxWidth: number
    gap: number
  }
  /** Ordered sections */
  sections: InfographicSection[]
  /** Generated markdown (optional) */
  markdown?: string
  /** Source article summary */
  sourceSummary: string
  /** Metadata */
  metadata: {
    generatedAt: string
    articleLength: number
    sectionCount: number
    language: 'zh' | 'en'
  }
}

// ============================================================================
// Agent Result Types
// ============================================================================

/**
 * Phase 1 result
 */
export interface OutlineResult {
  success: boolean
  outline?: ArticleOutline
  error?: string
}

/**
 * Phase 2 result
 */
export interface NarrativeResult {
  success: boolean
  plan?: NarrativePlan
  error?: string
}

/**
 * Phase 3 / Final result
 */
export interface InfographicResult {
  success: boolean
  infographic?: InfographicOutput
  error?: string
  /** Intermediate results for debugging */
  debug?: {
    outline?: ArticleOutline
    narrativePlan?: NarrativePlan
  }
}

// ============================================================================
// Multi-Style Variant Types
// ============================================================================

/**
 * Style variant identifiers
 */
export type StyleVariantId = 'executive' | 'storytelling' | 'analytical'

/**
 * Style variant configuration
 */
export interface StyleVariantConfig {
  /** Unique identifier */
  id: StyleVariantId
  /** Display name */
  name: string
  /** Short description */
  description: string
  /** Narrative logic description */
  narrativeLogic: string
  /** Preferred templates for this style */
  preferredTemplates: string[]
  /** Color palette */
  palette: 'vibrant' | 'business' | 'warm' | 'cool' | 'monochrome' | 'ocean'
  /** Flow direction */
  flowDirection: FlowDirection
  /** Max sections to include */
  maxSections: number
  /** Minimum importance score to include (1-10) */
  minImportance: number
  /** Whether to show descriptions */
  showDescriptions: boolean
  /** Whether to show insight text */
  showInsights: boolean
  /** Visual metaphor preference */
  visualMetaphor: VisualMetaphor
}

/**
 * A generated infographic variant
 */
export interface InfographicVariant {
  /** Style identifier */
  id: StyleVariantId
  /** Display name */
  name: string
  /** Description */
  description: string
  /** The generated infographic */
  infographic: InfographicOutput
  /** Preview data for thumbnail */
  preview: {
    sectionCount: number
    templateIds: string[]
    hasTimeline: boolean
    hasKPI: boolean
    hasComparison: boolean
  }
}

/**
 * Result with multiple style variants
 */
export interface MultiVariantResult {
  success: boolean
  variants?: InfographicVariant[]
  error?: string
  /** Shared outline from Phase 1 */
  outline?: ArticleOutline
}

// ============================================================================
// Agent Config + Progress
// ============================================================================

import type { LLMProvider } from '../../types'

/**
 * InfographicAgent configuration
 */
export interface InfographicAgentConfig {
  /** LLM provider */
  provider: LLMProvider
  /** Temperature for each phase */
  temperatures?: {
    outliner?: number
    narrative?: number
    generator?: number
  }
  /** Include few-shot examples in prompts */
  includeFewShot?: boolean
  /** Use LLM for final generation (vs rule-based) */
  useLLMGenerator?: boolean
  /** Enable verbose logging */
  verbose?: boolean
}

/**
 * Phase progress for streaming
 */
export interface InfographicProgress {
  phase: 'outlining' | 'planning' | 'generating' | 'complete'
  progress: number
  message: string
  data?: {
    outline?: ArticleOutline
    narrativePlan?: NarrativePlan
    infographic?: InfographicOutput
  }
  done?: boolean
}
