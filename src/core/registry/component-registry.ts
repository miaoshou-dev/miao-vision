/**
 * Component Registry System
 *
 * Unified system for registering and managing all Evidence-style components
 * (Charts, Inputs, Data Visualization, UI components)
 */

import type { ParsedCodeBlock, ReportBlock } from '@/types/report'
import type { SvelteComponent } from 'svelte'

/**
 * Component category types
 */
export type ComponentCategory = 'chart' | 'input' | 'data-viz' | 'ui' | 'layout'

/**
 * Property data types
 */
export type PropType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'array'
  | 'object'
  | 'query'  // Reference to SQL query result

/**
 * Property definition for component metadata
 */
export interface PropDefinition {
  /** Property name */
  name: string
  /** Data type */
  type: PropType
  /** Is this property required? */
  required: boolean
  /** Default value if not provided */
  default?: any
  /** Human-readable description */
  description?: string
  /** Valid values (for enum-like properties) */
  options?: string[]
  /** Example values */
  examples?: string[]
}

/**
 * Component metadata
 * Describes a component's capabilities and requirements
 */
export interface ComponentMetadata {
  /** Component type category */
  type: ComponentCategory
  /** Code block language identifier (e.g., 'line', 'dropdown', 'bigvalue') */
  language: string
  /** Display name for documentation */
  displayName: string
  /** Component description */
  description: string
  /** Property definitions */
  props: PropDefinition[]
  /** Usage examples in markdown */
  examples?: string[]
  /** Component category for grouping (e.g., 'time-series', 'comparison') */
  category?: string
  /** Icon emoji for documentation */
  icon?: string
  /** Tags for searchability */
  tags?: string[]
}

/**
 * Render context passed to parsers and renderers
 */
export interface RenderContext {
  /** All executed blocks in the report */
  blocks: ReportBlock[]
  /** Current input values */
  inputs: Record<string, any>
  /** Report metadata */
  metadata: Record<string, any>
  /** Table mapping (block name -> DuckDB table name) */
  tableMapping?: Map<string, string>
}

/**
 * Parser function
 * Parses markdown code block content into component props
 */
export type ComponentParser<T = any> = (
  block: ParsedCodeBlock,
  context: RenderContext
) => T | null

/**
 * Renderer function
 * Renders component to DOM using Svelte
 */
export type ComponentRenderer<T = any> = (
  container: HTMLElement,
  props: T,
  context: RenderContext
) => Promise<SvelteComponent> | SvelteComponent

/**
 * Validator function
 * Validates component props before rendering
 */
export type ComponentValidator<T = any> = (
  props: T,
  metadata: ComponentMetadata
) => { valid: boolean; errors: string[] }

/**
 * Complete component registration
 */
export interface RegisteredComponent<T = any> {
  /** Component metadata */
  metadata: ComponentMetadata
  /** Parser function */
  parser: ComponentParser<T>
  /** Renderer function */
  renderer: ComponentRenderer<T>
  /** Optional validator */
  validator?: ComponentValidator<T>
  /** Svelte component class (optional, for direct instantiation) */
  component?: typeof SvelteComponent
  /** Optional direct props builder used by visualization providers */
  buildProps?: (
    config: Record<string, any>,
    data: unknown,
    context: RenderContext
  ) => T | null
}

/**
 * Component Registry
 * Central registry for all Evidence-style components
 */
export class ComponentRegistry {
  private components = new Map<string, RegisteredComponent>()

  /**
   * Register a new component
   */
  register<T = any>(registration: RegisteredComponent<T>): void {
    const { language } = registration.metadata

    if (this.components.has(language)) {
      console.warn(`⚠️  Component "${language}" is already registered. Overwriting.`)
    }

    this.components.set(language, registration)
    console.log(`✅ Registered component: ${language} (${registration.metadata.displayName})`)
  }

  /**
   * Register multiple components at once
   */
  registerMany(registrations: RegisteredComponent[]): void {
    for (const registration of registrations) {
      this.register(registration)
    }
  }

  /**
   * Get component by language identifier
   */
  get(language: string): RegisteredComponent | undefined {
    return this.components.get(language)
  }

  /**
   * Check if a component is registered
   */
  has(language: string): boolean {
    return this.components.has(language)
  }

  /**
   * Get all registered component languages
   */
  getAllLanguages(): string[] {
    return Array.from(this.components.keys())
  }

  /**
   * Get all components of a specific category
   */
  getByCategory(category: ComponentCategory): RegisteredComponent[] {
    return Array.from(this.components.values()).filter(
      comp => comp.metadata.type === category
    )
  }

  /**
   * Get all components matching tags
   */
  getByTags(tags: string[]): RegisteredComponent[] {
    return Array.from(this.components.values()).filter(comp => {
      const componentTags = comp.metadata.tags || []
      return tags.some(tag => componentTags.includes(tag))
    })
  }

  /**
   * Get component metadata by language
   */
  getMetadata(language: string): ComponentMetadata | undefined {
    const component = this.components.get(language)
    return component?.metadata
  }

  /**
   * Get all component metadata (for documentation generation)
   */
  getAllMetadata(): ComponentMetadata[] {
    return Array.from(this.components.values()).map(comp => comp.metadata)
  }

  /**
   * Clear all registrations (mainly for testing)
   */
  clear(): void {
    this.components.clear()
  }

  /**
   * Validate component props against metadata
   */
  validate<T = any>(language: string, props: T): { valid: boolean; errors: string[] } {
    const component = this.components.get(language)

    if (!component) {
      return {
        valid: false,
        errors: [`Unknown component type: ${language}`]
      }
    }

    // Use custom validator if provided
    if (component.validator) {
      return component.validator(props, component.metadata)
    }

    // Default validation based on metadata
    return this.defaultValidate(props, component.metadata)
  }

  /**
   * Default validation logic
   */
  private defaultValidate<T = any>(
    props: T,
    metadata: ComponentMetadata
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    const propObj = props as Record<string, any>

    // Check required props
    for (const propDef of metadata.props) {
      if (propDef.required && !(propDef.name in propObj)) {
        errors.push(`Missing required property: ${propDef.name}`)
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

/**
 * Singleton instance
 */
export const componentRegistry = new ComponentRegistry()

/**
 * Helper function to create component metadata
 */
export function createMetadata(config: ComponentMetadata): ComponentMetadata {
  return config
}

/**
 * Chart block types that need placeholders (vgplot charts only)
 * Note: histogram is now a plugin component, not a vgplot chart
 */
const CHART_TYPES = ['chart', 'line', 'area', 'bar', 'scatter', 'pie']

/**
 * Check if a code block language should have a placeholder in markdown
 *
 * Called by rehype-block-placeholder to determine if a ```language
 * code block should be replaced with a <div class="block-placeholder">
 * for later component mounting.
 *
 * @param language - The code block language (e.g., 'sql', 'dropdown', 'chart')
 * @returns true if the block should get a placeholder
 */
export function shouldCreatePlaceholder(language: string): boolean {
  // SQL blocks always get placeholders (executed by DuckDB)
  if (language === 'sql') {
    return true
  }

  // Chart blocks get placeholders (rendered via vgplot)
  if (CHART_TYPES.includes(language)) {
    return true
  }

  // Check component registry (dropdown, buttongroup, bigvalue, datatable, etc.)
  return componentRegistry.has(language)
}
