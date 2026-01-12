/**
 * Infographic AI Types
 *
 * Types for LLM-powered infographic generation.
 *
 * @module core/ai/infographic/types
 */

import type { TemplateCategory } from '@plugins/data-display/infographic/templates'

/**
 * Semantic analysis result from LLM
 */
export interface SemanticAnalysisResult {
  /** Primary content category */
  category: TemplateCategory
  /** Confidence score (0-1) */
  confidence: number
  /** Extracted intent/purpose */
  intent: string
  /** Key entities found */
  entities: ExtractedEntity[]
  /** Suggested visualizations */
  suggestedVisualizations: VisualizationSuggestion[]
  /** Content summary */
  summary: string
  /** Detected data characteristics */
  dataCharacteristics: {
    hasNumericData: boolean
    hasTemporalData: boolean
    hasHierarchy: boolean
    hasComparison: boolean
    hasSequence: boolean
    itemCount: number
  }
}

/**
 * Extracted entity from text
 */
export interface ExtractedEntity {
  /** Entity text */
  text: string
  /** Entity type */
  type: 'metric' | 'category' | 'time' | 'action' | 'concept' | 'person' | 'organization'
  /** Numeric value if applicable */
  value?: number | string
  /** Unit or format */
  unit?: string
  /** Associated metadata */
  metadata?: Record<string, unknown>
}

/**
 * Visualization suggestion
 */
export interface VisualizationSuggestion {
  /** Template ID to use */
  templateId: string
  /** Reason for suggestion */
  reason: string
  /** Score (0-100) */
  score: number
  /** Data mapping */
  dataMapping?: Record<string, string>
}

/**
 * Infographic section in a multi-chart plan
 */
export interface InfographicSection {
  /** Section ID */
  id: string
  /** Section title */
  title: string
  /** Section type */
  type: 'kpi' | 'chart' | 'flow' | 'comparison' | 'hierarchy' | 'text'
  /** Template to use */
  templateId: string
  /** Extracted data for this section */
  data: Record<string, unknown>[]
  /** Layout hints */
  layout?: {
    width?: number
    height?: number
    position?: 'full' | 'half' | 'third'
  }
  /** Order in the infographic */
  order: number
}

/**
 * Multi-chart infographic plan
 */
export interface InfographicPlan {
  /** Plan title */
  title: string
  /** Overall theme/style */
  theme: string
  /** Color palette */
  palette: string
  /** Sections to generate */
  sections: InfographicSection[]
  /** Layout configuration */
  layout: {
    columns: number
    gap: number
    maxWidth: number
  }
  /** Metadata */
  metadata?: {
    sourceLength: number
    generatedAt: string
    model: string
  }
}

/**
 * Planning request
 */
export interface InfographicPlanRequest {
  /** Source text to analyze */
  text: string
  /** Optional user intent/requirements */
  intent?: string
  /** Preferred style */
  style?: 'minimal' | 'detailed' | 'infographic' | 'dashboard'
  /** Max sections to generate */
  maxSections?: number
  /** Language */
  language?: 'zh' | 'en'
}

/**
 * Planning result
 */
export interface InfographicPlanResult {
  success: boolean
  plan?: InfographicPlan
  error?: string
  /** Raw analysis for debugging */
  analysis?: SemanticAnalysisResult
}

/**
 * Section generation progress
 */
export interface InfographicProgress {
  /** Current section index */
  sectionIndex: number
  /** Total sections */
  totalSections: number
  /** Current section title */
  sectionTitle: string
  /** Generated markdown */
  markdown: string
  /** Is complete */
  isComplete: boolean
}

/**
 * Generated infographic result
 */
export interface GeneratedInfographic {
  success: boolean
  /** Complete markdown with all sections */
  markdown?: string
  /** The plan that was used */
  plan?: InfographicPlan
  /** Error if failed */
  error?: string
}
