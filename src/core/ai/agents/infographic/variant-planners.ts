/**
 * Style-specific narrative planners and STYLE_CONFIGS for infographic generation.
 * @module core/ai/agents/infographic/variant-planners
 */
import type { ArticleOutline, ArticlePoint, ExtractedDataPoint, NarrativePlan, NarrativeSection, NarrativeElement, StyleVariantConfig, StyleVariantId } from './types'
import { generateId, truncate, selectIconForLabel } from './utils'

export const STYLE_CONFIGS: Record<StyleVariantId, StyleVariantConfig> = {
  executive: {
    id: 'executive',
    name: 'Executive',
    description: '简洁明了，突出核心结论和关键指标',
    narrativeLogic: '结果 → 原因',
    preferredTemplates: ['kpi-row-badge', 'compare-binary-vs', 'list-row-badge-card'],
    palette: 'business',
    flowDirection: 'left_to_right',
    maxSections: 3,
    minImportance: 7,
    showDescriptions: false,
    showInsights: false,
    visualMetaphor: 'pyramid'
  },
  storytelling: {
    id: 'storytelling',
    name: 'Story',
    description: '流程叙事，展示发展脉络和时间线',
    narrativeLogic: '起因 → 经过 → 结果',
    preferredTemplates: ['flow-timeline', 'flow-linear-numbered', 'sequence-arrow', 'list-row-badge-card'],
    palette: 'ocean',
    flowDirection: 'top_to_bottom',
    maxSections: 4,
    minImportance: 5,
    showDescriptions: true,
    showInsights: true,
    visualMetaphor: 'journey'
  },
  analytical: {
    id: 'analytical',
    name: 'Analytical',
    description: '详尽完整，多维度对比和深度分析',
    narrativeLogic: '分类 → 对比 → 洞察',
    preferredTemplates: ['list-grid-icon', 'compare-table', 'chart-bar', 'kpi-row-badge', 'hierarchy-tree'],
    palette: 'vibrant',
    flowDirection: 'top_to_bottom',
    maxSections: 6,
    minImportance: 3,
    showDescriptions: true,
    showInsights: true,
    visualMetaphor: 'tree'
  }
}

/**
 * Executive Planner - Conclusion-first, KPI-focused
 * Narrative logic: Result → Cause
 */
