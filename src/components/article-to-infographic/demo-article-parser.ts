/**
 * Demo article parser
 *
 * Pure functions for generating demo/fallback markdown from article text.
 * Extracted from ArticleToInfographicDemo to keep the component focused on UI.
 */

/**
 * Generate markdown output from a sample or custom article.
 *
 * When a sample article key matches a demo template, the template is returned
 * verbatim. Otherwise the article text is parsed with a heuristic extractor.
 */
export function generateDemoMarkdown(
  selectedArticle: string,
  useCustom: boolean,
  customArticle: string,
  demoTemplates: Record<string, string>
): string {
  if (!useCustom && demoTemplates[selectedArticle]) {
    return demoTemplates[selectedArticle]
  }
  return generateCustomArticleMarkdown(customArticle)
}

/**
 * Heuristic parser: extracts KPI metrics, timeline steps, and list items
 * from free-form article text and emits infographic-section markdown.
 */
export function generateCustomArticleMarkdown(article: string): string {
  const lines = article.split('\n')
  const title = lines.find(l => l.trim().startsWith('#'))?.replace(/^#+\s*/, '').trim() || 'Custom Report'

  const kpiItems: { label: string; value: string }[] = []
  const listItems: { label: string; desc?: string }[] = []
  const timelineItems: { label: string; desc?: string }[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const bulletMatch = trimmed.match(/^[-*•]\s*(.+)$/)
    const numberMatch = trimmed.match(/^(?:\d+\.|Step\s*\d+:?|Phase\s*\d+:?)\s*(.+)$/i)
    const content = bulletMatch?.[1] || numberMatch?.[1]
    if (!content) continue

    const valuePatterns = [
      /^(.+?):\s*(\$?[\d,.]+[BMK]?%?|\d+%|[\d,.]+\s*(?:million|billion|points?|users?|deals?)?)/i,
      /^(.+?)\s*[-–—]\s*(\$?[\d,.]+[BMK]?%?|\d+%)/i,
      /^(.+?)\s+\((.+?)\)$/
    ]

    let extracted = false
    for (const pattern of valuePatterns) {
      const match = content.match(pattern)
      if (match) {
        const label = match[1].trim()
        const value = match[2].trim()
        if (/[\d$%]/.test(value)) {
          kpiItems.push({ label: label.substring(0, 25), value: value.substring(0, 15) })
        } else {
          listItems.push({ label: label.substring(0, 30), desc: value.substring(0, 50) })
        }
        extracted = true
        break
      }
    }

    if (!extracted) {
      if (numberMatch) {
        timelineItems.push({ label: content.substring(0, 30) })
      } else {
        listItems.push({ label: content.substring(0, 40) })
      }
    }
  }

  const sections: string[] = []

  if (kpiItems.length > 0) {
    sections.push(`\`\`\`infographic-section
template: kpi-row-badge
heading:
  title: "Key Metrics"
  subtitle: "Extracted from article"
palette: vibrant
width: 800
height: 150
items:
${kpiItems.slice(0, 4).map(i => `  - label: "${i.label}"
    value: "${i.value}"`).join('\n')}
\`\`\``)
  }

  if (timelineItems.length >= 2) {
    sections.push(`\`\`\`infographic-section
template: flow-timeline
heading:
  title: "Process Steps"
  subtitle: "Key stages identified"
palette: ocean
width: 800
height: 200
items:
${timelineItems.slice(0, 5).map(i => `  - label: "${i.label}"${i.desc ? `\n    desc: "${i.desc}"` : ''}`).join('\n')}
\`\`\``)
  }

  if (listItems.length > 0) {
    sections.push(`\`\`\`infographic-section
template: grid-comparison
heading:
  title: "Key Points"
  subtitle: "Article highlights"
palette: forest
width: 800
height: 250
items:
${listItems.slice(0, 4).map(i => `  - label: "${i.label}"${i.desc ? `\n    desc: "${i.desc}"` : ''}`).join('\n')}
\`\`\``)
  }

  if (sections.length === 0) {
    const contentLines = lines.filter(l => l.trim() && !l.trim().startsWith('#')).slice(0, 4)
    if (contentLines.length > 0) {
      sections.push(`\`\`\`infographic-section
template: kpi-row-badge
heading:
  title: "${title}"
  subtitle: "Article content"
palette: vibrant
width: 800
height: 150
items:
${contentLines.map((l, i) => `  - label: "Point ${i + 1}"
    value: "${l.trim().substring(0, 20).replace(/"/g, "'")}"`).join('\n')}
\`\`\``)
    }
  }

  return `# ${title}

> AI-generated infographic from custom article.

${sections.join('\n\n')}

> Note: For better AI-powered analysis with more accurate extraction, configure an API key.`
}
