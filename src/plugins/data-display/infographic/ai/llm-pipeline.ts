/**
 * LLM-Enhanced Text-to-Infographic Pipeline
 *
 * Uses LLM for semantic analysis and intelligent planning.
 * Falls back to regex-based pipeline when LLM is unavailable.
 *
 * @module plugins/data-display/infographic/ai/llm-pipeline
 */

import type { LLMProvider } from '@core/ai/types'
import type { TemplateDefinition, TemplateCategory } from '../templates'
import { getTemplateById } from '../templates'
import {
  SemanticAnalyzer,
  InfographicPlanner,
  InfographicGenerator,
  type InfographicPlan,
  type SemanticAnalysisResult
} from '@core/ai/infographic'
import { textToInfographic, type PipelineResult, type PipelineConfig } from './pipeline'

/**
 * LLM Pipeline configuration
 */
export interface LLMPipelineConfig extends PipelineConfig {
  /** LLM provider */
  provider?: LLMProvider
  /** Use LLM for analysis */
  useLLMAnalysis?: boolean
  /** Use LLM for planning */
  useLLMPlanning?: boolean
  /** Generate multi-section infographic */
  multiSection?: boolean
  /** Maximum sections for multi-section */
  maxSections?: number
  /** Language */
  language?: 'zh' | 'en'
  /** Style preset */
  style?: 'minimal' | 'detailed' | 'infographic' | 'dashboard'
}

/**
 * LLM Pipeline result
 */
export interface LLMPipelineResult extends PipelineResult {
  /** Full infographic plan (multi-section) */
  plan?: InfographicPlan
  /** Semantic analysis result */
  semanticAnalysis?: SemanticAnalysisResult
  /** Whether LLM was used */
  usedLLM?: boolean
}

/**
 * LLM-Enhanced Pipeline class
 */
export class LLMInfographicPipeline {
  private provider?: LLMProvider
  private analyzer?: SemanticAnalyzer
  private planner?: InfographicPlanner
  private generator: InfographicGenerator

  constructor(provider?: LLMProvider) {
    this.provider = provider
    this.generator = new InfographicGenerator()

    if (provider) {
      this.analyzer = new SemanticAnalyzer({
        provider,
        fallbackToRegex: true
      })
      this.planner = new InfographicPlanner({
        provider,
        verbose: false
      })
    }
  }

  /**
   * Set LLM provider
   */
  setProvider(provider: LLMProvider): void {
    this.provider = provider
    this.analyzer = new SemanticAnalyzer({
      provider,
      fallbackToRegex: true
    })
    this.planner = new InfographicPlanner({
      provider,
      verbose: false
    })
  }

  /**
   * Check if LLM is available
   */
  isLLMAvailable(): boolean {
    return !!this.provider?.isConfigured()
  }

  /**
   * Convert text to infographic (single section)
   */
  async convert(text: string, config: LLMPipelineConfig = {}): Promise<LLMPipelineResult> {
    const {
      useLLMAnalysis = true,
      useLLMPlanning = false,
      multiSection = false,
      ...baseConfig
    } = config

    // If LLM not available or disabled, use regex pipeline
    if (!this.isLLMAvailable() || (!useLLMAnalysis && !useLLMPlanning)) {
      const result = textToInfographic(text, baseConfig)
      return { ...result, usedLLM: false }
    }

    // Multi-section mode
    if (multiSection && useLLMPlanning) {
      return this.convertMultiSection(text, config)
    }

    // Single section with LLM analysis
    if (useLLMAnalysis && this.analyzer) {
      return this.convertWithLLMAnalysis(text, config)
    }

    // Fallback
    const result = textToInfographic(text, baseConfig)
    return { ...result, usedLLM: false }
  }

  /**
   * Convert with LLM semantic analysis
   */
  private async convertWithLLMAnalysis(
    text: string,
    config: LLMPipelineConfig
  ): Promise<LLMPipelineResult> {
    try {
      const analysis = await this.analyzer!.analyze(text)

      // Use semantic analysis to guide template selection
      const bestSuggestion = analysis.suggestedVisualizations[0]
      const templateId = bestSuggestion?.templateId || 'list-row-badge-card'
      const template = getTemplateById(templateId)

      if (!template) {
        // Fallback to regex pipeline
        const result = textToInfographic(text, config)
        return { ...result, semanticAnalysis: analysis, usedLLM: true }
      }

      // Build data from entities
      const data = this.entitiesToData(analysis)

      // Calculate dimensions
      const width = config.width || 800
      const height = config.height || 400

      const renderConfig = {
        theme: config.theme || 'dark-vibrant',
        palette: config.palette || 'vibrant',
        width,
        height,
        padding: 16
      }

      const markdown = this.generateMarkdown(templateId, data, renderConfig)

      return {
        success: true,
        template,
        templateId,
        data,
        config: renderConfig,
        analysis: {
          category: analysis.category,
          confidence: analysis.confidence,
          itemCount: analysis.dataCharacteristics.itemCount,
          patterns: analysis.entities.map(e => e.type)
        },
        alternatives: analysis.suggestedVisualizations.slice(1, 4).map(s => ({
          templateId: s.templateId,
          score: s.score
        })),
        markdown,
        semanticAnalysis: analysis,
        usedLLM: true
      }
    } catch (error) {
      console.error('LLM analysis failed, falling back to regex:', error)
      const result = textToInfographic(text, config)
      return { ...result, usedLLM: false }
    }
  }