export class ExecutivePlanner {
  private config = STYLE_CONFIGS.executive
  plan(outline: ArticleOutline): NarrativePlan {
    const sections: NarrativeSection[] = []
    const topPoint = this.getTopPoint(outline)
    if (topPoint) {
      sections.push(this.createHeroSection(topPoint, outline))
    }
    if (outline.dataPoints.length > 0) {
      sections.push(this.createKPISection(outline.dataPoints))
    }
    if (sections.length < this.config.maxSections) {
      const comparisonSection = this.createComparisonSection(outline)
      if (comparisonSection) {
        sections.push(comparisonSection)
      }
    }
    return {
      title: this.extractTitle(outline),
      subtitle: topPoint?.point || outline.theme,
      visualMetaphor: this.config.visualMetaphor,
      flowDirection: this.config.flowDirection,
      sections,
      palette: this.config.palette,
      theme: 'dark-vibrant'
    }
  }
  private getTopPoint(outline: ArticleOutline): ArticlePoint | undefined {
    return [...outline.structure]
      .sort((a, b) => b.importance - a.importance)[0]
  }
  private extractTitle(outline: ArticleOutline): string {
    const theme = outline.theme || ''
    // Remove markdown headers
    return theme.replace(/^#+\s*/, '').substring(0, 50)
  }
  private createHeroSection(point: ArticlePoint, outline: ArticleOutline): NarrativeSection {
    // Find related data points
    const relatedData = outline.dataPoints.slice(0, 2)
    const elements: NarrativeElement[] = relatedData.length > 0
      ? relatedData.map(dp => ({
          label: truncate(dp.label, 20),
          value: String(dp.value),
          iconHint: selectIconForLabel(dp.label)
        }))
      : [{
          label: truncate(point.point, 40),
          iconHint: 'star'
        }]
    return {
      id: generateId('sec'),
      role: 'hook',
      title: 'Key Takeaway',
      message: truncate(point.point, 80),
      visualType: 'kpi-cards',
      visualPurpose: 'Highlight the most important conclusion',
      elements,
      sourcePointIds: [point.id]
    }
  }
  private createKPISection(dataPoints: ExtractedDataPoint[]): NarrativeSection {
    const topMetrics = dataPoints.slice(0, 4)
    return {
      id: generateId('sec'),
      role: 'evidence',
      title: 'Key Metrics',
      message: 'Core performance indicators',
      visualType: 'kpi-cards',
      visualPurpose: 'Display key numerical metrics',
      elements: topMetrics.map(dp => ({
        label: truncate(dp.label, 25),
        value: String(dp.value) + (dp.unit ? ` ${dp.unit}` : ''),
        description: dp.change,
        iconHint: selectIconForLabel(dp.label)
      })),
      sourcePointIds: []
    }
  }
  private createComparisonSection(outline: ArticleOutline): NarrativeSection | null {
    // Look for comparative points
    const comparisonPoints = outline.structure.filter(
      p => p.relationToNext === 'contrasts' || p.point.toLowerCase().includes('vs')
    )
    if (comparisonPoints.length === 0) return null
    const point = comparisonPoints[0]
    return {
      id: generateId('sec'),
      role: 'contrast',
      title: 'Comparison',
      message: truncate(point.point, 60),
      visualType: 'compare-binary',
      visualPurpose: 'Show key differences',
      elements: point.support.slice(0, 4).map(s => ({
        label: truncate(s, 30)
      })),
      sourcePointIds: [point.id]
    }
  }
}

/**
 * Storytelling Planner - Timeline-based, journey narrative
 * Narrative logic: Beginning → Middle → End
 */
export class StorytellingPlanner {
  private config = STYLE_CONFIGS.storytelling
  plan(outline: ArticleOutline): NarrativePlan {
    const sections: NarrativeSection[] = []
    const storyArc = this.buildStoryArc(outline)
    if (storyArc.beginning) {
      sections.push(this.createContextSection(storyArc.beginning))
    }
    if (storyArc.middle.length > 0) {
      sections.push(this.createJourneySection(storyArc.middle, outline))
    }
    if (storyArc.end) {
      sections.push(this.createOutcomeSection(storyArc.end, outline))
    }
    if (sections.length < this.config.maxSections && storyArc.lesson) {
      sections.push(this.createInsightSection(storyArc.lesson))
    }
    return {
      title: this.extractTitle(outline),
      subtitle: 'A visual journey through the key developments',
      visualMetaphor: this.config.visualMetaphor,
      flowDirection: this.config.flowDirection,
      sections,
      palette: this.config.palette,
      theme: 'dark-vibrant'
    }
  }
  private buildStoryArc(outline: ArticleOutline): {
    beginning: ArticlePoint | null
    middle: ArticlePoint[]
    end: ArticlePoint | null
    lesson: ArticlePoint | null
  } {
    const points = outline.structure
    // Find sequential/temporal points for middle
    const processPoints = points.filter(
      p => p.relationToNext === 'follows' ||
           p.relationToNext === 'leads_to' ||
           p.point.match(/step|phase|stage|then|after|before|first|next|finally/i)
    )
    // Beginning: context or first point
    const beginning = points.find(p => p.role === 'context') || points[0] || null
    // Middle: process points or middle section
    const middle = processPoints.length > 0
      ? processPoints.slice(0, 5)
      : points.slice(1, Math.max(2, points.length - 1))
    // End: conclusion or last high-importance point
    const end = points.find(p => p.role === 'conclusion') ||
                [...points].sort((a, b) => b.importance - a.importance)[0] || null
    // Lesson: any insight point
    const lesson = points.find(p =>
      p.point.toLowerCase().includes('learn') ||
      p.point.toLowerCase().includes('insight') ||
      p.point.toLowerCase().includes('takeaway')
    ) || null
    return { beginning, middle, end, lesson }
  }
  private extractTitle(outline: ArticleOutline): string {
    return (outline.theme || 'Story').replace(/^#+\s*/, '').substring(0, 50)
  }
  private createContextSection(point: ArticlePoint): NarrativeSection {
    return {
      id: generateId('sec'),
      role: 'context',
      title: 'The Beginning',
      message: truncate(point.point, 100),
      visualType: 'icon-statement',
      visualPurpose: 'Set the context for the story',
      elements: [{
        label: truncate(point.point, 50),
        description: point.support[0] ? truncate(point.support[0], 60) : undefined,
        iconHint: 'flag'
      }],
      sourcePointIds: [point.id]
    }
  }
  private createJourneySection(points: ArticlePoint[], outline: ArticleOutline): NarrativeSection {
    // Try to use data points if they look temporal
    const timelineData = outline.dataPoints.filter(dp =>
      dp.label.match(/jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|q[1-4]|phase|step|stage/i)
    )
    const elements: NarrativeElement[] = timelineData.length >= 2
      ? timelineData.slice(0, 5).map(dp => ({
          label: truncate(dp.label, 25),
          value: String(dp.value),
          description: dp.change,
          iconHint: 'arrow-right'
        }))
      : points.slice(0, 5).map((p, i) => ({
          label: `Step ${i + 1}`,
          value: truncate(p.point, 30),
          description: p.support[0] ? truncate(p.support[0], 40) : undefined,
          iconHint: 'circle'
        }))
    return {
      id: generateId('sec'),
      role: 'main_point',
      title: 'The Journey',
      message: 'Key milestones and developments',
      visualType: 'flow-linear',
      visualPurpose: 'Show the progression over time',
      elements,
      sourcePointIds: points.map(p => p.id)
    }
  }
  private createOutcomeSection(point: ArticlePoint, outline: ArticleOutline): NarrativeSection {
    // Use data points for outcomes if available
    const outcomeData = outline.dataPoints.filter(dp =>
      dp.change || dp.label.match(/result|outcome|improvement|reduction|increase/i)
    )
    const elements: NarrativeElement[] = outcomeData.length > 0
      ? outcomeData.slice(0, 3).map(dp => ({
          label: truncate(dp.label, 25),
          value: String(dp.value),
          description: dp.change,
          iconHint: dp.change?.includes('+') || dp.change?.includes('increase') ? 'trending-up' : 'check'
        }))
      : [{
          label: truncate(point.point, 40),
          description: point.support[0] ? truncate(point.support[0], 50) : undefined,
          iconHint: 'trophy'
        }]
    return {
      id: generateId('sec'),
      role: 'conclusion',
      title: 'The Outcome',
      message: truncate(point.point, 80),
      visualType: 'kpi-cards',
      visualPurpose: 'Highlight the results achieved',
      elements,
      sourcePointIds: [point.id]
    }
  }
  private createInsightSection(point: ArticlePoint): NarrativeSection {
    return {
      id: generateId('sec'),
      role: 'conclusion',
      title: 'Key Insight',
      message: truncate(point.point, 100),
      visualType: 'icon-statement',
      visualPurpose: 'Summarize the main lesson',
      elements: [{
        label: truncate(point.point, 50),
        iconHint: 'lightbulb'
      }],
      sourcePointIds: [point.id]
    }
  }
}

/**
 * Analytical Planner - Comprehensive, multi-dimensional
 * Narrative logic: Categorize → Compare → Insight
 */
export class AnalyticalPlanner {
  private config = STYLE_CONFIGS.analytical
  plan(outline: ArticleOutline): NarrativePlan {
    const sections: NarrativeSection[] = []
    if (outline.dataPoints.length > 0) {
      sections.push(this.createOverviewSection(outline))
    }
    const categories = this.categorizePoints(outline)
    for (const category of categories.slice(0, 3)) {
      if (sections.length >= this.config.maxSections) break
      sections.push(this.createCategorySection(category))
    }
    if (sections.length < this.config.maxSections) {
      const compSection = this.createComparisonSection(outline)
      if (compSection) sections.push(compSection)
    }
    if (sections.length < this.config.maxSections) {
      const detailSection = this.createDetailSection(outline)
      if (detailSection) sections.push(detailSection)
    }
    return {
      title: this.extractTitle(outline),
      subtitle: 'Comprehensive analysis and detailed breakdown',
      visualMetaphor: this.config.visualMetaphor,
      flowDirection: this.config.flowDirection,
      sections,
      palette: this.config.palette,
      theme: 'dark-vibrant'
    }
  }
  private extractTitle(outline: ArticleOutline): string {
    return (outline.theme || 'Analysis').replace(/^#+\s*/, '').substring(0, 50)
  }
  private createOverviewSection(outline: ArticleOutline): NarrativeSection {
    const metrics = outline.dataPoints.slice(0, 6)
    return {
      id: generateId('sec'),
      role: 'hook',
      title: 'Overview',
      message: 'Key metrics at a glance',
      visualType: 'kpi-cards',
      visualPurpose: 'Provide comprehensive metric overview',
      elements: metrics.map(dp => ({
        label: truncate(dp.label, 25),
        value: String(dp.value) + (dp.unit ? ` ${dp.unit}` : ''),
        description: dp.change,
        iconHint: selectIconForLabel(dp.label)
      })),
      sourcePointIds: []
    }
  }
  private categorizePoints(outline: ArticleOutline): Array<{
    title: string
    points: ArticlePoint[]
    dataPoints: ExtractedDataPoint[]
  }> {
    const categories: Array<{
      title: string
      points: ArticlePoint[]
      dataPoints: ExtractedDataPoint[]
    }> = []
    // Group by concept relationships
    for (const concept of outline.concepts.slice(0, 3)) {
      const relatedPoints = outline.structure.filter(p =>
        p.point.toLowerCase().includes(concept.name.toLowerCase())
      )
      const relatedData = outline.dataPoints.filter(dp =>
        dp.label.toLowerCase().includes(concept.name.toLowerCase())
      )
      if (relatedPoints.length > 0 || relatedData.length > 0) {
        categories.push({
          title: concept.name,
          points: relatedPoints,
          dataPoints: relatedData
        })
      }
    }
    // If no concept-based categories, group by section headers
    if (categories.length === 0) {
      const headerPoints = outline.structure.filter(p =>
        p.point.startsWith('#') || p.point.startsWith('##')
      )
      for (const header of headerPoints.slice(0, 3)) {
        categories.push({
          title: header.point.replace(/^#+\s*/, ''),
          points: [header],
          dataPoints: []
        })
      }
    }
    return categories
  }
  private createCategorySection(category: {
    title: string
    points: ArticlePoint[]
    dataPoints: ExtractedDataPoint[]
  }): NarrativeSection {
    const elements: NarrativeElement[] = []
    // Add data points first
    for (const dp of category.dataPoints.slice(0, 4)) {
      elements.push({
        label: truncate(dp.label, 25),
        value: String(dp.value),
        description: dp.change,
        iconHint: selectIconForLabel(dp.label)
      })
    }
    // Add point details
    for (const point of category.points.slice(0, 4 - elements.length)) {
      elements.push({
        label: truncate(point.point.replace(/^#+\s*/, ''), 30),
        description: point.support[0] ? truncate(point.support[0], 40) : undefined
      })
    }
    return {
      id: generateId('sec'),
      role: 'main_point',
      title: truncate(category.title, 30),
      message: `Details about ${category.title.toLowerCase()}`,
      visualType: 'list-grid',
      visualPurpose: 'Show categorized information',
      elements,
      sourcePointIds: category.points.map(p => p.id)
    }
  }
  private createComparisonSection(outline: ArticleOutline): NarrativeSection | null {
    // Look for comparison patterns in data
    const comparisonData = outline.dataPoints.filter(dp =>
      dp.label.match(/vs|before|after|old|new|compare/i)
    )
    if (comparisonData.length < 2) {
      // Try to find comparison in points
      const compPoints = outline.structure.filter(p =>
        p.relationToNext === 'contrasts' || p.point.match(/vs|compare|differ/i)
      )
      if (compPoints.length === 0) return null
      return {
        id: generateId('sec'),
        role: 'contrast',
        title: 'Comparison',
        message: 'Key differences and contrasts',
        visualType: 'compare-table',
        visualPurpose: 'Compare different options or states',
        elements: compPoints[0].support.slice(0, 4).map(s => ({
          label: truncate(s, 35)
        })),
        sourcePointIds: compPoints.map(p => p.id)
      }
    }
    return {
      id: generateId('sec'),
      role: 'contrast',
      title: 'Comparison',
      message: 'Before and after metrics',
      visualType: 'compare-table',
      visualPurpose: 'Show comparative data',
      elements: comparisonData.slice(0, 4).map(dp => ({
        label: truncate(dp.label, 25),
        value: String(dp.value),
        description: dp.change
      })),
      sourcePointIds: []
    }
  }
  private createDetailSection(outline: ArticleOutline): NarrativeSection | null {
    // Get lower-importance points that haven't been used
    const detailPoints = outline.structure
      .filter(p => p.importance >= this.config.minImportance && p.importance < 7)
      .slice(0, 4)
    if (detailPoints.length === 0) return null
    return {
      id: generateId('sec'),
      role: 'evidence',
      title: 'Additional Details',
      message: 'Supporting information',
      visualType: 'list-vertical',
      visualPurpose: 'Provide additional context',
      elements: detailPoints.map(p => ({
        label: truncate(p.point.replace(/^#+\s*/, ''), 35),
        description: p.support[0] ? truncate(p.support[0], 50) : undefined
      })),
      sourcePointIds: detailPoints.map(p => p.id)
    }
  }
}
