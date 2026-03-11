import { z } from 'zod'

export const FieldEncodingSchema = z.object({
  field: z.string().describe('The column name in the data source'),
  type: z.enum(['quantitative', 'nominal', 'temporal', 'ordinal']).optional(),
  aggregate: z.enum(['sum', 'avg', 'count', 'min', 'max']).optional(),
  format: z.string().optional()
})

export const BaseVizSpecSchema = z.object({
  type: z.string(),
  data: z.object({
    source: z.string().describe('Name of the data source or SQL block'),
    transform: z.array(z.any()).optional()
  }),
  encoding: z.record(z.string(), FieldEncodingSchema),
  style: z.record(z.string(), z.any()).optional()
})
