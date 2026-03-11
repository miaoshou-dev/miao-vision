import { z } from 'zod'
import { BaseVizSpecSchema, FieldEncodingSchema } from './base'

export const BarChartSchema = BaseVizSpecSchema.extend({
  type: z.literal('bar'),
  encoding: z.object({
    x: FieldEncodingSchema.describe('Categorical axis (Dimension)'),
    y: FieldEncodingSchema.describe('Numerical axis (Measure)'),
    color: FieldEncodingSchema.optional().describe('Group by color')
  })
})

export const LineChartSchema = BaseVizSpecSchema.extend({
  type: z.literal('line'),
  encoding: z.object({
    x: FieldEncodingSchema.describe('Time or Sequence axis'),
    y: FieldEncodingSchema.describe('Numerical axis'),
    color: FieldEncodingSchema.optional().describe('Group lines by category')
  })
})

export const PieChartSchema = BaseVizSpecSchema.extend({
  type: z.literal('pie'),
  encoding: z.object({
    label: FieldEncodingSchema.describe('Sector label (Category)'),
    value: FieldEncodingSchema.describe('Sector size (Measure)'),
    color: FieldEncodingSchema.optional()
  })
})

export const BubbleChartSchema = BaseVizSpecSchema.extend({
  type: z.literal('bubble'),
  encoding: z.object({
    x: FieldEncodingSchema.describe('X-axis value'),
    y: FieldEncodingSchema.describe('Y-axis value'),
    size: FieldEncodingSchema.describe('Bubble size (Measure)'),
    color: FieldEncodingSchema.optional(),
    label: FieldEncodingSchema.optional().describe('Bubble label')
  })
})
