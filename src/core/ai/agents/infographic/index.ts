/**
 * Infographic Agent Module
 *
 * Independent AI agent for converting articles to infographics.
 * Uses a three-phase pipeline: Outline → Narrative → Generate.
 *
 * @module core/ai/agents/infographic
 *
 * @example
 * ```typescript
 * import { createInfographicAgent, articleToInfographic } from '@core/ai/agents/infographic'
 *
 * // Using the agent
 * const agent = createInfographicAgent({ provider: myLLMProvider })
 * const result = await agent.run({
 *   article: 'Your article text here...',
 *   style: 'detailed'
 * })
 *
 * // Quick function
 * const result = await articleToInfographic(article, provider, { style: 'minimal' })
 *
 * // Streaming with progress
 * for await (const progress of agent.stream({ article })) {
 *   console.log(`${progress.phase}: ${progress.progress}%`)
 * }
 * ```
 */

// Main agent
export { InfographicAgent, type InfographicAgentConfig, type InfographicProgress } from './agent'

import { InfographicAgent } from './agent'
import type { InfographicAgentConfig, InfographicInput, InfographicResult } from './types'
import type { LLMProvider } from '../../types'

/** Create an InfographicAgent instance */
export function createInfographicAgent(config: InfographicAgentConfig): InfographicAgent {
  return new InfographicAgent(config)
}

/** Quick conversion function */
export async function articleToInfographic(
  article: string,
  provider: LLMProvider,
  options: Partial<InfographicInput> = {}
): Promise<InfographicResult> {
  return new InfographicAgent({ provider }).run({ article, ...options })
}

// Phase processors (for advanced use)
export { ArticleOutliner, createOutliner, type OutlinerConfig } from './outliner'
export { NarrativePlanner, createNarrativePlanner, type NarrativePlannerConfig } from './narrative'
export { InfographicGenerator, createGenerator, type GeneratorConfig } from './generator'

// Types
export type {
  // Input/Output
  InfographicInput,
  InfographicOutput,
  InfographicResult,
  InfographicStyle,

  // Phase 1: Outline
  ArticleOutline,
  ArticleType,
  ArticlePoint,
  ArticleConcept,
  ExtractedDataPoint,
  OutlineResult,

  // Phase 2: Narrative
  NarrativePlan,
  NarrativeSection,
  NarrativeElement,
  NarrativeResult,
  VisualMetaphor,
  VisualType,
  SectionRole,
  FlowDirection,

  // Phase 3: Infographic
  InfographicSection,
  InfographicItem,

  // Multi-style variants
  StyleVariantId,
  InfographicVariant,
  MultiVariantResult
} from './types'

// Utilities
export {
  parseYamlResponse,
  getTemplateForVisualType,
  getAvailableTemplateIds,
  selectIconForLabel,
  VISUAL_TYPE_TO_TEMPLATE
} from './utils'

// UISpec conversion (InfographicOutput → UITree)
export { toUITree, buildSectionElement, buildLayoutElement } from './ui-spec-converter'

// UISpec streaming (InfographicOutput → AsyncGenerator<UITreePatch>)
export { streamUITreePatches, collectPatches } from './ui-spec-stream'
