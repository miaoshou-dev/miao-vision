/**
 * VizCatalog - Unified Catalog for Generated UI Visualizations
 *
 * Extends the base Catalog with VizSpec schema support for AI generation
 * and rendering capabilities. This bridges the gap between:
 * - AI output format (VizSpec with encoding)
 * - Component props (direct props for Svelte components)
 *
 * Phase 2 of Catalog migration.
 */

import { z } from 'zod'
import type { SvelteComponent } from 'svelte'
import type { Catalog, CatalogEntry } from './types'
import { createCatalog } from './catalog'
import { componentMount } from '@core/registry/component-mount'
import type { VizSpec, VizInstance } from '@/core/viz/types'

/**
 * VizSpec schema entry for AI generation
 */
export interface VizSchemaEntry {
  type: string
  description: string
  vizSchema: z.ZodType<unknown>
  /**
   * Concrete example VizSpec (excluding data.source, which is user-provided).
   * Rendered as YAML in the AI prompt to show the expected output format.
   */
  example?: Record<string, unknown>
  /** Maps VizSpec encoding to component config */
  mapSpecToConfig?: (spec: VizSpec) => Record<string, unknown>
}

/**
 * VizCatalog configuration
 */
export interface VizCatalogConfig {
  /** Base catalog instance */
  catalog?: Catalog
}

/**
 * VizCatalog class
 * Provides unified interface for AI visualization generation
 */
export class VizCatalog {
  private catalog: Catalog
  private vizSchemas = new Map<string, VizSchemaEntry>()
  private typeToRegistryKey = new Map<string, string>()

  constructor(config?: VizCatalogConfig) {
    this.catalog = config?.catalog ?? createCatalog()
    this.initializeDefaultMappings()
  }

  /**
   * Initialize default VizType to registry key mappings
   */
  private initializeDefaultMappings(): void {
    // Direct mappings (VizType matches registry key)
    const directTypes = [
      'bar', 'line', 'pie', 'area', 'scatter', 'bubble',
      'histogram', 'boxplot', 'radar', 'heatmap',
      'sankey', 'treemap', 'funnel', 'waterfall',
      'gauge', 'progress', 'sparkline', 'delta', 'bigvalue'
    ]

    for (const type of directTypes) {
      this.typeToRegistryKey.set(type, type)
    }

    // Special mappings
    this.typeToRegistryKey.set('table', 'datatable')
    this.typeToRegistryKey.set('calendar', 'calendar-heatmap')

    // Infographic types all map to 'infographic'
    const infographicTypes = [
      'infographic-list', 'infographic-flow', 'infographic-hierarchy',
      'infographic-comparison', 'infographic-kpi'
    ]
    for (const type of infographicTypes) {
      this.typeToRegistryKey.set(type, 'infographic')
    }
  }

  /**
   * Register a VizSpec schema for AI generation
   */
  registerVizSchema(entry: VizSchemaEntry): void {
    this.vizSchemas.set(entry.type, entry)
  }

  /**
   * Register multiple VizSpec schemas
   */
  registerVizSchemas(entries: VizSchemaEntry[]): void {
    for (const entry of entries) {
      this.registerVizSchema(entry)
    }
  }

  /**
   * Get all registered VizSpec schemas
   */
  getAllVizSchemas(): Map<string, VizSchemaEntry> {
    return this.vizSchemas
  }

  /**
   * Get VizSpec schema for a type
   */
  getVizSchema(type: string): VizSchemaEntry | undefined {
    return this.vizSchemas.get(type)
  }

  /**
   * Check if a VizType is supported
   */
  supportsVizType(type: string): boolean {
    return this.vizSchemas.has(type) || this.typeToRegistryKey.has(type)
  }

  /**
   * Get the registry key for a VizType
   */
  getRegistryKey(vizType: string): string {
    return this.typeToRegistryKey.get(vizType) ?? vizType
  }

  /**
   * Get CatalogEntry for a VizType
   */
  getEntry(vizType: string): CatalogEntry | undefined {
    const registryKey = this.getRegistryKey(vizType)
    return this.catalog.get(registryKey)
  }

  /**
   * Get underlying Catalog
   */
  getCatalog(): Catalog {
    return this.catalog
  }

  /**
   * Transform VizSpec encoding to component config
   *
   * Maps VizSpec encoding fields to component config properties.
   * Note: encoding.color maps to config.group (for grouping/coloring by field),
   * NOT to config.color (which is a literal color value).
   */
  transformSpecToConfig(spec: VizSpec): Record<string, unknown> {
    const config: Record<string, unknown> = { ...spec.style }

    const { encoding } = spec
    if (encoding.x) config.x = encoding.x.field
    if (encoding.y) config.y = encoding.y.field
    // color encoding = grouping field (not a literal color value)
    if (encoding.color) config.group = encoding.color.field
    if (encoding.size) config.size = encoding.size.field
    if (encoding.label) config.label = encoding.label.field
    if (encoding.value) config.value = encoding.value.field

    return config
  }

