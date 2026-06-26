import type {
  AgentColumnType,
  ColumnProfile,
  DataQualityProfile,
  DataProfile,
  HistogramBucket,
  LoadedDataset,
  ProfileInsight,
  ProfileHint,
  TemporalProfile
} from './types'

export interface ProfilingOptions {
  /** Return only file, rows, and column names+types — no statistics. */
  summary?: boolean
  /** Limit deep profiling to these column names. Correlations only computed between selected columns. */
  columns?: string[]
  /** Strip statistics with reliable=false from the output. */
  reliableOnly?: boolean
}

/** Lightweight schema-only profile (< 200 tokens). */
export function profileSummary(dataset: LoadedDataset): Pick<DataProfile, 'file' | 'rows' | 'sheet'> & {
  columns: Array<{ name: string; type: AgentColumnType }>
} {
  const allCols = dataset.columns.map(name => {
    const values = dataset.rows.map(r => r[name]).filter(v => v !== null && v !== undefined && v !== '')
    const type = inferColumnType(values)
    return { name, type }
  })
  return { file: dataset.file, rows: dataset.rows.length, sheet: dataset.sheet, columns: allCols }
}

export function profileDataset(dataset: LoadedDataset, options: ProfilingOptions = {}): DataProfile {
  const targetCols = options.columns
    ? dataset.columns.filter(c => options.columns!.includes(c))
    : dataset.columns

  const columns = targetCols.map(col => profileColumn(col, dataset.rows, options.reliableOnly))

  const numericNames = columns.filter(c => c.type === 'number').map(c => c.name)
  const rawCorrelations = numericNames.length >= 2
    ? computeCorrelations(numericNames, dataset.rows)
    : undefined

  const correlations = options.reliableOnly
    ? rawCorrelations?.filter(c => c.reliable)
    : rawCorrelations

  const hints = buildCatalogHints(columns, correlations ?? [])
  const quality = computeDataQuality(columns, dataset.rows.length)
  const insights = generateProfileInsights(columns, quality, correlations ?? [], dataset.rows.length)

  return {
    file: dataset.file,
    rows: dataset.rows.length,
    sheet: dataset.sheet,
    columns,
    quality,
    correlations: correlations && correlations.length > 0 ? correlations : undefined,
    hints: hints.length > 0 ? hints : undefined,
    insights: insights.length > 0 ? insights : undefined
  }
}

function profileColumn(name: string, rows: Record<string, unknown>[], reliableOnly = false): ColumnProfile {
  const values = rows.map(row => row[name])
  const nonNull = values.filter(v => v !== null && v !== undefined && v !== '')
  const type = inferColumnType(nonNull)
  const distinct = new Set(nonNull.map(normalizeDistinctValue))
  const distinctCount = distinct.size
  const nullRate = rows.length === 0 ? 0 : (values.length - nonNull.length) / rows.length
  const fillRate = rows.length === 0 ? 0 : nonNull.length / rows.length

  const profile: ColumnProfile = {
    name,
    type,
    total: rows.length,
    nonNullCount: nonNull.length,
    nullCount: values.length - nonNull.length,
    nullRate: round(nullRate),
    fillRate: round(fillRate),
    uniqueRate: nonNull.length === 0 ? 0 : round(distinctCount / nonNull.length),
    samples: Array.from(distinct).slice(0, 5),
    distinctCount
  }

  if (type === 'number') {
    const nums = nonNull.map(Number).filter(v => Number.isFinite(v))
    if (nums.length > 0) {
      const sorted = [...nums].sort((a, b) => a - b)
      profile.min = sorted[0]
      profile.max = sorted[sorted.length - 1]
      Object.assign(profile, computeNumericStats(nums, sorted, rows.length, reliableOnly))
    }
  }

  if (type === 'string') {
    const strs = nonNull.filter((v): v is string => typeof v === 'string')
    if (strs.length > 0 && rows.length > 0) {
      const freq = new Map<string, number>()
      for (const s of strs) freq.set(s, (freq.get(s) ?? 0) + 1)
      const [topVal, topCount] = [...freq.entries()].sort((a, b) => b[1] - a[1])[0]
      profile.topValue = topVal
      profile.topSharePct = round(topCount / nonNull.length)
      profile.distribution = buildDistribution(freq, nonNull.length)
    }
  }

  if (type === 'date') {
    const dateStrs = nonNull
      .map(v => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v).trim()))
      .filter(looksLikeDate)
    if (dateStrs.length > 0) {
      profile.temporal = computeTemporalStats(dateStrs, values)
    }
  }

  profile.role = inferColumnRole(profile)
  return profile
}

