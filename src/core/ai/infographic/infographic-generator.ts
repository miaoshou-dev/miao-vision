/**
 * InfographicGenerator - Generate Markdown from Plan
 *
 * Converts InfographicPlan to markdown with infographic code blocks.
 *
 * @module core/ai/infographic/infographic-generator
 */

import type { InfographicPlan, InfographicSection, InfographicProgress, GeneratedInfographic } from './types'
import { hasTemplate } from '@plugins/data-display/infographic-section/templates/registry'

/**
 * Map AI template types to registered infographic-section templates
 * This bridges the gap between AI-generated template names and actual registered templates
 */
const TEMPLATE_MAP: Record<string, string> = {
  // KPI/Metrics templates
  'list-grid-badge-card': 'kpi-row-badge',
  'kpi-grid': 'kpi-row-badge',
  'kpi-row': 'kpi-row-badge',
  'metrics': 'kpi-row-badge',
  'stats': 'kpi-row-badge',
  'summary': 'kpi-row-badge',

  // Timeline/Flow templates
  'list-row-horizontal-icon-arrow': 'flow-timeline',
  'flow-linear': 'flow-timeline',
  'timeline': 'flow-timeline',
  'process': 'flow-timeline',
  'steps': 'flow-timeline',
  'phases': 'flow-timeline',

  // Distribution/Pie templates
  'pie-chart': 'pie-distribution',
  'donut': 'pie-distribution',
  'distribution': 'pie-distribution',
  'breakdown': 'pie-distribution',
  'share': 'pie-distribution',

  // Comparison/Grid templates
  'compare-table-features': 'grid-comparison',
  'comparison': 'grid-comparison',
  'feature-grid': 'grid-comparison',
  'table': 'grid-comparison',
  'features': 'grid-comparison'
}

/**
 * Get the registered template name for a given AI template ID
 */
function mapToRegisteredTemplate(templateId: string): string {
  // If already a registered template, use it
  if (hasTemplate(templateId)) {
    return templateId
  }

  // Try to map from AI template to registered template
  const mapped = TEMPLATE_MAP[templateId]
  if (mapped) {
    return mapped
  }

  // Default to kpi-row-badge for unrecognized templates
  console.warn(`[InfographicGenerator] Unknown template "${templateId}", using kpi-row-badge`)
  return 'kpi-row-badge'
}

/**
 * Generator options
 */
export interface InfographicGeneratorOptions {
  /** Include section titles as headers */
  includeTitles?: boolean
  /** Include horizontal rules between sections */
  includeDividers?: boolean
  /** Default theme */
  defaultTheme?: string
  /** Default palette */
  defaultPalette?: string
}

/**
 * InfographicGenerator class
 */
export class InfographicGenerator {
  private options: Required<InfographicGeneratorOptions>

  constructor(options: InfographicGeneratorOptions = {}) {
    this.options = {
      includeTitles: options.includeTitles ?? true,
      includeDividers: options.includeDividers ?? true,
      defaultTheme: options.defaultTheme ?? 'dark-vibrant',
      defaultPalette: options.defaultPalette ?? 'vibrant'
    }
  }

