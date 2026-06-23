/**
 * Bootstrap Module
 *
 * Application initialization and component registration.
 *
 * This layer exists to:
 * 1. Keep core/ free of plugin dependencies (clean architecture)
 * 2. Centralize all initialization logic
 * 3. Control registration order
 *
 * Dependency flow:
 *   main.ts → bootstrap/ → plugins/ → core/
 *                       ↘ core/
 */

import { componentRegistry } from "@core/registry";
import { initializeMiaoRuntime } from "./init-runtime";

/**
 * Initialize the application
 *
 * Call this once at application startup in main.ts
 */
export function initializeApp(): void {
  console.log("🚀 Bootstrapping application...");

  initializeMiaoRuntime();

  console.log(`\n✅ Bootstrap complete: ${componentRegistry.getAllLanguages().length} components registered`)
  console.log('   Languages:', componentRegistry.getAllLanguages().join(', '))
}

/**
 * Get documentation for all registered components
 */
export function getComponentDocumentation() {
  const allMetadata = componentRegistry.getAllMetadata()

  return {
    total: allMetadata.length,
    byCategory: {
      chart: componentRegistry.getByCategory('chart').length,
      input: componentRegistry.getByCategory('input').length,
      dataViz: componentRegistry.getByCategory('data-viz').length,
      ui: componentRegistry.getByCategory('ui').length,
      layout: componentRegistry.getByCategory('layout').length
    },
    components: allMetadata.map(m => ({
      language: m.language,
      displayName: m.displayName,
      type: m.type,
      description: m.description,
      propsCount: m.props.length,
      requiredProps: m.props.filter(p => p.required).map(p => p.name)
    }))
  }
}

// Re-export for convenience
export { registerServices } from "./init-services";
export { registerPlugins } from "./init-plugins";
export { initializeCatalog, getCatalog, isCatalogInitialized } from "./init-catalog";
export { initializeMiaoRuntime, isMiaoRuntimeInitialized } from "./init-runtime";