function computeNumericStats(
  values: number[],
  sorted: number[],
  totalRows: number,
  reliableOnly: boolean
): Partial<ColumnProfile> {
  const n = values.length
  const sum = values.reduce((s, v) => s + v, 0)
  const mean = sum / n
  const p25 = percentile(sorted, 25)
  const median = percentile(sorted, 50)
  const p75 = percentile(sorted, 75)
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / n
  const stddev = Math.sqrt(variance)
  const skewness = stddev < 1e-10 ? 0 : round(3 * (mean - median) / stddev)

  const iqr = p75 - p25
  const outlierCount = values.filter(v => v < p25 - 1.5 * iqr || v > p75 + 1.5 * iqr).length

  const skewnessReliable = totalRows >= 30
  const outlierReliable = totalRows >= 20
  const histogramReliable = totalRows >= 20

  const result: Partial<ColumnProfile> = {
    sum: round(sum),
    mean: round(mean),
    median: round(median),
    p25: round(p25),
    p75: round(p75),
    stddev: round(stddev),
    coefficientOfVariation: Math.abs(mean) < 1e-10 ? undefined : round(stddev / Math.abs(mean)),
  }

  if (!reliableOnly || skewnessReliable) {
    result.skewness = skewness
    result.skewnessReliable = skewnessReliable
  }

  if (!reliableOnly || outlierReliable) {
    result.outlierCount = outlierCount
    result.outlierReliable = outlierReliable
  }

  if (!reliableOnly || histogramReliable) {
    result.histogram = computeHistogram(values, sorted[0], sorted[n - 1])
    result.histogramReliable = histogramReliable
  }

  return result
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  if (sorted.length === 1) return sorted[0]

  const index = (p / 100) * (sorted.length - 1)
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  const weight = index - lower

  if (upper >= sorted.length) return sorted[sorted.length - 1]
  return sorted[lower] * (1 - weight) + sorted[upper] * weight
}

function buildDistribution(
  freq: Map<string, number>,
  denominator: number
): ColumnProfile['distribution'] {
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([value, count]) => ({
      value,
      count,
      sharePct: denominator === 0 ? 0 : round(count / denominator)
    }))
}

function computeHistogram(values: number[], min: number, max: number): HistogramBucket[] {
  if (min === max) return [{ bucket: String(min), count: values.length }]
  const buckets = Math.min(8, values.length)
  const step = (max - min) / buckets
  const result: HistogramBucket[] = []
  for (let i = 0; i < buckets; i++) {
    const lo = min + i * step
    const hi = lo + step
    const isLast = i === buckets - 1
    const count = values.filter(v => (isLast ? v >= lo && v <= hi : v >= lo && v < hi)).length
    if (count > 0) result.push({ bucket: `${fmtNum(lo)}-${fmtNum(hi)}`, count })
  }
  return result
}

