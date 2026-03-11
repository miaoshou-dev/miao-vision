/**
 * MultiChartPlanner - Smart Report Layout Planning
 *
 * Takes article analysis and creates optimized multi-chart layouts.
 * Handles chart selection, data formatting, and visual hierarchy.
 *
 * @module core/ai/infographic/multi-chart-planner
 */

import type { ArticleSection, ArticleAnalysisResult, DataPoint } from './article-analyzer'
import type { InfographicSection, InfographicPlan } from './types'
import type { TemplateCategory, TemplateRepository } from '@/types/infographic-template'
import {
  type LayoutConfig,
  type PlannedChart,
  type MultiChartPlan,
  DEFAULT_LAYOUT,
  TEMPLATE_RULES,
  BASE_HEIGHTS
} from './planner-types'

// Re-export types
export type { LayoutConfig, PlannedChart, MultiChartPlan }

/**
 * MultiChartPlanner class
 */
export class MultiChartPlanner {
  private config: LayoutConfig
  private templateRepo?: TemplateRepository

  constructor(config: Partial<LayoutConfig> = {}, templateRepo?: TemplateRepository) {
    this.config = { ...DEFAULT_LAYOUT, ...config }
    this.templateRepo = templateRepo
  }

  /**
   * Create a multi-chart plan from article analysis
   */
  plan(analysis: ArticleAnalysisResult): MultiChartPlan {
    const visualizableSections = this.filterVisualizableSections(analysis.sections)
    const prioritizedSections = this.prioritizeSections(visualizableSections)
    const selectedSections = prioritizedSections.slice(0, this.config.maxSections)

    const plannedCharts = selectedSections.map(section =>
      this.planChart(section, analysis.keyMetrics)
    )

    const arrangedCharts = this.arrangeInGrid(plannedCharts)
    const hero = this.config.includeHero ? this.extractHero(arrangedCharts) : undefined
    const kpiRow = this.extractKPIRow(arrangedCharts, analysis.keyMetrics)
    const grid = this.calculateGrid(arrangedCharts)

    return {
      title: analysis.title,
      summary: analysis.summary,
      charts: arrangedCharts,
      grid,
      hero,
      kpiRow
    }
  }

  /**
   * Convert plan to InfographicPlan format
   */
  toInfographicPlan(multiPlan: MultiChartPlan): InfographicPlan {
    const sections: InfographicSection[] = []

    if (multiPlan.hero) {
      sections.push(this.chartToSection(multiPlan.hero, 1))
    }

    if (multiPlan.kpiRow) {
      sections.push(this.chartToSection(multiPlan.kpiRow, sections.length + 1))
    }

    const remainingCharts = multiPlan.charts.filter(
      c => c.sectionId !== multiPlan.hero?.sectionId && c.sectionId !== multiPlan.kpiRow?.sectionId
    )

    for (const chart of remainingCharts) {
      sections.push(this.chartToSection(chart, sections.length + 1))
    }

    return {
      title: multiPlan.title,
      theme: this.config.theme,
      palette: this.config.palette,
      sections,
      layout: {
        columns: multiPlan.grid.columns,
        gap: multiPlan.grid.gap,
        maxWidth: 1200
      },
      metadata: {
        sourceLength: 0,
        generatedAt: new Date().toISOString(),
        model: 'multi-chart-planner'
      }
    }
  }

  private filterVisualizableSections(sections: ArticleSection[]): ArticleSection[] {
    return sections.filter(section => {
      if (section.vizType === 'text') return false
      if (section.dataPoints.length === 0 && section.confidence < 0.5) return false
      return true
    })
  }

  private prioritizeSections(sections: ArticleSection[]): ArticleSection[] {
    return [...sections].sort((a, b) => {
      if (a.importance !== b.importance) return b.importance - a.importance
      if (a.dataPoints.length !== b.dataPoints.length) return b.dataPoints.length - a.dataPoints.length
      return b.confidence - a.confidence
    })
  }

  private planChart(section: ArticleSection, globalMetrics: DataPoint[]): PlannedChart {
    const dataCount = section.dataPoints.length || 3
    const templateId = this.selectTemplate(section.vizType as TemplateCategory, dataCount, section)
    const data = this.formatData(section, templateId)

    return {
      sectionId: section.id,
      title: section.title,
      templateId,
      data,
      layout: {
        column: 0,
        row: 0,
        width: this.determineWidth(section.vizType as TemplateCategory, dataCount),
        height: this.determineHeight(section.vizType as TemplateCategory, dataCount)
      },
      priority: section.importance
    }
  }

  private selectTemplate(vizType: TemplateCategory, dataCount: number, section: ArticleSection): string {
    if (section.suggestedTemplates.length > 0) {
      const suggested = section.suggestedTemplates[0]
      if (!this.templateRepo || this.templateRepo.getTemplateById(suggested)) return suggested
    }

    const rules = TEMPLATE_RULES[vizType]
    if (!rules) return 'list-row-badge-card'

    if (dataCount <= 3) return rules.small
    if (dataCount <= 6) return rules.medium
    return rules.large
  }

