/**
 * SemanticAnalyzer - LLM-Powered Text Analysis
 *
 * Replaces regex-based TextAnalyzer with semantic understanding via LLM.
 * Provides deeper insight into content structure and visualization needs.
 *
 * @module core/ai/infographic/semantic-analyzer
 */

import type { LLMProvider, ChatMessage } from '../types'
import type { SemanticAnalysisResult, ExtractedEntity, VisualizationSuggestion } from './types'
import type { TemplateCategory } from '@plugins/data-display/infographic/templates'
import { SEMANTIC_ANALYZER_SYSTEM_PROMPT, buildSemanticAnalyzerPrompt } from './prompts'
import { analyzeText as regexAnalyze } from '@plugins/data-display/infographic/ai/text-analyzer'

/**
 * SemanticAnalyzer options
 */
export interface SemanticAnalyzerOptions {
  /** LLM provider to use */
  provider: LLMProvider
  /** Temperature for analysis (lower = more consistent) */
  temperature?: number
  /** Language for analysis */
  language?: 'zh' | 'en'
  /** Fall back to regex if LLM fails */
  fallbackToRegex?: boolean
}

/**
 * SemanticAnalyzer class
 *
 * Uses LLM to deeply understand text content and suggest visualizations.
 */
export class SemanticAnalyzer {
  private provider: LLMProvider
  private temperature: number
  private language: 'zh' | 'en'
  private fallbackToRegex: boolean

  constructor(options: SemanticAnalyzerOptions) {
    this.provider = options.provider
    this.temperature = options.temperature ?? 0.3
    this.language = options.language ?? 'en'
    this.fallbackToRegex = options.fallbackToRegex ?? true
  }

  /**
   * Analyze text using LLM
   */
  async analyze(text: string): Promise<SemanticAnalysisResult> {
    // Check if provider is configured
    if (!this.provider.isConfigured()) {
      if (this.fallbackToRegex) {
        return this.fallbackAnalysis(text)
      }
      throw new Error('LLM provider not configured')
    }

    // Validate input
    if (!text || text.trim().length < 10) {
      throw new Error('Text too short for analysis')
    }

    const messages: ChatMessage[] = [
      { role: 'system', content: SEMANTIC_ANALYZER_SYSTEM_PROMPT },
      { role: 'user', content: buildSemanticAnalyzerPrompt(text, this.language) }
    ]

    try {
      const response = await this.provider.complete(messages, {
        temperature: this.temperature,
        maxTokens: 2000
      })

      const parsed = this.parseResponse(response.content)
      return this.validateAndNormalize(parsed, text)
    } catch (error) {
      console.error('SemanticAnalyzer LLM error:', error)

      if (this.fallbackToRegex) {
        return this.fallbackAnalysis(text)
      }
      throw error
    }
  }

  /**
   * Quick category detection (lightweight)
   */
  async detectCategory(text: string): Promise<TemplateCategory> {
    const result = await this.analyze(text)
    return result.category
  }

  /**
   * Parse LLM response into structured result
   */
  private parseResponse(content: string): Partial<SemanticAnalysisResult> {
    // Clean response - remove markdown code blocks if present
    let cleaned = content.trim()
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    }

