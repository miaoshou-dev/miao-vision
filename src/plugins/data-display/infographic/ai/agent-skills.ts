/**
 * AI Agent Skills for Infographic Generation
 *
 * Defines structured skills that LLMs can invoke to create,
 * modify, and query infographic components.
 */

import type { TemplateCategory } from '../templates'
import { getAllTemplates, getTemplateById, getTemplatesByCategory } from '../templates'
import { isSuitableForInfographic } from './text-analyzer'
import { toTemplateData } from './data-extractor'
import { getSmartRecommendations, getTemplateForUseCase, analyzeAndRecommend } from './smart-recommender'

/**
 * Skill parameter definition
 */
export interface SkillParameter {
  name: string
  type: 'string' | 'number' | 'boolean' | 'array' | 'object'
  description: string
  required: boolean
  default?: unknown
  enum?: string[]
}

/**
 * Skill definition
 */
export interface AgentSkill {
  /** Skill identifier */
  id: string
  /** Display name */
  name: string
  /** Description for LLM understanding */
  description: string
  /** Detailed usage instructions */
  instructions: string
  /** Input parameters */
  parameters: SkillParameter[]
  /** Example invocations */
  examples: { input: Record<string, unknown>; description: string }[]
  /** The skill function */
  execute: (params: Record<string, unknown>) => unknown
}

/**
 * Skill 1: Create Infographic from Text
 *
 * Analyzes text and generates infographic configuration.
 */
export const createFromTextSkill: AgentSkill = {
  id: 'infographic-create-from-text',
  name: 'Create Infographic from Text',
  description: 'Analyzes natural language text and generates an infographic configuration. Automatically detects the best structure (flow, comparison, hierarchy, etc.) and extracts data.',
  instructions: `
Use this skill when a user provides text content and wants to visualize it as an infographic.
The skill will:
1. Analyze the text to detect structural patterns (lists, comparisons, sequences, etc.)
2. Extract structured data from the text
3. Recommend the best template
4. Return a complete configuration ready for rendering

Input: Raw text describing data, processes, comparisons, etc.
Output: Template ID, extracted data, and rendering configuration.
  `.trim(),
  parameters: [
    {
      name: 'text',
      type: 'string',
      description: 'The text content to convert into an infographic',
      required: true
    },
    {
      name: 'preferredCategory',
      type: 'string',
      description: 'Optional preferred category (kpi, flow, comparison, hierarchy, relation, distribution, ranking)',
      required: false,
      enum: ['kpi', 'flow', 'comparison', 'hierarchy', 'relation', 'distribution', 'ranking']
    },
    {
      name: 'theme',
      type: 'string',
      description: 'Theme preset name (e.g., dark-vibrant, light-professional)',
      required: false,
      default: 'dark-vibrant'
    }
  ],
  examples: [
    {
      input: { text: 'Step 1: Planning\nStep 2: Development\nStep 3: Testing\nStep 4: Deployment' },
      description: 'Creates a flow/process infographic from numbered steps'
    },
    {
      input: { text: 'React vs Svelte: React uses virtual DOM, Svelte compiles to vanilla JS', preferredCategory: 'comparison' },
      description: 'Creates a comparison infographic'
    }
  ],
  execute: (params) => {
    const text = params.text as string
    const theme = (params.theme as string) || 'dark-vibrant'

    if (!text || !isSuitableForInfographic(text)) {
      return { error: 'Text is not suitable for infographic conversion' }
    }

    // Note: preferredCategory from params can be used to filter recommendations in the future
    const result = analyzeAndRecommend(text)
    const bestTemplate = result.bestTemplate

    if (!bestTemplate) {
      return { error: 'Could not find suitable template' }
    }

    return {
      templateId: bestTemplate.template.id,
      templateName: bestTemplate.template.name,
      category: bestTemplate.template.category,
      confidence: bestTemplate.score,
      data: toTemplateData(result.extraction),
      config: {
        theme,
        width: 800,
        height: 400,
        padding: 16
      },
      analysis: {
        detectedCategory: result.analysis.primaryCategory,
        itemCount: result.analysis.estimatedItemCount,
        hasNumbers: result.analysis.hasNumericData,
        hasDates: result.analysis.hasTemporalData
      }
    }
  }
}

