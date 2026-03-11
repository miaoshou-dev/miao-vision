/**
 * VizCatalog Initialization — Factory functions and built-in schema registration
 *
 * Separated from viz-catalog.ts to keep each file under 500 lines.
 * Consumers should import from viz-catalog.ts (which re-exports these).
 */

import { z } from 'zod'
import { VizCatalog } from './viz-catalog'

/**
 * Singleton instance
 */
let vizCatalogInstance: VizCatalog | null = null

/**
 * Get or create VizCatalog singleton
 */
export function getVizCatalog(): VizCatalog {
  if (!vizCatalogInstance) {
    vizCatalogInstance = new VizCatalog()
  }
  return vizCatalogInstance
}

/**
 * Initialize VizCatalog with VizSpec schemas
 * Call this after initializeCatalog()
 *
 * Note: Uses synchronous registration to ensure schemas are available
 * immediately when the function returns.
 */
export function initializeVizCatalog(): VizCatalog {
  const vizCatalog = getVizCatalog()

  // Register built-in chart schemas synchronously
  // We define schemas inline to avoid circular import issues

  // Base field encoding schema
  const FieldEncodingSchema = z.object({
    field: z.string(),
    type: z.enum(['quantitative', 'nominal', 'temporal', 'ordinal']).optional(),
    aggregate: z.enum(['sum', 'avg', 'count', 'min', 'max']).optional(),
    format: z.string().optional()
  })

  // Base VizSpec schema
  const BaseVizSpecSchema = z.object({
    type: z.string(),
    data: z.object({
      source: z.string(),
      transform: z.array(z.any()).optional()
    }).optional(),
    style: z.record(z.string(), z.any()).optional()
  })

  // Register chart schemas
  vizCatalog.registerVizSchemas([
    {
      type: 'bar',
      description: 'Bar Chart — compare categorical data, rankings, distributions.',
      vizSchema: BaseVizSpecSchema.extend({
        type: z.literal('bar'),
        encoding: z.object({
          x: FieldEncodingSchema.describe('Categorical axis (Dimension)'),
          y: FieldEncodingSchema.describe('Numerical axis (Measure)'),
          color: FieldEncodingSchema.optional().describe('Group by color')
        })
      }),
      example: {
        type: 'bar',
        data: { source: '<query_name>' },
        encoding: { x: { field: 'category' }, y: { field: 'revenue', aggregate: 'sum' } }
      }
    },
    {
      type: 'line',
      description: 'Line Chart — trends over time or continuous sequences.',
      vizSchema: BaseVizSpecSchema.extend({
        type: z.literal('line'),
        encoding: z.object({
          x: FieldEncodingSchema.describe('Time or Sequence axis'),
          y: FieldEncodingSchema.describe('Numerical axis'),
          color: FieldEncodingSchema.optional().describe('Group lines by category')
        })
      }),
      example: {
        type: 'line',
        data: { source: '<query_name>' },
        encoding: { x: { field: 'date', type: 'temporal' }, y: { field: 'sales' } }
      }
    },
    {
      type: 'area',
      description: 'Area Chart — like a line chart but emphasizes cumulative volume.',
      vizSchema: BaseVizSpecSchema.extend({
        type: z.literal('area'),
        encoding: z.object({
          x: FieldEncodingSchema.describe('Time or Sequence axis'),
          y: FieldEncodingSchema.describe('Numerical axis'),
          color: FieldEncodingSchema.optional().describe('Stack or group by category')
        })
      }),
      example: {
        type: 'area',
        data: { source: '<query_name>' },
        encoding: { x: { field: 'month', type: 'temporal' }, y: { field: 'visitors' } }
      }
    },
    {
      type: 'pie',
      description: 'Pie Chart — part-to-whole composition (≤7 categories recommended).',
      vizSchema: BaseVizSpecSchema.extend({
        type: z.literal('pie'),
        encoding: z.object({
          label: FieldEncodingSchema.describe('Sector label (Category)'),
          value: FieldEncodingSchema.describe('Sector size (Measure)'),
          color: FieldEncodingSchema.optional()
        })
      }),
      example: {
        type: 'pie',
        data: { source: '<query_name>' },
        encoding: { label: { field: 'product' }, value: { field: 'sales', aggregate: 'sum' } }
      }
    },
    {
      type: 'scatter',
      description: 'Scatter Chart — correlation between two numeric variables.',
      vizSchema: BaseVizSpecSchema.extend({
        type: z.literal('scatter'),
        encoding: z.object({
          x: FieldEncodingSchema.describe('X-axis numeric value'),
          y: FieldEncodingSchema.describe('Y-axis numeric value'),
          color: FieldEncodingSchema.optional().describe('Color by category'),
          label: FieldEncodingSchema.optional().describe('Point label')
        })
      }),
      example: {
        type: 'scatter',
        data: { source: '<query_name>' },
        encoding: { x: { field: 'price' }, y: { field: 'rating' }, color: { field: 'category' } }
      }
    },
    {
      type: 'bubble',
      description: 'Bubble Chart — three numeric dimensions (x, y, bubble size).',
      vizSchema: BaseVizSpecSchema.extend({
        type: z.literal('bubble'),
        encoding: z.object({
          x: FieldEncodingSchema.describe('X-axis value'),
          y: FieldEncodingSchema.describe('Y-axis value'),
          size: FieldEncodingSchema.describe('Bubble size (Measure)'),
          color: FieldEncodingSchema.optional(),
          label: FieldEncodingSchema.optional().describe('Bubble label')
        })
      }),
      example: {
        type: 'bubble',
        data: { source: '<query_name>' },
        encoding: { x: { field: 'gdp' }, y: { field: 'life_expectancy' }, size: { field: 'population' }, color: { field: 'continent' } }
      }
    },
    {
      type: 'histogram',
      description: 'Histogram — distribution of a single numeric variable.',
      vizSchema: BaseVizSpecSchema.extend({
        type: z.literal('histogram'),
        encoding: z.object({
          x: FieldEncodingSchema.describe('Numeric field to distribute'),
          y: FieldEncodingSchema.optional().describe('Count (auto-computed if omitted)')
        })
      }),
      example: {
        type: 'histogram',
        data: { source: '<query_name>' },
        encoding: { x: { field: 'age' } }
      }
    },
    {
      type: 'heatmap',
      description: 'Heatmap — two categorical dimensions with a numeric value intensity.',
      vizSchema: BaseVizSpecSchema.extend({
        type: z.literal('heatmap'),
        encoding: z.object({
          x: FieldEncodingSchema.describe('X-axis category'),
          y: FieldEncodingSchema.describe('Y-axis category'),
          value: FieldEncodingSchema.describe('Cell intensity value')
        })
      }),
      example: {
        type: 'heatmap',
        data: { source: '<query_name>' },
        encoding: { x: { field: 'weekday' }, y: { field: 'hour' }, value: { field: 'count', aggregate: 'sum' } }
      }
    },
    {
      type: 'funnel',
      description: 'Funnel Chart — sequential stages with declining values (conversion flow).',
      vizSchema: BaseVizSpecSchema.extend({
        type: z.literal('funnel'),
        encoding: z.object({
          label: FieldEncodingSchema.describe('Stage name'),
          value: FieldEncodingSchema.describe('Stage value')
        })
      }),
      example: {
        type: 'funnel',
        data: { source: '<query_name>' },
        encoding: { label: { field: 'stage' }, value: { field: 'users' } }
      }
    },
    {
      type: 'radar',
      description: 'Radar Chart — multivariate comparison across categories (spider chart).',
      vizSchema: BaseVizSpecSchema.extend({
        type: z.literal('radar'),
        encoding: z.object({
          label: FieldEncodingSchema.describe('Axis name (dimension)'),
          value: FieldEncodingSchema.describe('Axis value'),
          color: FieldEncodingSchema.optional().describe('Series grouping')
        })
      }),
      example: {
        type: 'radar',
        data: { source: '<query_name>' },
        encoding: { label: { field: 'skill' }, value: { field: 'score' }, color: { field: 'team' } }
      }
    },
    {
      type: 'gauge',
      description: 'Gauge — single KPI value against a target range.',
      vizSchema: BaseVizSpecSchema.extend({
        type: z.literal('gauge'),
        encoding: z.object({
          value: FieldEncodingSchema.describe('Current value')
        }),
        style: z.object({
          min: z.number().optional(),
          max: z.number().optional(),
          title: z.string().optional()
        }).optional()
      }),
      example: {
        type: 'gauge',
        data: { source: '<query_name>' },
        encoding: { value: { field: 'completion_rate', aggregate: 'avg' } },
        style: { min: 0, max: 100, title: 'Completion Rate (%)' }
      }
    },
    {
      type: 'bigvalue',
      description: 'BigValue — single prominent KPI metric display with optional comparison.',
      vizSchema: BaseVizSpecSchema.extend({
        type: z.literal('bigvalue'),
        encoding: z.object({
          value: FieldEncodingSchema.describe('Primary metric value')
        }),
        style: z.object({
          title: z.string().optional(),
          format: z.enum(['number', 'currency', 'percent']).optional()
        }).optional()
      }),
      example: {
        type: 'bigvalue',
        data: { source: '<query_name>' },
        encoding: { value: { field: 'total_revenue', aggregate: 'sum' } },
        style: { title: 'Total Revenue', format: 'currency' }
      }
    }
  ])

  // Register infographic schemas
  const InfographicSchema = BaseVizSpecSchema.extend({
    type: z.string(),
    encoding: z.object({
      label: FieldEncodingSchema.optional(),
      value: FieldEncodingSchema.optional(),
      icon: FieldEncodingSchema.optional(),
      description: FieldEncodingSchema.optional()
    }).passthrough()
  })

  const infographicMeta: Array<{ type: string; description: string; example: Record<string, unknown> }> = [
    {
      type: 'infographic-list',
      description: 'Infographic List — visually rich vertical list with icons and descriptions.',
      example: {
        type: 'infographic-list',
        data: { source: '<query_name>' },
        encoding: { label: { field: 'title' }, value: { field: 'count' }, description: { field: 'detail' } }
      }
    },
    {
      type: 'infographic-flow',
      description: 'Infographic Flow — sequential steps or process stages.',
      example: {
        type: 'infographic-flow',
        data: { source: '<query_name>' },
        encoding: { label: { field: 'step_name' }, description: { field: 'step_desc' } }
      }
    },
    {
      type: 'infographic-hierarchy',
      description: 'Infographic Hierarchy — parent-child tree or pyramid structures.',
      example: {
        type: 'infographic-hierarchy',
        data: { source: '<query_name>' },
        encoding: { label: { field: 'name' }, value: { field: 'level' } }
      }
    },
    {
      type: 'infographic-comparison',
      description: 'Infographic Comparison — side-by-side comparison of multiple items.',
      example: {
        type: 'infographic-comparison',
        data: { source: '<query_name>' },
        encoding: { label: { field: 'item' }, value: { field: 'score' } }
      }
    },
    {
      type: 'infographic-kpi',
      description: 'Infographic KPI — card-grid of highlighted metrics with icons.',
      example: {
        type: 'infographic-kpi',
        data: { source: '<query_name>' },
        encoding: { label: { field: 'metric_name' }, value: { field: 'metric_value' } }
      }
    }
  ]

  for (const meta of infographicMeta) {
    vizCatalog.registerVizSchema({
      type: meta.type,
      description: meta.description,
      vizSchema: InfographicSchema,
      example: meta.example
    })
  }

  console.log(`✅ VizCatalog initialized with ${vizCatalog.getAllVizSchemas().size} schemas`)
  return vizCatalog
}

/**
 * Reset VizCatalog (for testing)
 */
export function resetVizCatalog(): void {
  vizCatalogInstance = null
}
