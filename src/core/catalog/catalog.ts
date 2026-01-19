/**
 * Catalog Factory
 *
 * Creates a Catalog instance from the existing ComponentRegistry.
 * The Catalog provides a unified interface for UITree validation
 * and component discovery.
 */

import { z } from 'zod'
import type { SvelteComponent } from 'svelte'
import {
  componentRegistry,
  type ComponentMetadata,
  type PropDefinition,
  type RegisteredComponent
} from '@core/registry/component-registry'
import type { UITree, UITreeValidationResult } from '@/types/ui-tree'
import type { Catalog, CatalogEntry, CreateCatalogOptions } from './types'
import { validateTree } from './tree-validator'

/**
 * Convert PropDefinition type to Zod type
 */
function propTypeToZod(prop: PropDefinition): z.ZodTypeAny {
  let schema: z.ZodTypeAny

  switch (prop.type) {
    case 'string':
      if (prop.options && prop.options.length > 0) {
        // Enum-like string with options
        schema = z.enum(prop.options as [string, ...string[]])
      } else {
        schema = z.string()
      }
      break

    case 'number':
      schema = z.number()
      break

    case 'boolean':
      schema = z.boolean()
      break

    case 'date':
      schema = z.union([z.string(), z.date()])
      break

    case 'array':
      schema = z.array(z.unknown())
      break

    case 'object':
      schema = z.record(z.string(), z.unknown())
      break

    case 'query':
      // Query references are strings (block names)
      schema = z.string()
      break

    default:
      schema = z.unknown()
  }

  // Apply optional/required
  if (!prop.required) {
    if (prop.default !== undefined) {
      schema = schema.optional().default(prop.default)
    } else {
      schema = schema.optional()
    }
  }

  return schema
}

/**
 * Convert ComponentMetadata props to Zod schema
 */
function metadataToZodSchema(metadata: ComponentMetadata): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {}

  for (const prop of metadata.props) {
    shape[prop.name] = propTypeToZod(prop)
  }

  // Add passthrough for unknown props to be permissive
  return z.object(shape).passthrough()
}

/**
 * Create a CatalogEntry from a RegisteredComponent
 */
function createCatalogEntry(
  registered: RegisteredComponent,
  type: string
): CatalogEntry {
  const { metadata, component, buildProps } = registered

  // Generate Zod schema from metadata props
  const propsSchema = metadataToZodSchema(metadata)

  return {
    type,
    displayName: metadata.displayName,
    description: metadata.description,
    propsSchema,
    component: component as typeof SvelteComponent,
    metadata,
    buildProps: buildProps as CatalogEntry['buildProps']
  }
}

/**
 * Catalog implementation
 */
class CatalogImpl implements Catalog {
  private entries = new Map<string, CatalogEntry>()

  constructor(options?: CreateCatalogOptions) {
    this.buildFromRegistry(options)
  }

  /**
   * Build catalog entries from component registry
   */
  private buildFromRegistry(_options?: CreateCatalogOptions): void {
    const languages = componentRegistry.getAllLanguages()

    for (const language of languages) {
      const registered = componentRegistry.get(language)
      if (registered) {
        const entry = createCatalogEntry(registered, language)
        this.entries.set(language, entry)
      }
    }
  }

  getTypes(): string[] {
    return Array.from(this.entries.keys())
  }

  get(type: string): CatalogEntry | undefined {
    return this.entries.get(type)
  }

  has(type: string): boolean {
    return this.entries.has(type)
  }

  validateTree(tree: UITree): UITreeValidationResult {
    return validateTree(tree, this)
  }

  getSchema(type: string): z.ZodType<unknown> | undefined {
    return this.entries.get(type)?.propsSchema
  }

  getAllEntries(): CatalogEntry[] {
    return Array.from(this.entries.values())
  }

  getByCategory(category: string): CatalogEntry[] {
    return Array.from(this.entries.values()).filter(
      entry => entry.metadata.type === category
    )
  }

  getSuitableFor(dataTypes: ('numeric' | 'categorical' | 'temporal')[]): CatalogEntry[] {
    return Array.from(this.entries.values()).filter(entry => {
      if (!entry.aiHints) return false
      return dataTypes.some(dt =>
        entry.aiHints!.suitableFor.dataTypes.includes(dt)
      )
    })
  }

  /**
   * Add or update an entry (for dynamic registration)
   */
  set(type: string, entry: CatalogEntry): void {
    this.entries.set(type, entry)
  }

  /**
   * Get catalog size
   */
  get size(): number {
    return this.entries.size
  }
}

/**
 * Create a new Catalog instance
 *
 * @param options - Creation options
 * @returns Catalog instance populated from ComponentRegistry
 */
export function createCatalog(options?: CreateCatalogOptions): Catalog {
  return new CatalogImpl(options)
}

/**
 * Extended Catalog interface with mutation methods
 * (Used internally, not exposed in public interface)
 */
export interface MutableCatalog extends Catalog {
  set(type: string, entry: CatalogEntry): void
  readonly size: number
}

/**
 * Create a mutable catalog (for testing or dynamic registration)
 */
export function createMutableCatalog(options?: CreateCatalogOptions): MutableCatalog {
  return new CatalogImpl(options)
}
