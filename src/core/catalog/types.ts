/**
 * Catalog Type Definitions
 *
 * Defines the Catalog interface that provides a unified view of all
 * available components for the Generated UI system.
 *
 * The Catalog bridges the existing ComponentRegistry with the new
 * UITree validation and rendering pipeline.
 */

import type { z } from 'zod'
import type { ComponentMetadata, RenderContext } from '@core/registry/component-registry'
import type { UITree, UITreeValidationResult } from '@/types/ui-tree'
import type { SvelteComponent } from 'svelte'

/**
 * AI Hints for component selection
 * Helps AI choose appropriate components based on data characteristics
 */
export interface AIHints {
  /** Data type suitability */
  suitableFor: {
    /** Compatible data types */
    dataTypes: ('numeric' | 'categorical' | 'temporal')[]
    /** Optimal cardinality range for categorical data */
    cardinalityRange?: { min?: number; max?: number }
    /** Optimal row count range */
    rowCountRange?: { min?: number; max?: number }
  }
  /** Scenarios where this component should be avoided */
  avoid: string[]
  /** Semantic information */
  semantics: {
    /** Primary purpose of the component */
    purpose: string
    /** Alternative components that could be used */
    alternatives: string[]
  }
  /** Priority for AI selection (higher = preferred) */
  priority: number
}

/**
 * Single entry in the Catalog
 * Represents a component with all metadata needed for UITree validation and rendering
 */
export interface CatalogEntry<TProps extends Record<string, unknown> = Record<string, unknown>> {
  /** Component type identifier (matches componentRegistry language) */
  type: string

  /** Human-readable display name */
  displayName: string

  /** Component description */
  description: string

  /** Zod schema for props validation */
  propsSchema: z.ZodType<TProps>

  /**
   * Svelte component class
   * Using SvelteComponent type for broad compatibility
   */
  component: typeof SvelteComponent

  /** Original ComponentMetadata for backward compatibility */
  metadata: ComponentMetadata

  /** AI hints for intelligent component selection */
  aiHints?: AIHints

  /**
   * Custom props builder function
   * Transforms raw config + data into component props
   */
  buildProps?: (
    config: Record<string, unknown>,
    data: unknown,
    context: RenderContext
  ) => TProps | null
}

/**
 * Options for creating a Catalog
 */
export interface CreateCatalogOptions {
  /**
   * Include deprecated components
   * @default false
   */
  includeDeprecated?: boolean
}

/**
 * Catalog interface
 * Provides access to all registered components and validation
 */
export interface Catalog {
  /**
   * Get all registered component types
   */
  getTypes(): string[]

  /**
   * Get a catalog entry by type
   */
  get(type: string): CatalogEntry | undefined

  /**
   * Check if a type exists in the catalog
   */
  has(type: string): boolean

  /**
   * Validate a UITree against the catalog
   * Checks that all types exist and props match schemas
   */
  validateTree(tree: UITree): UITreeValidationResult

  /**
   * Get the Zod schema for a component type
   */
  getSchema(type: string): z.ZodType<unknown> | undefined

  /**
   * Get all catalog entries
   */
  getAllEntries(): CatalogEntry[]

  /**
   * Get entries by category
   */
  getByCategory(category: string): CatalogEntry[]

  /**
   * Get entries with AI hints suitable for given data characteristics
   */
  getSuitableFor(dataTypes: ('numeric' | 'categorical' | 'temporal')[]): CatalogEntry[]
}
