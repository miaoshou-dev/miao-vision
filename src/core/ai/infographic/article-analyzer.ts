/**
 * ArticleAnalyzer - Intelligent Article Segmentation
 *
 * Analyzes articles/documents and segments them into visualizable sections.
 * Identifies KPIs, trends, comparisons, processes, and other chart-worthy content.
 *
 * @module core/ai/infographic/article-analyzer
 */

import type { LLMProvider, ChatMessage } from '../types'
import type { TemplateCategory } from '@/types/infographic-template'

/**
 * Article section identified for visualization
 */
export interface ArticleSection {
  /** Section ID */
  id: string
  /** Section title/heading */
  title: string
  /** Original text content */
  content: string
  /** Start position in original text */
  startPos: number
  /** End position in original text */
  endPos: number
  /** Detected visualization type */
  vizType: TemplateCategory | 'text'
  /** Confidence in visualization type */
  confidence: number
  /** Extracted data points */
  dataPoints: DataPoint[]
  /** Key insights from this section */
  insights: string[]
  /** Suggested chart templates */
  suggestedTemplates: string[]
  /** Section importance (1-10) */
  importance: number
}

/**
 * Extracted data point
 */
export interface DataPoint {
  /** Label/name */
  label: string
  /** Value (numeric or string) */
  value: string | number
  /** Unit if applicable */
  unit?: string
  /** Category/group */
  category?: string
  /** Trend indicator */
  trend?: 'up' | 'down' | 'stable'
  /** Change amount */
  change?: string
  /** Time period */
  period?: string
}

/**
 * Article analysis result
 */
export interface ArticleAnalysisResult {
  /** Article title */
  title: string
  /** Overall summary */
  summary: string
  /** Detected sections */
  sections: ArticleSection[]
  /** Key metrics found */
  keyMetrics: DataPoint[]
  /** Main topics/themes */
  topics: string[]
  /** Suggested report structure */
  reportStructure: ReportStructure
  /** Analysis metadata */
  metadata: {
    wordCount: number
    sectionCount: number
    hasNumericData: boolean
    hasTrends: boolean
    hasComparisons: boolean
    language: 'zh' | 'en'
  }
}

/**
 * Suggested report structure
 */
export interface ReportStructure {
  /** Report title */
  title: string
  /** Layout type */
  layout: 'single-column' | 'two-column' | 'dashboard' | 'story'
  /** Ordered sections */
  sections: {
    sectionId: string
    position: 'hero' | 'primary' | 'secondary' | 'supporting'
    width: 'full' | 'half' | 'third'
  }[]
}

/**
 * System prompt for article analysis
 */
const ARTICLE_ANALYZER_SYSTEM_PROMPT = `You are an expert data journalist and visualization specialist. Your task is to analyze articles and identify sections that can be visualized as infographics.

## Your Goals
1. Segment the article into logical sections
2. Identify data-rich content suitable for visualization
3. Extract specific data points (numbers, percentages, comparisons)
4. Suggest appropriate visualization types for each section

## Section Types to Identify
- kpi: Key metrics, numbers, performance indicators (use for: revenue, growth, counts)
- ranking: Ordered lists, top N items, leaderboards
- flow: Processes, timelines, step-by-step sequences
- hierarchy: Organizational structures, nested categories
- comparison: A vs B, pros/cons, feature comparisons
- distribution: Market share, percentages, proportions
- relation: Networks, connections, dependencies
- statistical: Trends over time, charts, graphs
- text: Pure narrative without visualizable data

## Output Format
Respond with valid JSON only:

{
  "title": "Article title or generated title",
  "summary": "2-3 sentence summary",
  "sections": [
    {
      "id": "section-1",
      "title": "Section heading",
      "content": "Original text segment",
      "vizType": "kpi|ranking|flow|...|text",
      "confidence": 0.0-1.0,
      "dataPoints": [
        { "label": "Revenue", "value": 1000000, "unit": "USD", "trend": "up", "change": "+15%" }
      ],
      "insights": ["Key insight from this section"],
      "suggestedTemplates": ["list-row-badge-card", "chart-bar-horizontal"],
      "importance": 1-10
    }
  ],
  "keyMetrics": [
    { "label": "Total Revenue", "value": 1000000, "unit": "USD" }
  ],
  "topics": ["technology", "finance", "growth"],
  "reportStructure": {
    "title": "Report Title",
    "layout": "dashboard",
    "sections": [
      { "sectionId": "section-1", "position": "hero", "width": "full" }
    ]
  },
  "metadata": {
    "wordCount": 500,
    "sectionCount": 4,
    "hasNumericData": true,
    "hasTrends": true,
    "hasComparisons": false,
    "language": "en"
  }
}`

/**
 * Build user prompt for article analysis
 */
