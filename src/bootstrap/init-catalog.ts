/**
 * Catalog Initialization (Bootstrap Layer)
 *
 * Initializes the Catalog system for Generated UI.
 * Must be called after all plugins are registered.
 */

import { createCatalog, type Catalog } from '@core/catalog'

/**
 * Singleton catalog instance
 */
let catalog: Catalog | null = null

/**
 * Initialize the Catalog system
 *
 * Creates a Catalog instance populated from the ComponentRegistry.
 * Call this after registerPlugins() to ensure all components are available.
 *
 * @returns The initialized Catalog instance
 */
export function initializeCatalog(): Catalog {
  if (catalog) {
    console.warn('⚠️  Catalog already initialized. Returning existing instance.')
    return catalog
  }

  console.log('📚 Initializing Catalog system...')

  catalog = createCatalog()

  const types = catalog.getTypes()
  console.log(`✅ Catalog initialized: ${types.length} component types`)

  // Log component categories
  const categories = {
    chart: catalog.getByCategory('chart').length,
    input: catalog.getByCategory('input').length,
    dataViz: catalog.getByCategory('data-viz').length,
    ui: catalog.getByCategory('ui').length,
    layout: catalog.getByCategory('layout').length
  }

  console.log('   Categories:', categories)

  return catalog
}

/**
 * Get the initialized Catalog instance
 *
 * @throws Error if Catalog is not initialized
 * @returns The Catalog instance
 */
export function getCatalog(): Catalog {
  if (!catalog) {
    throw new Error(
      'Catalog not initialized. Call initializeCatalog() first during bootstrap.'
    )
  }
  return catalog
}

/**
 * Check if Catalog is initialized
 */
export function isCatalogInitialized(): boolean {
  return catalog !== null
}

/**
 * Reset the Catalog (mainly for testing)
 */
export function resetCatalog(): void {
  catalog = null
}
