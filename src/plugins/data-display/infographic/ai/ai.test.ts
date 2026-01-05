/**
 * AI Module Tests
 */
import { describe, it, expect } from 'vitest'
import { analyzeText, detectCategory, isSuitableForInfographic } from './text-analyzer'
import { extractData, toTemplateData } from './data-extractor'
import { getSmartRecommendations, getBestTemplate, getTemplateForUseCase, analyzeAndRecommend } from './smart-recommender'
import { textToInfographic, quickConvert, convertWithTemplate } from './pipeline'
import { executeSkill, getSkillDefinitions, AGENT_SKILLS } from './agent-skills'

describe('TextAnalyzer', () => {
  it('detects flow patterns', () => {
    const text = 'Step 1: Plan. Step 2: Build. Step 3: Test. Step 4: Deploy.'
    const result = analyzeText(text)
    expect(result.primaryCategory).toBe('flow')
    expect(result.estimatedItemCount).toBeGreaterThanOrEqual(3) // Minimum 3 items detected
  })

  it('detects comparison patterns', () => {
    const text = 'React vs Vue: React uses JSX, Vue uses templates.'
    const result = analyzeText(text)
    expect(result.primaryCategory).toBe('comparison')
  })

  it('detects kpi patterns', () => {
    const text = 'Revenue: $1.2M (+15%). Profit: $300K. Growth: 25%.'
    const result = analyzeText(text)
    expect(result.primaryCategory).toBe('kpi')
    expect(result.hasNumericData).toBe(true)
    expect(result.hasPercentageData).toBe(true)
  })

  it('checks suitability', () => {
    expect(isSuitableForInfographic('Too short')).toBe(false)
    expect(isSuitableForInfographic('Step 1: Plan. Step 2: Build. Step 3: Test.')).toBe(true)
  })
})

describe('DataExtractor', () => {
  it('extracts list items', () => {
    const text = '- Item 1\n- Item 2\n- Item 3'
    const analysis = analyzeText(text)
    const result = extractData(text, analysis)
    expect(result.items).toBeDefined()
    expect(result.items!.length).toBe(3)
  })

  it('extracts flow steps', () => {
    const text = '1. First step\n2. Second step\n3. Third step'
    const analysis = analyzeText(text)
    const result = extractData(text, analysis)
    expect(result.flow || result.items).toBeDefined()
  })

  it('converts to template data', () => {
    const text = '- Revenue: $1M\n- Growth: 15%'
    const analysis = analyzeText(text)
    const extraction = extractData(text, analysis)
    const templateData = toTemplateData(extraction)
    expect(templateData.items).toBeDefined()
  })
})

describe('SmartRecommender', () => {
  it('recommends templates based on text', () => {
    const recommendations = getSmartRecommendations({
      text: 'Step 1: Plan. Step 2: Build. Step 3: Test.'
    })
    expect(recommendations.length).toBeGreaterThan(0)
    expect(recommendations[0].score).toBeGreaterThan(0)
  })

  it('gets best template', () => {
    const result = getBestTemplate('Compare A vs B: A is fast, B is simple')
    expect(result).not.toBeNull()
    expect(result!.template.category).toBe('comparison')
  })

  it('maps use cases to templates', () => {
    expect(getTemplateForUseCase('compare products')).toContain('compare')
    expect(getTemplateForUseCase('show process')).toContain('flow')
    expect(getTemplateForUseCase('pie chart')).toContain('sector')
  })

  it('analyzes and recommends', () => {
    const result = analyzeAndRecommend('1. First 2. Second 3. Third 4. Fourth')
    expect(result.analysis).toBeDefined()
    expect(result.extraction).toBeDefined()
    expect(result.recommendations.length).toBeGreaterThan(0)
  })
})

describe('Pipeline', () => {
  it('converts text to infographic', () => {
    const result = textToInfographic('Step 1: Plan → Step 2: Build → Step 3: Test')
    expect(result.success).toBe(true)
    expect(result.templateId).toBeDefined()
    expect(result.data).toBeDefined()
    expect(result.markdown).toBeDefined()
  })

  it('quick converts', () => {
    const result = quickConvert('Revenue: $1M. Growth: 25%. Users: 10K.')
    expect(result.success).toBe(true)
  })

  it('converts with specific template', () => {
    const result = convertWithTemplate(
      '- Item A\n- Item B\n- Item C',
      'list-row-badge-card'
    )
    expect(result.success).toBe(true)
    expect(result.templateId).toBe('list-row-badge-card')
  })

  it('rejects too short text', () => {
    const result = textToInfographic('Hi')
    expect(result.success).toBe(false)
    expect(result.error).toContain('too short')
  })

  it('rejects too long text', () => {
    const longText = 'a'.repeat(6000)
    const result = textToInfographic(longText)
    expect(result.success).toBe(false)
    expect(result.error).toContain('too long')
  })
})

describe('AgentSkills', () => {
  it('has 5 skills defined', () => {
    expect(AGENT_SKILLS.length).toBe(5)
  })

  it('provides skill definitions', () => {
    const defs = getSkillDefinitions()
    expect(defs.length).toBe(5)
    expect(defs[0].id).toBeDefined()
    expect(defs[0].parameters).toBeDefined()
  })

  it('executes create-from-text skill', () => {
    const result = executeSkill('infographic-create-from-text', {
      text: '1. First step\n2. Second step\n3. Third step'
    }) as Record<string, unknown>
    expect(result.templateId).toBeDefined()
  })

  it('executes list-structures skill', () => {
    const result = executeSkill('infographic-list-structures', {}) as Record<string, unknown>
    expect(result.count).toBeGreaterThan(0)
    expect(result.templates).toBeDefined()
  })

  it('executes get-syntax skill', () => {
    const result = executeSkill('infographic-get-syntax', {
      templateId: 'list-row-badge-card'
    }) as Record<string, unknown>
    expect(result.id).toBe('list-row-badge-card')
    expect(result.requiredFields).toBeDefined()
  })

  it('executes recommend skill', () => {
    const result = executeSkill('infographic-recommend', {
      useCase: 'compare two options'
    }) as Record<string, unknown>
    expect(result.recommended).toBeDefined()
  })

  it('returns error for unknown skill', () => {
    const result = executeSkill('unknown-skill', {}) as Record<string, unknown>
    expect(result.error).toContain('not found')
  })
})