function buildArticleAnalyzerPrompt(article: string, language: 'zh' | 'en'): string {
  const langInstruction = language === 'zh'
    ? '请用中文分析以下文章，提取可视化的内容段落。JSON键名保持英文。'
    : 'Analyze the following article and identify visualizable sections:'

  return `${langInstruction}

---
${article}
---

Extract all data points, metrics, processes, and comparisons. For each section, suggest the best visualization type and templates.`
}

/**
 * ArticleAnalyzer class
 */
export class ArticleAnalyzer {
  private provider: LLMProvider
  private temperature: number
  private language: 'zh' | 'en'

  constructor(options: {
    provider: LLMProvider
    temperature?: number
    language?: 'zh' | 'en'
  }) {
    this.provider = options.provider
    this.temperature = options.temperature ?? 0.3
    this.language = options.language ?? 'en'
  }

  /**
   * Analyze an article
   */
  async analyze(article: string): Promise<ArticleAnalysisResult> {
    if (!this.provider.isConfigured()) {
      throw new Error('LLM provider not configured')
    }

    if (!article || article.trim().length < 50) {
      throw new Error('Article too short for analysis (minimum 50 characters)')
    }

    // Detect language if not set
    const detectedLang = this.detectLanguage(article)

    const messages: ChatMessage[] = [
      { role: 'system', content: ARTICLE_ANALYZER_SYSTEM_PROMPT },
      { role: 'user', content: buildArticleAnalyzerPrompt(article, detectedLang) }
    ]

    try {
      const response = await this.provider.complete(messages, {
        temperature: this.temperature,
        maxTokens: 4000
      })

      const parsed = this.parseResponse(response.content)
      return this.validateAndNormalize(parsed, article, detectedLang)
    } catch (error) {
      console.error('ArticleAnalyzer error:', error)
      // Return basic fallback analysis
      return this.fallbackAnalysis(article, detectedLang)
    }
  }

  /**
   * Stream analysis with progress
   */
  async *analyzeStream(article: string): AsyncGenerator<{
    type: 'progress' | 'section' | 'complete'
    data?: ArticleSection | ArticleAnalysisResult
    progress?: number
    message?: string
  }> {
    yield { type: 'progress', progress: 10, message: 'Starting analysis...' }

    try {
      const detectedLang = this.detectLanguage(article)
      yield { type: 'progress', progress: 20, message: 'Analyzing content structure...' }

      const messages: ChatMessage[] = [
        { role: 'system', content: ARTICLE_ANALYZER_SYSTEM_PROMPT },
        { role: 'user', content: buildArticleAnalyzerPrompt(article, detectedLang) }
      ]

      let fullContent = ''
      yield { type: 'progress', progress: 30, message: 'Processing with AI...' }

      for await (const chunk of this.provider.stream(messages, {
        temperature: this.temperature,
        maxTokens: 4000
      })) {
        fullContent += chunk.content
        if (chunk.done) {
          yield { type: 'progress', progress: 80, message: 'Finalizing analysis...' }
        }
      }

      const parsed = this.parseResponse(fullContent)
      const result = this.validateAndNormalize(parsed, article, detectedLang)

      // Yield each section
      for (const section of result.sections) {
        yield { type: 'section', data: section }
      }

      yield { type: 'complete', data: result, progress: 100 }
    } catch (error) {
      const detectedLang = this.detectLanguage(article)
      const fallback = this.fallbackAnalysis(article, detectedLang)
      yield { type: 'complete', data: fallback, progress: 100 }
    }
  }

  /**
   * Quick analysis for previews
   */
  async quickAnalyze(article: string): Promise<{
    title: string
    sectionCount: number
    hasVisualizableContent: boolean
    suggestedLayout: string
  }> {
    const result = await this.analyze(article)
    return {
      title: result.title,
      sectionCount: result.sections.filter(s => s.vizType !== 'text').length,
      hasVisualizableContent: result.sections.some(s => s.vizType !== 'text'),
      suggestedLayout: result.reportStructure.layout
    }
  }

  /**
   * Detect article language
   */
  private detectLanguage(text: string): 'zh' | 'en' {
    const chineseChars = text.match(/[\u4e00-\u9fa5]/g)
    const ratio = chineseChars ? chineseChars.length / text.length : 0
    return ratio > 0.1 ? 'zh' : 'en'
  }

  /**
   * Parse LLM response
   */
  private parseResponse(content: string): Partial<ArticleAnalysisResult> {
    let cleaned = content.trim()
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    }

