/**
 * Report Planner Prompts
 *
 * System and user prompts for AI report planning phase.
 * The planner analyzes data sources and generates a structured report plan.
 *
 * @module core/ai/prompts/report-planner
 */

import type { DataSourceInfo, ReportStyle, ReportSectionType } from '../types'

/**
 * Section type descriptions for LLM guidance
 */
const SECTION_TYPES: Record<ReportSectionType, string> = {
  kpi: 'KPI指标卡 - 展示关键数值指标，如总额、平均值、数量等',
  trend: '趋势分析 - 时间序列折线图/面积图，展示数据随时间的变化',
  ranking: '排名分析 - 柱状图展示Top N，如销售额前10的产品',
  comparison: '对比分析 - 柱状图或饼图比较不同类别的数值',
  distribution: '分布分析 - 直方图展示数值的分布情况',
  table: '数据表格 - 详细数据的表格展示',
  insight: '洞察总结 - 文字分析和业务建议'
}

/**
 * Style descriptions
 */
const STYLE_DESCRIPTIONS: Record<ReportStyle, string> = {
  professional: '专业正式风格 - 数据驱动，适合正式报告',
  concise: '简洁仪表盘风格 - 少文字，重点突出',
  visual: '可视化优先风格 - 多图表，少文字',
  narrative: '叙事分析风格 - 详细解释，讲故事'
}

/**
 * Build system prompt for report planning
 */
export function buildPlannerSystemPrompt(): string {
  return `你是一个数据分析报告规划专家。你的任务是根据用户的数据和需求，规划一份结构化的数据分析报告。

## 你的能力
1. 分析数据结构，识别关键维度和指标
2. 根据用户需求设计报告章节
3. 为每个章节选择合适的可视化类型
4. 确保报告逻辑清晰、重点突出

## 可用的章节类型
${Object.entries(SECTION_TYPES).map(([type, desc]) => `- ${type}: ${desc}`).join('\n')}

## 输出格式
你必须输出一个 JSON 格式的报告计划，格式如下：

\`\`\`json
{
  "title": "报告标题",
  "description": "报告简介（可选）",
  "sections": [
    {
      "type": "kpi",
      "title": "章节标题",
      "description": "章节描述（可选）",
      "dataSource": "数据源名称",
      "config": {
        // 根据章节类型的配置
      }
    }
  ]
}
\`\`\`

## 各类型的 config 配置

### kpi 类型
\`\`\`json
{
  "metrics": [
    {
      "name": "显示名称",
      "column": "列名",
      "aggregation": "sum|avg|count|max|min",
      "format": "number|currency|percent"
    }
  ]
}
\`\`\`

### trend 类型
\`\`\`json
{
  "timeColumn": "时间列名",
  "valueColumn": "数值列名",
  "granularity": "day|week|month|quarter|year",
  "chartType": "line|area"
}
\`\`\`

### ranking 类型
\`\`\`json
{
  "dimensionColumn": "维度列名",
  "valueColumn": "数值列名",
  "aggregation": "sum|avg|count",
  "limit": 10,
  "order": "desc"
}
\`\`\`

### comparison 类型
\`\`\`json
{
  "dimensionColumn": "维度列名",
  "valueColumn": "数值列名",
  "aggregation": "sum|avg|count",
  "chartType": "bar|pie"
}
\`\`\`

### distribution 类型
\`\`\`json
{
  "column": "数值列名",
  "bins": 10
}
\`\`\`

### table 类型
\`\`\`json
{
  "columns": ["列1", "列2"],
  "limit": 100,
  "sortBy": "排序列",
  "sortOrder": "asc|desc"
}
\`\`\`

### insight 类型
\`\`\`json
{
  "focus": ["分析重点1", "分析重点2"]
}
\`\`\`

## 规则
1. 只输出 JSON，不要有其他解释文字
2. dataSource 必须是用户提供的数据源名称之一
3. 所有 column/列名 必须是数据源中存在的列
4. 根据数据特征智能选择章节类型和配置
5. KPI 章节通常放在最前面，insight 章节放在最后
6. 章节数量控制在 3-7 个，保持报告重点突出
`
}

/**
 * Build user prompt with data context
 */
export function buildPlannerUserPrompt(
  dataSources: DataSourceInfo[],
  userPrompt: string,
  style: ReportStyle = 'professional',
  language: 'zh' | 'en' = 'zh'
): string {
  let prompt = `## 用户需求\n${userPrompt}\n\n`

  prompt += `## 报告风格\n${STYLE_DESCRIPTIONS[style]}\n\n`

  prompt += `## 语言\n${language === 'zh' ? '中文' : 'English'}\n\n`

  prompt += `## 可用数据源\n`

  for (const source of dataSources) {
    prompt += `\n### ${source.name}\n`
    prompt += `行数: ${source.rowCount}\n`
    prompt += `列定义:\n`

    for (const col of source.columns) {
      prompt += `- ${col.name} (${col.type})\n`
    }

    if (source.sample && source.sample.length > 0) {
      prompt += `\n示例数据 (前${Math.min(3, source.sample.length)}行):\n`
      prompt += '```json\n'
      prompt += JSON.stringify(source.sample.slice(0, 3), null, 2)
      prompt += '\n```\n'
    }
  }

  prompt += `\n请根据以上信息，生成一份报告计划。`

  return prompt
}

/**
 * Parse planner response to extract report plan
 */
export function parsePlannerResponse(response: string): {
  success: boolean
  plan?: {
    title: string
    description?: string
    sections: Array<{
      type: ReportSectionType
      title: string
      description?: string
      dataSource: string
      config: Record<string, unknown>
    }>
  }
  error?: string
} {
  try {
    // Extract JSON from code block or raw JSON
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/) ||
      response.match(/\{[\s\S]*"sections"[\s\S]*\}/)

    if (!jsonMatch) {
      return {
        success: false,
        error: '无法解析报告计划，LLM 响应格式不正确'
      }
    }

    const jsonStr = jsonMatch[1] || jsonMatch[0]
    const plan = JSON.parse(jsonStr.trim())

    // Validate required fields
    if (!plan.title || !Array.isArray(plan.sections)) {
      return {
        success: false,
        error: '报告计划缺少必需字段 (title, sections)'
      }
    }

    // Validate sections
    for (const section of plan.sections) {
      if (!section.type || !section.title || !section.dataSource) {
        return {
          success: false,
          error: `章节缺少必需字段: ${JSON.stringify(section)}`
        }
      }

      if (!Object.keys(SECTION_TYPES).includes(section.type)) {
        return {
          success: false,
          error: `不支持的章节类型: ${section.type}`
        }
      }
    }

    return { success: true, plan }
  } catch (error) {
    return {
      success: false,
      error: `JSON 解析失败: ${error instanceof Error ? error.message : '未知错误'}`
    }
  }
}
