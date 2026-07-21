import { parseEvidenceRefs, resolveEvidencePath } from './directive-resolver'
import type { AnalyzeEvidence } from './context-schema'
import type { DeckClaimArgs, DeckClaimCheck } from './deck-types'

export interface ClaimCheckResult {
  ok: boolean
  actual?: unknown
  expected?: unknown
  inputs: Record<string, unknown>
  tolerance: number
  message?: string
}

export function executeClaimCheck(check: DeckClaimCheck, args: DeckClaimArgs, evidence: AnalyzeEvidence[]): ClaimCheckResult {
  const tolerance = args.tolerance ?? 1e-6
  try {
    if (check === 'evidence_ref_exists' || check === 'caveat_present') return result(true, {}, tolerance)
    if (check === 'value_match') {
      const actual = resolve(args.value, evidence)
      return compare(actual, args.expected, { value: actual }, tolerance)
    }
    if (check === 'delta_formula') {
      const from = numeric(resolve(args.from, evidence))
      const to = numeric(resolve(args.to, evidence))
      const mode = args.mode ?? 'absolute'
      if (mode === 'percent' && from === 0) return result(false, { from, to, mode }, tolerance, undefined, args.expected, 'Percent delta cannot use a zero denominator.')
      const actual = mode === 'absolute' ? to - from : mode === 'percent' ? (to - from) / from : (to - from) * 100
      return compare(actual, args.expected, { from, to, mode }, tolerance)
    }
    if (check === 'share_formula') {
      const numerator = numeric(resolve(args.numerator, evidence))
      const denominator = numeric(resolve(args.denominator, evidence))
      if (denominator === 0) return result(false, { numerator, denominator }, tolerance, undefined, args.expected, 'Share cannot use a zero denominator.')
      return compare(numerator / denominator, args.expected, { numerator, denominator }, tolerance)
    }
    if (check === 'benchmark_present') {
      const value = resolve(args.value, evidence)
      const benchmark = resolve(args.benchmark, evidence)
      return result(value !== undefined && benchmark !== undefined, { value, benchmark }, tolerance, benchmark, benchmark)
    }
    if (check === 'trend_periods') {
      const series = resolve(args.series, evidence)
      if (!Array.isArray(series)) return result(false, { series }, tolerance, undefined, args.minimumPeriods, 'Trend series must resolve to an array.')
      const minimum = args.minimumPeriods ?? 3
      if (series.length < minimum) return result(false, { periods: series.length }, tolerance, series.length, minimum, 'Trend has too few periods.')
      if (!args.valueField || !args.direction) return result(true, { periods: series.length }, tolerance, series.length, minimum)
      const first = numeric((series[0] as Record<string, unknown>)[args.valueField])
      const last = numeric((series.at(-1) as Record<string, unknown>)[args.valueField])
      const actual = last > first ? 'up' : last < first ? 'down' : 'flat'
      return result(actual === args.direction, { first, last, periods: series.length }, tolerance, actual, args.direction)
    }
    if (check === 'rank_position') {
      const rows = resolve(args.rows, evidence)
      if (!Array.isArray(rows) || !args.subjectField || !args.valueField || args.subject === undefined) return result(false, { rows }, tolerance, undefined, args.expectedRank, 'Rank check requires rows, subjectField, valueField, subject, and expectedRank.')
      const direction = args.order === 'asc' ? 1 : -1
      const sorted = rows.map((row, index) => ({ row: row as Record<string, unknown>, index })).sort((a, b) => {
        const diff = (numeric(a.row[args.valueField!]) - numeric(b.row[args.valueField!])) * direction
        return diff || a.index - b.index
      })
      const target = sorted.find(item => String(item.row[args.subjectField!]) === String(args.subject))
      if (!target) return result(false, { subject: args.subject }, tolerance, undefined, args.expectedRank, 'Rank subject was not found.')
      const targetValue = numeric(target.row[args.valueField])
      const better = sorted.filter(item => direction === -1 ? numeric(item.row[args.valueField!]) > targetValue : numeric(item.row[args.valueField!]) < targetValue)
      const actual = better.length + 1
      return result(actual === args.expectedRank, { subject: args.subject, value: targetValue }, tolerance, actual, args.expectedRank)
    }
    return result(false, {}, tolerance, undefined, undefined, `Unsupported claim check '${check}'.`)
  } catch (error) {
    return result(false, {}, tolerance, undefined, args.expected, error instanceof Error ? error.message : 'Claim check failed.')
  }
}

function resolve(path: string | undefined, evidence: AnalyzeEvidence[]): unknown {
  if (!path) return undefined
  const refs = parseEvidenceRefs(path)
  if (refs.length !== 1) throw new Error(`Expected one evidence path, received '${path}'.`)
  const resolved = resolveEvidencePath(evidence, refs[0].id, refs[0].path)
  if (!resolved.found) throw new Error(`Evidence path '${path}' cannot be resolved.`)
  return resolved.value
}

function numeric(value: unknown): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) throw new Error(`Expected a numeric value, received '${String(value)}'.`)
  return parsed
}

function compare(actual: unknown, expected: unknown, inputs: Record<string, unknown>, tolerance: number): ClaimCheckResult {
  if (typeof actual === 'number' && typeof expected === 'number') {
    const scale = Math.max(1, Math.abs(actual), Math.abs(expected))
    return result(Math.abs(actual - expected) <= tolerance * scale, inputs, tolerance, actual, expected)
  }
  return result(String(actual) === String(expected), inputs, tolerance, actual, expected)
}

function result(ok: boolean, inputs: Record<string, unknown>, tolerance: number, actual?: unknown, expected?: unknown, message?: string): ClaimCheckResult {
  return { ok, inputs, tolerance, ...(actual !== undefined ? { actual } : {}), ...(expected !== undefined ? { expected } : {}), ...(message ? { message } : {}) }
}
