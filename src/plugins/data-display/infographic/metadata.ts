/**
 * Infographic Component Metadata
 *
 * Defines the component schema, props, and examples for documentation/IDE support
 */

import { createMetadata } from '@core/registry'

export const InfographicMetadata = createMetadata({
  type: 'data-viz',
  language: 'infographic',
  displayName: 'Infographic',
  description: 'Create visual infographics with icons, colors, and layouts for process flows and metrics',
  icon: '📊',
  category: 'visualization',
  tags: ['data-viz', 'infographic', 'process', 'flow', 'icons'],
  props: [
    {
      name: 'data',
      type: 'query',
      required: true,
      description: 'SQL query name providing the items data',
      examples: ['process_steps', 'metrics', 'categories']
    },
    {
      name: 'label',
      type: 'string',
      required: true,
      description: 'Column name for item labels',
      examples: ['step_name', 'metric_name', 'title']
    },
    {
      name: 'icon',
      type: 'string',
      required: false,
      description: 'Column name for icon names (MDI icons)',
      examples: ['icon', 'icon_name']
    },
    {
      name: 'desc',
      type: 'string',
      required: false,
      description: 'Column name for item descriptions',
      examples: ['description', 'subtitle']
    },
    {
      name: 'value',
      type: 'string',
      required: false,
      description: 'Column name for values (for metric displays)',
      examples: ['amount', 'count', 'percentage']
    },
    {
      name: 'layout',
      type: 'string',
      required: false,
      default: 'row',
      description: 'Layout type for items',
      options: ['row', 'zigzag', 'grid']
    },
    {
      name: 'theme',
      type: 'string',
      required: false,
      default: 'dark-vibrant',
      description: 'Theme preset name',
      examples: ['dark-vibrant', 'dark-business', 'light-blue']
    },
    {
      name: 'palette',
      type: 'string',
      required: false,
      default: 'vibrant',
      description: 'Color palette name',
      examples: ['vibrant', 'business', 'ocean', 'sunset']
    },
    {
      name: 'showArrows',
      type: 'boolean',
      required: false,
      default: true,
      description: 'Show arrows between items (row layout)'
    },
    {
      name: 'width',
      type: 'number',
      required: false,
      default: 800,
      description: 'Infographic width in pixels'
    },
    {
      name: 'height',
      type: 'number',
      required: false,
      default: 200,
      description: 'Infographic height in pixels'
    },
    {
      name: 'itemType',
      type: 'string',
      required: false,
      default: 'icon-node',
      description: 'Item component type',
      options: ['icon-node', 'badge-card', 'value-card']
    }
  ],
  examples: [
    `\`\`\`infographic
data: process_steps
label: step_name
icon: icon
desc: description
layout: row
theme: dark-vibrant
showArrows: true
\`\`\``,
    `\`\`\`infographic
data: kpi_metrics
label: metric_name
value: metric_value
icon: icon
layout: row
theme: dark-business
itemType: value-card
showArrows: false
\`\`\``,
    `\`\`\`infographic
data: categories
label: category_name
icon: icon
desc: description
layout: zigzag
theme: light-blue
palette: ocean
\`\`\``
  ]
})
