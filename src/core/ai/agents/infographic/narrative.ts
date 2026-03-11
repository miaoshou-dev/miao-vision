/**
 * NarrativePlanner - Phase 2 of the Infographic Pipeline
 *
 * Transforms article outlines into visual narrative plans.
 * Decides how to tell the story through visuals.
 *
 * @module core/ai/agents/infographic/narrative
 */

import type { LLMProvider, ChatMessage } from '../../types'
import type {
  ArticleOutline,
  NarrativePlan,
  NarrativeSection,
  NarrativeElement,
  NarrativeResult,
  InfographicStyle,
  VisualMetaphor,
  VisualType,
  SectionRole,
  FlowDirection
} from './types'
import { buildNarrativePlannerSystemPrompt, buildNarrativePlannerUserPrompt, NARRATIVE_EXAMPLES } from './prompts'
import { parseYamlResponse, generateId } from './utils'

/**
 * NarrativePlanner configuration
 */
export interface NarrativePlannerConfig {
  /** LLM provider */
  provider: LLMProvider
  /** Temperature (0.4-0.6 recommended for creativity with structure) */
  temperature?: number
  /** Include few-shot examples */
  includeFewShot?: boolean
  /** Enable verbose logging */
  verbose?: boolean
}

/**
 * NarrativePlanner class
 *
 * Phase 2: Plan the visual narrative.
 */
export class NarrativePlanner {
  private provider: LLMProvider
  private temperature: number
  private includeFewShot: boolean
  private verbose: boolean

