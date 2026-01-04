/**
 * Report Planner
 *
 * Uses LLM to analyze data sources and generate a structured report plan.
 * The plan defines sections, visualizations, and data transformations.
 *
 * @module core/ai/report-planner
 */

import type {
  LLMProvider,
  ChatMessage,
  DataSourceInfo,
  ReportPlan,
  ReportStyle,
  ReportSection
} from './types'
import {
  buildPlannerSystemPrompt,
  buildPlannerUserPrompt,
  parsePlannerResponse
} from './prompts'

/**
 * Report planning result
 */
export interface PlanningResult {
  success: boolean
  plan?: ReportPlan
  error?: string
}

/**
 * Report Planner Service
 *
 * Generates structured report plans from natural language descriptions.
 */
export class ReportPlanner {
  private provider: LLMProvider

  constructor(provider: LLMProvider) {
    this.provider = provider
  }

  /**
   * Update the LLM provider
   */
  setProvider(provider: LLMProvider): void {
    this.provider = provider
  }

  /**
   * Generate a report plan from user input and data sources
   */
  async plan(
    dataSources: DataSourceInfo[],
    userPrompt: string,
    options: {
      style?: ReportStyle
      language?: 'zh' | 'en'
    } = {}
  ): Promise<PlanningResult> {
    // Validate provider
    if (!this.provider.isConfigured()) {
      return {
        success: false,
        error: 'AI 服务未配置，请先设置 API Key'
      }
    }

    // Validate data sources
    if (dataSources.length === 0) {
      return {
        success: false,
        error: '没有可用的数据源，请先加载数据'
      }
    }

    // Build messages
    const messages: ChatMessage[] = [
      { role: 'system', content: buildPlannerSystemPrompt() },
      {
        role: 'user',
        content: buildPlannerUserPrompt(
          dataSources,
          userPrompt,
          options.style || 'professional',
          options.language || 'zh'
        )
      }
    ]

    try {
      // Call LLM
      const response = await this.provider.complete(messages, {
        temperature: 0.4, // Slightly creative but mostly deterministic
        maxTokens: 4096
      })

      // Parse response
      const parsed = parsePlannerResponse(response.content)

      if (!parsed.success || !parsed.plan) {
        return {
          success: false,
          error: parsed.error || '解析报告计划失败'
        }
      }

      // Validate plan against data sources
      const validationError = this.validatePlan(parsed.plan, dataSources)
      if (validationError) {
        return {
          success: false,
          error: validationError
        }
      }

      return {
        success: true,
        plan: parsed.plan as ReportPlan
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '规划失败，请重试'
      }
    }
  }

  /**
   * Stream plan generation for real-time feedback
   */
  async *planStream(
    dataSources: DataSourceInfo[],
    userPrompt: string,
    options: {
      style?: ReportStyle
      language?: 'zh' | 'en'
    } = {}
  ): AsyncGenerator<{ partial: string; done: boolean }, PlanningResult, unknown> {
    // Validate provider
    if (!this.provider.isConfigured()) {
      return {
        success: false,
        error: 'AI 服务未配置，请先设置 API Key'
      }
    }

    // Validate data sources
    if (dataSources.length === 0) {
      return {
        success: false,
        error: '没有可用的数据源，请先加载数据'
      }
    }

    const messages: ChatMessage[] = [
      { role: 'system', content: buildPlannerSystemPrompt() },
      {
        role: 'user',
        content: buildPlannerUserPrompt(
          dataSources,
          userPrompt,
          options.style || 'professional',
          options.language || 'zh'
        )
      }
    ]

    let fullContent = ''

    try {
      for await (const chunk of this.provider.stream(messages, {
        temperature: 0.4,
        maxTokens: 4096
      })) {
        fullContent += chunk.content
        yield { partial: fullContent, done: chunk.done }
      }

      // Parse final response
      const parsed = parsePlannerResponse(fullContent)

      if (!parsed.success || !parsed.plan) {
        return {
          success: false,
          error: parsed.error || '解析报告计划失败'
        }
      }

      // Validate plan
      const validationError = this.validatePlan(parsed.plan, dataSources)
      if (validationError) {
        return {
          success: false,
          error: validationError
        }
      }

      return {
        success: true,
        plan: parsed.plan as ReportPlan
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '规划失败，请重试'
      }
    }
  }