  /**
   * Apply data transforms from VizSpec
   */
  applyTransforms(
    data: Record<string, unknown>[],
    spec: VizSpec
  ): Record<string, unknown>[] {
    if (!spec.data?.transform) return data

    let processedData = [...data]

    for (const transform of spec.data.transform) {
      // Handle 'convert' transform type (type conversion)
      if (transform.type === 'convert' && transform.fields) {
        processedData = processedData.map(d => {
          const newRow = { ...d }
          for (const fieldDef of transform.fields) {
            const field = fieldDef.field
            const targetType = fieldDef.type
            if (field in newRow) {
              const value = newRow[field]
              if (targetType === 'number') {
                newRow[field] = typeof value === 'number' ? value : parseFloat(String(value)) || 0
              } else if (targetType === 'string') {
                newRow[field] = String(value)
              } else if (targetType === 'boolean') {
                newRow[field] = Boolean(value)
              }
            }
          }
          return newRow
        })
      }
      // Handle 'calculate' transform type (computed fields)
      else if (transform.calculate && transform.as) {
        try {
          const func = new Function('datum', `return ${transform.calculate}`)
          processedData = processedData.map(d => ({
            ...d,
            [transform.as]: func(d)
          }))
        } catch (e) {
          console.warn(`[VizCatalog] Failed to apply transform "${transform.as}":`, e)
        }
      }
    }

    return processedData
  }

  /**
   * Render a VizSpec to a container
   * Replaces vizRegistry.render()
   */
  async render(
    container: HTMLElement,
    spec: VizSpec,
    data: Record<string, unknown>[]
  ): Promise<VizInstance> {
    const id = `viz-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    const registryKey = this.getRegistryKey(spec.type)
    console.log('[VizCatalog] render called', {
      specType: spec.type,
      registryKey,
      dataRows: data.length
    })

    // Get component entry
    const entry = this.getEntry(spec.type)
    if (!entry) {
      throw new Error(`No component found for VizType: ${spec.type} (registryKey: ${registryKey})`)
    }

    console.log('[VizCatalog] resolved component:', entry.type, entry.displayName)

    // Transform spec to config
    const config = this.transformSpecToConfig(spec)
    console.log('[VizCatalog] config:', config)

    // Apply data transforms
    const processedData = this.applyTransforms(data, spec)
    console.log('[VizCatalog] processedData sample:', processedData.slice(0, 2))

    // Build props
    let props: Record<string, unknown> = { config, data: processedData }

    if (entry.buildProps) {
      const builtProps = entry.buildProps(config, processedData, {} as any)
      console.log('[VizCatalog] builtProps:', builtProps)
      if (builtProps) {
        props = builtProps
      }
    }

    // Mount component
    const mounted = componentMount.mount(
      entry.component as typeof SvelteComponent,
      props,
      container,
      { id, className: 'w-full h-full' }
    )

    return {
      id,
      type: spec.type,
      provider: 'catalog',
      element: container,
      destroy: () => mounted.unmount(),
      update: async (newData) => {
        if (mounted.update) {
          mounted.update({ data: newData })
        }
      }
    }
  }

  /**
   * Generate AI prompt context for visualization generation.
   *
   * Auto-derived from registered VizSchemaEntry items (description + schema + example).
   * Adding a new chart type here automatically updates the prompt — no manual editing needed.
   */
  generatePromptContext(): string {
    const chartTypes: [string, VizSchemaEntry][] = []
    const infographicTypes: [string, VizSchemaEntry][] = []

    for (const [type, entry] of this.vizSchemas) {
      if (type.startsWith('infographic-')) {
        infographicTypes.push([type, entry])
      } else {
        chartTypes.push([type, entry])
      }
    }

    const lines: string[] = []

    lines.push(`You are a Visualization Expert. You generate VizSpec configuration blocks to render charts.`)
    lines.push(``)
    lines.push(`CHART SELECTION RULES (follow in order):`)
    lines.push(`1. If the user explicitly names a chart type, use that exact type.`)
    lines.push(`2. Term mapping: "line chart"→"line", "bar chart"→"bar", "pie chart"→"pie", "bubble chart"→"bubble"`)
    lines.push(`3. Only use infographic-* types when the user explicitly asks for an infographic.`)
    lines.push(``)
    lines.push(`CRITICAL DATA RULES:`)
    lines.push(`1. ONLY use column names provided in the DATA CONTEXT — never invent names.`)
    lines.push(`2. If required columns are missing, choose a simpler chart using available columns.`)
    lines.push(``)
    lines.push(`OUTPUT FORMAT:`)
    lines.push(`Output a YAML block fenced with \`\`\`vizspec ... \`\`\`.`)
    lines.push(``)

    // Chart types section
    lines.push(`## CHART TYPES`)
    lines.push(``)
    for (const [type, entry] of chartTypes) {
      lines.push(...this.formatEntryBlock(type, entry))
    }

