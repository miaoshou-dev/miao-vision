/**
 * Markdown generation helpers for InfographicGenerator
 *
 * Extracted to keep generator.ts under the 500-line file size limit.
 */

import type { NarrativePlan, InfographicSection, InfographicItem } from './types'

/**
 * Raw output from LLM
 */
export interface RawInfographicOutput {
  title?: string
  theme?: string
  palette?: string
  layout?: {
    direction?: string
    maxWidth?: number
    gap?: number
  }
  sections?: Partial<InfographicSection>[]
  sourceSummary?: string
}

/**
 * Generate markdown representation of the infographic with narrative text
 */
export function generateMarkdown(plan: NarrativePlan, sections: InfographicSection[]): string {
  const parts: string[] = []

  parts.push(`# ${plan.title}`)

  if (plan.subtitle) {
    parts.push('')
    parts.push(`> ${plan.subtitle}`)
  }

  plan.sections.forEach((narrativeSection, i) => {
    const infographicSection = sections[i]
    if (!infographicSection) return

    parts.push('')
    parts.push(`## ${narrativeSection.title}`)

    if (narrativeSection.message && narrativeSection.message !== narrativeSection.title) {
      parts.push('')
      parts.push(narrativeSection.message)
    }

    parts.push('')
    parts.push(generateInfographicBlock(infographicSection, plan))
  })

  return parts.join('\n')
}

/**
 * Generate a single infographic code block in YAML format
 */
export function generateInfographicBlock(section: InfographicSection, plan: NarrativePlan): string {
  const dataYaml = section.items.map((item: InfographicItem) => {
    const fields: string[] = [`    label: "${item.label}"`]
    if (item.value !== undefined) fields.push(`    value: "${item.value}"`)
    if (item.desc) fields.push(`    desc: "${item.desc}"`)
    if (item.icon) fields.push(`    icon: "${item.icon}"`)
    if (item.trend) fields.push(`    trend: ${item.trend}`)
    return `  -\n${fields.join('\n')}`
  }).join('\n')

  const lines: string[] = [
    `template: ${section.templateId}`,
    `width: 800`,
    `height: 200`,
    `palette: ${plan.palette || 'vibrant'}`
  ]

  if (section.heading?.title) {
    lines.push(`heading:`)
    lines.push(`  title: "${section.heading.title}"`)
    if (section.heading.subtitle) {
      lines.push(`  subtitle: "${section.heading.subtitle}"`)
    }
  }

  if (section.insight?.text) {
    lines.push(`insight:`)
    lines.push(`  text: "${section.insight.text}"`)
  }

  lines.push(`data:`)
  lines.push(dataYaml)

  return `\`\`\`infographic\n${lines.join('\n')}\n\`\`\``
}