/**
 * Skill 2: Get Template Syntax
 *
 * Returns the syntax and required fields for a template.
 */
export const getTemplateSyntaxSkill: AgentSkill = {
  id: 'infographic-get-syntax',
  name: 'Get Template Syntax',
  description: 'Returns the syntax, required fields, and usage examples for a specific infographic template.',
  instructions: `
Use this skill when you need to understand how to configure a specific template.
Returns the template definition including:
- Required and optional fields
- Optimal data row counts
- Description and usage guidance
  `.trim(),
  parameters: [
    {
      name: 'templateId',
      type: 'string',
      description: 'The template identifier (e.g., "list-row-badge-card", "compare-binary-vs")',
      required: true
    }
  ],
  examples: [
    {
      input: { templateId: 'compare-binary-vs' },
      description: 'Get syntax for VS comparison template'
    }
  ],
  execute: (params) => {
    const templateId = params.templateId as string
    const template = getTemplateById(templateId)

    if (!template) {
      const all = getAllTemplates()
      return {
        error: `Template not found: ${templateId}`,
        availableTemplates: all.map(t => ({ id: t.id, name: t.name, category: t.category }))
      }
    }

    return {
      id: template.id,
      name: template.name,
      category: template.category,
      structure: template.structure,
      item: template.item,
      requiredFields: template.requiredFields,
      optionalFields: template.optionalFields || [],
      optimalRows: template.optimalRows,
      description: template.description,
      usage: `Use this template for ${template.description.toLowerCase()}`
    }
  }
}

/**
 * Skill 3: List Available Structures
 *
 * Returns available templates filtered by category.
 */
export const listStructuresSkill: AgentSkill = {
  id: 'infographic-list-structures',
  name: 'List Available Structures',
  description: 'Lists all available infographic structures/templates, optionally filtered by category.',
  instructions: `
Use this skill to discover available infographic templates.
Can filter by category to find templates for specific use cases.
Categories: kpi, ranking, flow, hierarchy, comparison, distribution, relation
  `.trim(),
  parameters: [
    {
      name: 'category',
      type: 'string',
      description: 'Optional category filter',
      required: false,
      enum: ['kpi', 'ranking', 'flow', 'hierarchy', 'comparison', 'distribution', 'relation']
    }
  ],
  examples: [
    {
      input: {},
      description: 'List all available templates'
    },
    {
      input: { category: 'flow' },
      description: 'List only flow/sequence templates'
    }
  ],
  execute: (params) => {
    const category = params.category as TemplateCategory | undefined

    const templates = category
      ? getTemplatesByCategory(category)
      : getAllTemplates()

    return {
      count: templates.length,
      category: category || 'all',
      templates: templates.map(t => ({
        id: t.id,
        name: t.name,
        category: t.category,
        description: t.description,
        optimalRows: t.optimalRows
      }))
    }
  }
}

/**
 * Skill 4: Recommend Template
 *
 * Recommends best templates based on use case or data characteristics.
 */
