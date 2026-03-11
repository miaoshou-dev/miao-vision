import { describe, it, expect } from 'vitest'
import { schemaExtractor } from './schema-extractor'

describe('SchemaExtractor', () => {
    it('should handle empty data', () => {
        const result = schemaExtractor.extract('test', [])
        expect(result.columns).toEqual([])
        expect(result.rowCount).toBe(0)
    })

    it('should handle data with null first row (The Fix)', () => {
        // This reproduces the crash: [undefined]
        const data = [undefined, { id: 1 }] as any[]
        const result = schemaExtractor.extract('test', data)

        expect(result.columns).toHaveLength(1)
        expect(result.columns[0].name).toBe('id')
        expect(result.rowCount).toBe(2)
    })

    it('should return empty schema if all rows are null', () => {
        const data = [null, undefined] as any[]
        const result = schemaExtractor.extract('test', data)
        expect(result.columns).toEqual([])
        expect(result.rowCount).toBe(2)
    })
})
