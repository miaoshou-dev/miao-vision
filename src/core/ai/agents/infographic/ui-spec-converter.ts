/**
 * UISpec Converter
 *
 * Converts InfographicOutput (from the three-phase agent pipeline) to UITree
 * (structured UI specification for rendering without Markdown parsing).
 *
 * Dependency note: this module lives in core/ and only imports from types/.
 * The props.data payload mirrors InfographicSectionData (plugins layer) by shape,
 * not by import, to preserve the core → types-only dependency rule.
 *
 * @module core/ai/agents/infographic/ui-spec-converter
 */

import type { UITree, UIElement } from '@/types/ui-tree'
import type { InfographicOutput, InfographicSection, InfographicItem } from './types'

// ============================================================================
// Template ID mapping
//
// Agent templateId (from INFOGRAPHIC_TEMPLATES registry)
// → InfographicSectionData.template (from infographic-section plugin registry)
//
// The infographic-section plugin currently registers 4 templates:
//   kpi-row-badge, flow-timeline, pie-distribution, grid-comparison
// All other agent template IDs map to the closest equivalent.
// ============================================================================

const AGENT_TEMPLATE_TO_SECTION_TEMPLATE: Record<string, string> = {
  // KPI / single-row metrics
  'list-row-badge-card': 'kpi-row-badge',
  'list-row-value-card': 'kpi-row-badge',
  'list-grid-circular-progress': 'kpi-row-badge',

  // Grid / ranking → grid-comparison
  'list-grid-badge-card': 'grid-comparison',
  'list-pyramid-badge-card': 'grid-comparison',
  'list-pyramid-value-card': 'grid-comparison',
  'list-pyramid-distribution': 'grid-comparison',
  'list-zigzag-icon-arrow': 'grid-comparison',

  // Flow / sequence → flow-timeline
  'list-row-horizontal-icon-arrow': 'flow-timeline',
  'sequence-timeline-badge-card': 'flow-timeline',
  'list-zigzag-badge-card': 'flow-timeline',
  'flow-linear-numbered': 'flow-timeline',
  'cycle-radial-process': 'flow-timeline',
  'sequence-snake-flow': 'flow-timeline',
  'sequence-roadmap-horizontal': 'flow-timeline',
  'sequence-stairs-progression': 'flow-timeline',
  'sequence-ascending-bars': 'flow-timeline',

  // Hierarchy / comparison → grid-comparison
  'hierarchy-tree-org': 'grid-comparison',
  'mind-map-radial': 'grid-comparison',
  'list-row-horizontal-comparison': 'grid-comparison',
  'compare-binary-vs': 'grid-comparison',
  'compare-quadrant-matrix': 'grid-comparison',
  'compare-swot-analysis': 'grid-comparison',
  'compare-table-features': 'grid-comparison',

  // Distribution
  'list-sector-pie': 'pie-distribution',

  // Relation → grid-comparison
  'relation-network-circular': 'grid-comparison',
  'relation-venn-diagram': 'grid-comparison',
  'relation-circle-connections': 'grid-comparison',

  // Statistical charts → kpi-row-badge (best available match)
  'chart-bar-horizontal': 'kpi-row-badge',
  'chart-bar-vertical': 'kpi-row-badge',
  'chart-line-trend': 'kpi-row-badge',
  'chart-line-multi-series': 'kpi-row-badge',
  'chart-funnel-conversion': 'kpi-row-badge',
}

const DEFAULT_SECTION_TEMPLATE = 'kpi-row-badge'

/**
 * Map an agent templateId to the InfographicSectionData template name.
 */
function mapTemplateId(templateId: string): string {
  return AGENT_TEMPLATE_TO_SECTION_TEMPLATE[templateId] ?? DEFAULT_SECTION_TEMPLATE
}

/**
 * Convert InfographicItem (agent) → SectionItem-shaped plain object.
 *
 * Both types share the same fields; this function normalises extra fields
 * that some agent templates add (e.g. `step`, `date`, `rank`).
 */
function mapItem(item: InfographicItem): Record<string, unknown> {
  const mapped: Record<string, unknown> = { label: item.label }

  if (item.value !== undefined) mapped.value = item.value
  if (item.desc !== undefined) mapped.desc = item.desc
  if (item.icon !== undefined) mapped.icon = item.icon
  if (item.trend !== undefined) mapped.trend = item.trend
  if (item.color !== undefined) mapped.color = item.color

  return mapped
}

/**
 * Build an infographic-section UIElement from an InfographicSection.
 *
 * props.data is shaped as InfographicSectionData (plugins/infographic-section/types.ts)
 * but typed as Record<string, unknown> to avoid a core → plugins import.
 *
 * Exported for use by the streaming patch generator.
 */
export function buildSectionElement(
  section: InfographicSection,
  globalTheme: string,
  globalPalette: string,
  defaultWidth: number
): UIElement {
  const sectionData: Record<string, unknown> = {
    template: mapTemplateId(section.templateId),
    items: section.items.map(mapItem),
    theme: globalTheme,
    palette: globalPalette,
    width: section.layout?.width ?? defaultWidth,
  }

  if (section.heading) sectionData.heading = section.heading
  if (section.insight) sectionData.insight = section.insight
  if (section.footnote) sectionData.footnote = section.footnote
  if (section.layout?.height !== undefined) sectionData.height = section.layout.height

  return {
    key: section.id,
    type: 'infographic-section',
    props: { data: sectionData },
  }
}

/**
 * Build the infographic-layout root UIElement (no children).
 * Exported for use by the streaming patch generator.
 */
export function buildLayoutElement(output: InfographicOutput): UIElement {
  return {
    key: 'infographic-layout',
    type: 'infographic-layout',
    props: {
      title: output.title,
      theme: output.theme,
      palette: output.palette,
      direction: output.layout.direction,
      maxWidth: output.layout.maxWidth,
      gap: output.layout.gap,
      sourceSummary: output.sourceSummary,
    },
    children: [],
  }
}

/**
 * Convert InfographicOutput → UITree.
 *
 * The resulting tree has:
 * - root: 'infographic-layout' element with layout metadata
 * - children: one 'infographic-section' element per section
 *
 * @param output - The final output from the three-phase InfographicAgent
 * @returns A UITree ready for UISpecRenderer / UISpecInfographicRenderer
 */
export function toUITree(output: InfographicOutput): UITree {
  const rootKey = 'infographic-layout'

  const sectionElements = output.sections.map((section) =>
    buildSectionElement(
      section,
      output.theme,
      output.palette,
      output.layout.maxWidth
    )
  )

  const rootElement: UIElement = {
    ...buildLayoutElement(output),
    children: sectionElements.map((el) => el.key),
  }

  const elements: Record<string, UIElement> = { [rootKey]: rootElement }
  for (const el of sectionElements) {
    elements[el.key] = el
  }

  return {
    version: '1.0',
    root: rootKey,
    elements,
  }
}
