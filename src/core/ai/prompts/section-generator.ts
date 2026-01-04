/**
 * Section Generator Prompts
 *
 * Prompts for generating markdown content for each report section type.
 * Each section type has specialized prompts optimized for its purpose.
 *
 * @module core/ai/prompts/section-generator
 */

import type {
  ReportSection,
  ReportStyle,
  KPISectionConfig,
  TrendSectionConfig,
  RankingSectionConfig,
  ComparisonSectionConfig,
  DistributionSectionConfig,
  TableSectionConfig,
  InsightSectionConfig,
  DataSourceInfo
} from '../types'

/**
 * Aggregation SQL expressions
 */
const AGGREGATION_SQL: Record<string, string> = {
  sum: 'SUM',
  avg: 'AVG',
  count: 'COUNT',
  max: 'MAX',
  min: 'MIN'
}

/**
 * Generate SQL for KPI section
 */
export function generateKPISQL(
  config: KPISectionConfig,
  dataSource: string
): string {
  const selectParts = config.metrics.map((m) => {
    const agg = AGGREGATION_SQL[m.aggregation] || 'SUM'
    return `${agg}(${m.column}) as ${m.name.replace(/\s+/g, '_').toLowerCase()}`
  })

  return `SELECT ${selectParts.join(', ')} FROM ${dataSource}`
}

/**
 * Generate markdown for KPI section
 */
export function generateKPIMarkdown(
  section: ReportSection,
  queryName: string
): string {
  const config = section.config as KPISectionConfig
  let markdown = `## ${section.title}\n\n`

  if (section.description) {
    markdown += `${section.description}\n\n`
  }

  // Generate SQL block
  const sql = generateKPISQL(config, section.dataSource)
  markdown += `\`\`\`sql name=${queryName}\n${sql}\n\`\`\`\n\n`

  // Generate BigValue components for each metric
  for (const metric of config.metrics) {
    const colName = metric.name.replace(/\s+/g, '_').toLowerCase()
    markdown += `\`\`\`bigvalue\n`
    markdown += `query: ${queryName}\n`
    markdown += `value: ${colName}\n`
    markdown += `title: ${metric.name}\n`
    if (metric.format) {
      markdown += `format: ${metric.format}\n`
    }
    markdown += `\`\`\`\n\n`
  }

  return markdown
}

/**
 * Generate SQL for trend section
 */
export function generateTrendSQL(
  config: TrendSectionConfig,
  dataSource: string
): string {
  const granularityExpr = getGranularityExpression(
    config.timeColumn,
    config.granularity
  )

  return `SELECT
  ${granularityExpr} as period,
  SUM(${config.valueColumn}) as value
FROM ${dataSource}
GROUP BY period
ORDER BY period`
}

/**
 * Get SQL expression for time granularity
 */
function getGranularityExpression(
  column: string,
  granularity: string
): string {
  switch (granularity) {
    case 'day':
      return `DATE_TRUNC('day', ${column})`
    case 'week':
      return `DATE_TRUNC('week', ${column})`
    case 'month':
      return `DATE_TRUNC('month', ${column})`
    case 'quarter':
      return `DATE_TRUNC('quarter', ${column})`
    case 'year':
      return `DATE_TRUNC('year', ${column})`
    default:
      return `DATE_TRUNC('day', ${column})`
  }
}

/**
 * Generate markdown for trend section
 */
export function generateTrendMarkdown(
  section: ReportSection,
  queryName: string
): string {
  const config = section.config as TrendSectionConfig
  let markdown = `## ${section.title}\n\n`

  if (section.description) {
    markdown += `${section.description}\n\n`
  }

  const sql = generateTrendSQL(config, section.dataSource)
  markdown += `\`\`\`sql name=${queryName}\n${sql}\n\`\`\`\n\n`

  const chartType = config.chartType || 'line'
  markdown += `\`\`\`chart\n`
  markdown += `type: ${chartType}\n`
  markdown += `data: ${queryName}\n`
  markdown += `x: period\n`
  markdown += `y: value\n`
  markdown += `title: ${section.title}\n`
  markdown += `\`\`\`\n\n`

  return markdown
}

/**
 * Generate SQL for ranking section
 */
