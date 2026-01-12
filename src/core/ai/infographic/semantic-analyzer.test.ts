/**
 * SemanticAnalyzer Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SemanticAnalyzer, createSemanticAnalyzer } from './semantic-analyzer'
import type { LLMProvider, ChatMessage, CompletionResponse, StreamChunk } from '../types'

// Mock LLM Provider
function createMockProvider(response: string, configured = true): LLMProvider {
  return {
    name: 'deepseek',
    isConfigured: () => configured,
    complete: vi.fn().mockResolvedValue({
      content: response,
      model: 'test-model',
      usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 }
    } as CompletionResponse),
    stream: vi.fn()
  }
}

describe('SemanticAnalyzer', () => {
  describe('analyze', () => {
    it('should analyze text and return semantic result', async () => {
      const mockResponse = JSON.stringify({
        category: 'flow',
        confidence: 0.85,
        intent: 'Display a process workflow',
        summary: 'A step-by-step process',
        entities: [
          { text: 'Step 1', type: 'action' },
          { text: 'Step 2', type: 'action' },
          { text: 'Step 3', type: 'action' }
        ],
        dataCharacteristics: {
          hasNumericData: false,
          hasTemporalData: false,
          hasHierarchy: false,
          hasComparison: false,
          hasSequence: true,
          itemCount: 3
        },
        suggestedVisualizations: [
          { templateId: 'list-row-horizontal-icon-arrow', reason: 'Sequential process', score: 85 }
        ]
      })

      const provider = createMockProvider(mockResponse)
      const analyzer = new SemanticAnalyzer({ provider })

      const result = await analyzer.analyze('Step 1: Setup → Step 2: Configure → Step 3: Deploy')

      expect(result.category).toBe('flow')
      expect(result.confidence).toBeCloseTo(0.85)
      expect(result.entities).toHaveLength(3)
      expect(result.dataCharacteristics.hasSequence).toBe(true)
      expect(result.suggestedVisualizations[0].templateId).toBe('list-row-horizontal-icon-arrow')
    })

    it('should fallback to regex analysis when LLM not configured', async () => {
      const provider = createMockProvider('', false)
      const analyzer = new SemanticAnalyzer({ provider, fallbackToRegex: true })

      const result = await analyzer.analyze('Revenue: $1M, Growth: 25%, Users: 10K')

      expect(result.category).toBe('kpi')
      expect(result.dataCharacteristics.hasNumericData).toBe(true)
    })

    it('should throw error for short text', async () => {
      const provider = createMockProvider('')
      const analyzer = new SemanticAnalyzer({ provider })

      await expect(analyzer.analyze('Hi')).rejects.toThrow('Text too short')
    })

    it('should handle LLM errors gracefully', async () => {
      const provider: LLMProvider = {
        name: 'deepseek',
        isConfigured: () => true,
        complete: vi.fn().mockRejectedValue(new Error('API Error')),
        stream: vi.fn()
      }

      const analyzer = new SemanticAnalyzer({ provider, fallbackToRegex: true })
      const result = await analyzer.analyze('Step 1: Setup → Step 2: Configure → Step 3: Deploy')

      // Should fallback to regex
      expect(result.category).toBeDefined()
    })

    it('should parse JSON even with markdown code blocks', async () => {
      const mockResponse = '```json\n{"category":"kpi","confidence":0.9,"intent":"Show metrics","summary":"KPI data","entities":[],"dataCharacteristics":{"hasNumericData":true,"hasTemporalData":false,"hasHierarchy":false,"hasComparison":false,"hasSequence":false,"itemCount":3},"suggestedVisualizations":[]}\n```'

      const provider = createMockProvider(mockResponse)
      const analyzer = new SemanticAnalyzer({ provider })

      const result = await analyzer.analyze('Revenue: $1M, Growth: 25%')

      expect(result.category).toBe('kpi')
      expect(result.confidence).toBeCloseTo(0.9)
    })
  })

  describe('detectCategory', () => {
    it('should return primary category', async () => {
      const mockResponse = JSON.stringify({
        category: 'comparison',
        confidence: 0.8,
        intent: 'Compare options',
        summary: 'Comparison',
        entities: [],
        dataCharacteristics: {
          hasNumericData: false,
          hasTemporalData: false,
          hasHierarchy: false,
          hasComparison: true,
          hasSequence: false,
          itemCount: 2
        },
        suggestedVisualizations: []
      })

      const provider = createMockProvider(mockResponse)
      const analyzer = new SemanticAnalyzer({ provider })

      const category = await analyzer.detectCategory('Option A vs Option B')

      expect(category).toBe('comparison')
    })
  })

  describe('createSemanticAnalyzer', () => {
    it('should create analyzer instance', () => {
      const provider = createMockProvider('')
      const analyzer = createSemanticAnalyzer({ provider })

      expect(analyzer).toBeInstanceOf(SemanticAnalyzer)
    })
  })
})
