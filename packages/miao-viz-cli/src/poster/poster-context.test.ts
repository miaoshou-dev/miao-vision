import { describe, expect, it } from 'vitest'
import { analyzeDataset } from '../analyzer'
import { compactAnalyzeContextSchema, analyzeContextSchema } from '../context-schema'
import { fromCompactAnalyzeContext, toCompactAnalyzeContext } from '../context-compact'
import type { LoadedDataset } from '../types'

const dataset: LoadedDataset = {
  file: 'poster-context.csv',
  columns: ['country', 'sales'],
  rows: [
    { country: 'A', sales: 10 },
    { country: 'B', sales: 20 },
    { country: 'C', sales: 30 }
  ]
}

describe('poster context recommendations', () => {
  it('exposes poster recommendations separately from report catalog', () => {
    const context = analyzeDataset(dataset, { intent: 'rank categories' })
    expect(context.poster?.templates.length).toBe(7)
    expect(context.poster?.templates.find(item => item.id === 'data-poster-ranking')).toMatchObject({ status: 'available', recommendedTheme: 'editorial-light' })
    expect(context.catalog).not.toHaveProperty('posterStyle')
  })

  it('round-trips full and compact poster context without null coercion', () => {
    const context = analyzeDataset(dataset, { intent: 'rank categories' })
    expect(analyzeContextSchema.safeParse(context).success).toBe(true)
    const compact = toCompactAnalyzeContext(context)
    expect(compactAnalyzeContextSchema.safeParse(compact).success).toBe(true)
    const restored = fromCompactAnalyzeContext(compact)
    expect(restored.poster).toEqual(context.poster)
    expect(restored.catalog).not.toHaveProperty('posterStyle')
  })

  it('keeps recommendation ordering deterministic', () => {
    const first = analyzeDataset(dataset, { intent: 'rank categories' }).poster?.templates.map(item => item.id)
    const second = analyzeDataset(dataset, { intent: 'rank categories' }).poster?.templates.map(item => item.id)
    expect(second).toEqual(first)
  })
})
