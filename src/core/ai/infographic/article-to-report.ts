/**
 * ArticleToReport - Complete Pipeline
 *
 * End-to-end pipeline for converting articles to multi-chart infographic reports.
 * Combines ArticleAnalyzer, MultiChartPlanner, and InfographicGenerator.
 *
 * @module core/ai/infographic/article-to-report
 */

import type { LLMProvider } from '../types'
import type { InfographicPlan, GeneratedInfographic } from './types'
import type { ArticleAnalysisResult } from './article-analyzer'
import type { MultiChartPlan, LayoutConfig } from './multi-chart-planner'
import { ArticleAnalyzer } from './article-analyzer'
import { MultiChartPlanner } from './multi-chart-planner'
import { InfographicGenerator } from './infographic-generator'

/**
 * Pipeline options
 */
export interface ArticleToReportOptions {
  /** LLM provider */
  provider: LLMProvider
  /** Layout configuration */
  layout?: Partial<LayoutConfig>
  /** Language */
  language?: 'zh' | 'en'
  /** Include title in output */
  includeTitle?: boolean
  /** Include summary */
  includeSummary?: boolean
  /** Maximum sections */
  maxSections?: number
}

/**
 * Pipeline progress event
 */
export interface PipelineProgress {
  /** Current stage */
  stage: 'analyzing' | 'planning' | 'generating' | 'complete' | 'error'
  /** Progress percentage (0-100) */
  progress: number
  /** Status message */
  message: string
  /** Partial data */
  data?: {
    analysis?: ArticleAnalysisResult
    plan?: MultiChartPlan
    infographicPlan?: InfographicPlan
    markdown?: string
  }
}

/**
 * Pipeline result
 */
export interface ArticleToReportResult {
  success: boolean
  /** Generated markdown */
  markdown?: string
  /** Article analysis */
  analysis?: ArticleAnalysisResult
  /** Multi-chart plan */
  chartPlan?: MultiChartPlan
  /** Infographic plan */
  infographicPlan?: InfographicPlan
  /** Error message */
  error?: string
  /** Generation stats */
  stats?: {
    analysisTime: number
    planningTime: number
    generationTime: number
    totalTime: number
    sectionCount: number
    chartCount: number
  }
}

/**
 * ArticleToReport Pipeline
 */
export class ArticleToReportPipeline {
  private analyzer: ArticleAnalyzer
  private planner: MultiChartPlanner
  private generator: InfographicGenerator
  private options: Required<ArticleToReportOptions>

  constructor(options: ArticleToReportOptions) {
    this.options = {
      provider: options.provider,
      layout: options.layout || {},
      language: options.language || 'en',
      includeTitle: options.includeTitle ?? true,
      includeSummary: options.includeSummary ?? true,
      maxSections: options.maxSections || 8
    }

    this.analyzer = new ArticleAnalyzer({
      provider: options.provider,
      language: this.options.language
    })

    this.planner = new MultiChartPlanner({
      ...this.options.layout,
      maxSections: this.options.maxSections
    })

    this.generator = new InfographicGenerator({
      includeTitles: true,
      includeDividers: true
    })
  }

