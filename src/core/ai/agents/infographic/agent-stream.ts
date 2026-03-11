/**
 * Streaming helpers for InfographicAgent
 *
 * Extracted async generator functions and factory utilities to keep agent.ts
 * under the 500-line file size limit.
 */

import type { ArticleOutliner } from './outliner'
import type { NarrativePlanner } from './narrative'
import type { InfographicGenerator } from './generator'
import type {
  InfographicInput,
  ArticleOutline,
  NarrativePlan,
  InfographicVariant,
  InfographicProgress
} from './types'
/**
 * Stream the full three-phase pipeline with progress updates.
 */
export async function* streamPipeline(
  outliner: ArticleOutliner,
  narrativePlanner: NarrativePlanner,
  generator: InfographicGenerator,
  input: InfographicInput,
  detectLanguage: (text: string) => 'zh' | 'en'
): AsyncGenerator<InfographicProgress, void, unknown> {
  const { article, style = 'detailed', language, maxSections } = input
  const detectedLanguage = language ?? detectLanguage(article)

  let outline: ArticleOutline | undefined
  let narrativePlan: NarrativePlan | undefined

  // Phase 1: Outline (0-33%)
  yield { phase: 'outlining', progress: 0, message: 'Analyzing article structure...' }

  for await (const update of outliner.analyzeStream(article, detectedLanguage)) {
    yield {
      phase: 'outlining',
      progress: Math.round(update.progress * 0.33),
      message: update.message,
      data: update.outline ? { outline: update.outline } : undefined
    }
    if (update.outline) outline = update.outline
  }

  if (!outline) throw new Error('Failed to analyze article')

  // Phase 2: Narrative Planning (33-66%)
  yield { phase: 'planning', progress: 33, message: 'Planning visual narrative...', data: { outline } }

  for await (const update of narrativePlanner.planStream(outline, style)) {
    yield {
      phase: 'planning',
      progress: 33 + Math.round(update.progress * 0.33),
      message: update.message,
      data: update.plan ? { outline, narrativePlan: update.plan } : { outline }
    }
    if (update.plan) narrativePlan = update.plan
  }

  if (!narrativePlan) throw new Error('Failed to plan narrative')

  if (maxSections && narrativePlan.sections.length > maxSections) {
    narrativePlan.sections = narrativePlan.sections.slice(0, maxSections)
  }

  // Phase 3: Generate (66-100%)
  yield {
    phase: 'generating',
    progress: 66,
    message: 'Generating infographic...',
    data: { outline, narrativePlan }
  }

  const generateResult = await generator.generate(narrativePlan, detectedLanguage)

  if (!generateResult.success || !generateResult.infographic) {
    throw new Error(generateResult.error || 'Failed to generate infographic')
  }

  const infographic = generateResult.infographic
  infographic.metadata.articleLength = article.length

  yield {
    phase: 'complete',
    progress: 100,
    message: 'Complete',
    data: { outline, narrativePlan, infographic },
    done: true
  }
}

/**
 * Stream outline + variant generation with progress updates.
 */
export async function* streamVariants(
  outliner: ArticleOutliner,
  generator: InfographicGenerator,
  input: InfographicInput,
  detectLanguage: (text: string) => 'zh' | 'en'
): AsyncGenerator<InfographicProgress & { variants?: InfographicVariant[] }, void, unknown> {
  const { article, language } = input
  const detectedLanguage = language ?? detectLanguage(article)

  let outline: ArticleOutline | undefined

  // Phase 1: Outline (0-70%)
  yield { phase: 'outlining', progress: 0, message: 'Analyzing article structure...' }

  for await (const update of outliner.analyzeStream(article, detectedLanguage)) {
    yield {
      phase: 'outlining',
      progress: Math.round(update.progress * 0.7),
      message: update.message,
      data: update.outline ? { outline: update.outline } : undefined
    }
    if (update.outline) outline = update.outline
  }

  if (!outline) throw new Error('Failed to analyze article')

  // Phase 2: Generate variants (70-100%)
  yield { phase: 'generating', progress: 70, message: 'Generating style variants...', data: { outline } }

  const variantResult = generator.generateVariants(outline, detectedLanguage)

  if (!variantResult.success || !variantResult.variants) {
    throw new Error(variantResult.error || 'Failed to generate variants')
  }

  for (const variant of variantResult.variants) {
    variant.infographic.metadata.articleLength = article.length
  }

  yield {
    phase: 'complete',
    progress: 100,
    message: 'Complete - 3 style variants generated',
    data: { outline },
    variants: variantResult.variants,
    done: true
  }
}
