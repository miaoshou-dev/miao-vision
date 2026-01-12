/**
 * InfographicGenerator - Generate Markdown from Plan
 *
 * Converts InfographicPlan to markdown with infographic code blocks.
 *
 * @module core/ai/infographic/infographic-generator
 */

import type { InfographicPlan, InfographicSection, InfographicProgress, GeneratedInfographic } from './types'
import { getTemplateById } from '@plugins/data-display/infographic/templates'

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
    const template = getTemplateById(section.templateId)
    let markdown = ''

    // Add section title if enabled
    if (this.options.includeTitles && section.title) {
      markdown += `## ${section.title}\n\n`
    }

    // Generate infographic code block
    const codeBlock = this.generateCodeBlock(section, plan, template?.requiredFields || ['label'])

    markdown += codeBlock + '\n\n'

    return markdown
  }

  /**
   * Generate infographic code block
   */
  private generateCodeBlock(
    section: InfographicSection,
    plan: InfographicPlan,
    requiredFields: string[]
  ): string {
    const theme = plan.theme || this.options.defaultTheme
    const palette = plan.palette || this.options.defaultPalette
    const width = section.layout?.width || 800
    const height = section.layout?.height || 400

    // Build YAML-like config
    const config: string[] = [
      `template: ${section.templateId}`,
      `theme: ${theme}`,
      `palette: ${palette}`,
      `width: ${width}`,
      `height: ${height}`
    ]

    // Add data
    const dataYaml = this.formatDataAsYaml(section.data, requiredFields)

    return `\`\`\`infographic
${config.join('\n')}
data:
${dataYaml}
\`\`\``
  }

  /**
   * Format data array as YAML
   */
  private formatDataAsYaml(data: Record<string, unknown>[], requiredFields: string[]): string {
    if (!data || data.length === 0) {
      return '  - label: "No data"'
    }

    return data.map(item => {
      const lines: string[] = []

      // Add required fields first
      for (const field of requiredFields) {
        const value = item[field]
        if (value !== undefined) {
          lines.push(`    ${field}: ${this.formatYamlValue(value)}`)
        }
      }

      // Add other fields
      for (const [key, value] of Object.entries(item)) {
        if (!requiredFields.includes(key) && value !== undefined) {
          lines.push(`    ${key}: ${this.formatYamlValue(value)}`)
        }
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
