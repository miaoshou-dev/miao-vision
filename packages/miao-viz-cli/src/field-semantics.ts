import type { AgentColumnType } from './types'

export type FieldRole =
  | 'measure'
  | 'dimension'
  | 'time'
  | 'id'
  | 'status'
  | 'score'
  | 'flag'
  | 'text'
  | 'geo'
  | 'unknown'

export type SemanticTag =
  | 'currency'
  | 'percentage'
  | 'url'
  | 'ordinal'
  | 'latitude'
  | 'longitude'
  | 'country'
  | 'province'
  | 'city'

export type ChartUsagePolicy = 'recommended' | 'allowed' | 'discouraged' | 'forbidden'

export interface ChartUsageProfile {
  asMeasure: ChartUsagePolicy
  asDimension: ChartUsagePolicy
  asDetailKey: ChartUsagePolicy
}

export interface FieldSemantics {
  role: FieldRole
  semanticTags: SemanticTag[]
  confidence: number
  rationale: string[]
  qualityFlags: string[]
  chartUsage: ChartUsageProfile
}

export interface FieldSemanticsInput {
  name: string
  type: AgentColumnType
  nonNullCount: number
  nullRate: number
  uniqueRate: number
  distinctCount: number
  samples: unknown[]
}

export function inferFieldSemantics(input: FieldSemanticsInput): FieldSemantics {
  const name = input.name.toLowerCase()
  const tags: SemanticTag[] = []
  const rationale: string[] = []
  const qualityFlags: string[] = []

  if (input.nullRate >= 0.2) qualityFlags.push('high_missing_rate')
  if (input.uniqueRate >= 0.98 && input.nonNullCount >= 10) qualityFlags.push('high_unique_rate')

  if (looksLikeUrl(input)) tags.push('url')
  if (/\b(lat|latitude)\b/.test(name)) tags.push('latitude')
  if (/\b(lon|lng|longitude)\b/.test(name)) tags.push('longitude')
  if (/\b(country|nation)\b/.test(name)) tags.push('country')
  if (/\b(province|state|region_state)\b/.test(name)) tags.push('province')
  if (/\b(city|town)\b/.test(name)) tags.push('city')
  if (/(^|_)(amount|revenue|sales|cost|profit|price|gmv|arr|mrr|income|expense)(_|$)/.test(name)) tags.push('currency')
  if (/(^|_)(rate|ratio|percent|percentage|pct|share)(_|$)/.test(name) || /_%$/.test(name)) tags.push('percentage')
  if (/(^|_)(rank|level|tier|grade)(_|$)/.test(name)) tags.push('ordinal')

  const idByName = /\b(id|uuid|guid|key|code|number|no)\b/.test(name) || /(_id|id)$/.test(name)
  if (idByName) rationale.push('name matches identifier pattern')
  if (input.uniqueRate >= 0.98 && input.nonNullCount >= 10) rationale.push('unique rate is very high')

  let role: FieldRole = 'unknown'
  let confidence = 0.5

  if (input.type === 'date') {
    role = 'time'
    confidence = 0.95
    rationale.push('column type is date')
  } else if (input.type === 'boolean') {
    role = 'flag'
    confidence = 0.94
    rationale.push('column type is boolean')
  } else if (tags.includes('latitude') || tags.includes('longitude') || tags.includes('country') || tags.includes('province') || tags.includes('city')) {
    role = 'geo'
    confidence = 0.86
    rationale.push('name matches geographic field pattern')
  } else if (tags.includes('url')) {
    role = 'text'
    confidence = 0.9
    rationale.push('sample values look like URLs')
  } else if (idByName || (input.uniqueRate >= 0.98 && input.nonNullCount >= 10 && input.type !== 'date')) {
    role = 'id'
    confidence = idByName ? 0.94 : 0.86
  } else if (input.type === 'number') {
    if (/(^|_)(score|rating|grade|rank|level|index)(_|$)/.test(name)) {
      role = 'score'
      confidence = 0.84
      rationale.push('name matches score/rating pattern')
    } else {
      role = 'measure'
      confidence = tags.includes('currency') || tags.includes('percentage') ? 0.9 : 0.78
      rationale.push('numeric non-identifier column')
    }
  } else if (input.type === 'string') {
    if (/\b(status|state|phase|stage|flag|type|category|tier)\b/.test(name) && input.distinctCount <= 20) {
      role = 'status'
      confidence = 0.84
      rationale.push('low-cardinality status/category name')
    } else if (input.distinctCount > 50 && input.uniqueRate > 0.5) {
      role = 'text'
      confidence = 0.72
      rationale.push('high-cardinality string field')
    } else {
      role = 'dimension'
      confidence = input.distinctCount <= 30 ? 0.82 : 0.68
      rationale.push('string column suitable for grouping')
    }
  }

  return {
    role,
    semanticTags: [...new Set(tags)],
    confidence: round(confidence),
    rationale: rationale.length ? [...new Set(rationale)] : ['fallback semantic inference'],
    qualityFlags,
    chartUsage: buildChartUsage(role, tags)
  }
}

function buildChartUsage(role: FieldRole, tags: SemanticTag[]): ChartUsageProfile {
  if (role === 'id') {
    return { asMeasure: 'forbidden', asDimension: 'discouraged', asDetailKey: 'recommended' }
  }
  if (role === 'measure' || role === 'score') {
    return {
      asMeasure: tags.includes('percentage') ? 'allowed' : 'recommended',
      asDimension: 'discouraged',
      asDetailKey: 'allowed'
    }
  }
  if (role === 'dimension' || role === 'status' || role === 'geo' || role === 'flag') {
    return { asMeasure: 'forbidden', asDimension: 'recommended', asDetailKey: 'allowed' }
  }
  if (role === 'time') {
    return { asMeasure: 'forbidden', asDimension: 'allowed', asDetailKey: 'allowed' }
  }
  if (role === 'text') {
    return { asMeasure: 'forbidden', asDimension: 'discouraged', asDetailKey: 'allowed' }
  }
  return { asMeasure: 'discouraged', asDimension: 'discouraged', asDetailKey: 'allowed' }
}

function looksLikeUrl(input: FieldSemanticsInput): boolean {
  const lower = input.name.toLowerCase()
  if (/\b(url|uri|link|website|homepage)\b/.test(lower)) return true
  return input.samples.some(value => /^https?:\/\//i.test(String(value ?? '').trim()))
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}