  /**
   * Validate plan against available data sources
   */
  private validatePlan(
    plan: { sections: Array<{ dataSource: string; config: Record<string, unknown> }> },
    dataSources: DataSourceInfo[]
  ): string | null {
    const availableSources = new Set(dataSources.map((d) => d.name))

    for (const section of plan.sections) {
      // Check data source exists
      if (!availableSources.has(section.dataSource)) {
        return `数据源 "${section.dataSource}" 不存在，可用数据源: ${[...availableSources].join(', ')}`
      }

      // Find source and validate columns
      const source = dataSources.find((d) => d.name === section.dataSource)
      if (source) {
        const columnError = this.validateSectionColumns(section, source)
        if (columnError) {
          return columnError
        }
      }
    }

    return null
  }

  /**
   * Validate section columns against data source
   */
  private validateSectionColumns(
    section: { config: Record<string, unknown> },
    source: DataSourceInfo
  ): string | null {
    const availableColumns = new Set(source.columns.map((c) => c.name))
    const config = section.config

    // Check common column fields
    const columnFields = [
      'column',
      'timeColumn',
      'valueColumn',
      'dimensionColumn'
    ]

    for (const field of columnFields) {
      const value = config[field] as string | undefined
      if (value && !availableColumns.has(value)) {
        return `列 "${value}" 在数据源 "${source.name}" 中不存在`
      }
    }

    // Check metrics array
    const metrics = config.metrics as Array<{ column: string }> | undefined
    if (metrics) {
      for (const metric of metrics) {
        if (!availableColumns.has(metric.column)) {
          return `列 "${metric.column}" 在数据源 "${source.name}" 中不存在`
        }
      }
    }

    // Check columns array
    const columns = config.columns as string[] | undefined
    if (columns) {
      for (const col of columns) {
        if (!availableColumns.has(col)) {
          return `列 "${col}" 在数据源 "${source.name}" 中不存在`
        }
      }
    }

    return null
  }

  /**
   * Suggest a default plan based on data sources
   * Used when user provides no specific prompt
   */
  suggestDefaultPlan(dataSources: DataSourceInfo[]): ReportPlan {
    const sections: ReportSection[] = []
    const mainSource = dataSources[0]

    if (!mainSource) {
      return {
        title: '数据分析报告',
        sections: []
      }
    }

    // Identify column types
    const numericColumns = mainSource.columns.filter((c) =>
      c.type.toLowerCase().includes('int') ||
      c.type.toLowerCase().includes('float') ||
      c.type.toLowerCase().includes('double') ||
      c.type.toLowerCase().includes('decimal')
    )

    const timeColumns = mainSource.columns.filter((c) =>
      c.type.toLowerCase().includes('date') ||
      c.type.toLowerCase().includes('time') ||
      c.type.toLowerCase().includes('timestamp')
    )

    const textColumns = mainSource.columns.filter((c) =>
      c.type.toLowerCase().includes('varchar') ||
      c.type.toLowerCase().includes('string') ||
      c.type.toLowerCase().includes('text')
    )

    // Add KPI section if we have numeric columns
    if (numericColumns.length > 0) {
      sections.push({
        type: 'kpi',
        title: '关键指标',
        dataSource: mainSource.name,
        config: {
          metrics: numericColumns.slice(0, 3).map((col) => ({
            name: col.name,
            column: col.name,
            aggregation: 'sum' as const,
            format: 'number' as const
          }))
        }
      })
    }

    // Add trend section if we have time and numeric columns
    if (timeColumns.length > 0 && numericColumns.length > 0) {
      sections.push({
        type: 'trend',
        title: '趋势分析',
        dataSource: mainSource.name,
        config: {
          timeColumn: timeColumns[0].name,
          valueColumn: numericColumns[0].name,
          granularity: 'day' as const,
          chartType: 'line' as const
        }
      })
    }

    // Add ranking section if we have text and numeric columns
    if (textColumns.length > 0 && numericColumns.length > 0) {
      sections.push({
        type: 'ranking',
        title: '排名分析',
        dataSource: mainSource.name,
        config: {
          dimensionColumn: textColumns[0].name,
          valueColumn: numericColumns[0].name,
          aggregation: 'sum' as const,
          limit: 10,
          order: 'desc' as const
        }
      })
    }

    // Add data table
    sections.push({
      type: 'table',
      title: '详细数据',
      dataSource: mainSource.name,
      config: {
        limit: 100,
        sortOrder: 'desc' as const
      }
    })

    return {
      title: `${mainSource.name} 数据分析报告`,
      description: '自动生成的数据分析报告',
      sections
    }
  }
}

/**
 * Create a ReportPlanner instance
 */
export function createReportPlanner(provider: LLMProvider): ReportPlanner {
  return new ReportPlanner(provider)
}
