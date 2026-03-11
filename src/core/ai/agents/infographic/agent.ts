/**
 * InfographicAgent - Unified Article → Infographic Pipeline
 *
 * Three-phase pipeline for converting articles to infographics:
 * 1. ArticleOutliner: Understand article structure
 * 2. NarrativePlanner: Plan visual narrative
 * 3. InfographicGenerator: Generate final output
 *
 * @module core/ai/agents/infographic/agent
 */

import type { LLMProvider } from '../../types'
import type { AgentConfig, AgentPhase } from '../shared/types'
import type {
  InfographicInput,
  InfographicOutput,
  InfographicResult,
  ArticleOutline,
  NarrativePlan,
  InfographicStyle,
  InfographicVariant,
  MultiVariantResult,
  InfographicAgentConfig,
  InfographicProgress
} from './types'
import { ArticleOutliner } from './outliner'
import { NarrativePlanner } from './narrative'
import { InfographicGenerator } from './generator'
import { streamPipeline, streamVariants } from './agent-stream'

export type { InfographicAgentConfig, InfographicProgress }

/**
 * InfographicAgent class
 *
 * Unified interface for the three-phase Article → Infographic pipeline.
 */
export class InfographicAgent {
  readonly name = 'infographic'
  readonly version = '2.0.0'

  private config: AgentConfig
  readonly outliner: ArticleOutliner
  readonly narrativePlanner: NarrativePlanner
  readonly generator: InfographicGenerator
  private verbose: boolean

  constructor(config: InfographicAgentConfig) {
    this.config = {
      provider: config.provider,
      temperature: 0.4,
      verbose: config.verbose
    }
    this.verbose = config.verbose ?? false

    this.outliner = new ArticleOutliner({
      provider: config.provider,
      temperature: config.temperatures?.outliner ?? 0.3,
      includeFewShot: config.includeFewShot ?? true,
      verbose: config.verbose
    })

    this.narrativePlanner = new NarrativePlanner({
      provider: config.provider,
      temperature: config.temperatures?.narrative ?? 0.5,
      includeFewShot: config.includeFewShot ?? true,
      verbose: config.verbose
    })

    this.generator = new InfographicGenerator({
      provider: config.provider,
      temperature: config.temperatures?.generator ?? 0.4,
      useLLM: config.useLLMGenerator ?? false,
      verbose: config.verbose
    })
  }

  getPhases(): AgentPhase[] {
    return [
      { name: 'outlining', description: 'Analyzing article structure and extracting key points', progress: 0 },
      { name: 'planning', description: 'Planning visual narrative and selecting visualizations', progress: 33 },
      { name: 'generating', description: 'Generating final infographic specification', progress: 66 }
    ]
  }

  getConfig(): AgentConfig { return this.config }

  setProvider(provider: LLMProvider): void {
    this.config.provider = provider
    this.outliner.setProvider(provider)
    this.narrativePlanner.setProvider(provider)
    this.generator.setProvider(provider)
  }

  isReady(): boolean { return this.outliner.isReady() }

  async execute(input: InfographicInput): Promise<InfographicOutput> {
    const result = await this.run(input)
    if (!result.success || !result.infographic) {
      throw new Error(result.error || 'Failed to generate infographic')
    }
    return result.infographic
  }

