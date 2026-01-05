/**
 * Report Generator
 *
 * Generates complete markdown report from a report plan.
 * Supports streaming generation for real-time preview.
 *
 * @module core/ai/report-generator
 */

import type {
  LLMProvider,
  ChatMessage,
  DataSourceInfo,
  ReportPlan,
  ReportSection,
  ReportStyle,
  ReportGenerationResult,
  SectionProgress,
  ChartPalette
} from './types'
import {
  generateSectionMarkdown,
  buildInsightSystemPrompt,
  buildInsightUserPrompt,
  generateInsightMarkdown
} from './prompts'

/**
 * Report Generator Service
 *
 * Transforms a report plan into complete markdown content.
 */
export class ReportGenerator {
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
   * Generate complete report markdown from a plan
   */
  async generate(
    plan: ReportPlan,
    dataSources: DataSourceInfo[],
    options: {
      style?: ReportStyle
      language?: 'zh' | 'en'
      palette?: ChartPalette
    } = {}
  ): Promise<ReportGenerationResult> {
    try {
      let markdown = this.generateHeader(plan)

      // Generate each section
      for (let i = 0; i < plan.sections.length; i++) {
        const section = plan.sections[i]

        if (section.type === 'insight') {
          // Insight sections need LLM generation
          const previousSections = plan.sections
            .slice(0, i)
            .map((s) => generateSectionMarkdown(s, plan.sections.indexOf(s), options.palette))

          const insightContent = await this.generateInsightContent(
            section,
            dataSources,
            previousSections,
            options.style || 'professional'
          )

          markdown += generateInsightMarkdown(section, insightContent)
        } else {
          // Other sections use template generation
          markdown += generateSectionMarkdown(section, i, options.palette)
        }
      }

      return {
        success: true,
        markdown,
        plan
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '报告生成失败'
      }
    }
  }

  /**
   * Stream report generation for real-time preview
   *
   * Yields progress for each section as it's generated.
   */
  async *generateStream(
    plan: ReportPlan,
    dataSources: DataSourceInfo[],
    options: {
      style?: ReportStyle
      language?: 'zh' | 'en'
      palette?: ChartPalette
    } = {}
  ): AsyncGenerator<SectionProgress, ReportGenerationResult, unknown> {
    try {
      let fullMarkdown = this.generateHeader(plan)

      // Yield header progress
      yield {
        sectionIndex: -1,
        sectionTitle: '报告标题',
        markdown: fullMarkdown,
        isComplete: true
      }

      // Generate each section
      const previousSections: string[] = []

      for (let i = 0; i < plan.sections.length; i++) {
        const section = plan.sections[i]

        if (section.type === 'insight') {
          // Stream insight generation
          yield {
            sectionIndex: i,
            sectionTitle: section.title,
            markdown: fullMarkdown + `## ${section.title}\n\n*正在生成分析内容...*\n\n`,
            isComplete: false
          }

          let insightContent = ''

          for await (const chunk of this.streamInsightContent(
            section,
            dataSources,
            previousSections,
            options.style || 'professional'
          )) {
            insightContent = chunk.content

            yield {
              sectionIndex: i,
              sectionTitle: section.title,
              markdown: fullMarkdown + `## ${section.title}\n\n${insightContent}\n\n`,
              isComplete: chunk.done
            }
          }

          const sectionMarkdown = generateInsightMarkdown(section, insightContent)
          fullMarkdown += sectionMarkdown
          previousSections.push(sectionMarkdown)
        } else {
          // Template-based generation (instant)
          const sectionMarkdown = generateSectionMarkdown(section, i, options.palette)
          fullMarkdown += sectionMarkdown
          previousSections.push(sectionMarkdown)

          yield {
            sectionIndex: i,
            sectionTitle: section.title,
            markdown: fullMarkdown,
            isComplete: true
          }
        }
      }

      return {
        success: true,
        markdown: fullMarkdown,
        plan
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '报告生成失败'
      }
    }
  }

  /**
   * Generate report header markdown
   */
  private generateHeader(plan: ReportPlan): string {
    let header = `# ${plan.title}\n\n`

    if (plan.description) {
      header += `${plan.description}\n\n`
    }

    header += `---\n\n`

    return header
  }

  /**
   * Generate insight content using LLM
   */
  private async generateInsightContent(
    section: ReportSection,
    dataSources: DataSourceInfo[],
    previousSections: string[],
    style: ReportStyle
  ): Promise<string> {
    if (!this.provider.isConfigured()) {
      return '*AI 服务未配置，无法生成分析内容*'
    }

    const messages: ChatMessage[] = [
      { role: 'system', content: buildInsightSystemPrompt(style) },
      {
        role: 'user',
        content: buildInsightUserPrompt(
          section,
          dataSources,
          previousSections
        )
      }
    ]

    try {
      const response = await this.provider.complete(messages, {
        temperature: 0.6, // More creative for insights
        maxTokens: 1024
      })

      return response.content
    } catch (error) {
      return `*生成失败: ${error instanceof Error ? error.message : '未知错误'}*`
    }
  }

  /**
   * Stream insight content generation
   */
  private async *streamInsightContent(
    section: ReportSection,
    dataSources: DataSourceInfo[],
    previousSections: string[],
    style: ReportStyle
  ): AsyncGenerator<{ content: string; done: boolean }, void, unknown> {
    if (!this.provider.isConfigured()) {
      yield { content: '*AI 服务未配置，无法生成分析内容*', done: true }
      return
    }

    const messages: ChatMessage[] = [
      { role: 'system', content: buildInsightSystemPrompt(style) },
      {
        role: 'user',
        content: buildInsightUserPrompt(
          section,
          dataSources,
          previousSections
        )
      }
    ]

    let fullContent = ''

    try {
      for await (const chunk of this.provider.stream(messages, {
        temperature: 0.6,
        maxTokens: 1024
      })) {
        fullContent += chunk.content
        yield { content: fullContent, done: chunk.done }
      }
    } catch (error) {
      yield {
        content: `*生成失败: ${error instanceof Error ? error.message : '未知错误'}*`,
        done: true
      }
    }
  }
}

/**
 * Create a ReportGenerator instance
 */
export function createReportGenerator(provider: LLMProvider): ReportGenerator {
  return new ReportGenerator(provider)
}

/**
 * Convenience function to generate a complete report
 *
 * Combines planning and generation into a single call.
 */
export async function generateReport(
  planner: { plan: (dataSources: DataSourceInfo[], prompt: string, options?: { style?: ReportStyle; language?: 'zh' | 'en' }) => Promise<{ success: boolean; plan?: ReportPlan; error?: string }> },
  generator: ReportGenerator,
  dataSources: DataSourceInfo[],
  userPrompt: string,
  options: {
    style?: ReportStyle
    language?: 'zh' | 'en'
    palette?: ChartPalette
  } = {}
): Promise<ReportGenerationResult> {
  // Step 1: Plan the report
  const planResult = await planner.plan(dataSources, userPrompt, options)

  if (!planResult.success || !planResult.plan) {
    return {
      success: false,
      error: planResult.error || '报告规划失败'
    }
  }

  // Step 2: Generate the report
  return generator.generate(planResult.plan, dataSources, options)
}
