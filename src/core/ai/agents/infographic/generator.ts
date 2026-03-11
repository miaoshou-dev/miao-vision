/**
 * InfographicGenerator - Phase 3 of the Infographic Pipeline
 *
 * Transforms narrative plans into final infographic specifications.
 * Maps visual types to concrete templates and formats data.
 *
 * @module core/ai/agents/infographic/generator
 */

import type { LLMProvider, ChatMessage } from '../../types'
import type {
  NarrativePlan,
  NarrativeSection,
  InfographicOutput,
  InfographicSection,
  InfographicItem,
  InfographicResult,
  FlowDirection,
  ArticleOutline,
  InfographicVariant,
  MultiVariantResult
} from './types'
import { generateStyleVariants } from './variants'
import { buildGeneratorSystemPrompt, buildGeneratorUserPrompt } from './prompts'
import { generateMarkdown, generateInfographicBlock, type RawInfographicOutput } from './generator-markdown'
import {
  parseYamlResponse,
  generateId,
  getTemplateForVisualType,
  getAvailableTemplateIds,
  selectIconForLabel,
  truncate
} from './utils'

/**
 * InfographicGenerator configuration
 */
export interface GeneratorConfig {
  /** LLM provider (optional - can work without it) */
  provider?: LLMProvider
  /** Temperature (0.3-0.5 recommended for formatting) */
  temperature?: number
  /** Use LLM for generation (vs rule-based) */
  useLLM?: boolean
  /** Enable verbose logging */
  verbose?: boolean
}

/**
 * InfographicGenerator class
 *
 * Phase 3: Generate final infographic specification.
 */
export class InfographicGenerator {
  private provider?: LLMProvider
  private temperature: number
  private useLLM: boolean
  private verbose: boolean
  private availableTemplates: string[]

  constructor(config: GeneratorConfig = {}) {
    this.provider = config.provider
    this.temperature = config.temperature ?? 0.4
    this.useLLM = config.useLLM ?? false
    this.verbose = config.verbose ?? false
    this.availableTemplates = getAvailableTemplateIds()
  }

  /**
   * Update LLM provider
   */
  setProvider(provider: LLMProvider): void {
    this.provider = provider
  }

  /**
   * Check if generator can use LLM
   */
  canUseLLM(): boolean {
    return !!this.provider?.isConfigured()
  }

  /**
   * Generate infographic from narrative plan
   */
  async generate(
    plan: NarrativePlan,
    language: 'zh' | 'en' = 'en'
  ): Promise<InfographicResult> {
    try {
      // Try LLM-based generation if available and enabled
      if (this.useLLM && this.canUseLLM()) {
        const result = await this.generateWithLLM(plan, language)
        if (result.success) {
          return result
        }
        // Fallback to rule-based if LLM fails
        if (this.verbose) {
          console.log('[InfographicGenerator] LLM failed, using rule-based generation')
        }
      }

      // Rule-based generation
      const infographic = this.generateRuleBased(plan, language)
      return { success: true, infographic }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error('[InfographicGenerator] Error:', message)
      return { success: false, error: message }
    }
  }

  /**
   * Generate using LLM
   */
  private async generateWithLLM(
    plan: NarrativePlan,
    language: 'zh' | 'en'
  ): Promise<InfographicResult> {
    if (!this.provider) {
      return { success: false, error: 'No LLM provider' }
    }

    try {
      const messages: ChatMessage[] = [
        { role: 'system', content: buildGeneratorSystemPrompt(this.availableTemplates) },
        { role: 'user', content: buildGeneratorUserPrompt(plan, language) }
      ]

      const response = await this.provider.complete(messages, {
        temperature: this.temperature,
        maxTokens: 4000
      })

      const parsed = parseYamlResponse<RawInfographicOutput>(response.content)

      if (!parsed) {
        return { success: false, error: 'Failed to parse generator response' }
      }

      const infographic = this.normalizeOutput(parsed, plan, language)
      return { success: true, infographic }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return { success: false, error: message }
    }
  }

