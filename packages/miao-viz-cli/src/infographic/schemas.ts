import { z } from 'zod'

const numericValue = z.union([
  z.number(),
  z.string().transform(v => {
    const n = Number.parseFloat(v.replace(/[^0-9.\-]/g, ''))
    return Number.isFinite(n) ? n : 0
  })
])

export const kpiItemSchema = z.object({
  label: z.string().min(1),
  value: numericValue,
  unit: z.string().optional(),
  delta: z.string().optional()
})

export const kpiStripDataSchema = z.object({
  items: z.array(kpiItemSchema).min(1).max(12)
})

export const metricBarItemSchema = z.object({
  label: z.string().min(1),
  value: numericValue,
  unit: z.string().optional()
})

export const metricBarsDataSchema = z.object({
  items: z.array(metricBarItemSchema).min(1).max(10)
})

export const processFlowItemSchema = z.object({
  label: z.string().optional(),
  text: z.string().min(1)
})

export const processFlowDataSchema = z.object({
  items: z.array(processFlowItemSchema).min(1).max(8)
})

export const conceptContrastItemSchema = z.record(z.string(), z.string()).and(z.object({
  label: z.string().min(1),
  text: z.string().optional().default('')
}))

export const conceptContrastDataSchema = z.object({
  items: z.array(conceptContrastItemSchema).min(1).max(8)
})

export const timelinePathItemSchema = z.object({
  label: z.string().optional(),
  text: z.string().min(1)
})

export const timelinePathDataSchema = z.object({
  items: z.array(timelinePathItemSchema).min(1).max(10)
})

export const partToWholeItemSchema = z.object({
  label: z.string().min(1),
  value: numericValue,
  text: z.string()
})

export const partToWholeDataSchema = z.object({
  items: z.array(partToWholeItemSchema).min(1).max(10)
})

export const beforeAfterDataSchema = z.object({
  before: z.array(z.record(z.string(), z.unknown())).min(1).max(10),
  after: z.array(z.record(z.string(), z.unknown())).min(1).max(10),
  items: z.array(z.record(z.string(), z.unknown())).min(1).max(10),
  beforeLabel: z.string().optional(),
  afterLabel: z.string().optional()
})

export const tradeoffMatrixItemSchema = z.object({
  label: z.string().min(1),
  text: z.string(),
  detail: z.string().optional()
})

export const tradeoffMatrixDataSchema = z.object({
  items: z.array(tradeoffMatrixItemSchema).length(4),
  xLabel: z.string().optional(),
  yLabel: z.string().optional()
})

export const rankedListItemSchema = z.object({
  label: z.string().min(1),
  value: numericValue,
  text: z.string()
})

export const rankedListChartDataSchema = z.object({
  items: z.array(rankedListItemSchema).min(1).max(12)
})

export const systemDiagramDataSchema = z.object({
  nodes: z.array(z.object({
    label: z.string().min(1),
    zone: z.string().optional(),
    color: z.string().optional()
  })).min(1).max(12),
  edges: z.array(z.object({
    from: z.number().int().min(0),
    to: z.number().int().min(0)
  })).max(20)
})

export const calloutDiagramItemSchema = z.object({
  label: z.string().min(1),
  text: z.string(),
  detail: z.string().optional()
})

export const calloutDiagramDataSchema = z.object({
  items: z.array(calloutDiagramItemSchema).min(1).max(8)
})

export const iconClusterItemSchema = z.object({
  label: z.string().min(1),
  text: z.string()
})

export const iconClusterDataSchema = z.object({
  items: z.array(iconClusterItemSchema).min(1).max(12)
})

export const visualDataSchemas = {
  'kpi-strip': kpiStripDataSchema,
  'metric-bars': metricBarsDataSchema,
  'process-flow': processFlowDataSchema,
  'concept-contrast': conceptContrastDataSchema,
  'timeline-path': timelinePathDataSchema,
  'part-to-whole': partToWholeDataSchema,
  'before-after': beforeAfterDataSchema,
  'tradeoff-matrix': tradeoffMatrixDataSchema,
  'ranked-list-chart': rankedListChartDataSchema,
  'system-diagram': systemDiagramDataSchema,
  'callout-diagram': calloutDiagramDataSchema,
  'icon-cluster': iconClusterDataSchema
} as const
