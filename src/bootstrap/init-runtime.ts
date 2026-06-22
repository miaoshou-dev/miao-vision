/**
 * Shared runtime initialization for browser app and agent/headless modes.
 */

import { componentRegistry } from '@core/registry'
import { initializeVizCatalog } from '@/core/catalog'
import { registerServices } from './init-services'
import { registerVgplotCharts } from './init-charts'
import { registerPlugins } from './init-plugins'
import { initializeCatalog } from './init-catalog'

let initialized = false

export function initializeMiaoRuntime(): void {
  if (initialized) {
    return
  }

  registerServices()
  registerVgplotCharts()
  registerPlugins()
  initializeCatalog()
  initializeVizCatalog()

  initialized = true
}

export function isMiaoRuntimeInitialized(): boolean {
  return initialized
}

export function getRegisteredComponentCount(): number {
  return componentRegistry.getAllLanguages().length
}