    // Infographic types section
    if (infographicTypes.length > 0) {
      lines.push(`## INFOGRAPHIC TYPES (only when user explicitly requests)`)
      lines.push(``)
      for (const [type, entry] of infographicTypes) {
        lines.push(...this.formatEntryBlock(type, entry))
      }
    }

    return lines.join('\n')
  }

  /**
   * Format a single VizSchemaEntry as prompt lines.
   * Auto-derives schema documentation and renders example as YAML.
   */
  private formatEntryBlock(type: string, entry: VizSchemaEntry): string[] {
    const lines: string[] = []
    lines.push(`### ${type}`)
    lines.push(`${entry.description}`)
    lines.push(``)
    lines.push(`Schema:`)
    lines.push(`\`\`\``)
    lines.push(this.zodToSimplifiedString(entry.vizSchema))
    lines.push(`\`\`\``)

    if (entry.example) {
      lines.push(``)
      lines.push(`Example:`)
      lines.push(`\`\`\`vizspec`)
      lines.push(this.toYaml(entry.example))
      lines.push(`\`\`\``)
    }

    lines.push(``)
    return lines
  }

  /**
   * Minimal YAML serializer for VizSpec examples.
   * Handles the nested structures used in VizSpec (objects, arrays, strings, numbers).
   */
  private toYaml(value: unknown, indent = 0): string {
    const pad = '  '.repeat(indent)

    if (value === null || value === undefined) return `${pad}null`

    if (typeof value === 'boolean') return `${pad}${value}`
    if (typeof value === 'number') return `${pad}${value}`

    if (typeof value === 'string') {
      // Quote strings that contain special YAML characters
      return /[:{}\[\],&*#?|<>=!%@`]/.test(value) ? `${pad}"${value}"` : `${pad}${value}`
    }

    if (Array.isArray(value)) {
      if (value.length === 0) return `${pad}[]`
      return value.map(item => `${pad}- ${this.toYaml(item, 0).trimStart()}`).join('\n')
    }

    if (typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>)
      if (entries.length === 0) return `${pad}{}`
      return entries
        .map(([k, v]) => {
          if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
            return `${pad}${k}:\n${this.toYaml(v, indent + 1)}`
          }
          if (Array.isArray(v)) {
            return `${pad}${k}:\n${this.toYaml(v, indent + 1)}`
          }
          return `${pad}${k}: ${this.toYaml(v, 0).trimStart()}`
        })
        .join('\n')
    }

    return `${pad}${String(value)}`
  }

  /**
   * Convert Zod schema to human-readable string for LLM
   */
  private zodToSimplifiedString(schema: z.ZodType<unknown>): string {
    return this.parseZod((schema as any)._def)
  }

  private parseZod(def: any): string {
    if (!def) return 'any'

    const typeName = def.typeName || def.type || 'unknown'

    switch (typeName) {
      case 'ZodString':
      case 'string':
        return 'string'
      case 'ZodNumber':
      case 'number':
        return 'number'
      case 'ZodBoolean':
      case 'boolean':
        return 'boolean'
      case 'ZodDate':
      case 'date':
        return 'Date'
      case 'ZodEnum':
      case 'enum': {
        const values = def.values || (def.entries ? Object.keys(def.entries) : [])
        return 'enum(' + values.map((v: string) => '"' + v + '"').join(' | ') + ')'
      }
      case 'ZodLiteral':
      case 'literal':
        // Literal values are the actual type name (e.g. 'bar') — show as string literal
        return def.value !== undefined ? `"${def.value}"` : 'string'
      case 'ZodArray':
      case 'array':
        return 'Array<' + this.parseZod(def.type._def) + '>'
      case 'ZodOptional':
      case 'optional':
      case 'ZodNullable':
      case 'nullable':
        return this.parseZod(def.innerType._def) + ' (optional)'
      case 'ZodObject':
      case 'object': {
        const shapeFn = def.shape
        const shape = shapeFn ? (typeof shapeFn === 'function' ? shapeFn() : shapeFn) : {}
        const lines = Object.entries(shape || {}).map(([key, value]: [string, any]) => {
          const desc = value.description ? ' // ' + value.description : ''
          return '  ' + key + ': ' + this.parseZod(value._def) + desc
        })
        return '{\n' + lines.join('\n') + '\n}'
      }
      case 'ZodRecord':
      case 'record':
        return 'Record<' + this.parseZod(def.keyType._def) + ', ' + this.parseZod(def.valueType._def) + '>'
      case 'ZodIntersection':
      case 'intersection':
        return this.parseZod(def.left._def) + ' & ' + this.parseZod(def.right._def)
      default:
        return 'any'
    }
  }
}

// Re-export factory functions so existing consumers (including tests) that
// import from './viz-catalog' continue to resolve without changes.
export { getVizCatalog, initializeVizCatalog, resetVizCatalog } from './viz-catalog-init'