  private formatData(section: ArticleSection, templateId: string): Record<string, unknown>[] {
    if (this.templateRepo && !this.templateRepo.getTemplateById(templateId)) return []

    return section.dataPoints.map((dp, index) => {
      const item: Record<string, unknown> = { id: `item-${index + 1}`, label: dp.label }
      if (dp.value !== undefined) item.value = dp.value
      if (dp.unit) item.unit = dp.unit
      if (dp.trend) item.trend = dp.trend
      if (dp.change) item.change = dp.change
      if (dp.category) item.category = dp.category
      if (dp.period) item.period = dp.period
      if (section.insights[index]) item.desc = section.insights[index]
      return item
    })
  }

  private determineWidth(vizType: TemplateCategory, dataCount: number): 'full' | 'half' | 'third' {
    if (vizType === 'flow' && dataCount > 4) return 'full'
    if (vizType === 'hierarchy') return 'full'
    if (vizType === 'relation' && dataCount > 5) return 'full'
    if (vizType === 'kpi' && dataCount <= 4) return 'half'
    if (vizType === 'comparison') return 'half'
    return this.config.maxColumns === 1 ? 'full' : 'half'
  }

  private determineHeight(vizType: TemplateCategory, dataCount: number): number {
    const base = BASE_HEIGHTS[vizType] || 300
    if (dataCount > 10) return base + 200
    if (dataCount > 6) return base + 100
    return base
  }

  private arrangeInGrid(charts: PlannedChart[]): PlannedChart[] {
    let currentRow = 0
    let currentCol = 0
    const maxCols = this.config.maxColumns

    return charts.map(chart => {
      const widthSpan = chart.layout.width === 'full' ? maxCols :
                        chart.layout.width === 'half' ? Math.ceil(maxCols / 2) : 1

      if (currentCol + widthSpan > maxCols) {
        currentRow++
        currentCol = 0
      }

      const arranged = {
        ...chart,
        layout: { ...chart.layout, column: currentCol, row: currentRow }
      }

      currentCol += widthSpan
      if (currentCol >= maxCols) {
        currentRow++
        currentCol = 0
      }

      return arranged
    })
  }

  private extractHero(charts: PlannedChart[]): PlannedChart | undefined {
    const heroTypes: TemplateCategory[] = ['kpi', 'statistical', 'flow']
    for (const chart of charts) {
      const template = this.templateRepo?.getTemplateById(chart.templateId)
      if (template && heroTypes.includes(template.category)) {
        return { ...chart, layout: { ...chart.layout, width: 'full', row: 0, column: 0 } }
      }
    }
    return undefined
  }

  private extractKPIRow(charts: PlannedChart[], globalMetrics: DataPoint[]): PlannedChart | undefined {
    if (globalMetrics.length < 2) return undefined

    const data = globalMetrics.slice(0, 4).map((m, i) => ({
      id: `kpi-${i + 1}`,
      label: m.label,
      value: m.value,
      unit: m.unit,
      trend: m.trend,
      change: m.change
    }))

    return {
      sectionId: 'kpi-row',
      title: 'Key Metrics',
      templateId: data.length <= 3 ? 'list-row-badge-card' : 'list-grid-badge-card',
      data,
      layout: { column: 0, row: 0, width: 'full', height: 150 },
      priority: 10
    }
  }

  private calculateGrid(charts: PlannedChart[]): { columns: number; rows: number; gap: number } {
    if (charts.length === 0) return { columns: 1, rows: 0, gap: 20 }
    const maxRow = Math.max(...charts.map(c => c.layout.row))
    const gap = this.config.style === 'compact' ? 12 : this.config.style === 'spacious' ? 24 : 20
    return { columns: this.config.maxColumns, rows: maxRow + 1, gap }
  }

  private chartToSection(chart: PlannedChart, order: number): InfographicSection {
    const template = this.templateRepo?.getTemplateById(chart.templateId)
    return {
      id: chart.sectionId,
      title: chart.title,
      type: template?.category || 'chart',
      templateId: chart.templateId,
      data: chart.data,
      layout: {
        width: chart.layout.width === 'full' ? 1200 : chart.layout.width === 'half' ? 580 : 380,
        height: chart.layout.height,
        position: chart.layout.width
      },
      order
    }
  }
}

/**
 * Create multi-chart planner
 */
export function createMultiChartPlanner(
  config?: Partial<LayoutConfig>,
  templateRepo?: TemplateRepository
): MultiChartPlanner {
  return new MultiChartPlanner(config, templateRepo)
}

/**
 * Quick plan from analysis
 */
export function planMultiChart(
  analysis: ArticleAnalysisResult,
  config?: Partial<LayoutConfig>,
  templateRepo?: TemplateRepository
): MultiChartPlan {
  const planner = new MultiChartPlanner(config, templateRepo)
  return planner.plan(analysis)
}
