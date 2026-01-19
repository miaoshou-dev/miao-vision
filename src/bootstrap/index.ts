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
import { registerServices } from "./init-services";
import { registerVgplotCharts } from "./init-charts";
import { registerPlugins } from "./init-plugins";
import { initializeVizLayer } from "@/core/viz/init";
import { initializeCatalog } from "./init-catalog";

/**
 * Initialize the application
 *
 * Call this once at application startup in main.ts
 */
export function initializeApp(): void {
  console.log("🚀 Bootstrapping application...");

  // 1. Register core services first (DI for chart builder, input initializer)
  registerServices();

  // 2. Register vgplot charts (chart, line, area, scatter)
  registerVgplotCharts();

  // 3. Register all plugin components
  registerPlugins();

  // 4. Initialize Viz Provider Layer (Generative UI)
  // @deprecated - Use Catalog system instead. Will be removed in future version.
  initializeVizLayer();

  // 5. Initialize Catalog system (new unified component catalog)
  initializeCatalog();

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
export { registerVgplotCharts } from "./init-charts";
export { registerPlugins } from "./init-plugins";
export { initializeCatalog, getCatalog, isCatalogInitialized } from "./init-catalog";
