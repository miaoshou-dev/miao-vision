import type { AgentReportSpec, AgentPosterSpec } from '../types'
import { normalizePosterSlots } from './poster-composition'

const templateByComposition: Record<string, NonNullable<AgentPosterSpec['template']>> = {
  'ranked-story': 'data-poster-ranking',
  'share-story': 'data-poster-share',
  'timeline-story': 'content-poster-timeline',
  'trend-story': 'data-poster-trend',
  'comparison-story': 'data-poster-comparison',
  'flow-story': 'data-poster-flow',
  'geo-ranking-story': 'data-poster-geo'
}

export function normalizePosterSpec(spec: AgentReportSpec): AgentReportSpec {
  if (spec.layout?.preset !== 'poster' || !spec.poster) return spec
  const composition = spec.poster.composition ?? 'ranked-story'
  const template = spec.poster.template ?? templateByComposition[composition] ?? 'data-poster-ranking'
  return {
    ...spec,
    poster: {
      ...spec.poster,
      template,
      composition,
      slots: normalizePosterSlots(spec.poster.slots, spec.poster.chartId, composition)
    }
  }
}