  /**
   * Generate complete markdown from plan
   */
  generate(plan: InfographicPlan): GeneratedInfographic {
    try {
      const sections = plan.sections
        .sort((a, b) => a.order - b.order)
        .map(section => this.generateSection(section, plan))

      const markdown = this.assembleMarkdown(plan, sections)

      return {
        success: true,
        markdown,
        plan
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return {
        success: false,
        error: message,
        plan
      }
    }
  }

  /**
   * Generate with progress updates
   */
  async *generateStream(plan: InfographicPlan): AsyncGenerator<InfographicProgress> {
    const sortedSections = plan.sections.sort((a, b) => a.order - b.order)
    let accumulatedMarkdown = this.generateHeader(plan)

    for (let i = 0; i < sortedSections.length; i++) {
      const section = sortedSections[i]

      yield {
        sectionIndex: i,
        totalSections: sortedSections.length,
        sectionTitle: section.title,
        markdown: accumulatedMarkdown,
        isComplete: false
      }

      const sectionMarkdown = this.generateSection(section, plan)
      accumulatedMarkdown += sectionMarkdown

      if (this.options.includeDividers && i < sortedSections.length - 1) {
        accumulatedMarkdown += '\n---\n\n'
      }
    }

    yield {
      sectionIndex: sortedSections.length - 1,
      totalSections: sortedSections.length,
      sectionTitle: 'Complete',
      markdown: accumulatedMarkdown,
      isComplete: true
    }
  }

  /**
   * Generate header/title section
   */
  private generateHeader(plan: InfographicPlan): string {
    let header = `# ${plan.title}\n\n`

    if (plan.metadata?.generatedAt) {
      const date = new Date(plan.metadata.generatedAt).toLocaleDateString()
      header += `*Generated on ${date}*\n\n`
    }

    return header
  }

  /**
   * Generate a single section
   */
  private generateSection(section: InfographicSection, plan: InfographicPlan): string {
    let markdown = ''

    // Add section title if enabled
    if (this.options.includeTitles && section.title) {
      markdown += `## ${section.title}\n\n`
    }

    // Generate infographic-section code block
    const codeBlock = this.generateCodeBlock(section, plan)

    markdown += codeBlock + '\n\n'

    return markdown
  }

  /**
   * Generate infographic-section code block
   * Uses the correct format expected by InfographicSection component
   */
  private generateCodeBlock(
    section: InfographicSection,
    plan: InfographicPlan
  ): string {
    // Map template to registered template name
    const template = mapToRegisteredTemplate(section.templateId)
    const theme = plan.theme || this.options.defaultTheme
    const palette = plan.palette || this.options.defaultPalette
    const width = section.layout?.width || 800

    // Build YAML-like config
    const config: string[] = [
      `template: ${template}`,
      `theme: ${theme}`,
      `palette: ${palette}`,
      `width: ${width}`
    ]

    // Add title/subtitle if present
    if (section.title) {
      config.push(`title: "${section.title}"`)
    }

    // Format items (not data)
    const itemsYaml = this.formatItemsAsYaml(section.data)

    return `\`\`\`infographic-section
${config.join('\n')}
items:
${itemsYaml}
\`\`\``
  }

  /**
   * Format items array as YAML for infographic-section
   * Only includes fields that InfographicSection understands: label, value, desc, icon, trend
   */
  private formatItemsAsYaml(data: Record<string, unknown>[]): string {
    if (!data || data.length === 0) {
      return '  - label: "No data"'
    }

    return data.map(item => {
      const lines: string[] = []

      // Label is required
      const label = item.label || item.name || item.title || 'Item'
      lines.push(`    label: ${this.formatYamlValue(label)}`)

      // Add value if present
      if (item.value !== undefined) {
        lines.push(`    value: ${this.formatYamlValue(item.value)}`)
      }

      // Add desc if present
      if (item.desc || item.description) {
        lines.push(`    desc: ${this.formatYamlValue(item.desc || item.description)}`)
      }

      // Add icon if present
      if (item.icon) {
        lines.push(`    icon: ${this.formatYamlValue(item.icon)}`)
      }

      // Add trend if present and valid
      if (item.trend && ['up', 'down', 'flat'].includes(String(item.trend).toLowerCase())) {
        lines.push(`    trend: ${String(item.trend).toLowerCase()}`)
      }

      return `  -\n${lines.join('\n')}`
    }).join('\n')
  }

  /**
   * Format a value for YAML
   */
  private formatYamlValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '""'
    }

    if (typeof value === 'string') {
      // Quote strings with special characters
      if (value.includes(':') || value.includes('#') || value.includes('\n')) {
        return `"${value.replace(/"/g, '\\"')}"`
      }
      return `"${value}"`
    }

    if (typeof value === 'number') {
      return String(value)
    }

    if (typeof value === 'boolean') {
      return value ? 'true' : 'false'
    }

    if (Array.isArray(value)) {
      return `[${value.map(v => this.formatYamlValue(v)).join(', ')}]`
    }

    if (typeof value === 'object') {
      return JSON.stringify(value)
    }

    return String(value)
  }

  /**
   * Assemble final markdown document
   */
  private assembleMarkdown(plan: InfographicPlan, sections: string[]): string {
    let markdown = this.generateHeader(plan)

    for (let i = 0; i < sections.length; i++) {
      markdown += sections[i]

      if (this.options.includeDividers && i < sections.length - 1) {
        markdown += '---\n\n'
      }
    }

    return markdown
  }
}

/**
 * Create an infographic generator instance
 */
export function createInfographicGenerator(
  options?: InfographicGeneratorOptions
): InfographicGenerator {
  return new InfographicGenerator(options)
}

/**
 * Quick generate markdown from plan
 */
export function generateInfographicMarkdown(plan: InfographicPlan): string {
  const generator = new InfographicGenerator()
  const result = generator.generate(plan)
  return result.markdown || ''
}
