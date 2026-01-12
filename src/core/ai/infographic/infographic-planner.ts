/**
 * InfographicPlanner - LLM-Powered Infographic Planning
 *
 * Creates multi-section infographic plans from text content.
 * Similar to ReportPlanner but specialized for infographic generation.
 *
 * @module core/ai/infographic/infographic-planner
 */

import type { LLMProvider, ChatMessage, StreamChunk } from '../types'
import type {
  InfographicPlan,
  InfographicPlanRequest,
  InfographicPlanResult,
  InfographicSection,
  SemanticAnalysisResult
} from './types'
import { getInfographicPlannerSystemPrompt, buildInfographicPlannerPrompt } from './prompts'
import { SemanticAnalyzer } from './semantic-analyzer'
import { getAllTemplates, getTemplateById } from '@plugins/data-display/infographic/templates'

/**
 * InfographicPlanner options
 */
export interface InfographicPlannerOptions {
  /** LLM provider */
  provider: LLMProvider
  /** Temperature for planning (0.3-0.5 recommended) */
  temperature?: number
  /** Enable verbose logging */
  verbose?: boolean
}

/**
 * InfographicPlanner class
 *
 * Generates comprehensive infographic plans from text input.
 */
export class InfographicPlanner {
  private provider: LLMProvider
  private temperature: number
  private verbose: boolean
  private analyzer: SemanticAnalyzer

  constructor(options: InfographicPlannerOptions) {
    this.provider = options.provider
    this.temperature = options.temperature ?? 0.4
    this.verbose = options.verbose ?? false
    this.analyzer = new SemanticAnalyzer({
      provider: options.provider,
      fallbackToRegex: true
    })
  }

