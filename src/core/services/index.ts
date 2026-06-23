/**
 * Service Registry
 *
 * Provides dependency injection for core services.
 * Services are registered during bootstrap and accessed via getters.
 * This allows core/ to use plugin functionality without direct imports.
 */

import type {
  IInputInitializer,
  IDatabaseStore
} from '@/types/interfaces'

/**
 * Service registry state
 */
interface ServiceRegistry {
  inputInitializer: IInputInitializer | null
  databaseStore: IDatabaseStore | null
}

const registry: ServiceRegistry = {
  inputInitializer: null,
  databaseStore: null
}

/**
 * Register the input initializer service
 */
export function registerInputInitializer(initializer: IInputInitializer): void {
  registry.inputInitializer = initializer
  console.log('✅ InputInitializer service registered')
}

/**
 * Register the database store service
 */
export function registerDatabaseStore(store: IDatabaseStore): void {
  registry.databaseStore = store
  console.log('✅ DatabaseStore service registered')
}

/**
 * Get the input initializer service
 * @throws Error if not registered
 */
export function getInputInitializer(): IInputInitializer {
  if (!registry.inputInitializer) {
    throw new Error('InputInitializer service not registered. Call registerInputInitializer() during bootstrap.')
  }
  return registry.inputInitializer
}

/**
 * Get the database store service
 * @throws Error if not registered
 */
export function getDatabaseStore(): IDatabaseStore {
  if (!registry.databaseStore) {
    throw new Error('DatabaseStore service not registered. Call registerDatabaseStore() during bootstrap.')
  }
  return registry.databaseStore
}

/**
 * Check if services are registered
 */
export function isServicesReady(): boolean {
  return (
    registry.inputInitializer !== null &&
    registry.databaseStore !== null
  )
}
