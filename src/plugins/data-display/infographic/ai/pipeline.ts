/**
 * Text-to-Infographic Pipeline
 *
 * End-to-end pipeline for converting text into infographic configurations.
 * Orchestrates analysis, extraction, and template selection.
 */

import type { TemplateCategory, TemplateDefinition } from '../templates'
import { getTemplateById } from '../templates'
import { analyzeText } from './text-analyzer'
import { extractData, toTemplateData } from './data-extractor'
import { getSmartRecommendations } from './smart-recommender'

/**
 * Pipeline configuration
 */
export interface PipelineConfig {
  /** Preferred theme */
  theme?: string
  /** Preferred palette */
  palette?: string
  /** Default width */
  width?: number
  /** Default height */
  height?: number
  /** Preferred category override */
  preferredCategory?: TemplateCategory
  /** Minimum confidence threshold */
  minConfidence?: number
}

/**
 * Pipeline result
 */
export interface PipelineResult {
  /** Whether conversion was successful */
  success: boolean
  /** Error message if failed */
  error?: string
  /** Selected template */
  template?: TemplateDefinition
  /** Template ID */
  templateId?: string
  /** Extracted and formatted data */
  data?: Record<string, unknown>
  /** Render configuration */
  config?: {
    theme: string
    palette: string
    width: number
    height: number
    padding: number
  }
  /** Analysis details */
  analysis?: {
    category: TemplateCategory | 'unknown'
    confidence: number
    itemCount: number
    patterns: string[]
  }
  /** Alternative recommendations */
  alternatives?: { templateId: string; score: number }[]
  /** Markdown code block for embedding */
  markdown?: string
}

/**
 * Default pipeline configuration
 */
const DEFAULT_CONFIG: Required<PipelineConfig> = {
  theme: 'dark-vibrant',
  palette: 'vibrant',
  width: 800,
  height: 400,
  preferredCategory: undefined as unknown as TemplateCategory,
  minConfidence: 20
}

/**
 * Calculate optimal dimensions based on template and item count
 */
function calculateDimensions(
  template: TemplateDefinition,
  itemCount: number,
  baseWidth: number,
  baseHeight: number
): { width: number; height: number } {
  const category = template.category

  switch (category) {
    case 'flow':
      // Horizontal layouts need more width
      return {
        width: Math.max(baseWidth, itemCount * 150),
        height: Math.min(baseHeight, 300)
      }
    case 'hierarchy':
    case 'relation':
      // Networks/trees need square-ish aspect ratio
      return {
        width: Math.max(baseWidth, 500),
        height: Math.max(baseHeight, 450)
      }
    case 'comparison':
      // Comparisons need balanced width
      return {
        width: Math.max(baseWidth, 700),
        height: Math.max(baseHeight, 350)
      }
    case 'distribution':
      // Pie charts work well square
      return {
        width: Math.max(baseWidth, 500),
        height: Math.max(baseHeight, 400)
      }
    default:
      // KPI/ranking adapt to item count
      if (itemCount <= 4) {
        return { width: baseWidth, height: Math.min(baseHeight, 200) }
      }
      return { width: baseWidth, height: baseHeight }
  }
}

/**
 * Generate markdown code block for the infographic
 */
function generateMarkdown(
  templateId: string,
  data: Record<string, unknown>,
  config: { theme: string; width: number; height: number }
): string {
  // Convert data to YAML-like format
  const dataYaml = Object.entries(data)
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return `${key}:\n${value.map(item => `  - ${JSON.stringify(item)}`).join('\n')}`
      }
      return `${key}: ${JSON.stringify(value)}`
    })
    .join('\n')

  return `\`\`\`infographic
template: ${templateId}
theme: ${config.theme}
width: ${config.width}
height: ${config.height}
${dataYaml}
\`\`\``
}

/**
 * Main pipeline function: Convert text to infographic
 */
