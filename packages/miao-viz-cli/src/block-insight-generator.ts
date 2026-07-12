import type { AgentInsight } from './types'
import type { MetricCandidate } from './context-schema'

export function insightTotal(measure: string): AgentInsight {
  return {
    type: 'total',
    text: `Total ${measure}: $evidence:total.values.total_${measure}`,
    evidence: ['total'],
    derivedFrom: ['total'],
    check: 'evidence_ref_exists'
  }
}

export function insightTrend(
  timeField: string,
  measure: string,
  candidate?: MetricCandidate
): AgentInsight | null {
  const text = `${measure} trend (by ${timeField}): ` +
    `from $evidence:by_time.rows[0].total_${measure} ` +
    `to $evidence:by_time.rows[last].total_${measure}`
  const insight: AgentInsight = {
    type: 'trend',
    text,
    evidence: ['by_time'],
    derivedFrom: ['by_time'],
    check: 'evidence_ref_exists'
  }

  if (candidate?.value !== undefined) {
    const pct = Math.abs(candidate.value * 100).toFixed(1)
    const direction = candidate.value > 0 ? 'increased' : candidate.value < 0 ? 'decreased' : 'unchanged'
    const suffix = candidate.value !== 0
      ? `. Period-over-period ${direction} ${pct}%`
      : '. Period-over-period unchanged'
    insight.text += suffix
  }

  return insight
}

export function insightTopN(
  dimension: string,
  measure: string,
  topN: number
): AgentInsight {
  return {
    type: 'rank',
    text: `Top ${topN} ${dimension} by ${measure}: ` +
      `$evidence:by_dimension.rows[0].${dimension} ` +
      `at $evidence:by_dimension.rows[0].total_${measure}`,
    evidence: ['by_dimension'],
    derivedFrom: ['by_dimension'],
    check: 'rank_position'
  }
}

export function insightPeriodChange(candidate: MetricCandidate): AgentInsight | null {
  if (candidate.value === undefined) return null
  const pct = Math.abs(candidate.value * 100).toFixed(1)
  const direction = candidate.value > 0 ? 'increased' : candidate.value < 0 ? 'decreased' : 'unchanged'
  return {
    type: 'delta',
    text: candidate.value !== 0
      ? `${candidate.label}: ${direction} ${pct}%`
      : `${candidate.label}: unchanged`,
    evidence: ['by_time'],
    derivedFrom: ['by_time'],
    check: 'delta_formula'
  }
}
