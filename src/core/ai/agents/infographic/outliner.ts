/**
 * ArticleOutliner - Phase 1 of the Infographic Pipeline
 *
 * Analyzes articles and extracts their logical structure, key points,
 * concepts, and data points. This is the foundation for all subsequent
 * phases.
 *
 * @module core/ai/agents/infographic/outliner
 */

import type { LLMProvider, ChatMessage } from '../../types'
import type {
  ArticleOutline,
  ArticleType,
  ArticlePoint,
  ArticleConcept,
  ExtractedDataPoint,
  OutlineResult
} from './types'
import { OUTLINER_SYSTEM_PROMPT, buildOutlinerUserPrompt, OUTLINER_EXAMPLES } from './prompts'
import { parseYamlResponse } from './utils'

/**
 * ArticleOutliner configuration
 */
export interface OutlinerConfig {
  /** LLM provider */
  provider: LLMProvider
  /** Temperature (0.2-0.4 recommended for analysis) */
  temperature?: number
  /** Include few-shot examples */
  includeFewShot?: boolean
  /** Enable verbose logging */
  verbose?: boolean
}

/**
 * ArticleOutliner class
 *
 * Phase 1: Understand the article's structure and content.
 */
export class ArticleOutliner {
  private provider: LLMProvider
  private temperature: number
  private includeFewShot: boolean
  private verbose: boolean

  constructor(config: OutlinerConfig) {
    this.provider = config.provider
    this.temperature = config.temperature ?? 0.3
    this.includeFewShot = config.includeFewShot ?? true
    this.verbose = config.verbose ?? false
  }

  /**
   * Update LLM provider
   */
  setProvider(provider: LLMProvider): void {
    this.provider = provider
  }

  /**
   * Check if outliner is ready
   */
  isReady(): boolean {
    return this.provider?.isConfigured() ?? false
  }

  /**
   * Analyze article and extract outline
   */
  async analyze(article: string, language?: 'zh' | 'en'): Promise<OutlineResult> {
    if (!this.isReady()) {
      return { success: false, error: 'LLM provider not configured' }
    }

    // Validate input
    const trimmed = article.trim()
    if (trimmed.length < 50) {
      return { success: false, error: 'Article too short (minimum 50 characters)' }
    }

    if (trimmed.length > 15000) {
      return { success: false, error: 'Article too long (maximum 15000 characters)' }
    }

    // Detect language if not provided
    const detectedLang = language ?? this.detectLanguage(trimmed)

    try {
      // Build messages
      const systemPrompt = this.includeFewShot
        ? `${OUTLINER_SYSTEM_PROMPT}\n\n${OUTLINER_EXAMPLES}`
        : OUTLINER_SYSTEM_PROMPT

      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: buildOutlinerUserPrompt(trimmed, detectedLang) }
      ]

      if (this.verbose) {
        console.log('[ArticleOutliner] Analyzing article, length:', trimmed.length)
      }

      // Call LLM
      const response = await this.provider.complete(messages, {
        temperature: this.temperature,
        maxTokens: 2000
      })

      // Parse response
      const parsed = parseYamlResponse<RawOutline>(response.content)

      if (!parsed) {
        return { success: false, error: 'Failed to parse outline response' }
      }

      // Normalize and validate
      const outline = this.normalizeOutline(parsed, detectedLang)

      if (this.verbose) {
        console.log('[ArticleOutliner] Outline extracted:', {
          theme: outline.theme,
          type: outline.type,
          pointCount: outline.structure.length,
          conceptCount: outline.concepts.length,
          dataPointCount: outline.dataPoints.length
        })
      }