  /**
   * Rule-based generation (no LLM required)
   */
  generateRuleBased(plan: NarrativePlan, language: 'zh' | 'en'): InfographicOutput {
    const sections: InfographicSection[] = plan.sections.map((section, index) => {
      return this.convertSection(section, plan, index)
    })

    // Generate markdown representation
    const markdown = generateMarkdown(plan, sections)

    return {
      title: plan.title,
      theme: plan.theme,
      palette: plan.palette,
      layout: {
        direction: plan.flowDirection,
        maxWidth: 1200,
        gap: 24
      },
      sections,
      markdown,
      sourceSummary: plan.title,
      metadata: {
        generatedAt: new Date().toISOString(),
        articleLength: 0, // Not available at this stage
        sectionCount: sections.length,
        language
      }
    }
  }

  /**
   * Public method to generate from a NarrativePlan
   * Used by style variant system
   */
  generateFromPlan(plan: NarrativePlan, language: 'zh' | 'en' = 'en'): InfographicOutput {
    return this.generateRuleBased(plan, language)
  }

  /**
   * Generate multiple style variants from an article outline
   *
   * Returns 3 variants: Executive, Storytelling, Analytical
   * Each with different narrative logic and visual emphasis
   */
  generateVariants(
    outline: ArticleOutline,
    language: 'zh' | 'en' = 'en'
  ): MultiVariantResult {
    try {
      const variants = generateStyleVariants(
        outline,
        { generateFromPlan: (plan, lang) => this.generateFromPlan(plan, lang) },
        language
      )

      if (this.verbose) {
        console.log('[InfographicGenerator] Generated variants:', variants.map(v => v.id))
      }

      return { success: true, variants, outline }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error('[InfographicGenerator] Variant generation failed:', message)
      return { success: false, error: message }
    }
  }

  /**
   * Convert a narrative section to infographic section
   */
  private convertSection(
    section: NarrativeSection,
    plan: NarrativePlan,
    index: number
  ): InfographicSection {
    const templateId = getTemplateForVisualType(section.visualType, this.availableTemplates)
    const items = this.convertElements(section, templateId)

    const result: InfographicSection = {
      id: section.id || generateId('sec'),
      templateId,
      heading: {
        title: truncate(section.title, 40),
        subtitle: section.role === 'hook' ? undefined : truncate(section.message, 60)
      },
      items,
      layout: {
        position: this.getPosition(section.role, index, plan.sections.length)
      }
    }

    // Add insight for main content sections
    if (section.role !== 'hook' && section.message && section.message !== section.title) {
      result.insight = {
        text: truncate(section.message, 100)
      }
    }

    return result
  }

  /**
   * Convert narrative elements to infographic items
   */
  private convertElements(section: NarrativeSection, templateId: string): InfographicItem[] {
    // Handle special templates
    if (templateId === 'compare-binary-vs') {
      return this.convertToCompareItems(section)
    }

    if (templateId.includes('hierarchy') || templateId.includes('mind-map')) {
      return this.convertToHierarchyItems(section)
    }

    // Standard conversion
    return section.elements.map((el) => {
      const item: InfographicItem = {
        label: truncate(el.label, 30)
      }

      if (el.value !== undefined) {
        item.value = el.value
      }

      if (el.description) {
        item.desc = truncate(el.description, 50)
      }

      // Auto-select icon
      const icon = el.iconHint || selectIconForLabel(el.label)
      if (icon) {
        item.icon = icon
      }

      // Detect trend from value
      if (typeof el.value === 'string') {
        if (el.value.startsWith('+') || el.value.includes('increase') || el.value.includes('增')) {
          item.trend = 'up'
        } else if (el.value.startsWith('-') || el.value.includes('decrease') || el.value.includes('减')) {
          item.trend = 'down'
        }
      }

      return item
    })
  }

