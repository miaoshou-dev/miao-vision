import type { AgentChartSpec, AgentDataTransform } from './types'

export interface TransformTraceStep {
  step: number
  type: AgentDataTransform['type'] | 'encoding-aggregate'
  inputRows: number
  outputRows: number
  preview: Record<string, unknown>[]
}

export function prepareChartData(rows: Record<string, unknown>[], chart: AgentChartSpec): Record<string, unknown>[] {
  let current = [...rows]
  for (const transform of chart.data?.transform ?? []) {
    current = applyTransform(current, transform)
  }
  current = applyEncodingAggregates(current, chart)
  return current
}

export function inspectChartTransforms(
  rows: Record<string, unknown>[],
  chart: AgentChartSpec
): { rows: Record<string, unknown>[]; transforms: TransformTraceStep[] } {
  let current = [...rows]
  const transforms: TransformTraceStep[] = []
  let step = 1
  for (const transform of chart.data?.transform ?? []) {
    const inputRows = current.length
    current = applyTransform(current, transform)
    transforms.push({
      step: step++,
      type: transform.type,
      inputRows,
      outputRows: current.length,
      preview: current.slice(0, 3)
    })
  }
  const beforeEncoding = current
  current = applyEncodingAggregates(current, chart)
  if (current !== beforeEncoding) {
    transforms.push({
      step,
      type: 'encoding-aggregate',
      inputRows: beforeEncoding.length,
      outputRows: current.length,
      preview: current.slice(0, 3)
    })
  }
  return { rows: current, transforms }
}

// Apply encoding-level aggregation when encoding.*.aggregate is set.
// Runs after data.transform so transforms can do derive-month / pre-filtering first.
// When both data.transform and encoding.aggregate are present, they compose:
// transforms handle complex reshaping, encoding.aggregate handles the final reduction.
export function applyEncodingAggregates(
  rows: Record<string, unknown>[],
  chart: AgentChartSpec
): Record<string, unknown>[] {
  const enc = chart.encoding
  if (!enc) return rows

  if (chart.type === 'bigvalue') {
    const valueEnc = enc.value
    if (valueEnc?.field && valueEnc.aggregate) {
      const result = aggregateMeasure(rows, valueEnc.field, valueEnc.aggregate)
      return [{ [valueEnc.field]: result }]
    }
    return rows
  }

  if (chart.type === 'bar' || chart.type === 'line' || chart.type === 'area') {
    const xField = enc.x?.field
    const yEnc = enc.y
    if (xField && yEnc?.field && yEnc.aggregate) {
      const groupFields = [xField]
      if (enc.color?.field) groupFields.push(enc.color.field)
      return groupByAndAggregate(rows, groupFields, yEnc.field, yEnc.aggregate)
    }
    return rows
  }

  if (chart.type === 'pie') {
    const labelField = enc.label?.field
    const valueEnc = enc.value
    if (labelField && valueEnc?.field && valueEnc.aggregate) {
      const groupFields = [labelField]
      if (enc.color?.field) groupFields.push(enc.color.field)
      return groupByAndAggregate(rows, groupFields, valueEnc.field, valueEnc.aggregate)
    }
    return rows
  }

  return rows
}

function groupByAndAggregate(
  rows: Record<string, unknown>[],
  groupFields: string[],
  valueField: string,
  op: string
): Record<string, unknown>[] {
  const groups = new Map<string, Record<string, unknown>[]>()
  for (const row of rows) {
    const key = JSON.stringify(groupFields.map(f => row[f]))
    const group = groups.get(key) ?? []
    group.push(row)
    groups.set(key, group)
  }
  return [...groups.values()].map(groupRows => {
    const first = groupRows[0]
    const out: Record<string, unknown> = {}
    for (const f of groupFields) out[f] = first[f]
    out[valueField] = aggregateMeasure(groupRows, valueField, op)
    return out
  })
}

