import type { AnalyzeContext, AnalyzeField } from './context-schema'

export function parseIntent(
  raw: string,
  fields: AnalyzeField[],
  correctAssumption?: string
): AnalyzeContext['intent'] {
  const measures = fields.filter(f => f.role === 'measure' || f.role === 'score')
  const dimensions = fields.filter(f => f.role === 'dimension' || f.role === 'status' || f.role === 'geo' || f.role === 'flag')
  const times = fields.filter(f => f.role === 'time')

  let primaryMeasure = measures[0]?.name
  let primaryDimension = dimensions[0]?.name
  let timeField = times[0]?.name
  const invalidCorrections: Array<{ key: 'primary_measure' | 'primary_dimension' | 'time_field'; value: string }> = []

  if (correctAssumption) {
    const correction = parseCorrection(correctAssumption)
    if (correction) {
      const allowed = correction.key === 'primary_measure' ? measures : correction.key === 'primary_dimension' ? dimensions : times
      if (allowed.some(f => f.name === correction.value)) {
        if (correction.key === 'primary_measure') primaryMeasure = correction.value
        if (correction.key === 'primary_dimension') primaryDimension = correction.value
        if (correction.key === 'time_field') timeField = correction.value
      } else {
        invalidCorrections.push(correction)
      }
    }
  }

  const assumptions: AnalyzeContext['intent']['assumptions'] = []
  if (primaryMeasure) assumptions.push(makeAssumption('primary_measure', primaryMeasure, measures, measures.length > 1 ? 0.62 : 0.9))
  if (primaryDimension) assumptions.push(makeAssumption('primary_dimension', primaryDimension, dimensions, dimensions.length > 1 ? 0.72 : 0.9))
  if (times.length > 0) assumptions.push(makeAssumption('time_field', timeField ?? times[0].name, times, times.length > 1 ? 0.7 : 0.9))
  if (measures.length === 0) assumptions.push({ key: 'primary_measure', value: '', confidence: 0, reason: 'no numeric measure detected' })
  for (const correction of invalidCorrections) {
    assumptions.push({
      key: correction.key,
      value: correction.value,
      confidence: 0,
      alternatives: fields.map(f => f.name),
      reason: `correctAssumption references unknown or incompatible field '${correction.value}'`
    })
  }

  const rawLower = raw.toLowerCase()
  const wantsTrend = /trend|over time|by month|by year/.test(rawLower)
  const timePeriods = times[0] ? (times[0].timePeriods ?? 0) : 0
  const coverage = (wantsTrend && timePeriods < 3) || invalidCorrections.length > 0 ? 'partial' : 'full'

  return { raw: raw || '(no intent specified)', coverage, assumptions }
}

function parseCorrection(value: string): { key: 'primary_measure' | 'primary_dimension' | 'time_field'; value: string } | null {
  const match = value.match(/^(primary_measure|primary_dimension|time_field)=([\w-]+)$/)
  if (!match) return null
  return { key: match[1] as 'primary_measure' | 'primary_dimension' | 'time_field', value: match[2] }
}

function makeAssumption(
  key: 'primary_measure' | 'primary_dimension' | 'time_field',
  value: string,
  candidates: AnalyzeField[],
  confidence: number
): AnalyzeContext['intent']['assumptions'][number] {
  return {
    key,
    value,
    confidence,
    alternatives: candidates.filter(f => f.name !== value).map(f => f.name),
    reason: candidates.length > 1 ? `multiple ${key.replace('primary_', '').replace('_', ' ')} candidates detected` : `single clear ${key.replace('primary_', '').replace('_', ' ')}`
  }
}