  constructor(config: NarrativePlannerConfig) {
    this.provider = config.provider
    this.temperature = config.temperature ?? 0.5
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
   * Check if planner is ready
   */
  isReady(): boolean {
    return this.provider?.isConfigured() ?? false
  }

  /**
   * Plan visual narrative from article outline
   */
  async plan(
    outline: ArticleOutline,
    style: InfographicStyle = 'detailed'
  ): Promise<NarrativeResult> {
    if (!this.isReady()) {
      return { success: false, error: 'LLM provider not configured' }
    }

    // Validate outline
    if (!outline.structure || outline.structure.length === 0) {
      return { success: false, error: 'Outline has no structure points' }
    }

    try {
      // Build messages
      const systemPrompt = this.includeFewShot
        ? `${buildNarrativePlannerSystemPrompt()}\n\n${NARRATIVE_EXAMPLES}`
        : buildNarrativePlannerSystemPrompt()

      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: buildNarrativePlannerUserPrompt(outline, style) }
      ]

      if (this.verbose) {
        console.log('[NarrativePlanner] Planning narrative for:', outline.theme)
      }

      // Call LLM
      const response = await this.provider.complete(messages, {
        temperature: this.temperature,
        maxTokens: 3000
      })

      // Parse response
      const parsed = parseYamlResponse<RawNarrativePlan>(response.content)

      if (!parsed) {
        // Fallback to rule-based planning
        if (this.verbose) {
          console.log('[NarrativePlanner] LLM parse failed, using fallback')
        }
        return { success: true, plan: this.createFallbackPlan(outline, style) }
      }

      // Normalize and validate
      const plan = this.normalizePlan(parsed, outline)

      if (this.verbose) {
        console.log('[NarrativePlanner] Plan created:', {
          title: plan.title,
          metaphor: plan.visualMetaphor,
          sectionCount: plan.sections.length
        })
      }

      return { success: true, plan }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error('[NarrativePlanner] Error:', message)

      // Return fallback plan instead of failing
      return { success: true, plan: this.createFallbackPlan(outline, style) }
    }
  }

  /**
   * Stream planning with progress updates
   */
  async *planStream(
    outline: ArticleOutline,
    style: InfographicStyle = 'detailed'
  ): AsyncGenerator<{ progress: number; message: string; plan?: NarrativePlan }> {
    yield { progress: 0, message: 'Starting narrative planning...' }

    if (!this.isReady()) {
      yield { progress: 100, message: 'Error: LLM provider not configured' }
      return
    }

    yield { progress: 10, message: 'Analyzing content structure...' }

    try {
      const systemPrompt = this.includeFewShot
        ? `${buildNarrativePlannerSystemPrompt()}\n\n${NARRATIVE_EXAMPLES}`
        : buildNarrativePlannerSystemPrompt()

      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: buildNarrativePlannerUserPrompt(outline, style) }
      ]

      yield { progress: 20, message: 'Selecting visual metaphor...' }

      let fullContent = ''
      for await (const chunk of this.provider.stream(messages, {
        temperature: this.temperature,
        maxTokens: 3000
      })) {
        fullContent += chunk.content
        if (!chunk.done) {
          yield { progress: 20 + Math.min(60, fullContent.length / 60), message: 'Designing sections...' }
        }
      }

      yield { progress: 85, message: 'Finalizing narrative plan...' }

      const parsed = parseYamlResponse<RawNarrativePlan>(fullContent)
      const plan = parsed
        ? this.normalizePlan(parsed, outline)
        : this.createFallbackPlan(outline, style)

      yield { progress: 100, message: 'Complete', plan }
    } catch {
      yield { progress: 90, message: 'Using fallback plan...' }
      const plan = this.createFallbackPlan(outline, style)
      yield { progress: 100, message: 'Complete', plan }
    }
  }

  /**
   * Create a fallback plan using rules
   */
  createFallbackPlan(outline: ArticleOutline, style: InfographicStyle): NarrativePlan {
    const metaphor = this.selectMetaphor(outline)
    const sections: NarrativeSection[] = []

    // Hook section with theme
    sections.push({
      id: generateId('s'),
      role: 'hook',
      title: outline.theme.substring(0, 50),
      message: outline.theme,
      visualType: 'icon-statement',
      visualPurpose: 'Establish the main topic',
      elements: [{ label: outline.theme }],
      sourcePointIds: []
    })

    // Add sections based on style
    const maxSections = style === 'minimal' ? 2 : style === 'detailed' ? 5 : 4

    // Process structure points
    for (let i = 0; i < Math.min(outline.structure.length, maxSections); i++) {
      const point = outline.structure[i]
      const visualType = this.selectVisualType(point, outline, i)

      const elements: NarrativeElement[] = point.support.length > 0
        ? point.support.map(s => ({ label: s }))
        : [{ label: point.point }]

      sections.push({
        id: generateId('s'),
        role: i === 0 ? 'main_point' : i === outline.structure.length - 1 ? 'conclusion' : 'main_point',
        title: point.point.substring(0, 40),
        message: point.point,
        visualType,
        visualPurpose: `Present ${point.point.substring(0, 30)}`,
        elements,
        sourcePointIds: [point.id]
      })
    }

    // Add KPI section if data points exist
    if (outline.dataPoints.length > 0 && sections.length < maxSections + 1) {
      sections.splice(1, 0, {
        id: generateId('s'),
        role: 'evidence',
        title: outline.language === 'zh' ? '关键数据' : 'Key Metrics',
        message: 'Important numbers from the analysis',
        visualType: 'kpi-cards',
        visualPurpose: 'Highlight quantitative data',
        elements: outline.dataPoints.slice(0, 4).map(d => ({
          label: d.label,
          value: String(d.value),
          description: d.unit
        })),
        sourcePointIds: []
      })
    }

    return {
      title: outline.theme.substring(0, 60),
      visualMetaphor: metaphor,
      flowDirection: 'top_to_bottom',
      sections,
      palette: this.selectPalette(outline),
      theme: 'dark-vibrant'
    }
  }

  /**
   * Select visual metaphor based on article type
   */
  private selectMetaphor(outline: ArticleOutline): VisualMetaphor {
    const typeToMetaphor: Record<string, VisualMetaphor> = {
      narrative: 'journey',
      argumentative: 'pyramid',
      explanatory: 'tree',
      procedural: 'journey',
      comparative: 'balance',
      informational: 'stack'
    }
    return typeToMetaphor[outline.type] || 'stack'
  }

  /**
   * Select visual type for a point
   */
  private selectVisualType(
    point: { point: string; support: string[]; relationToNext?: string },
    outline: ArticleOutline,
    _index: number
  ): VisualType {
    const lower = point.point.toLowerCase()

    // Check for process/step keywords
    if (/step|stage|phase|process|流程|步骤|阶段/.test(lower)) {
      return 'flow-linear'
    }

    // Check for comparison
    if (/vs|versus|compare|对比|比较/.test(lower) || point.relationToNext === 'contrasts') {
      return 'compare-binary'
    }

    // Check for hierarchy
    if (/level|tier|layer|层级|层次/.test(lower)) {
      return 'hierarchy-pyramid'
    }

    // Check for cycle
    if (/cycle|loop|repeat|循环|周期/.test(lower)) {
      return 'flow-cycle'
    }

    // Use based on support count
    if (point.support.length >= 4) {
      return 'list-grid'
    }
    if (point.support.length >= 2) {
      return 'list-horizontal'
    }

    // Default based on outline type
    const typeDefaults: Record<string, VisualType> = {
      procedural: 'flow-linear',
      comparative: 'compare-binary',
      argumentative: 'list-vertical',
      narrative: 'list-horizontal',
      explanatory: 'list-vertical',
      informational: 'list-horizontal'
    }

    return typeDefaults[outline.type] || 'list-horizontal'
  }

  /**
   * Select color palette based on content
   */
  private selectPalette(outline: ArticleOutline): NarrativePlan['palette'] {
    const theme = outline.theme.toLowerCase()

    if (/business|finance|corporate|企业|商业|金融/.test(theme)) {
      return 'business'
    }
    if (/growth|success|positive|增长|成功/.test(theme)) {
      return 'warm'
    }
    if (/tech|digital|data|技术|数字|数据/.test(theme)) {
      return 'cool'
    }

    return 'vibrant'
  }

  /**
   * Normalize raw plan from LLM
   */
  private normalizePlan(raw: RawNarrativePlan, outline: ArticleOutline): NarrativePlan {
    const validMetaphors: VisualMetaphor[] = [
      'journey', 'pyramid', 'balance', 'cycle', 'network', 'funnel', 'tree', 'stack'
    ]
    const validDirections: FlowDirection[] = ['top_to_bottom', 'left_to_right', 'radial']
    const validPalettes: NarrativePlan['palette'][] = ['vibrant', 'business', 'warm', 'cool', 'monochrome']
    const validThemes: NarrativePlan['theme'][] = ['dark-vibrant', 'light-clean', 'gradient-modern']

    return {
      title: raw.title || outline.theme.substring(0, 60),
      subtitle: raw.subtitle,
      visualMetaphor: validMetaphors.includes(raw.visualMetaphor as VisualMetaphor)
        ? raw.visualMetaphor as VisualMetaphor
        : this.selectMetaphor(outline),
      flowDirection: validDirections.includes(raw.flowDirection as FlowDirection)
        ? raw.flowDirection as FlowDirection
        : 'top_to_bottom',
      sections: this.normalizeSections(raw.sections || []),
      palette: validPalettes.includes(raw.palette as NarrativePlan['palette'])
        ? raw.palette as NarrativePlan['palette']
        : 'vibrant',
      theme: validThemes.includes(raw.theme as NarrativePlan['theme'])
        ? raw.theme as NarrativePlan['theme']
        : 'dark-vibrant'
    }
  }

  /**
   * Normalize sections array
   */
  private normalizeSections(raw: Partial<NarrativeSection>[]): NarrativeSection[] {
    const validRoles: SectionRole[] = ['hook', 'context', 'main_point', 'evidence', 'contrast', 'conclusion']
    const validVisualTypes: VisualType[] = [
      'icon-statement', 'list-horizontal', 'list-vertical', 'list-grid',
      'flow-linear', 'flow-cycle', 'compare-binary', 'compare-table',
      'hierarchy-pyramid', 'hierarchy-tree', 'chart-bar', 'chart-pie',
      'chart-line', 'mind-map', 'kpi-cards'
    ]

    return raw.map((s, i) => ({
      id: s.id || generateId('s'),
      role: validRoles.includes(s.role as SectionRole) ? s.role as SectionRole : 'main_point',
      title: s.title || `Section ${i + 1}`,
      message: s.message || s.title || '',
      visualType: validVisualTypes.includes(s.visualType as VisualType)
        ? s.visualType as VisualType
        : 'list-horizontal',
      visualPurpose: s.visualPurpose || 'Display content',
      elements: this.normalizeElements(s.elements || []),
      sourcePointIds: Array.isArray(s.sourcePointIds) ? s.sourcePointIds : []
    }))
  }

  /**
   * Normalize elements array
   */
  private normalizeElements(raw: Partial<NarrativeElement>[]): NarrativeElement[] {
    return raw.map(e => ({
      label: String(e.label || 'Item'),
      value: e.value,
      description: e.description,
      iconHint: e.iconHint
    }))
  }
}

/**
 * Raw narrative plan from LLM
 */
interface RawNarrativePlan {
  title?: string
  subtitle?: string
  visualMetaphor?: string
  flowDirection?: string
  palette?: string
  theme?: string
  sections?: Partial<NarrativeSection>[]
}

/**
 * Create a NarrativePlanner instance
 */
export function createNarrativePlanner(config: NarrativePlannerConfig): NarrativePlanner {
  return new NarrativePlanner(config)
}