  /**
   * Generate an infographic plan
   */
  async plan(request: InfographicPlanRequest): Promise<InfographicPlanResult> {
    if (!this.provider.isConfigured()) {
      return { success: false, error: 'LLM provider not configured' }
    }

    const { text, intent, style = 'infographic', maxSections = 6, language = 'en' } = request

    // Validate input
    if (!text || text.trim().length < 20) {
      return { success: false, error: 'Text too short for infographic generation' }
    }

    if (text.length > 10000) {
      return { success: false, error: 'Text too long (max 10000 characters)' }
    }

    try {
      // First, run semantic analysis
      const analysis = await this.analyzer.analyze(text)

      if (this.verbose) {
        console.log('Semantic analysis:', analysis)
      }

      // Build messages for planning
      const messages: ChatMessage[] = [
        { role: 'system', content: getInfographicPlannerSystemPrompt() },
        { role: 'user', content: buildInfographicPlannerPrompt(text, { intent, style, maxSections, language }) }
      ]

      // Call LLM
      const response = await this.provider.complete(messages, {
        temperature: this.temperature,
        maxTokens: 4000
      })

      // Parse response
      const plan = this.parseResponse(response.content, text, language)

      // Validate plan
      const validatedPlan = this.validatePlan(plan)

      return {
        success: true,
        plan: validatedPlan,
        analysis
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error('InfographicPlanner error:', message)
      return { success: false, error: message }
    }
  }

  /**
   * Generate plan with streaming progress
   */
  async *planStream(request: InfographicPlanRequest): AsyncGenerator<{
    type: 'analysis' | 'planning' | 'complete'
    data?: SemanticAnalysisResult | InfographicPlan | string
    progress?: number
  }> {
    if (!this.provider.isConfigured()) {
      yield { type: 'complete', data: 'LLM provider not configured' }
      return
    }

    const { text, intent, style = 'infographic', maxSections = 6, language = 'en' } = request

    try {
      // Phase 1: Semantic analysis
      yield { type: 'analysis', progress: 10 }
      const analysis = await this.analyzer.analyze(text)
      yield { type: 'analysis', data: analysis, progress: 30 }

      // Phase 2: Planning
      yield { type: 'planning', progress: 40 }

      const messages: ChatMessage[] = [
        { role: 'system', content: getInfographicPlannerSystemPrompt() },
        { role: 'user', content: buildInfographicPlannerPrompt(text, { intent, style, maxSections, language }) }
      ]

      // Stream the response
      let fullContent = ''
      for await (const chunk of this.provider.stream(messages, {
        temperature: this.temperature,
        maxTokens: 4000
      })) {
        fullContent += chunk.content
        yield { type: 'planning', progress: 40 + (chunk.done ? 50 : 30) }
      }

      // Parse and validate
      const plan = this.parseResponse(fullContent, text, language)
      const validatedPlan = this.validatePlan(plan)

      yield { type: 'complete', data: validatedPlan, progress: 100 }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      yield { type: 'complete', data: message }
    }
  }

  /**
   * Quick plan for simple content (fewer LLM calls)
   */
  async quickPlan(text: string, language: 'zh' | 'en' = 'en'): Promise<InfographicPlanResult> {
    return this.plan({
      text,
      style: 'minimal',
      maxSections: 3,
      language
    })
  }

  /**
   * Parse LLM response into plan
   */
  private parseResponse(content: string, sourceText: string, language: 'zh' | 'en'): InfographicPlan {
    // Clean response
    let cleaned = content.trim()
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    }

    let parsed: Partial<InfographicPlan>
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      // Try to extract JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('Failed to parse plan response')
      }
    }

    // Build plan with defaults
    return {
      title: parsed.title || (language === 'zh' ? '信息图表' : 'Infographic'),
      theme: parsed.theme || 'dark-vibrant',
      palette: parsed.palette || 'vibrant',
      sections: this.normalizeSections(parsed.sections || []),
      layout: {
        columns: parsed.layout?.columns || 1,
        gap: parsed.layout?.gap || 20,
        maxWidth: parsed.layout?.maxWidth || 1200
      },
      metadata: {
        sourceLength: sourceText.length,
        generatedAt: new Date().toISOString(),
        model: this.provider.name
      }
    }
  }

  /**
   * Normalize sections array
   */
  private normalizeSections(sections: Partial<InfographicSection>[]): InfographicSection[] {
    return sections.map((s, index) => ({
      id: s.id || `section-${index + 1}`,
      title: s.title || `Section ${index + 1}`,
      type: s.type || 'chart',
      templateId: s.templateId || 'list-row-badge-card',
      data: Array.isArray(s.data) ? s.data : [],
      layout: {
        width: s.layout?.width || 800,
        height: s.layout?.height || 400,
        position: s.layout?.position || 'full'
      },
      order: s.order ?? index + 1
    }))
  }

  /**
   * Validate plan against available templates
   */
  private validatePlan(plan: InfographicPlan): InfographicPlan {
    const allTemplates = getAllTemplates()
    const validTemplateIds = new Set(allTemplates.map(t => t.id))

    // Validate each section's template
    const validatedSections = plan.sections.map(section => {
      if (!validTemplateIds.has(section.templateId)) {
        // Find a suitable replacement
        const template = this.findSuitableTemplate(section)
        return { ...section, templateId: template }
      }

      // Validate data fields
      const template = getTemplateById(section.templateId)
      if (template) {
        const validatedData = this.validateSectionData(section.data, template.requiredFields)
        return { ...section, data: validatedData }
      }

      return section
    })

    return { ...plan, sections: validatedSections }
  }

  /**
   * Find suitable template for section type
   */
  private findSuitableTemplate(section: InfographicSection): string {
    const typeDefaults: Record<string, string> = {
      kpi: 'list-row-badge-card',
      chart: 'chart-bar-horizontal',
      flow: 'list-row-horizontal-icon-arrow',
      comparison: 'compare-binary-vs',
      hierarchy: 'hierarchy-tree-org',
      text: 'list-row-badge-card'
    }
    return typeDefaults[section.type] || 'list-row-badge-card'
  }

  /**
   * Validate and normalize section data
   */
  private validateSectionData(
    data: Record<string, unknown>[],
    requiredFields: string[]
  ): Record<string, unknown>[] {
    return data.map(item => {
      const normalized: Record<string, unknown> = {}

      // Ensure required fields exist
      for (const field of requiredFields) {
        if (field in item) {
          normalized[field] = item[field]
        } else if (field === 'label' && 'name' in item) {
          normalized.label = item.name
        } else if (field === 'value' && 'count' in item) {
          normalized.value = item.count
        } else {
          normalized[field] = field === 'value' ? 0 : ''
        }
      }

      // Copy optional fields
      for (const [key, value] of Object.entries(item)) {
        if (!(key in normalized)) {
          normalized[key] = value
        }
      }

      return normalized
    })
  }

  /**
   * Suggest a default plan based on analysis (no LLM)
   */
  suggestDefaultPlan(analysis: SemanticAnalysisResult, text: string): InfographicPlan {
    const sections: InfographicSection[] = []

    // Add KPI section if numeric data exists
    if (analysis.dataCharacteristics.hasNumericData) {
      const metrics = analysis.entities.filter(e => e.type === 'metric')
      if (metrics.length > 0) {
        sections.push({
          id: 'kpi-section',
          title: 'Key Metrics',
          type: 'kpi',
          templateId: metrics.length <= 4 ? 'list-row-badge-card' : 'list-grid-badge-card',
          data: metrics.map(m => ({
            label: m.text,
            value: m.value || 0,
            unit: m.unit
          })),
          order: 1
        })
      }
    }

    // Add main content section based on category
    const mainTemplate = analysis.suggestedVisualizations[0]?.templateId || 'list-row-badge-card'
    sections.push({
      id: 'main-section',
      title: analysis.intent,
      type: analysis.category as InfographicSection['type'],
      templateId: mainTemplate,
      data: analysis.entities.map(e => ({
        label: e.text,
        value: e.value,
        desc: e.unit
      })),
      order: sections.length + 1
    })

    return {
      title: analysis.summary.substring(0, 50),
      theme: 'dark-vibrant',
      palette: 'vibrant',
      sections,
      layout: { columns: 1, gap: 20, maxWidth: 1200 },
      metadata: {
        sourceLength: text.length,
        generatedAt: new Date().toISOString(),
        model: 'fallback'
      }
    }
  }
}

/**
 * Create an infographic planner instance
 */
export function createInfographicPlanner(options: InfographicPlannerOptions): InfographicPlanner {
  return new InfographicPlanner(options)
}