export function textToInfographic(
  text: string,
  config: PipelineConfig = {}
): PipelineResult {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config }

  // Validate input
  if (!text || text.trim().length < 10) {
    return {
      success: false,
      error: 'Text is too short for infographic conversion (minimum 10 characters)'
    }
  }

  if (text.length > 5000) {
    return {
      success: false,
      error: 'Text is too long (maximum 5000 characters)'
    }
  }

  try {
    // Step 1: Analyze text
    const analysis = analyzeText(text)

    // Step 2: Extract structured data
    const extraction = extractData(text, analysis)

    // Step 3: Get template recommendations
    const recommendations = getSmartRecommendations({
      text,
      analysis,
      extraction,
      preferredCategory: mergedConfig.preferredCategory || undefined,
      itemCount: analysis.estimatedItemCount,
      hasNumbers: analysis.hasNumericData,
      hasTemporal: analysis.hasTemporalData
    })

    // Check if we have any recommendations
    if (recommendations.length === 0) {
      return {
        success: false,
        error: 'Could not find suitable template for this text'
      }
    }

    // Step 4: Select best template
    const best = recommendations[0]

    // Check confidence threshold
    if (best.score < mergedConfig.minConfidence) {
      return {
        success: false,
        error: `Confidence too low (${best.score}% < ${mergedConfig.minConfidence}% threshold)`,
        analysis: {
          category: analysis.primaryCategory,
          confidence: analysis.primaryConfidence,
          itemCount: analysis.estimatedItemCount,
          patterns: analysis.patterns.map(p => p.type)
        },
        alternatives: recommendations.map(r => ({
          templateId: r.template.id,
          score: r.score
        }))
      }
    }

    // Step 5: Format data for template
    const templateData = toTemplateData(extraction)

    // Step 6: Calculate dimensions
    const dimensions = calculateDimensions(
      best.template,
      analysis.estimatedItemCount,
      mergedConfig.width,
      mergedConfig.height
    )

    // Step 7: Build result
    const renderConfig = {
      theme: mergedConfig.theme,
      palette: mergedConfig.palette,
      width: dimensions.width,
      height: dimensions.height,
      padding: 16
    }

    const result: PipelineResult = {
      success: true,
      template: best.template,
      templateId: best.template.id,
      data: templateData,
      config: renderConfig,
      analysis: {
        category: analysis.primaryCategory,
        confidence: best.score / 100,
        itemCount: analysis.estimatedItemCount,
        patterns: [...new Set(analysis.patterns.map(p => p.type))]
      },
      alternatives: recommendations.slice(1, 4).map(r => ({
        templateId: r.template.id,
        score: r.score
      })),
      markdown: generateMarkdown(best.template.id, templateData, renderConfig)
    }

    return result

  } catch (error) {
    return {
      success: false,
      error: `Pipeline error: ${(error as Error).message}`
    }
  }
}

/**
 * Quick conversion with sensible defaults
 */
export function quickConvert(text: string): PipelineResult {
  return textToInfographic(text, {
    theme: 'dark-vibrant',
    minConfidence: 15
  })
}

/**
 * Convert with specific template (bypass recommendation)
 */
export function convertWithTemplate(
  text: string,
  templateId: string,
  config: PipelineConfig = {}
): PipelineResult {
  const template = getTemplateById(templateId)
  if (!template) {
    return {
      success: false,
      error: `Template not found: ${templateId}`
    }
  }

  const analysis = analyzeText(text)
  const extraction = extractData(text, analysis)
  const templateData = toTemplateData(extraction)

  const mergedConfig = { ...DEFAULT_CONFIG, ...config }
  const dimensions = calculateDimensions(
    template,
    analysis.estimatedItemCount,
    mergedConfig.width,
    mergedConfig.height
  )

  const renderConfig = {
    theme: mergedConfig.theme,
    palette: mergedConfig.palette,
    width: dimensions.width,
    height: dimensions.height,
    padding: 16
  }

  return {
    success: true,
    template,
    templateId,
    data: templateData,
    config: renderConfig,
    analysis: {
      category: template.category,
      confidence: 1,
      itemCount: analysis.estimatedItemCount,
      patterns: []
    },
    markdown: generateMarkdown(templateId, templateData, renderConfig)
  }
}

/**
 * Batch conversion for multiple text inputs
 */
export function batchConvert(
  texts: string[],
  config: PipelineConfig = {}
): PipelineResult[] {
  return texts.map(text => textToInfographic(text, config))
}
