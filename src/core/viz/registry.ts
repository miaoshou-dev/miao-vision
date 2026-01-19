/**
 * VizRegistry - Visualization Provider Registry
 *
 * @deprecated This module is deprecated. Use the Catalog system from '@core/catalog' instead.
 * The Catalog provides a unified interface for component discovery, validation, and rendering.
 *
 * Migration guide:
 * - Replace `vizRegistry.getMetadata(type)` with `getCatalog().get(type)`
 * - Replace `vizRegistry.getAllMetadata()` with `getCatalog().getAllEntries()`
 * - Replace `vizRegistry.render(...)` with direct Svelte component mounting via Catalog
 *
 * This module will be removed in a future version.
 */

import type { IVizProvider, VizType, VizInstance, VizSpec } from './types'
import { z } from 'zod'

/** @deprecated Use CatalogEntry from '@core/catalog' instead */
export interface ComponentMetadata {
  description: string
  schema: z.ZodType<any>
}

/**
 * @deprecated Use Catalog from '@core/catalog' instead
 */
class VizRegistry {
  private providers = new Map<string, IVizProvider>()
  private metadata = new Map<VizType, ComponentMetadata>()
  private deprecationWarned = new Set<string>()

  private warnDeprecation(method: string): void {
    if (!this.deprecationWarned.has(method)) {
      console.warn(
        `⚠️ [Deprecated] vizRegistry.${method}() is deprecated. ` +
        `Use Catalog from '@core/catalog' instead.`
      )
      this.deprecationWarned.add(method)
    }
  }

  /**
   * Register a provider
   * @deprecated Use Catalog system instead
   */
  registerProvider(name: string, provider: IVizProvider): void {
    this.providers.set(name, provider)
  }

  /**
   * Register metadata and schema for a visualization type
   * @deprecated Use Catalog system instead
   */
  registerMetadata(type: VizType, metadata: ComponentMetadata): void {
    this.metadata.set(type, metadata)
  }

  /**
   * Get provider for a specific type
   * @deprecated Use Catalog system instead
   */
  getProviderForType(type: VizType): IVizProvider | null {
    this.warnDeprecation('getProviderForType')
    for (const provider of this.providers.values()) {
      if (provider.supports(type)) {
        return provider
      }
    }
    return null
  }

  /**
   * Get metadata for AI generation
   * @deprecated Use getCatalog().get(type) instead
   */
  getMetadata(type: VizType): ComponentMetadata | undefined {
    this.warnDeprecation('getMetadata')
    return this.metadata.get(type)
  }

  /**
   * Get all registered types with their metadata
   * @deprecated Use getCatalog().getAllEntries() instead
   */
  getAllMetadata(): Record<VizType, ComponentMetadata> {
    this.warnDeprecation('getAllMetadata')
    const result: Partial<Record<VizType, ComponentMetadata>> = {}
    for (const [type, meta] of this.metadata) {
      result[type] = meta
    }
    return result as Record<VizType, ComponentMetadata>
  }

  /**
   * Main render method
   * @deprecated Use Catalog and direct Svelte component mounting instead
   */
  async render(
    container: HTMLElement,
    spec: VizSpec,
    data: Record<string, unknown>[]
  ): Promise<VizInstance> {
    this.warnDeprecation('render')
    const provider = this.getProviderForType(spec.type)
    if (!provider) {
      throw new Error(`No provider found for visualization type: ${spec.type}`)
    }
    return provider.render(container, spec, data)
  }
}

/** @deprecated Use getCatalog() from '@bootstrap' instead */
export const vizRegistry = new VizRegistry()
