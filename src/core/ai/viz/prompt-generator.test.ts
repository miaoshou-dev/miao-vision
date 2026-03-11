import { describe, it, expect, beforeEach } from 'vitest'
import { z } from 'zod'
import { CatalogPromptGenerator } from './prompt-generator'
import { getVizCatalog, resetVizCatalog } from '@/core/catalog'

describe('CatalogPromptGenerator', () => {
  let generator: CatalogPromptGenerator

  beforeEach(() => {
    resetVizCatalog()
    generator = new CatalogPromptGenerator()
  })

  it('should generate system prompt containing registered components', () => {
    // Register a schema in the VizCatalog singleton (T1: single source of truth)
    getVizCatalog().registerVizSchema({
      type: 'mock-chart',
      description: 'A mock chart for testing',
      vizSchema: z.object({ x: z.string().describe('X Axis') })
    })

    const prompt = generator.generateSystemThinkingContext()

    expect(prompt).toContain('You are a Visualization Expert')
    expect(prompt).toContain('mock-chart')
    expect(prompt).toContain('A mock chart for testing')
    expect(prompt).toContain('```vizspec')
    // T1 format: "### type" header + "Schema:" block
    expect(prompt).toContain('### mock-chart')
    expect(prompt).toContain('Schema:')
    expect(prompt).toContain('x: string')
  })

  it('should format Zod schema correctly', () => {
    getVizCatalog().registerVizSchema({
      type: 'color-test',
      description: 'test',
      vizSchema: z.object({ color: z.enum(['red', 'blue']) })
    })

    const prompt = generator.generateSystemThinkingContext()

    expect(prompt).toContain('enum')
    expect(prompt).toContain('red')
    expect(prompt).toContain('blue')
  })
})