  /**
   * Convert to compare-binary-vs format
   */
  private convertToCompareItems(section: NarrativeSection): InfographicItem[] {
    const elements = section.elements

    // If already has 2 groups, use them
    if (elements.length === 2 && elements[0].label && elements[1].label) {
      return [
        {
          label: elements[0].label,
          items: elements[0].description
            ? [elements[0].description]
            : elements.slice(0, Math.ceil(elements.length / 2)).map(e => e.label)
        } as unknown as InfographicItem,
        {
          label: elements[1].label,
          items: elements[1].description
            ? [elements[1].description]
            : elements.slice(Math.ceil(elements.length / 2)).map(e => e.label)
        } as unknown as InfographicItem
      ]
    }

    // Split elements into two groups
    const mid = Math.ceil(elements.length / 2)
    const leftItems = elements.slice(0, mid).map(e => e.label)
    const rightItems = elements.slice(mid).map(e => e.label)

    return [
      { label: 'Option A', items: leftItems } as unknown as InfographicItem,
      { label: 'Option B', items: rightItems } as unknown as InfographicItem
    ]
  }

  /**
   * Convert to hierarchy format
   */
  private convertToHierarchyItems(section: NarrativeSection): InfographicItem[] {
    // Create a root with children
    const root: InfographicItem = {
      id: 'root',
      label: section.title,
      children: section.elements.map((el, i) => ({
        id: `child-${i}`,
        label: el.label,
        desc: el.description
      }))
    } as unknown as InfographicItem

    return [root]
  }

  /**
   * Get layout position based on role
   */
  private getPosition(
    role: string,
    index: number,
    total: number
  ): 'full' | 'half' | 'third' {
    if (role === 'hook') return 'full'
    if (role === 'conclusion') return 'full'
    if (total <= 3) return 'full'
    if (role === 'evidence') return 'half'
    return index % 2 === 0 ? 'half' : 'half'
  }

  /**
   * Normalize LLM output
   */
  private normalizeOutput(
    raw: RawInfographicOutput,
    plan: NarrativePlan,
    language: 'zh' | 'en'
  ): InfographicOutput {
    const normalizedSections = this.normalizeSections(raw.sections || [])
    const validDirections: FlowDirection[] = ['top_to_bottom', 'left_to_right', 'radial']
    const direction = validDirections.includes(raw.layout?.direction as FlowDirection)
      ? raw.layout!.direction as FlowDirection
      : plan.flowDirection

    return {
      title: raw.title || plan.title,
      theme: raw.theme || plan.theme,
      palette: raw.palette || plan.palette,
      layout: {
        direction,
        maxWidth: raw.layout?.maxWidth || 1200,
        gap: raw.layout?.gap || 24
      },
      sections: normalizedSections,
      markdown: generateMarkdown(plan, normalizedSections),
      sourceSummary: raw.sourceSummary || plan.title,
      metadata: {
        generatedAt: new Date().toISOString(),
        articleLength: 0,
        sectionCount: normalizedSections.length,
        language
      }
    }
  }

  /**
   * Normalize sections from LLM
   */
  private normalizeSections(raw: Partial<InfographicSection>[]): InfographicSection[] {
    return raw.map((s, i) => ({
      id: s.id || generateId('sec'),
      templateId: s.templateId && this.availableTemplates.includes(s.templateId)
        ? s.templateId
        : 'list-row-badge-card',
      heading: s.heading ? {
        title: s.heading.title || `Section ${i + 1}`,
        subtitle: s.heading.subtitle
      } : undefined,
      insight: s.insight,
      items: this.normalizeItems(s.items || []),
      footnote: s.footnote,
      layout: s.layout
    }))
  }

  /**
   * Normalize items
   */
  private normalizeItems(raw: Partial<InfographicItem>[]): InfographicItem[] {
    return raw.map(item => ({
      label: String(item.label || 'Item'),
      value: item.value,
      desc: item.desc,
      icon: item.icon,
      trend: item.trend,
      color: item.color,
      ...item
    }))
  }
}

/**
 * Create an InfographicGenerator instance
 */
export function createGenerator(config?: GeneratorConfig): InfographicGenerator {
  return new InfographicGenerator(config)
}