  async run(input: InfographicInput): Promise<InfographicResult> {
    const startTime = Date.now()

    if (!this.isReady()) {
      return { success: false, error: 'Agent not ready: LLM provider not configured' }
    }

    const { article, style = 'detailed', language, maxSections } = input
    const detectedLanguage = language ?? this.detectLanguage(article)

    try {
      if (this.verbose) console.log('[InfographicAgent] Phase 1: Outlining...')
      const outlineResult = await this.outliner.analyze(article, detectedLanguage)
      if (!outlineResult.success || !outlineResult.outline) {
        return { success: false, error: outlineResult.error || 'Failed to analyze article' }
      }

      if (this.verbose) console.log('[InfographicAgent] Phase 2: Planning narrative...')
      const narrativeResult = await this.narrativePlanner.plan(outlineResult.outline, style)
      if (!narrativeResult.success || !narrativeResult.plan) {
        return { success: false, error: narrativeResult.error || 'Failed to plan narrative' }
      }

      if (maxSections && narrativeResult.plan.sections.length > maxSections) {
        narrativeResult.plan.sections = narrativeResult.plan.sections.slice(0, maxSections)
      }

      if (this.verbose) console.log('[InfographicAgent] Phase 3: Generating...')
      const generateResult = await this.generator.generate(narrativeResult.plan, detectedLanguage)
      if (!generateResult.success || !generateResult.infographic) {
        return { success: false, error: generateResult.error || 'Failed to generate infographic' }
      }

      generateResult.infographic.metadata.articleLength = article.length
      if (this.verbose) console.log('[InfographicAgent] Complete in', Date.now() - startTime, 'ms')

      return {
        success: true,
        infographic: generateResult.infographic,
        debug: { outline: outlineResult.outline, narrativePlan: narrativeResult.plan }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error('[InfographicAgent] Error:', message)
      return { success: false, error: message }
    }
  }

  async executePhase<T>(phaseName: string, input: unknown): Promise<T> {
    switch (phaseName) {
      case 'outlining': {
        const outlineResult = await this.outliner.analyze(
          (input as { article: string }).article,
          (input as { language?: 'zh' | 'en' }).language
        )
        return outlineResult as T
      }
      case 'planning': {
        const planResult = await this.narrativePlanner.plan(input as ArticleOutline, 'detailed')
        return planResult as T
      }
      case 'generating': {
        const genResult = await this.generator.generate(input as NarrativePlan, 'en')
        return genResult as T
      }
      default:
        throw new Error(`Unknown phase: ${phaseName}`)
    }
  }

  quickGenerate(article: string, style: InfographicStyle = 'minimal'): InfographicOutput {
    const language = this.detectLanguage(article)
    const outline = this.outliner.quickAnalyze(article)
    const plan = this.narrativePlanner.createFallbackPlan(outline, style)
    const infographic = this.generator.generateRuleBased(plan, language)
    infographic.metadata.articleLength = article.length
    return infographic
  }

  async runWithVariants(input: InfographicInput): Promise<MultiVariantResult> {
    const startTime = Date.now()
    if (!this.isReady()) {
      return { success: false, error: 'Agent not ready: LLM provider not configured' }
    }
    const { article, language } = input
    const detectedLanguage = language ?? this.detectLanguage(article)

    try {
      if (this.verbose) console.log('[InfographicAgent] Generating outline for variants...')
      const outlineResult = await this.outliner.analyze(article, detectedLanguage)
      if (!outlineResult.success || !outlineResult.outline) {
        return { success: false, error: outlineResult.error || 'Failed to analyze article' }
      }

      if (this.verbose) console.log('[InfographicAgent] Generating 3 style variants...')
      const variantResult = this.generator.generateVariants(outlineResult.outline, detectedLanguage)
      if (!variantResult.success) return variantResult

      for (const variant of variantResult.variants || []) {
        variant.infographic.metadata.articleLength = article.length
      }

      if (this.verbose) console.log('[InfographicAgent] Variants complete in', Date.now() - startTime, 'ms')
      return variantResult
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error('[InfographicAgent] Variant generation error:', message)
      return { success: false, error: message }
    }
  }

  quickGenerateVariants(article: string): MultiVariantResult {
    const language = this.detectLanguage(article)
    try {
      const outline = this.outliner.quickAnalyze(article)
      const result = this.generator.generateVariants(outline, language)
      for (const variant of result.variants || []) {
        variant.infographic.metadata.articleLength = article.length
      }
      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return { success: false, error: message }
    }
  }

  async *stream(
    input: InfographicInput
  ): AsyncGenerator<InfographicProgress, void, unknown> {
    yield* streamPipeline(this.outliner, this.narrativePlanner, this.generator, input, this.detectLanguage.bind(this))
  }

  async *streamWithVariants(
    input: InfographicInput
  ): AsyncGenerator<InfographicProgress & { variants?: InfographicVariant[] }, void, unknown> {
    yield* streamVariants(this.outliner, this.generator, input, this.detectLanguage.bind(this))
  }

  private detectLanguage(text: string): 'zh' | 'en' {
    const chineseChars = text.match(/[\u4e00-\u9fa5]/g)
    const ratio = chineseChars ? chineseChars.length / text.length : 0
    return ratio > 0.1 ? 'zh' : 'en'
  }
}