export const recommendTemplateSkill: AgentSkill = {
  id: 'infographic-recommend',
  name: 'Recommend Template',
  description: 'Recommends the best infographic template based on use case description or data characteristics.',
  instructions: `
Use this skill when you need to suggest an appropriate template.
Can accept either:
- A use case description (e.g., "compare two products", "show workflow")
- Data characteristics (item count, has numbers, has dates)
Returns ranked recommendations with confidence scores.
  `.trim(),
  parameters: [
    {
      name: 'useCase',
      type: 'string',
      description: 'Description of the use case (e.g., "compare products", "show process steps")',
      required: false
    },
    {
      name: 'itemCount',
      type: 'number',
      description: 'Expected number of items to display',
      required: false,
      default: 4
    },
    {
      name: 'hasNumbers',
      type: 'boolean',
      description: 'Whether data includes numeric values',
      required: false,
      default: false
    },
    {
      name: 'hasDates',
      type: 'boolean',
      description: 'Whether data includes dates/timeline',
      required: false,
      default: false
    }
  ],
  examples: [
    {
      input: { useCase: 'compare two frameworks' },
      description: 'Get recommendation for comparison use case'
    },
    {
      input: { itemCount: 5, hasNumbers: true },
      description: 'Get recommendation for 5 numeric items'
    }
  ],
  execute: (params) => {
    const useCase = params.useCase as string | undefined
    const itemCount = (params.itemCount as number) || 4
    const hasNumbers = (params.hasNumbers as boolean) || false
    const hasDates = (params.hasDates as boolean) || false

    // If use case provided, get direct mapping
    if (useCase) {
      const templateId = getTemplateForUseCase(useCase)
      const template = getTemplateById(templateId)
      return {
        recommended: templateId,
        template: template ? {
          id: template.id,
          name: template.name,
          category: template.category,
          description: template.description
        } : null,
        reason: `Best match for "${useCase}" use case`
      }
    }

    // Otherwise use smart recommendations
    const recommendations = getSmartRecommendations({
      itemCount,
      hasNumbers,
      hasTemporal: hasDates
    })

    return {
      recommendations: recommendations.slice(0, 3).map(r => ({
        templateId: r.template.id,
        templateName: r.template.name,
        score: r.score,
        reasons: r.reasons
      }))
    }
  }
}

/**
 * Skill 5: Update Infographic
 *
 * Modifies an existing infographic configuration.
 */
export const updateInfographicSkill: AgentSkill = {
  id: 'infographic-update',
  name: 'Update Infographic',
  description: 'Updates an existing infographic configuration with new data or settings.',
  instructions: `
Use this skill to modify an existing infographic:
- Add or remove items
- Change template
- Update theme or dimensions
- Modify specific data fields
  `.trim(),
  parameters: [
    {
      name: 'currentConfig',
      type: 'object',
      description: 'Current infographic configuration',
      required: true
    },
    {
      name: 'updates',
      type: 'object',
      description: 'Updates to apply (data, theme, dimensions, etc.)',
      required: true
    }
  ],
  examples: [
    {
      input: {
        currentConfig: { templateId: 'list-row-badge-card', data: { items: [] } },
        updates: { data: { items: [{ label: 'New', value: '100' }] } }
      },
      description: 'Add new item to existing infographic'
    }
  ],
  execute: (params) => {
    const currentConfig = params.currentConfig as Record<string, unknown>
    const updates = params.updates as Record<string, unknown>

    // Deep merge configuration
    const merged = {
      ...currentConfig,
      ...updates,
      data: {
        ...(currentConfig.data as Record<string, unknown> || {}),
        ...(updates.data as Record<string, unknown> || {})
      },
      config: {
        ...(currentConfig.config as Record<string, unknown> || {}),
        ...(updates.config as Record<string, unknown> || {})
      }
    }

    return {
      updated: true,
      config: merged
    }
  }
}

/**
 * All available skills
 */
export const AGENT_SKILLS: AgentSkill[] = [
  createFromTextSkill,
  getTemplateSyntaxSkill,
  listStructuresSkill,
  recommendTemplateSkill,
  updateInfographicSkill
]

/**
 * Get skill by ID
 */
export function getSkillById(id: string): AgentSkill | undefined {
  return AGENT_SKILLS.find(s => s.id === id)
}

/**
 * Get all skill definitions (for LLM context)
 */
export function getSkillDefinitions(): { id: string; name: string; description: string; parameters: SkillParameter[] }[] {
  return AGENT_SKILLS.map(s => ({
    id: s.id,
    name: s.name,
    description: s.description,
    parameters: s.parameters
  }))
}

/**
 * Execute a skill by ID
 */
export function executeSkill(skillId: string, params: Record<string, unknown>): unknown {
  const skill = getSkillById(skillId)
  if (!skill) {
    return { error: `Skill not found: ${skillId}` }
  }

  try {
    return skill.execute(params)
  } catch (error) {
    return { error: `Skill execution failed: ${(error as Error).message}` }
  }
}
