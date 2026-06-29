import type { AgentInsight } from './types'

export interface NormalizedInsight {
  text: string
  evidence: string[]
  caveat?: string
  severity?: 'info' | 'warning'
  original: AgentInsight
}

export function normalizeInsight(insight: AgentInsight): NormalizedInsight {
  if (typeof insight === 'string') {
    return { text: insight, evidence: [], original: insight }
  }
  return {
    text: insight.text,
    evidence: insight.evidence ?? [],
    caveat: insight.caveat,
    severity: insight.severity,
    original: insight
  }
}

export function normalizeInsights(insights: AgentInsight[] | undefined): NormalizedInsight[] {
  return (insights ?? []).map(normalizeInsight)
}

export function mapInsightText(
  insight: AgentInsight,
  mapText: (text: string) => string
): AgentInsight {
  if (typeof insight === 'string') return mapText(insight)
  return { ...insight, text: mapText(insight.text) }
}

export function insightPreview(text: string): string {
  return `"${text.slice(0, 80)}${text.length > 80 ? '...' : ''}"`
}