function applyTransform(
  rows: Record<string, unknown>[],
  transform: AgentDataTransform
): Record<string, unknown>[] {
  if (transform.type === 'derive-month' && transform.field && transform.as) {
    return rows.map(row => ({
      ...row,
      [transform.as as string]: toMonth(row[transform.field as string])
    }))
  }

  if (transform.type === 'aggregate') {
    return aggregateRows(rows, transform)
  }

  if (transform.type === 'sort' && transform.field) {
    const order = transform.order ?? 'desc'
    return [...rows].sort((a, b) => compareValues(a[transform.field as string], b[transform.field as string], order))
  }

  if (transform.type === 'limit' && typeof transform.value === 'number') {
    return rows.slice(0, transform.value)
  }

  if (transform.type === 'filter') {
    return applyFilter(rows, transform)
  }

  return rows
}

function aggregateRows(
  rows: Record<string, unknown>[],
  transform: AgentDataTransform
): Record<string, unknown>[] {
  const groupBy = transform.groupBy ?? []
  const measures = transform.measures ?? []
  const groups = new Map<string, Record<string, unknown>[]>()

  for (const row of rows) {
    const key = JSON.stringify(groupBy.map(field => row[field]))
    const existing = groups.get(key) ?? []
    existing.push(row)
    groups.set(key, existing)
  }

  return Array.from(groups.values()).map(groupRows => {
    const first = groupRows[0]
    const row: Record<string, unknown> = {}
    for (const field of groupBy) {
      row[field] = first[field]
    }
    for (const measure of measures) {
      row[measure.as] = aggregateMeasure(groupRows, measure.field, measure.op)
    }
    return row
  })
}

function aggregateMeasure(rows: Record<string, unknown>[], field: string, op: string): number {
  if (op === 'count') return rows.length
  const values = rows.map(row => Number(row[field])).filter(value => Number.isFinite(value))
  if (values.length === 0) return 0
  if (op === 'avg') return values.reduce((sum, value) => sum + value, 0) / values.length
  if (op === 'min') return Math.min(...values)
  if (op === 'max') return Math.max(...values)
  return values.reduce((sum, value) => sum + value, 0)
}

function compareValues(a: unknown, b: unknown, order: 'asc' | 'desc'): number {
  const direction = order === 'asc' ? 1 : -1
  const aNumber = Number(a)
  const bNumber = Number(b)
  if (Number.isFinite(aNumber) && Number.isFinite(bNumber)) {
    return (aNumber - bNumber) * direction
  }
  return String(a ?? '').localeCompare(String(b ?? '')) * direction
}

function applyFilter(
  rows: Record<string, unknown>[],
  transform: AgentDataTransform
): Record<string, unknown>[] {
  const field = transform.field
  const rawValue = transform.value
  if (!field || rawValue == null) return rows

  const rawStr = String(rawValue)
  const ops = ['>=', '<=', '>', '<', '='] as const
  let op = '='
  let compareValue = rawStr

  for (const candidate of ops) {
    if (rawStr.startsWith(candidate)) {
      op = candidate
      compareValue = rawStr.slice(candidate.length).trim()
      break
    }
  }

  return rows.filter(row => {
    const cellValue = row[field]
    if (op === '=') return String(cellValue ?? '') === compareValue

    const numCell = Number(cellValue)
    const numComp = Number(compareValue)
    if (Number.isFinite(numCell) && Number.isFinite(numComp)) {
      if (op === '>=') return numCell >= numComp
      if (op === '<=') return numCell <= numComp
      if (op === '>') return numCell > numComp
      if (op === '<') return numCell < numComp
    }

    const strCell = String(cellValue ?? '')
    if (op === '>=') return strCell >= compareValue
    if (op === '<=') return strCell <= compareValue
    if (op === '>') return strCell > compareValue
    if (op === '<') return strCell < compareValue
    return false
  })
}

function toMonth(value: unknown): string {
  const date = value instanceof Date ? value : new Date(String(value))
  if (Number.isNaN(date.getTime())) return String(value ?? '')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${date.getFullYear()}-${month}`
}
