import { vizRegistry } from './registry'
import { SvelteProvider } from './providers/svelte-provider'
import { InfographicProvider } from './providers/infographic-provider'
import { BarChartSchema, LineChartSchema, PieChartSchema, BubbleChartSchema } from './schemas/charts'
import { InfographicSchema } from './schemas/infographics'


export function initializeVizLayer() {
  // Providers
  vizRegistry.registerProvider('svelte', new SvelteProvider())
  vizRegistry.registerProvider('infographic', new InfographicProvider())

  // Metadata & Schemas (For AI)
  vizRegistry.registerMetadata('bar', {
    description: 'Bar Chart for comparing categorical data. Good for ranking and distributions.',
    schema: BarChartSchema
  })

  vizRegistry.registerMetadata('line', {
    description: 'Line Chart for showing trends over time or sequence.',
    schema: LineChartSchema
  })

  vizRegistry.registerMetadata('pie', {
    description: 'Pie Chart for showing part-to-whole composition.',
    schema: PieChartSchema
  })

  vizRegistry.registerMetadata('bubble', {
    description: 'Bubble Chart for displaying three dimensions of data (x, y, size).',
    schema: BubbleChartSchema
  })

  // Register infographics
  const infoTypes = [
      'infographic-list',
      'infographic-flow',
      'infographic-hierarchy',
      'infographic-comparison',
      'infographic-kpi'
  ] as const

  infoTypes.forEach(type => {
      vizRegistry.registerMetadata(type, {
          description: `Infographic optimized for ${type.split('-')[1]} structures. Use when you need visually rich, non-statistical presentation.`,
          schema: InfographicSchema
      })
  })

  console.log('✨ Viz Layer Initialized: Providers & Schemas Ready')
}
