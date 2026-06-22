/**
 * ComponentDefinition - Declarative Component Definition Interface
 *
 * Provides a simplified, declarative way to define components.
 * Automatically generates parser and renderer from the definition.
 * Eliminates boilerplate code in individual component files.
 */

import type { Component } from 'svelte'
import type { ParsedCodeBlock } from '@/types/report'
import type {
  ComponentMetadata,
  RegisteredComponent,
  RenderContext,
  ComponentParser,
  ComponentRenderer
} from './component-registry'
import type { ConfigSchema } from './config-parser'
import { configParser } from './config-parser'
import { dataResolver, type SelectOption } from './data-resolver'
import { componentMount } from './component-mount'
import { placeholderFactory } from './placeholder-factory'

/**
 * Data binding configuration
 * Defines how to extract data from SQL query results
 */
export interface DataBinding<TConfig = unknown, TData = unknown> {
  /**
   * Field name in config that references the data source
   * e.g., 'data', 'query'
   */
  sourceField: string

  /**
   * Transform function to convert query result to component data
   * If not provided, raw query result is used
   */
  transform?: (
    queryResult: { columns: string[]; data: Array<Record<string, unknown>>; rowCount: number },
    config: TConfig
  ) => TData
}

/**
 * Component definition interface
 * Declarative way to define a component
 */
export interface ComponentDefinition<TConfig = unknown, TProps = unknown> {
  /**
   * Component metadata for registry
   */
  metadata: ComponentMetadata

  /**
   * Configuration schema for parsing
   */
  configSchema: ConfigSchema

  /**
   * Svelte component to render
   */
  component: Component<any>

  /**
   * Data binding configuration (optional)
   * Required for components that need SQL query data
   */
  dataBinding?: DataBinding<TConfig, unknown>

  /**
   * Custom props builder (optional)
   * Override default props construction logic
   */
  buildProps?: (
    config: TConfig,
    data: unknown,
    context: RenderContext & { inputStore?: unknown }
  ) => TProps | null

  /**
   * Container class name for the mounted component
   */
  containerClass?: string
}

/**
 * Extended render context with inputStore and block
 */
export interface ExtendedRenderContext extends RenderContext {
  inputStore?: unknown
  block?: ParsedCodeBlock
}

/**
 * Create a RegisteredComponent from a ComponentDefinition
 * This is the core factory function that generates parser and renderer
 */
export function createRegistration<TConfig = unknown, TProps = unknown>(
  definition: ComponentDefinition<TConfig, TProps>
): RegisteredComponent<TProps> {
  const { metadata, configSchema, component, dataBinding, buildProps, containerClass } = definition

  // Generate parser function
  const parser: ComponentParser<TProps> = (
    block: ParsedCodeBlock,
    context: RenderContext
  ): TProps | null => {
    // 1. Parse configuration using schema
    const parseResult = configParser.parseBlock<TConfig>(block, configSchema)

    if (!parseResult.success || !parseResult.data) {
      console.warn(`[${metadata.language}] Config parsing failed:`, parseResult.errors)
      return null
    }

    const config = parseResult.data

    // 2. Resolve data if data binding is configured
    let resolvedData: unknown = null

    if (dataBinding) {
      const sourceIdentifier = (config as Record<string, unknown>)[dataBinding.sourceField] as string

      if (sourceIdentifier) {
        const dataResult = dataResolver.getQueryResult(sourceIdentifier, context.blocks)

        if (!dataResult.success || !dataResult.data) {
          // Data not available yet - return null to show placeholder
          console.log(`[${metadata.language}] Data source "${sourceIdentifier}" not available`)
          return null
        }

        // Apply transform if provided
        if (dataBinding.transform) {
          resolvedData = dataBinding.transform(dataResult.data, config)
        } else {
          resolvedData = dataResult.data
        }
      }
    }

    // 3. Build props - include block in context for custom parsing
    const extendedContext = {
      ...context,
      block  // Add block for components that need raw content access
    } as ExtendedRenderContext

    if (buildProps) {
      return buildProps(config, resolvedData, extendedContext)
    }

    // Default props structure
    return {
      config,
      data: resolvedData,
      ...extendedContext
    } as TProps
  }

  // Generate renderer function
  const renderer: ComponentRenderer<TProps> = async (
    container: HTMLElement,
    props: TProps,
    _context: RenderContext
  ) => {
    // Handle null props (data not ready)
    if (!props) {
      const placeholder = placeholderFactory.createPending(metadata.displayName)
      container.appendChild(placeholder)
      return null as any
    }

    try {
      // Mount the component
      const mounted = componentMount.mount(component, props as any, container, {
        className: containerClass || `${metadata.language}-wrapper`,
        onMounted: () => {
          console.log(`✅ ${metadata.displayName} mounted`)
        }
      })

      return mounted.instance
    } catch (error) {
      console.error(`[${metadata.language}] Render failed:`, error)
      const errorPlaceholder = placeholderFactory.createError(
        error instanceof Error ? error : new Error(String(error)),
        metadata.displayName
      )
      container.appendChild(errorPlaceholder)
      return null as any
    }
  }

  return {
    metadata,
    parser,
    renderer,
    component: component as any,
    buildProps: buildProps as RegisteredComponent<TProps>['buildProps']
  }
}

/**
 * Convenience function: Define and create registration in one call
 */
export function defineComponent<TConfig = unknown, TProps = unknown>(
  definition: ComponentDefinition<TConfig, TProps>
): RegisteredComponent<TProps> {
  return createRegistration(definition)
}

/**
 * Helper: Create select options transform for dropdowns/buttongroups
 */
export function createSelectOptionsTransform(
  valueColumn: string,
  labelColumn?: string
): DataBinding<{ value: string; label?: string }, SelectOption[]>['transform'] {
  return (queryResult, _config) => {
    const options: SelectOption[] = []
    const valueCol = valueColumn
    const labelCol = labelColumn || valueColumn

    for (const row of queryResult.data) {
      const value = row[valueCol]
      const label = row[labelCol]

      if (value !== null && value !== undefined) {
        options.push({
          value: String(value),
          label: String(label ?? value)
        })
      }
    }

    return options
  }
}

/**
 * Helper: Create single value transform for BigValue/Value
 */
export function createSingleValueTransform(
  columnName: string,
  rowIndex: number = 0
): DataBinding<{ column?: string }, unknown>['transform'] {
  return (queryResult, config) => {
    const column = (config as Record<string, unknown>).column as string || columnName

    if (queryResult.data.length <= rowIndex) {
      return null
    }

    return queryResult.data[rowIndex][column]
  }
}

/**
 * Helper: Create table data transform for DataTable
 */
export function createTableDataTransform(): DataBinding<unknown, { columns: string[]; rows: unknown[] }>['transform'] {
  return (queryResult) => ({
    columns: queryResult.columns,
    rows: queryResult.data
  })
}

/**
 * Type guard: Check if props are available
 */
export function hasProps<T>(props: T | null): props is T {
  return props !== null
}
