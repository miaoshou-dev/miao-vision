/**
 * Infographic Agent Prompts — barrel re-export
 *
 * System and user prompts for the three-phase pipeline:
 * - Phase 1: ArticleOutliner  → prompts-outliner.ts
 * - Phase 2: NarrativePlanner → prompts-narrative.ts
 * - Phase 3: InfographicGenerator → prompts-generator.ts
 *
 * @module core/ai/agents/infographic/prompts
 */

export {
  OUTLINER_SYSTEM_PROMPT,
  buildOutlinerUserPrompt,
  OUTLINER_EXAMPLES,
} from './prompts-outliner'

export {
  buildNarrativePlannerSystemPrompt,
  buildNarrativePlannerUserPrompt,
  NARRATIVE_EXAMPLES,
} from './prompts-narrative'

export {
  buildGeneratorSystemPrompt,
  buildGeneratorUserPrompt,
} from './prompts-generator'