      return { success: true, outline }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error('[ArticleOutliner] Error:', message)
      return { success: false, error: message }
    }
  }

  /**
   * Stream analysis with progress updates
   */
  async *analyzeStream(
    article: string,
    language?: 'zh' | 'en'
  ): AsyncGenerator<{ progress: number; message: string; outline?: ArticleOutline }> {
    yield { progress: 0, message: 'Starting article analysis...' }

    if (!this.isReady()) {
      yield { progress: 100, message: 'Error: LLM provider not configured' }
      return
    }

    const trimmed = article.trim()
    const detectedLang = language ?? this.detectLanguage(trimmed)

    yield { progress: 10, message: 'Analyzing article structure...' }

    try {
      const systemPrompt = this.includeFewShot
        ? `${OUTLINER_SYSTEM_PROMPT}\n\n${OUTLINER_EXAMPLES}`
        : OUTLINER_SYSTEM_PROMPT

      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: buildOutlinerUserPrompt(trimmed, detectedLang) }
      ]

      yield { progress: 20, message: 'Extracting key points...' }

      let fullContent = ''
      for await (const chunk of this.provider.stream(messages, {
        temperature: this.temperature,
        maxTokens: 2000
      })) {
        fullContent += chunk.content
        if (!chunk.done) {
          yield { progress: 20 + Math.min(60, fullContent.length / 50), message: 'Processing...' }
        }
      }

      yield { progress: 85, message: 'Finalizing outline...' }

      const parsed = parseYamlResponse<RawOutline>(fullContent)
      if (!parsed) {
        yield { progress: 100, message: 'Error: Failed to parse response' }
        return
      }

      const outline = this.normalizeOutline(parsed, detectedLang)
      yield { progress: 100, message: 'Complete', outline }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      yield { progress: 100, message: `Error: ${message}` }
    }
  }

  /**
   * Quick analysis without LLM (fallback)
   */
  quickAnalyze(article: string): ArticleOutline {
    const trimmed = article.trim()
    const language = this.detectLanguage(trimmed)

    // Split into paragraphs
    const paragraphs = trimmed.split(/\n\n+/).filter(p => p.trim().length > 20)

    // Extract numbers/percentages
    const numbers = trimmed.match(/\d+\.?\d*%|\$[\d,]+\.?\d*|\d+\.?\d*/g) || []

    // Detect article type based on keywords
    const type = this.detectArticleType(trimmed)

    // Build basic structure
    const structure: ArticlePoint[] = paragraphs.slice(0, 5).map((p, i) => ({
      id: `p${i + 1}`,
      point: p.substring(0, 80) + (p.length > 80 ? '...' : ''),
      support: [],
      importance: i === 0 ? 9 : 7 - i,
      relationToNext: i < paragraphs.length - 1 ? 'follows' as const : undefined
    }))

    // Extract data points
    const dataPoints: ExtractedDataPoint[] = numbers.slice(0, 5).map((n, i) => ({
      label: `Data Point ${i + 1}`,
      value: n,
      sourceQuote: trimmed.substring(
        Math.max(0, trimmed.indexOf(n) - 20),
        Math.min(trimmed.length, trimmed.indexOf(n) + n.length + 20)
      )
    }))

    return {
      theme: paragraphs[0]?.substring(0, 100) || 'Article summary',
      type,
      structure,
      concepts: [],
      dataPoints,
      language,
      confidence: 0.4
    }
  }

  /**
   * Detect article language
   */
  private detectLanguage(text: string): 'zh' | 'en' {
    const chineseChars = text.match(/[\u4e00-\u9fa5]/g)
    const ratio = chineseChars ? chineseChars.length / text.length : 0
    return ratio > 0.1 ? 'zh' : 'en'
  }

  /**
   * Detect article type based on content
   */
  private detectArticleType(text: string): ArticleType {
    // Check for procedural
    if (/step\s*\d|第.步|步骤|流程|how to|tutorial/i.test(text)) {
      return 'procedural'
    }

    // Check for comparative
    if (/\bvs\.?\b|versus|compared to|比较|对比|pros and cons/i.test(text)) {
      return 'comparative'
    }

    // Check for argumentative
    if (/i believe|we should|must|should|argue|因此|所以|认为|观点/i.test(text)) {
      return 'argumentative'
    }

    // Check for narrative
    if (/once upon|story|journey|experience|我们|当时|那天/i.test(text)) {
      return 'narrative'
    }

    // Check for explanatory
    if (/what is|how does|why|是什么|为什么|如何|原理/i.test(text)) {
      return 'explanatory'
    }

    return 'informational'
  }

  /**
   * Normalize raw parsed outline
   */
  private normalizeOutline(raw: RawOutline, language: 'zh' | 'en'): ArticleOutline {
    const validTypes: ArticleType[] = [
      'narrative', 'argumentative', 'explanatory',
      'procedural', 'comparative', 'informational'
    ]

    return {
      theme: raw.theme || 'Article summary',
      type: validTypes.includes(raw.type as ArticleType) ? raw.type as ArticleType : 'informational',
      structure: this.normalizeStructure(raw.structure || []),
      concepts: this.normalizeConcepts(raw.concepts || []),
      dataPoints: this.normalizeDataPoints(raw.dataPoints || []),
      language,
      confidence: typeof raw.confidence === 'number'
        ? Math.max(0, Math.min(1, raw.confidence))
        : 0.7
    }
  }

  /**
   * Normalize structure points
   */
  private normalizeStructure(raw: Partial<ArticlePoint>[]): ArticlePoint[] {
    return raw.map((p, i) => ({
      id: p.id || `p${i + 1}`,
      point: String(p.point || `Point ${i + 1}`),
      support: Array.isArray(p.support) ? p.support.map(String) : [],
      importance: typeof p.importance === 'number' ? Math.max(1, Math.min(10, p.importance)) : 5,
      relationToNext: this.validateRelation(p.relationToNext)
    }))
  }

  /**
   * Validate point relation
   */
  private validateRelation(rel: unknown): ArticlePoint['relationToNext'] {
    const valid = ['leads_to', 'contrasts', 'parallels', 'supports', 'contains', 'follows']
    return valid.includes(String(rel)) ? rel as ArticlePoint['relationToNext'] : undefined
  }

  /**
   * Normalize concepts
   */
  private normalizeConcepts(raw: Partial<ArticleConcept>[]): ArticleConcept[] {
    const validRelationships = ['causes', 'contains', 'contrasts', 'enables', 'exemplifies']

    return raw.map(c => ({
      name: String(c.name || 'Concept'),
      relatesTo: Array.isArray(c.relatesTo) ? c.relatesTo.map(String) : [],
      relationship: validRelationships.includes(String(c.relationship))
        ? c.relationship as ArticleConcept['relationship']
        : 'causes'
    }))
  }

  /**
   * Normalize data points
   */
  private normalizeDataPoints(raw: Partial<ExtractedDataPoint>[]): ExtractedDataPoint[] {
    return raw.map(d => ({
      label: String(d.label || 'Data'),
      value: d.value ?? '',
      unit: d.unit ? String(d.unit) : undefined,
      change: d.change ? String(d.change) : undefined,
      sourceQuote: d.sourceQuote ? String(d.sourceQuote) : undefined
    }))
  }
}

/**
 * Raw outline type from LLM response
 */
interface RawOutline {
  theme?: string
  type?: string
  structure?: Partial<ArticlePoint>[]
  concepts?: Partial<ArticleConcept>[]
  dataPoints?: Partial<ExtractedDataPoint>[]
  confidence?: number
}

/**
 * Create an ArticleOutliner instance
 */
export function createOutliner(config: OutlinerConfig): ArticleOutliner {
  return new ArticleOutliner(config)
}