function fmtNum(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${round(n / 1_000_000)}M`
  if (Math.abs(n) >= 1000) return `${round(n / 1000)}k`
  return String(round(n))
}

function computeTemporalStats(dateStrs: string[], rawValues: unknown[]): TemporalProfile {
  const parsed = dateStrs.map(s => new Date(s)).filter(d => !Number.isNaN(d.getTime()))
  if (parsed.length === 0) return { span: '', granularity: 'day', isMonotonic: false, gapCount: 0 }

  const sorted = [...parsed].sort((a, b) => a.getTime() - b.getTime())
  const min = sorted[0]
  const max = sorted[sorted.length - 1]
  const granularity = inferGranularity(dateStrs)
  const span = granularity === 'day'
    ? `${min.toISOString().slice(0, 10)} ~ ${max.toISOString().slice(0, 10)}`
    : `${min.toISOString().slice(0, 7)} ~ ${max.toISOString().slice(0, 7)}`

  const rawDates = rawValues
    .filter(v => v !== null && v !== undefined && v !== '')
    .map(v => new Date(String(v)))
    .filter(d => !Number.isNaN(d.getTime()))
  let isMonotonic = true
  for (let i = 1; i < rawDates.length; i++) {
    if (rawDates[i].getTime() < rawDates[i - 1].getTime()) { isMonotonic = false; break }
  }

  return { span, granularity, isMonotonic, gapCount: countGaps(sorted, granularity) }
}

function inferGranularity(dateStrs: string[]): TemporalProfile['granularity'] {
  const hasDay = dateStrs.some(s => /^\d{4}-\d{2}-\d{2}/.test(s))
  if (hasDay) {
    const allFirst = dateStrs.every(s => /^\d{4}-\d{2}-01/.test(s))
    return allFirst ? 'month' : 'day'
  }
  return dateStrs.some(s => /^\d{4}-\d{2}$/.test(s)) ? 'month' : 'year'
}

function countGaps(sorted: Date[], granularity: TemporalProfile['granularity']): number {
  if (sorted.length < 2) return 0
  const min = sorted[0]
  const max = sorted[sorted.length - 1]
  let expected: number
  if (granularity === 'day') {
    expected = Math.round((max.getTime() - min.getTime()) / 86_400_000) + 1
  } else if (granularity === 'month') {
    expected = (max.getFullYear() - min.getFullYear()) * 12 + (max.getMonth() - min.getMonth()) + 1
  } else {
    expected = max.getFullYear() - min.getFullYear() + 1
  }
  return Math.max(0, expected - sorted.length)
}

function computeCorrelations(
  numericNames: string[],
  rows: Record<string, unknown>[]
): Array<{ a: string; b: string; r: number; n: number; reliable: boolean }> {
  const result: Array<{ a: string; b: string; r: number; n: number; reliable: boolean }> = []
  for (let i = 0; i < numericNames.length; i++) {
    for (let j = i + 1; j < numericNames.length; j++) {
      const a = numericNames[i]
      const b = numericNames[j]
      const pairs = rows
        .map(row => [Number(row[a]), Number(row[b])] as [number, number])
        .filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y))
      if (pairs.length < 3) continue
      const r = pearsonR(pairs)
      if (Math.abs(r) >= 0.3) result.push({ a, b, r: round(r), n: pairs.length, reliable: pairs.length >= 10 })
    }
  }
  return result.sort((x, y) => Math.abs(y.r) - Math.abs(x.r))
}

function pearsonR(pairs: [number, number][]): number {
  const n = pairs.length
  const mx = pairs.reduce((s, [x]) => s + x, 0) / n
  const my = pairs.reduce((s, [, y]) => s + y, 0) / n
  let num = 0, dx = 0, dy = 0
  for (const [x, y] of pairs) {
    num += (x - mx) * (y - my)
    dx += (x - mx) ** 2
    dy += (y - my) ** 2
  }
  const den = Math.sqrt(dx * dy)
  return den < 1e-10 ? 0 : num / den
}

export function buildCatalogHints(
  columns: ColumnProfile[],
  correlations: Array<{ a: string; b: string; r: number; n: number; reliable: boolean }>
): ProfileHint[] {
  const hints: ProfileHint[] = []
  const nums = columns.filter(c => c.type === 'number')
  const strs = columns.filter(c => c.type === 'string')
  const dates = columns.filter(c => c.type === 'date')

  for (const col of nums) {
    hints.push({ type: 'kpi', field: col.name, label: col.name.replace(/_/g, ' ') })
  }

  if (dates.length > 0 && nums.length > 0) {
    hints.push({ type: 'time-series', xField: dates[0].name, yFields: nums.map(c => c.name) })
  }

  for (const str of strs) {
    if (str.distinctCount >= 2 && str.distinctCount <= 20) {
      for (const num of nums) {
        hints.push({ type: 'ranking', groupField: str.name, measureField: num.name })
      }
    }
  }

  for (const str of strs) {
    if (str.distinctCount >= 2 && str.distinctCount <= 7 && nums.length > 0) {
      hints.push({ type: 'share', labelField: str.name, valueField: nums[0].name })
    }
  }

  for (const col of nums) {
    if (col.skewness !== undefined && Math.abs(col.skewness) >= 1) {
      hints.push({ type: 'distribution', field: col.name, skewed: true })
    }
  }

  for (const corr of correlations.filter(c => Math.abs(c.r) >= 0.6)) {
    hints.push({ type: 'correlation', a: corr.a, b: corr.b, r: corr.r })
  }

  return hints
}

function computeDataQuality(columns: ColumnProfile[], rowCount: number): DataQualityProfile {
  const totalCells = rowCount * columns.length
  const nullCells = columns.reduce((sum, col) => sum + col.nullCount, 0)
  const avgUniqueRate = columns.length === 0
    ? 0
    : columns.reduce((sum, col) => sum + col.uniqueRate, 0) / columns.length

  return {
    completeness: totalCells === 0 ? 1 : round((totalCells - nullCells) / totalCells),
    nullRate: totalCells === 0 ? 0 : round(nullCells / totalCells),
    avgUniqueRate: round(avgUniqueRate),
    highNullColumns: columns.filter(col => col.nullRate >= 0.2).map(col => col.name),
    likelyIdColumns: columns.filter(col => col.role === 'id').map(col => col.name),
    duplicateProneDimensions: columns
      .filter(col => col.role === 'dimension' && col.distinctCount <= Math.max(20, rowCount * 0.2))
      .map(col => col.name)
  }
}

function generateProfileInsights(
  columns: ColumnProfile[],
  quality: DataQualityProfile,
  correlations: Array<{ a: string; b: string; r: number; n: number; reliable: boolean }>,
  rowCount: number
): ProfileInsight[] {
  const insights: ProfileInsight[] = []

  if (rowCount === 0) {
    insights.push({
      type: 'warning',
      title: 'No rows available',
      description: 'The dataset is empty, so charts and insights cannot be generated reliably.'
    })
    return insights
  }

  if (quality.highNullColumns.length > 0) {
    insights.push({
      type: 'warning',
      title: 'Columns with high missing rate',
      description: `${quality.highNullColumns.slice(0, 4).join(', ')} exceed a 20% null rate and may need filtering or annotation.`,
      fields: quality.highNullColumns
    })
  }

  if (quality.likelyIdColumns.length > 0) {
    insights.push({
      type: 'info',
      title: 'Likely identifier fields detected',
      description: `${quality.likelyIdColumns.slice(0, 4).join(', ')} look like IDs and should usually be excluded from visual encodings.`,
      fields: quality.likelyIdColumns
    })
  }

  for (const col of columns) {
    if (col.role === 'measure' && col.coefficientOfVariation !== undefined && col.coefficientOfVariation >= 1) {
      insights.push({
        type: 'trend',
        title: `High variability in ${col.name}`,
        description: `${col.name} varies strongly relative to its mean; distribution, boxplot, or annotated outlier views may explain the spread.`,
        fields: [col.name]
      })
    }
  }

  for (const corr of correlations.filter(c => Math.abs(c.r) >= 0.6).slice(0, 3)) {
    insights.push({
      type: 'trend',
      title: `Strong relationship: ${corr.a} and ${corr.b}`,
      description: `Pearson correlation is ${corr.r}; a scatter chart with an annotation can surface this relationship.`,
      fields: [corr.a, corr.b]
    })
  }

  return insights.slice(0, 12)
}

function inferColumnRole(profile: ColumnProfile): ColumnProfile['role'] {
  if (profile.type === 'date') return 'time'
  if (profile.type === 'boolean') return 'flag'
  if (profile.type === 'number') return 'measure'
  if (profile.type === 'unknown') return 'unknown'

  const lowerName = profile.name.toLowerCase()
  const looksLikeId = /\b(id|uuid|guid|key|code)\b/.test(lowerName) || /(_id|id)$/.test(lowerName)
  if (looksLikeId || (profile.uniqueRate >= 0.98 && profile.nonNullCount >= 10)) return 'id'

  return 'dimension'
}

function inferColumnType(values: unknown[]): AgentColumnType {
  if (values.length === 0) return 'unknown'
  const scores: Record<AgentColumnType, number> = { string: 0, number: 0, boolean: 0, date: 0, unknown: 0 }
  for (const value of values.slice(0, 100)) scores[inferValueType(value)] += 1
  const entries = Object.entries(scores) as Array<[AgentColumnType, number]>
  entries.sort((a, b) => b[1] - a[1])
  return entries[0][1] === 0 ? 'unknown' : entries[0][0]
}

function inferValueType(value: unknown): AgentColumnType {
  if (typeof value === 'number' && Number.isFinite(value)) return 'number'
  if (typeof value === 'boolean') return 'boolean'
  if (value instanceof Date && !Number.isNaN(value.getTime())) return 'date'
  if (typeof value === 'string') {
    const t = value.trim()
    if (t === '') return 'unknown'
    if (!Number.isNaN(Number(t))) return 'number'
    if (t.toLowerCase() === 'true' || t.toLowerCase() === 'false') return 'boolean'
    if (looksLikeDate(t)) return 'date'
    return 'string'
  }
  return 'unknown'
}

function looksLikeDate(value: string): boolean {
  if (!/^\d{4}[-/]\d{1,2}([-/]\d{1,2})?/.test(value)) return false
  return !Number.isNaN(new Date(value).getTime())
}

function normalizeDistinctValue(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString()
  return value
}

function round(value: number): number {
  return Math.round(value * 10000) / 10000
}