export function generateRankingSQL(
  config: RankingSectionConfig,
  dataSource: string
): string {
  const agg = AGGREGATION_SQL[config.aggregation] || 'SUM'
  const order = config.order === 'asc' ? 'ASC' : 'DESC'

  return `SELECT
  ${config.dimensionColumn} as dimension,
  ${agg}(${config.valueColumn}) as value
FROM ${dataSource}
GROUP BY ${config.dimensionColumn}
ORDER BY value ${order}
LIMIT ${config.limit}`
}

/**
 * Generate markdown for ranking section
 */
export function generateRankingMarkdown(
  section: ReportSection,
  queryName: string
): string {
  const config = section.config as RankingSectionConfig
  let markdown = `## ${section.title}\n\n`

  if (section.description) {
    markdown += `${section.description}\n\n`
  }

  const sql = generateRankingSQL(config, section.dataSource)
  markdown += `\`\`\`sql name=${queryName}\n${sql}\n\`\`\`\n\n`

  markdown += `\`\`\`chart\n`
  markdown += `type: bar\n`
  markdown += `data: ${queryName}\n`
  markdown += `x: dimension\n`
  markdown += `y: value\n`
  markdown += `title: ${section.title}\n`
  markdown += `\`\`\`\n\n`

  return markdown
}

/**
 * Generate SQL for comparison section
 */
export function generateComparisonSQL(
  config: ComparisonSectionConfig,
  dataSource: string
): string {
  const agg = AGGREGATION_SQL[config.aggregation] || 'SUM'

  return `SELECT
  ${config.dimensionColumn} as category,
  ${agg}(${config.valueColumn}) as value
FROM ${dataSource}
GROUP BY ${config.dimensionColumn}
ORDER BY value DESC`
}

/**
 * Generate markdown for comparison section
 */
export function generateComparisonMarkdown(
  section: ReportSection,
  queryName: string
): string {
  const config = section.config as ComparisonSectionConfig
  let markdown = `## ${section.title}\n\n`

  if (section.description) {
    markdown += `${section.description}\n\n`
  }

  const sql = generateComparisonSQL(config, section.dataSource)
  markdown += `\`\`\`sql name=${queryName}\n${sql}\n\`\`\`\n\n`

  const chartType = config.chartType || 'bar'
  markdown += `\`\`\`chart\n`
  markdown += `type: ${chartType}\n`
  markdown += `data: ${queryName}\n`
  markdown += `x: category\n`
  markdown += `y: value\n`
  markdown += `title: ${section.title}\n`
  markdown += `\`\`\`\n\n`

  return markdown
}

/**
 * Generate SQL for distribution section
 */
export function generateDistributionSQL(
  config: DistributionSectionConfig,
  dataSource: string
): string {
  return `SELECT ${config.column} as value FROM ${dataSource}`
}

/**
 * Generate markdown for distribution section
 */
export function generateDistributionMarkdown(
  section: ReportSection,
  queryName: string
): string {
  const config = section.config as DistributionSectionConfig
  let markdown = `## ${section.title}\n\n`

  if (section.description) {
    markdown += `${section.description}\n\n`
  }

  const sql = generateDistributionSQL(config, section.dataSource)
  markdown += `\`\`\`sql name=${queryName}\n${sql}\n\`\`\`\n\n`

  markdown += `\`\`\`chart\n`
  markdown += `type: histogram\n`
  markdown += `data: ${queryName}\n`
  markdown += `x: value\n`
  if (config.bins) {
    markdown += `bins: ${config.bins}\n`
  }
  markdown += `title: ${section.title}\n`
  markdown += `\`\`\`\n\n`

  return markdown
}

/**
 * Generate SQL for table section
 */
export function generateTableSQL(
  config: TableSectionConfig,
  dataSource: string
): string {
  const columns = config.columns?.join(', ') || '*'
  let sql = `SELECT ${columns} FROM ${dataSource}`

  if (config.sortBy) {
    const order = config.sortOrder === 'asc' ? 'ASC' : 'DESC'
    sql += ` ORDER BY ${config.sortBy} ${order}`
  }

  if (config.limit) {
    sql += ` LIMIT ${config.limit}`
  }

  return sql
}

/**
 * Generate markdown for table section
 */