    try {
      return JSON.parse(cleaned)
    } catch {
      // Try to extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
      throw new Error('Failed to parse LLM response as JSON')
    }
  }

  /**
   * Validate and normalize parsed result
   */
  private validateAndNormalize(
    parsed: Partial<SemanticAnalysisResult>,
    originalText: string
  ): SemanticAnalysisResult {
    const validCategories: TemplateCategory[] = [
      'kpi', 'ranking', 'flow', 'hierarchy', 'comparison', 'distribution', 'relation', 'statistical'
    ]

    // Validate category
    const category = validCategories.includes(parsed.category as TemplateCategory)
      ? (parsed.category as TemplateCategory)
      : 'kpi'

    // Normalize confidence
    const confidence = typeof parsed.confidence === 'number'
      ? Math.max(0, Math.min(1, parsed.confidence))
      : 0.7

    // Normalize entities
    const entities: ExtractedEntity[] = Array.isArray(parsed.entities)
      ? parsed.entities.map(e => ({
          text: String(e.text || ''),
          type: e.type || 'concept',
          value: e.value,
          unit: e.unit,
          metadata: e.metadata
        }))
      : []

    // Normalize suggestions
    const suggestions: VisualizationSuggestion[] = Array.isArray(parsed.suggestedVisualizations)
      ? parsed.suggestedVisualizations.map(s => ({
          templateId: String(s.templateId || 'list-row-badge-card'),
          reason: String(s.reason || ''),
          score: typeof s.score === 'number' ? s.score : 50,
          dataMapping: s.dataMapping
        }))
      : []

    // Normalize data characteristics
    const dataCharacteristics = {
      hasNumericData: parsed.dataCharacteristics?.hasNumericData ?? false,
      hasTemporalData: parsed.dataCharacteristics?.hasTemporalData ?? false,
      hasHierarchy: parsed.dataCharacteristics?.hasHierarchy ?? false,
      hasComparison: parsed.dataCharacteristics?.hasComparison ?? false,
      hasSequence: parsed.dataCharacteristics?.hasSequence ?? false,
      itemCount: parsed.dataCharacteristics?.itemCount ?? (entities.length || 3)
    }

    return {
      category,
      confidence,
      intent: String(parsed.intent || 'Display information'),
      summary: String(parsed.summary || originalText.substring(0, 100)),
      entities,
      suggestedVisualizations: suggestions,
      dataCharacteristics
    }
  }

  /**
   * Fallback to regex-based analysis
   */
  private fallbackAnalysis(text: string): SemanticAnalysisResult {
    const regexResult = regexAnalyze(text)

    // Convert regex result to semantic format
    const entities: ExtractedEntity[] = regexResult.patterns.map(p => ({
      text: p.text,
      type: 'concept' as const,
      metadata: p.metadata
    }))

    return {
      category: regexResult.primaryCategory === 'unknown' ? 'kpi' : regexResult.primaryCategory,
      confidence: regexResult.primaryConfidence,
      intent: `Display ${regexResult.primaryCategory} information`,
      summary: text.substring(0, 100),
      entities,
      suggestedVisualizations: [
        {
          templateId: this.getCategoryDefaultTemplate(regexResult.primaryCategory),
          reason: 'Based on pattern analysis',
          score: regexResult.primaryConfidence * 100
        }
      ],
      dataCharacteristics: {
        hasNumericData: regexResult.hasNumericData,
        hasTemporalData: regexResult.hasTemporalData,
        hasHierarchy: regexResult.primaryCategory === 'hierarchy',
        hasComparison: regexResult.primaryCategory === 'comparison',
        hasSequence: regexResult.primaryCategory === 'flow',
        itemCount: regexResult.estimatedItemCount
      }
    }
  }

  /**
   * Get default template for category
   */
  private getCategoryDefaultTemplate(category: TemplateCategory | 'unknown'): string {
    const defaults: Record<string, string> = {
      kpi: 'list-row-badge-card',
      ranking: 'list-pyramid-badge-card',
      flow: 'list-row-horizontal-icon-arrow',
      hierarchy: 'hierarchy-tree-org',
      comparison: 'compare-binary-vs',
      distribution: 'list-sector-pie',
      relation: 'relation-network-circular',
      statistical: 'chart-bar-horizontal',
      unknown: 'list-row-badge-card'
    }
    return defaults[category] || defaults.unknown
  }
}

/**
 * Create a semantic analyzer instance
 */
export function createSemanticAnalyzer(options: SemanticAnalyzerOptions): SemanticAnalyzer {
  return new SemanticAnalyzer(options)
}