  /**
   * Convert article to report (single call)
   */
  async convert(article: string): Promise<ArticleToReportResult> {
    const startTime = Date.now()
    let analysisTime = 0
    let planningTime = 0
    let generationTime = 0

    try {
      // Stage 1: Analyze article
      const analysisStart = Date.now()
      const analysis = await this.analyzer.analyze(article)
      analysisTime = Date.now() - analysisStart

      // Stage 2: Plan charts
      const planningStart = Date.now()
      const chartPlan = this.planner.plan(analysis)
      const infographicPlan = this.planner.toInfographicPlan(chartPlan)
      planningTime = Date.now() - planningStart

      // Stage 3: Generate markdown
      const generationStart = Date.now()
      const generated = this.generator.generate(infographicPlan)
      generationTime = Date.now() - generationStart

      if (!generated.success) {
        return {
          success: false,
          error: generated.error,
          analysis,
          chartPlan
        }
      }

      // Build final markdown
      let markdown = ''

      if (this.options.includeTitle) {
        markdown += `# ${analysis.title}\n\n`
      }

      if (this.options.includeSummary && analysis.summary) {
        markdown += `> ${analysis.summary}\n\n`
      }

      markdown += generated.markdown || ''

      return {
        success: true,
        markdown,
        analysis,
        chartPlan,
        infographicPlan,
        stats: {
          analysisTime,
          planningTime,
          generationTime,
          totalTime: Date.now() - startTime,
          sectionCount: analysis.sections.length,
          chartCount: chartPlan.charts.length
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        stats: {
          analysisTime,
          planningTime,
          generationTime,
          totalTime: Date.now() - startTime,
          sectionCount: 0,
          chartCount: 0
        }
      }
    }
  }

  /**
   * Convert with streaming progress
   */
  async *convertStream(article: string): AsyncGenerator<PipelineProgress> {
    const startTime = Date.now()

    try {
      // Stage 1: Analyzing
      yield {
        stage: 'analyzing',
        progress: 10,
        message: 'Analyzing article content...'
      }

      let analysis: ArticleAnalysisResult | undefined

      for await (const event of this.analyzer.analyzeStream(article)) {
        if (event.type === 'progress') {
          yield {
            stage: 'analyzing',
            progress: 10 + (event.progress || 0) * 0.3,
            message: event.message || 'Analyzing...'
          }
        } else if (event.type === 'complete') {
          analysis = event.data as ArticleAnalysisResult
          yield {
            stage: 'analyzing',
            progress: 40,
            message: `Found ${analysis.sections.length} visualizable sections`,
            data: { analysis }
          }
        }
      }

      if (!analysis) {
        throw new Error('Analysis failed to complete')
      }

      // Stage 2: Planning
      yield {
        stage: 'planning',
        progress: 45,
        message: 'Planning chart layouts...'
      }

      const chartPlan = this.planner.plan(analysis)

      yield {
        stage: 'planning',
        progress: 55,
        message: `Planned ${chartPlan.charts.length} charts`,
        data: { analysis, plan: chartPlan }
      }

      const infographicPlan = this.planner.toInfographicPlan(chartPlan)

      yield {
        stage: 'planning',
        progress: 65,
        message: 'Layout complete',
        data: { analysis, plan: chartPlan, infographicPlan }
      }

      // Stage 3: Generating
      yield {
        stage: 'generating',
        progress: 70,
        message: 'Generating infographic markdown...'
      }

      let markdown = ''

      if (this.options.includeTitle) {
        markdown += `# ${analysis.title}\n\n`
      }

      if (this.options.includeSummary && analysis.summary) {
        markdown += `> ${analysis.summary}\n\n`
      }

      // Stream section generation
      let sectionIndex = 0
      for await (const progress of this.generator.generateStream(infographicPlan)) {
        sectionIndex++
        const pct = 70 + (sectionIndex / infographicPlan.sections.length) * 25

        yield {
          stage: 'generating',
          progress: pct,
          message: `Generating: ${progress.sectionTitle}`,
          data: {
            analysis,
            plan: chartPlan,
            infographicPlan,
            markdown: markdown + progress.markdown
          }
        }

        if (progress.isComplete) {
          markdown += progress.markdown
        }
      }

      // Complete
      yield {
        stage: 'complete',
        progress: 100,
        message: `Report generated in ${((Date.now() - startTime) / 1000).toFixed(1)}s`,
        data: {
          analysis,
          plan: chartPlan,
          infographicPlan,
          markdown
        }
      }
    } catch (error) {
      yield {
        stage: 'error',
        progress: 0,
        message: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Preview analysis without full generation
   */
  async preview(article: string): Promise<{
    title: string
    summary: string
    chartCount: number
    estimatedSections: string[]
  }> {
    const analysis = await this.analyzer.quickAnalyze(article)
    const fullAnalysis = await this.analyzer.analyze(article)
    const chartPlan = this.planner.plan(fullAnalysis)

    return {
      title: fullAnalysis.title,
      summary: fullAnalysis.summary,
      chartCount: chartPlan.charts.length,
      estimatedSections: chartPlan.charts.map(c => c.title)
    }
  }
}

/**
 * Create article-to-report pipeline
 */
export function createArticleToReportPipeline(
  options: ArticleToReportOptions
): ArticleToReportPipeline {
  return new ArticleToReportPipeline(options)
}

/**
 * Quick convert article to report
 */
export async function articleToReport(
  article: string,
  provider: LLMProvider,
  options?: Partial<Omit<ArticleToReportOptions, 'provider'>>
): Promise<ArticleToReportResult> {
  const pipeline = new ArticleToReportPipeline({ provider, ...options })
  return pipeline.convert(article)
}

/**
 * Stream convert article to report
 */
export async function* streamArticleToReport(
  article: string,
  provider: LLMProvider,
  options?: Partial<Omit<ArticleToReportOptions, 'provider'>>
): AsyncGenerator<PipelineProgress> {
  const pipeline = new ArticleToReportPipeline({ provider, ...options })
  yield* pipeline.convertStream(article)
}
