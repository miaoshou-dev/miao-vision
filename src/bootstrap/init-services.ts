/**
 * Service Initialization (Bootstrap Layer)
 *
 * Registers service implementations with the core service registry.
 * This allows core/ to use plugin functionality without direct imports.
 */

import {
  registerInputInitializer,
  registerDatabaseStore
} from '@core/services'
import type { IInputInitializer, IInputStore, IDatabaseStore } from '@/types/interfaces'
import type { ParsedCodeBlock } from '@/types/report'

// Import actual implementations from plugins
import { initializeInputDefaults } from '@plugins/inputs/initialize-defaults'

// Import database store from app
import { databaseStore } from '@app/stores/database.svelte'

/**
 * Input initializer adapter
 * Wraps plugin input initializer to match IInputInitializer interface
 */
const inputInitializerAdapter: IInputInitializer = {
  initializeDefaults(blocks: ParsedCodeBlock[], inputStore: IInputStore): void {
    // The plugin's initializeInputDefaults expects a full InputStore
    // but our interface only exposes the minimal methods needed
    initializeInputDefaults(blocks, inputStore as any)
  }
}

/**
 * Database store adapter
 * Wraps app database store to match IDatabaseStore interface
 */
const databaseStoreAdapter: IDatabaseStore = {
  get state() {
    return {
      initialized: databaseStore.state.initialized,
      loading: databaseStore.state.loading,
      error: databaseStore.state.error
    }
  },

  executeQuery(sql: string) {
    return databaseStore.executeQuery(sql)
  }
}

/**
 * Register all services with the core service registry
 */
export function registerServices(): void {
  console.log('🔧 Registering services...')

  registerInputInitializer(inputInitializerAdapter)
  registerDatabaseStore(databaseStoreAdapter)

  console.log('✅ Services registered')
}
