import type { AgentPosterSpec } from '../types'

export type PosterRenderMode = 'ranking' | 'share' | 'comparison' | 'trend' | 'flow' | 'geo-ranking' | 'timeline'

const modes: Record<string, PosterRenderMode> = {
  'ranked-story': 'ranking',
  'share-story': 'share',
  'timeline-story': 'timeline',
  'trend-story': 'trend',
  'comparison-story': 'comparison',
  'flow-story': 'flow',
  'geo-ranking-story': 'geo-ranking'
}

export function getPosterRenderMode(poster: AgentPosterSpec): PosterRenderMode {
  return modes[poster.composition ?? 'ranked-story'] ?? 'ranking'
}

export function getPosterTemplateComposition(template: AgentPosterSpec['template']): string | undefined {
  if (template === 'data-poster-ranking') return 'ranked-story'
  if (template === 'data-poster-share') return 'share-story'
  if (template === 'content-poster-timeline') return 'timeline-story'
  if (template === 'data-poster-trend') return 'trend-story'
  if (template === 'data-poster-comparison') return 'comparison-story'
  if (template === 'data-poster-flow') return 'flow-story'
  if (template === 'data-poster-geo') return 'geo-ranking-story'
  return undefined
}
