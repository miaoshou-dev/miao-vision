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

  return { raw: raw || '(no intent specified)', coverage, assumptions, visualTasks: inferVisualTasks(rawLower, fields) }
}

function inferVisualTasks(raw: string, fields: AnalyzeField[]): NonNullable<AnalyzeContext['intent']['visualTasks']> {
  const tasks: NonNullable<AnalyzeContext['intent']['visualTasks']> = []
  const add = (family: NonNullable<AnalyzeContext['intent']['visualTasks']>[number]['family'], confidence: number, rationale: string) => {
    if (!tasks.some(task => task.family === family)) tasks.push({ family, confidence, rationale: [rationale] })
  }
  if (/trend|over time|by month|by year|趋势|同比|环比/.test(raw)) add('trend', 0.92, 'time-oriented intent phrase detected')
  if (/change|delta|before|after|变化|增减|前后/.test(raw)) add('change', 0.9, 'change intent phrase detected')
  if (/target|goal|attainment|目标|达成/.test(raw)) add('target-attainment', 0.94, 'target intent phrase detected')
  if (/rank|top|bottom|排名|最高|最低/.test(raw)) add('ranking', 0.9, 'ranking intent phrase detected')
  if (/share|composition|占比|构成/.test(raw)) add('composition', 0.9, 'composition intent phrase detected')
  if (/distribution|outlier|分布|异常/.test(raw)) add('distribution', 0.9, 'distribution intent phrase detected')
  if (/correlation|relationship|相关|关系/.test(raw)) add('relationship', 0.9, 'relationship intent phrase detected')
  if (/flow|funnel|conversion|流向|漏斗|转化/.test(raw)) add('flow', 0.9, 'flow intent phrase detected')
  if (/interval|confidence|uncertainty|区间|置信|不确定/.test(raw)) add('uncertainty', 0.92, 'interval intent phrase detected')
  if (/map|region|geographic|地图|地理/.test(raw) && fields.some(field => field.role === 'geo')) add('geo', 0.88, 'geographic intent and field detected')
  if (/compare|versus| vs |比较|对比/.test(raw)) add('comparison', 0.9, 'comparison intent phrase detected')
  if (tasks.length === 0) add(fields.some(field => field.role === 'dimension') ? 'comparison' : 'summary', 0.65, 'default inferred from available field roles')
  return tasks
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