export function generateTableMarkdown(
  section: ReportSection,
  queryName: string
): string {
  const config = section.config as TableSectionConfig
  let markdown = `## ${section.title}\n\n`

  if (section.description) {
    markdown += `${section.description}\n\n`
  }

  const sql = generateTableSQL(config, section.dataSource)
  markdown += `\`\`\`sql name=${queryName}\n${sql}\n\`\`\`\n\n`

  markdown += `\`\`\`datatable\n`
  markdown += `query: ${queryName}\n`
  markdown += `searchable: true\n`
  markdown += `sortable: true\n`
  markdown += `\`\`\`\n\n`

  return markdown
}

/**
 * Build system prompt for insight section generation
 */
export function buildInsightSystemPrompt(style: ReportStyle): string {
  const styleGuide = {
    professional:
      '请使用专业、正式的语言，侧重于数据分析和业务洞察。',
    concise: '请简洁明了，使用要点式列表，突出关键发现。',
    visual: '请配合图表进行简短分析，减少文字描述。',
    narrative:
      '请采用叙事风格，详细解释数据背后的故事和业务含义。'
  }

  return `你是一个数据分析专家，负责根据数据生成分析洞察。

## 写作风格
${styleGuide[style]}

## 输出格式
直接输出 Markdown 格式的分析内容，包括：
1. 关键发现（2-4个要点）
2. 数据解读
3. 业务建议（如适用）

## 规则
1. 基于提供的数据进行分析，不要编造数据
2. 使用中文撰写
3. 保持客观专业的语气
4. 控制在 200-400 字以内
`
}

/**
 * Build user prompt for insight section
 */
export function buildInsightUserPrompt(
  section: ReportSection,
  dataSources: DataSourceInfo[],
  previousSections: string[]
): string {
  const config = section.config as InsightSectionConfig
  const source = dataSources.find((d) => d.name === section.dataSource)

  let prompt = `## 分析任务\n${section.title}\n\n`

  if (section.description) {
    prompt += `描述: ${section.description}\n\n`
  }

  if (config.focus && config.focus.length > 0) {
    prompt += `## 分析重点\n`
    for (const focus of config.focus) {
      prompt += `- ${focus}\n`
    }
    prompt += '\n'
  }

  if (source) {
    prompt += `## 数据源信息\n`
    prompt += `表名: ${source.name}\n`
    prompt += `行数: ${source.rowCount}\n`
    prompt += `列: ${source.columns.map((c) => c.name).join(', ')}\n\n`

    if (source.sample && source.sample.length > 0) {
      prompt += `示例数据:\n\`\`\`json\n`
      prompt += JSON.stringify(source.sample.slice(0, 5), null, 2)
      prompt += `\n\`\`\`\n\n`
    }
  }

  if (previousSections.length > 0) {
    prompt += `## 前面章节的分析\n`
    prompt += previousSections.join('\n\n')
    prompt += '\n\n'
  }

  prompt += `请基于以上信息，生成分析洞察内容。`

  return prompt
}

/**
 * Generate markdown for insight section (non-streaming fallback)
 */
export function generateInsightMarkdown(
  section: ReportSection,
  insightContent: string
): string {
  let markdown = `## ${section.title}\n\n`

  if (section.description) {
    markdown += `*${section.description}*\n\n`
  }

  markdown += insightContent
  markdown += '\n\n'

  return markdown
}

/**
 * Generate section markdown based on type
 */
export function generateSectionMarkdown(
  section: ReportSection,
  sectionIndex: number
): string {
  const queryName = `section_${sectionIndex}_data`

  switch (section.type) {
    case 'kpi':
      return generateKPIMarkdown(section, queryName)
    case 'trend':
      return generateTrendMarkdown(section, queryName)
    case 'ranking':
      return generateRankingMarkdown(section, queryName)
    case 'comparison':
      return generateComparisonMarkdown(section, queryName)
    case 'distribution':
      return generateDistributionMarkdown(section, queryName)
    case 'table':
      return generateTableMarkdown(section, queryName)
    case 'insight':
      // Insight needs LLM generation, return placeholder
      return `## ${section.title}\n\n*正在生成分析内容...*\n\n`
    default:
      return `## ${section.title}\n\n*未知章节类型*\n\n`
  }
}
