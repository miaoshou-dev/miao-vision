/**
 * Infographic Section Module
 *
 * A template-based system for creating rich infographic sections
 * with integrated heading, insight, chart, and footnote areas.
 *
 * @example
 * ```svelte
 * <script>
 *   import { InfographicSection } from '@plugins/data-display/infographic-section'
 *
 *   const data = {
 *     template: 'kpi-row-badge',
 *     heading: {
 *       title: 'Q4 Key Metrics',
 *       subtitle: 'Performance highlights'
 *     },
 *     insight: {
 *       text: 'Revenue grew 45% year-over-year',
 *       highlight: '45%'
 *     },
 *     items: [
 *       { label: 'Revenue', value: '$12.5M', trend: 'up' },
 *       { label: 'Users', value: '158K', trend: 'up' },
 *       { label: 'NPS', value: '72' }
 *     ],
 *     footnote: {
 *       text: 'Data as of Dec 31, 2024',
 *       source: 'Finance Dept'
 *     }
 *   }
 * </script>
 *
 * <InfographicSection {data} />
 * ```
 */

// Main component
export { default as InfographicSection } from './InfographicSection.svelte'

// Component registration for Markdown integration
export { infographicSectionRegistration, InfographicSectionMetadata } from './definition'
export type { InfographicSectionConfig, InfographicSectionProps } from './definition'

// Types
export type {
  InfographicSectionData,
  SectionItem,
  SectionHeading,
  SectionInsight,
  SectionFootnote,
  TrendDirection,
  TemplateRenderer,
  TemplateRendererProps,
  TemplateRegistry,
  TemplateName
} from './types'

// Template registry
export {
  templateRegistry,
  getTemplate,
  hasTemplate,
  getTemplateNames,
  getTemplateMetadata,
  type RegisteredTemplateName
} from './templates/registry'

// Adapters
export {
  adaptToRow,
  adaptToFlow,
  adaptToSector,
  adaptToGrid
} from './adapters'

// Adapter types
export type { RowItem } from './adapters/row-adapter'
export type { FlowStep } from './adapters/flow-adapter'
export type { SectorItemData } from './adapters/sector-adapter'
export type { GridItem } from './adapters/grid-adapter'
