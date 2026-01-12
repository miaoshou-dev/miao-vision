/**
 * Infographic AI Prompts
 *
 * System and user prompts for LLM-powered infographic generation.
 *
 * @module core/ai/infographic/prompts
 */

import type { TemplateCategory } from '@plugins/data-display/infographic/templates'
import { getAllTemplates } from '@plugins/data-display/infographic/templates'

/**
 * Get template reference for prompts
 */
function getTemplateReference(): string {
  const templates = getAllTemplates()
  const byCategory = templates.reduce((acc, t) => {
    if (!acc[t.category]) acc[t.category] = []
    acc[t.category].push(`- ${t.id}: ${t.description} (${t.optimalRows[0]}-${t.optimalRows[1]} items)`)
    return acc
  }, {} as Record<string, string[]>)

  return Object.entries(byCategory)
    .map(([cat, items]) => `### ${cat}\n${items.join('\n')}`)
    .join('\n\n')
}

/**
 * System prompt for semantic analysis
 */
export const SEMANTIC_ANALYZER_SYSTEM_PROMPT = `You are an expert content analyzer specializing in identifying structural patterns in text for infographic visualization.

Your task is to analyze text and extract:
1. The primary category (what type of information this represents)
2. Key entities (metrics, categories, actions, concepts)
3. Data characteristics (numeric, temporal, hierarchical, etc.)
4. Suggested visualizations

## Categories
- kpi: Key metrics, numbers, performance indicators
- ranking: Ordered lists, top N, leaderboards
- flow: Sequential processes, workflows, timelines
- hierarchy: Tree structures, org charts, nested information
- comparison: A vs B, pros/cons, feature comparisons
- distribution: Percentages, market share, proportions
- relation: Networks, connections, dependencies
- statistical: Trends, charts, data over time

## Output Format
Respond with valid JSON only, no markdown code blocks.

{
  "category": "flow|kpi|ranking|hierarchy|comparison|distribution|relation|statistical",
  "confidence": 0.0-1.0,
  "intent": "Brief description of what the content is trying to convey",
  "summary": "One sentence summary",
  "entities": [
    {
      "text": "entity text",
      "type": "metric|category|time|action|concept|person|organization",
      "value": "optional numeric or string value",
      "unit": "optional unit"
    }
  ],
  "dataCharacteristics": {
    "hasNumericData": true/false,
    "hasTemporalData": true/false,
    "hasHierarchy": true/false,
    "hasComparison": true/false,
    "hasSequence": true/false,
    "itemCount": number
  },
  "suggestedVisualizations": [
    {
      "templateId": "template-id",
      "reason": "Why this template fits",
      "score": 0-100
    }
  ]
}`

/**
 * Build semantic analyzer user prompt
 */
export function buildSemanticAnalyzerPrompt(text: string, language: 'zh' | 'en' = 'en'): string {
  const langInstruction = language === 'zh'
    ? '请用中文分析以下文本，但JSON键名保持英文。'
    : 'Analyze the following text:'

  return `${langInstruction}

---
${text}
---

Identify the structure, extract key information, and suggest the best visualization templates.`
}

/**
 * System prompt for infographic planning
 */
export function getInfographicPlannerSystemPrompt(): string {
  const templateRef = getTemplateReference()

  return `You are an expert infographic designer that creates multi-section visual reports from text content.

Your task is to:
1. Analyze the input text
2. Break it into logical sections
3. Choose the best visualization template for each section
4. Extract and structure the data for each template

## Available Templates
${templateRef}

## Output Format
Respond with valid JSON only, no markdown code blocks.

{
  "title": "Infographic title",
  "theme": "dark-vibrant",
  "palette": "vibrant|business|ocean|sunset|forest",
  "layout": {
    "columns": 1-3,
    "gap": 20,
    "maxWidth": 1200
  },
  "sections": [
    {
      "id": "section-1",
      "title": "Section Title",
      "type": "kpi|chart|flow|comparison|hierarchy|text",
      "templateId": "template-id-from-list",
      "data": [
        { "label": "Item 1", "value": 100, "desc": "Optional description" }
      ],
      "layout": {
        "width": 800,
        "height": 400,
        "position": "full|half|third"
      },
      "order": 1
    }
  ]
}

## Data Field Guidelines
- KPI templates: { label, value, desc?, icon?, trend? }
- Flow templates: { label, desc?, icon?, step? }
- Comparison templates: { label, items[] } or { title, items[], subtitle? }
- Hierarchy templates: { id, label, children?[], desc? }
- Statistical templates: { label, value, series? }

## Design Principles
1. Lead with KPIs if numeric metrics exist
2. Use flow for processes/timelines
3. Use comparison for A vs B content
4. Keep sections focused - one concept per section
5. Order sections logically (overview → details → conclusions)`
}

/**
 * Build infographic planner user prompt
 */
export function buildInfographicPlannerPrompt(
  text: string,
  options: {
    intent?: string
    style?: 'minimal' | 'detailed' | 'infographic' | 'dashboard'
    maxSections?: number
    language?: 'zh' | 'en'
  } = {}
): string {
  const { intent, style = 'infographic', maxSections = 6, language = 'en' } = options

  const styleGuide = {
    minimal: 'Create a minimal design with 1-2 key sections only.',
    detailed: 'Create a comprehensive multi-section infographic.',
    infographic: 'Create a balanced infographic with visual appeal.',
    dashboard: 'Create a dashboard-style layout with KPIs prominent.'
  }

  const langInstruction = language === 'zh'
    ? '请用中文生成标题和描述，但JSON键名和templateId保持英文。'
    : ''

  return `Create an infographic plan from the following content:

---
${text}
---

${intent ? `User intent: ${intent}` : ''}
Style: ${styleGuide[style]}
Maximum sections: ${maxSections}
${langInstruction}

Extract the key information and create appropriate visualizations.`
}

/**
 * System prompt for section data extraction
 */
export const DATA_EXTRACTOR_SYSTEM_PROMPT = `You are a data extraction specialist that converts unstructured text into structured data for infographic templates.

Given a text segment and target template, extract data in the exact format needed.

## Output Format
Respond with valid JSON array only:
[
  { "label": "...", "value": "...", ... }
]

Match the field names to template requirements exactly.`

/**
 * Build data extraction prompt for a specific template
 */
export function buildDataExtractionPrompt(
  text: string,
  templateId: string,
  requiredFields: string[],
  optionalFields: string[] = []
): string {
  return `Extract data from this text for template "${templateId}":

---
${text}
---

Required fields: ${requiredFields.join(', ')}
Optional fields: ${optionalFields.join(', ') || 'none'}

Return a JSON array of items with these fields.`
}

/**
 * Category detection prompt (lightweight)
 */
export const CATEGORY_DETECTION_PROMPT = `Classify this text into ONE category. Respond with just the category name.

Categories: kpi, ranking, flow, hierarchy, comparison, distribution, relation, statistical

Text: {text}

Category:`