  /**
   * Convert to multi-section infographic
   */
  private async convertMultiSection(
    text: string,
    config: LLMPipelineConfig
  ): Promise<LLMPipelineResult> {
    if (!this.planner) {
      const result = textToInfographic(text, config)
      return { ...result, usedLLM: false }
    }

    try {
      const planResult = await this.planner.plan({
        text,
        intent: config.preferredCategory,
        style: config.style || 'infographic',
        maxSections: config.maxSections || 6,
        language: config.language || 'en'
      })

      if (!planResult.success || !planResult.plan) {
        const result = textToInfographic(text, config)
        return { ...result, usedLLM: true, error: planResult.error }
      }

      // Generate markdown from plan
      const generated = this.generator.generate(planResult.plan)

      // Get first section for single-section compatibility
      const firstSection = planResult.plan.sections[0]
      const template = firstSection ? getTemplateById(firstSection.templateId) : undefined

      return {
        success: true,
        template,
        templateId: firstSection?.templateId,
        data: firstSection?.data ? { items: firstSection.data } : undefined,
        config: {
          theme: planResult.plan.theme,
          palette: planResult.plan.palette,
          width: firstSection?.layout?.width || 800,
          height: firstSection?.layout?.height || 400,
          padding: 16
        },
        analysis: {
          category: firstSection?.type as TemplateCategory || 'kpi',
          confidence: 0.9,
          itemCount: firstSection?.data?.length || 0,
          patterns: []
        },
        markdown: generated.markdown,
        plan: planResult.plan,
        semanticAnalysis: planResult.analysis,
        usedLLM: true
      }
    } catch (error) {
      console.error('LLM planning failed, falling back to regex:', error)
      const result = textToInfographic(text, config)
      return { ...result, usedLLM: false }
    }
  }

  /**
   * Stream multi-section generation
   */
  async *convertStream(text: string, config: LLMPipelineConfig = {}) {
    if (!this.planner || !this.isLLMAvailable()) {
      const result = textToInfographic(text, config)
      yield { type: 'complete' as const, result: { ...result, usedLLM: false } }
      return
    }

    try {
      yield { type: 'start' as const, message: 'Starting analysis...' }

      for await (const progress of this.planner.planStream({
        text,
        intent: config.preferredCategory,
        style: config.style || 'infographic',
        maxSections: config.maxSections || 6,
        language: config.language || 'en'
      })) {
        if (progress.type === 'analysis') {
          yield {
            type: 'analysis' as const,
            progress: progress.progress,
            data: progress.data
          }
        } else if (progress.type === 'planning') {
          yield {
            type: 'planning' as const,
            progress: progress.progress
          }
        } else if (progress.type === 'complete') {
          const plan = progress.data as InfographicPlan
          const generated = this.generator.generate(plan)
          yield {
            type: 'complete' as const,
            result: {
              success: true,
              markdown: generated.markdown,
              plan,
              usedLLM: true
            } as LLMPipelineResult
          }
        }
      }
    } catch (error) {
      const result = textToInfographic(text, config)
      yield { type: 'complete' as const, result: { ...result, usedLLM: false } }
    }
  }

  /**
   * Convert entities to template data
   */
  private entitiesToData(analysis: SemanticAnalysisResult): Record<string, unknown> {
    const items = analysis.entities.map((entity, index) => ({
      id: `item-${index + 1}`,
      label: entity.text,
      value: entity.value || '',
      desc: entity.unit || '',
      type: entity.type
    }))

    return { items }
  }

  /**
   * Generate markdown code block
   */
  private generateMarkdown(
    templateId: string,
    data: Record<string, unknown>,
    config: { theme: string; width: number; height: number }
  ): string {
    const items = (data.items as Array<Record<string, unknown>>) || []
    const dataYaml = items.map(item => {
      const fields = Object.entries(item)
        .filter(([, v]) => v !== undefined && v !== '')
        .map(([k, v]) => `    ${k}: ${typeof v === 'string' ? `"${v}"` : v}`)
        .join('\n')
      return `  -\n${fields}`
    }).join('\n')

    return `\`\`\`infographic
template: ${templateId}
theme: ${config.theme}
width: ${config.width}
height: ${config.height}
data:
${dataYaml}
\`\`\``
  }
}

/**
 * Create LLM pipeline instance
 */
export function createLLMPipeline(provider?: LLMProvider): LLMInfographicPipeline {
  return new LLMInfographicPipeline(provider)
}

/**
 * Quick LLM conversion
 */
export async function llmConvert(
  text: string,
  provider: LLMProvider,
  config: LLMPipelineConfig = {}
): Promise<LLMPipelineResult> {
  const pipeline = new LLMInfographicPipeline(provider)
  return pipeline.convert(text, config)
}

/**
 * Multi-section LLM conversion
 */
export async function llmConvertMultiSection(
  text: string,
  provider: LLMProvider,
  config: Omit<LLMPipelineConfig, 'multiSection'> = {}
): Promise<LLMPipelineResult> {
  const pipeline = new LLMInfographicPipeline(provider)
  return pipeline.convert(text, { ...config, multiSection: true, useLLMPlanning: true })
}
