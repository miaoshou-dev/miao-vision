/**
 * CatalogPromptGenerator
 *
 * Generates AI prompts for visualization generation using VizCatalog.
 * Updated in Phase 2 to use Catalog system instead of deprecated vizRegistry.
 */

import { getVizCatalog } from '@/core/catalog'

export class CatalogPromptGenerator {
  /**
   * Generates the "System Prompt" part related to Visualizations.
   * Uses VizCatalog to dynamically list available components.
   */
  generateSystemThinkingContext(): string {
    const vizCatalog = getVizCatalog()
    return vizCatalog.generatePromptContext()
  }
}

export const catalogPrompt = new CatalogPromptGenerator()
