import { z } from 'zod'
import { BaseVizSpecSchema, FieldEncodingSchema } from './base'

export const InfographicSchema = BaseVizSpecSchema.extend({
  type: z.enum([
    'infographic-list',
    'infographic-flow',
    'infographic-hierarchy',
    'infographic-comparison',
    'infographic-kpi'
  ]),
  encoding: z.object({
    label: FieldEncodingSchema.describe('Main label for the item'),
    value: FieldEncodingSchema.optional().describe('Metric value or secondary label'),
    description: FieldEncodingSchema.optional().describe('Detailed description text'),
    icon: FieldEncodingSchema.optional().describe('Column containing icon names (e.g. "users", "server")')
  })
})
