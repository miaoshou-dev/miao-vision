/**
 * Histogram Component Schema
 */

import type { ConfigSchema } from '@core/registry'

/**
 * Schema for parsing histogram configuration
 */
export const HistogramSchema: ConfigSchema = {
  fields: [
    { name: 'data', type: 'string', required: true },
    { name: 'valueColumn', type: 'string', required: true },
    { name: 'bins', type: 'number', default: 10 },
    { name: 'title', type: 'string' },
    { name: 'subtitle', type: 'string' },
    { name: 'height', type: 'number', default: 300 },
    { name: 'color', type: 'string', default: '#3B82F6' },
    { name: 'palette', type: 'string' },
    { name: 'showXAxis', type: 'boolean', default: true },
    { name: 'showYAxis', type: 'boolean', default: true },
    { name: 'xAxisLabel', type: 'string' },
    { name: 'yAxisLabel', type: 'string', default: 'Count' },
    {
      name: 'valueFormat',
      type: 'enum',
      enum: ['number', 'currency', 'percent'],
      default: 'number'
    },
    { name: 'currencySymbol', type: 'string', default: '$' },
    { name: 'showLabels', type: 'boolean', default: true },
    {
      name: 'binMode',
      type: 'enum',
      enum: ['include-min', 'include-max'],
      default: 'include-min'
    },
    { name: 'class', type: 'string' }
  ]
}
