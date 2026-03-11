import { componentRegistry } from '@/core/registry'
import { componentMount } from '@/core/registry/component-mount'
import type { IVizProvider, VizSpec, VizInstance, VizType } from '../types'

export class InfographicProvider implements IVizProvider {
  readonly supportedTypes: VizType[] = [
    'infographic-list',
    'infographic-flow',
    'infographic-hierarchy',
    'infographic-comparison',
    'infographic-kpi'
  ]

  supports(type: VizType): boolean {
    return this.supportedTypes.includes(type)
  }

  async render(
    container: HTMLElement,
    spec: VizSpec,
    data: Record<string, unknown>[]
  ): Promise<VizInstance> {
    const id = `infographic-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // InfographicRenderer is registered under 'infographic'
    // Note: In 0.2.0, 'infographic' might be the key.
    const componentDef = componentRegistry.get('infographic')

    if (!componentDef) {
       throw new Error(`Infographic component not found in registry`)
    }

    // Transform Data
    const items = this.transformData(data, spec)

    // Determine Config based on Type
    // e.g., 'infographic-flow' -> layout: 'row' (with arrows)
    const config = this.deriveConfig(spec)

    const mounted = componentMount.mount(
        componentDef.component as any,
        { items, config },
        container,
        { id, className: 'w-full h-full' }
    )

    return {
        id,
        type: spec.type,
        provider: 'infographic',
        element: container,
        destroy: () => mounted.unmount(),
        update: async (newData) => {
             const newItems = this.transformData(newData, spec)
             if (mounted.update) {
                 mounted.update({ items: newItems })
             }
        }
    }
  }

  private transformData(data: Record<string, any>[], spec: VizSpec) {
      const { encoding } = spec
      return data.map(row => {
          const item: any = {
              label: encoding.label ? String(row[encoding.label.field]) : ''
          }
          if (encoding.value) item.value = row[encoding.value.field]
          if (encoding.description) item.desc = String(row[encoding.description.field])
          if (encoding.icon) item.icon = String(row[encoding.icon.field])

          return item
      })
  }

  private deriveConfig(spec: VizSpec) {
      const type = spec.type as string

      const config: any = {
          data: spec.data.source, // Required by type definition but unused in this direct mount
          label: spec.encoding.label?.field || 'label',
          ...spec.style
      }

      // Semantic Defaults
      if (type === 'infographic-flow') {
          config.layout = config.layout || 'row'
          config.showArrows = true
      } else if (type === 'infographic-list') {
          config.layout = config.layout || 'grid'
          config.showArrows = false
      } else if (type === 'infographic-kpi') {
          config.itemType = 'value-card'
          config.layout = 'grid'
      }

      return config
  }
}
