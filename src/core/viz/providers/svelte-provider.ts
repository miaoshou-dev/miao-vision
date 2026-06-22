import { componentRegistry } from '@/core/registry'
import { componentMount } from '@/core/registry/component-mount'
import type { IVizProvider, VizSpec, VizInstance, VizType } from '../types'
import { getRegistryKeyForVizType } from '../type-mapping'

export class SvelteProvider implements IVizProvider {
  readonly supportedTypes: VizType[] = [
    'bar', 'line', 'pie', 'area', 'scatter', 'histogram',
    'boxplot', 'bubble', 'radar', 'heatmap',
    'sankey', 'treemap', 'funnel', 'waterfall',
    'gauge', 'progress', 'sparkline', 'delta', 'bigvalue',
    'table'
  ]

  supports(type: VizType): boolean {
    return this.supportedTypes.includes(type)
  }

  async render(
    container: HTMLElement,
    spec: VizSpec,
    data: Record<string, unknown>[]
  ): Promise<VizInstance> {
    const id = `svelte-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    const registryKey = this.mapTypeToRegistryKey(spec.type)
    const componentDef = componentRegistry.get(registryKey)

    if (!componentDef) {
       // Fallback or error
       throw new Error(`Component definition not found for key: ${registryKey}`)
    }

    const config = this.transformSpecToConfig(spec)

    // Apply strict but simple transforms from the spec
    // This allows basic derived fields like "Price_numeric" from "Price"
    // Limitations: Supports 'calculate' with simple field access or basic JS
    let processedData = [...data]
    if (spec.data && spec.data.transform) {
      spec.data.transform.forEach(t => {
        if (t.calculate && t.as) {
          try {
            // Safe evaluation of simple math/parse logic
            const func = new Function('datum', `return ${t.calculate}`)
            processedData = processedData.map(d => ({
              ...d,
              [t.as]: func(d)
            }))
          } catch (e) {
            console.warn(`[SvelteProvider] Failed to apply transform "${t.as}":`, e)
          }
        }
      })
    }

    // Construct initial props
    let props: Record<string, any> = { config, data: processedData }

    // If component has a prop builder, use it to transform data
    // This is critical for charts that need pre-calculation (bar, pie, etc.)
    if (componentDef.buildProps) {
        const builtProps = componentDef.buildProps(config, data, {} as any)
        if (builtProps) {
            props = builtProps
        }
    }

    // Mount using the unified component mount system
    const mounted = componentMount.mount(
        componentDef.component as any,
        props,
        container,
        { id, className: 'w-full h-full' }
    )

    return {
        id,
        type: spec.type,
        provider: 'svelte',
        element: container,
        destroy: () => mounted.unmount(),
        update: async (newData) => {
             if (mounted.update) {
                 mounted.update({ data: newData })
             }
        }
    }
  }

  private mapTypeToRegistryKey(type: VizType): string {
      return getRegistryKeyForVizType(type)
  }

  private transformSpecToConfig(spec: VizSpec): Record<string, any> {
      const config: Record<string, any> = { ...spec.style }

      const { encoding } = spec
      if (encoding.x) config.x = encoding.x.field
      if (encoding.y) config.y = encoding.y.field
      if (encoding.color) config.color = encoding.color.field
      if (encoding.size) config.size = encoding.size.field
      if (encoding.label) config.label = encoding.label.field
      if (encoding.value) config.value = encoding.value.field

      return config
  }
}
