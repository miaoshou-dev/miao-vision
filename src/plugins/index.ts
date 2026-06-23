/**
 * Plugins Module
 *
 * Central export point for all plugins.
 * Use registerAllPlugins() to register all plugins at once.
 */

import type { ComponentRegistry } from '@core/registry'

// Import plugin registration functions
import { registerInputPlugins, inputPlugins } from './inputs'
import { registerDataDisplayPlugins, dataDisplayPlugins } from './data-display'
import { registerUIPlugins, uiPlugins } from './ui'
import { registerMapPlugins, mapPlugins } from './maps'

// Re-export all plugins
export * from './inputs'
export * from './data-display'
export * from './ui'
export * from './maps'

/**
 * Register all plugins with the component registry
 *
 * Call this once at application startup after initializing the registry.
 *
 * @example
 * ```typescript
 * import { componentRegistry } from '@core/registry'
 * import { registerAllPlugins } from '@plugins'
 *
 * registerAllPlugins(componentRegistry)
 * ```
 */
export function registerAllPlugins(registry: ComponentRegistry): void {
  console.log('🔌 Registering all plugins...')

  registerInputPlugins(registry)
  registerDataDisplayPlugins(registry)
  registerUIPlugins(registry)
  registerMapPlugins(registry)

  console.log('✅ All plugins registered!')
}

/**
 * All plugin registrations (for manual iteration)
 */
export const allPlugins = [
  ...inputPlugins,
  ...dataDisplayPlugins,
  ...uiPlugins,
  ...mapPlugins
]