    try {
      return JSON.parse(cleaned)
    } catch {
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
      throw new Error('Failed to parse article analysis response')
    }
  }

  /**
   * Validate and normalize result
   */
  private validateAndNormalize(
    parsed: Partial<ArticleAnalysisResult>,
    originalText: string,
    language: 'zh' | 'en'
  ): ArticleAnalysisResult {
    const validVizTypes: (TemplateCategory | 'text')[] = [
      'kpi', 'ranking', 'flow', 'hierarchy', 'comparison',
      'distribution', 'relation', 'statistical', 'text'
    ]

    // Normalize sections
    const sections: ArticleSection[] = (parsed.sections || []).map((s, index) => ({
      id: s.id || `section-${index + 1}`,
      title: s.title || `Section ${index + 1}`,
      content: s.content || '',
      startPos: s.startPos || 0,
      endPos: s.endPos || 0,
      vizType: validVizTypes.includes(s.vizType as TemplateCategory) ? s.vizType as TemplateCategory : 'text',
      confidence: typeof s.confidence === 'number' ? Math.max(0, Math.min(1, s.confidence)) : 0.5,
      dataPoints: Array.isArray(s.dataPoints) ? s.dataPoints.map(dp => ({
        label: String(dp.label || ''),
        value: dp.value ?? '',
        unit: dp.unit,
        category: dp.category,
        trend: dp.trend,
        change: dp.change,
        period: dp.period
      })) : [],
      insights: Array.isArray(s.insights) ? s.insights : [],
      suggestedTemplates: Array.isArray(s.suggestedTemplates) ? s.suggestedTemplates : [],
      importance: typeof s.importance === 'number' ? Math.max(1, Math.min(10, s.importance)) : 5
    }))

    // Normalize key metrics
    const keyMetrics: DataPoint[] = (parsed.keyMetrics || []).map(m => ({
      label: String(m.label || ''),
      value: m.value ?? '',
      unit: m.unit,
      trend: m.trend,
      change: m.change
    }))

    // Default report structure
    const reportStructure: ReportStructure = parsed.reportStructure || {
      title: parsed.title || 'Report',
      layout: 'single-column',
      sections: sections.map((s, i) => ({
        sectionId: s.id,
        position: i === 0 ? 'hero' : 'primary',
        width: 'full'
      }))
    }

    return {
      title: parsed.title || this.extractTitle(originalText),
      summary: parsed.summary || originalText.substring(0, 200),
      sections,
      keyMetrics,
      topics: Array.isArray(parsed.topics) ? parsed.topics : [],
      reportStructure,
      metadata: {
        wordCount: originalText.split(/\s+/).length,
        sectionCount: sections.length,
        hasNumericData: sections.some(s => s.dataPoints.length > 0),
        hasTrends: sections.some(s => s.dataPoints.some(dp => dp.trend)),
        hasComparisons: sections.some(s => s.vizType === 'comparison'),
        language
      }
    }
  }

  /**
   * Extract title from text
   */
  private extractTitle(text: string): string {
    // Try to find a heading
    const headingMatch = text.match(/^#\s+(.+)$/m)
    if (headingMatch) return headingMatch[1]

    // Use first sentence
    const firstSentence = text.match(/^[^.!?]+[.!?]/)
    if (firstSentence) return firstSentence[0].substring(0, 60)

    return 'Untitled Report'
  }

  /**
   * Fallback analysis without LLM
   */
  private fallbackAnalysis(text: string, language: 'zh' | 'en'): ArticleAnalysisResult {
    // Split by paragraphs
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 20)

    // Basic data extraction using regex
    const numbers = text.match(/\$?[\d,]+\.?\d*%?/g) || []
    const hasNumericData = numbers.length > 0

    const sections: ArticleSection[] = paragraphs.slice(0, 6).map((p, i) => {
      const hasNumbers = /\d+/.test(p)
      const hasComparison = /vs\.?|versus|compared to|比较|对比/i.test(p)
      const hasProcess = /step|phase|first|then|next|第一|然后|接下来/i.test(p)

      let vizType: TemplateCategory | 'text' = 'text'
      if (hasNumbers && !hasProcess && !hasComparison) vizType = 'kpi'
      else if (hasComparison) vizType = 'comparison'
      else if (hasProcess) vizType = 'flow'

      return {
        id: `section-${i + 1}`,
        title: `Section ${i + 1}`,
        content: p,
        startPos: text.indexOf(p),
        endPos: text.indexOf(p) + p.length,
        vizType,
        confidence: 0.5,
        dataPoints: [],
        insights: [],
        suggestedTemplates: vizType === 'kpi' ? ['list-row-badge-card'] : [],
        importance: i === 0 ? 8 : 5
      }
    })

    return {
      title: this.extractTitle(text),
      summary: text.substring(0, 200),
      sections,
      keyMetrics: [],
      topics: [],
      reportStructure: {
        title: 'Report',
        layout: 'single-column',
        sections: sections.map((s, i) => ({
          sectionId: s.id,
          position: i === 0 ? 'hero' as const : 'primary' as const,
          width: 'full' as const
        }))
      },
      metadata: {
        wordCount: text.split(/\s+/).length,
        sectionCount: sections.length,
        hasNumericData,
        hasTrends: false,
        hasComparisons: sections.some(s => s.vizType === 'comparison'),
        language
      }
    }
  }
}

/**
 * Create article analyzer
 */
export function createArticleAnalyzer(options: {
  provider: LLMProvider
  temperature?: number
  language?: 'zh' | 'en'
}): ArticleAnalyzer {
  return new ArticleAnalyzer(options)
}
