/**
 * Infographic Agent Utilities
 *
 * Helper functions for parsing, validation, and data transformation.
 *
 * @module core/ai/agents/infographic/utils
 */

import * as yaml from 'yaml'

/**
 * Parse YAML response from LLM
 *
 * Handles common issues like markdown code fences, extra whitespace, etc.
 */
export function parseYamlResponse<T>(content: string): T | null {
  let cleaned = content.trim()

  // Remove <thinking> blocks first
  const thinkingMatch = cleaned.match(/<thinking>[\s\S]*?<\/thinking>/)
  if (thinkingMatch) {
    cleaned = cleaned.replace(thinkingMatch[0], '').trim()
  }

  // Remove markdown code fences
  if (cleaned.startsWith('```')) {
    cleaned = cleaned
      .replace(/^```(?:yaml|yml)?\n?/i, '')
      .replace(/\n?```$/, '')
      .trim()
  }

  // Try to find YAML block if content has extra text
  if (!cleaned.startsWith('theme:') && !cleaned.startsWith('title:')) {
    const yamlMatch = cleaned.match(/^(theme:|title:)[\s\S]+/m)
    if (yamlMatch) {
      cleaned = yamlMatch[0]
    }
  }

  try {
    return yaml.parse(cleaned) as T
  } catch (e1) {
    // Try to fix common YAML issues
    try {
      // Fix unquoted strings with colons
      const fixed = cleaned.replace(/: ([^"\n]+:[^\n]+)$/gm, ': "$1"')
      return yaml.parse(fixed) as T
    } catch (e2) {
      // Try JSON fallback
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]) as T
        }
      } catch {
        // Final fallback: return null
      }

      console.warn('[parseYamlResponse] Failed to parse:', e2)
      return null
    }
  }
}

/**
 * Generate a unique ID
 */
export function generateId(prefix: string = 'id'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

/**
 * Truncate text to a maximum length
 */
export function truncate(text: string, maxLength: number, suffix: string = '...'): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - suffix.length).trim() + suffix
}

/**
 * Clean and normalize text
 */
export function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .trim()
}

/**
 * Extract numbers from text
 */
export function extractNumbers(text: string): Array<{ value: string; context: string }> {
  const results: Array<{ value: string; context: string }> = []
  const patterns = [
    /\$[\d,]+\.?\d*[KMB]?/g,           // Currency: $100, $1.5M
    /\d+\.?\d*%/g,                      // Percentages: 15%, 3.5%
    /\d{1,3}(?:,\d{3})+(?:\.\d+)?/g,    // Large numbers: 1,000,000
    /\d+\.?\d*[KMB]/gi,                 // Abbreviated: 1.5M, 100K
    /\d+(?:\.\d+)?/g                    // Plain numbers
  ]

  for (const pattern of patterns) {
    const matches = text.matchAll(pattern)
    for (const match of matches) {
      const value = match[0]
      const start = Math.max(0, match.index! - 30)
      const end = Math.min(text.length, match.index! + value.length + 30)
      const context = text.slice(start, end).trim()

      // Avoid duplicates
      if (!results.some(r => r.value === value)) {
        results.push({ value, context })
      }
    }
  }

  return results
}

/**
 * Detect if text is primarily Chinese
 */
export function isChinese(text: string): boolean {
  const chineseChars = text.match(/[\u4e00-\u9fa5]/g)
  const ratio = chineseChars ? chineseChars.length / text.length : 0
  return ratio > 0.1
}

/**
 * Map visual type to template IDs
 */
export const VISUAL_TYPE_TO_TEMPLATE: Record<string, string[]> = {
  'icon-statement': ['list-row-badge-card'],
  'list-horizontal': ['list-row-badge-card', 'list-row-horizontal-icon-arrow'],
  'list-vertical': ['list-grid-badge-card', 'list-row-badge-card'],
  'list-grid': ['list-grid-badge-card'],
  'flow-linear': ['flow-linear-numbered', 'list-row-horizontal-icon-arrow'],
  'flow-cycle': ['cycle-radial-process', 'flow-linear-numbered'],
  'compare-binary': ['compare-binary-vs', 'compare-table-features'],
  'compare-table': ['compare-table-features', 'compare-binary-vs'],
  'hierarchy-pyramid': ['list-pyramid-badge-card', 'hierarchy-tree-org'],
  'hierarchy-tree': ['hierarchy-tree-org', 'mind-map-radial'],
  'chart-bar': ['chart-bar-horizontal', 'list-pyramid-badge-card'],
  'chart-pie': ['list-sector-pie'],
  'chart-line': ['chart-line-trend', 'chart-bar-horizontal'],
  'mind-map': ['mind-map-radial', 'hierarchy-tree-org'],
  'kpi-cards': ['list-row-badge-card', 'list-grid-badge-card']
}

/**
 * Get template ID for visual type
 */
export function getTemplateForVisualType(
  visualType: string,
  availableTemplates: string[]
): string {
  const candidates = VISUAL_TYPE_TO_TEMPLATE[visualType] || ['list-row-badge-card']

  // Find first available candidate
  for (const candidate of candidates) {
    if (availableTemplates.includes(candidate)) {
      return candidate
    }
  }

  // Fallback to first available template
  return availableTemplates[0] || 'list-row-badge-card'
}

/**
 * Get all available template IDs
 */
export function getAvailableTemplateIds(): string[] {
  return [
    // KPI templates
    'list-row-badge-card',
    'list-row-value-card',
    'list-grid-badge-card',
    'list-grid-circular-progress',
    // Ranking templates
    'list-pyramid-badge-card',
    'list-zigzag-icon-arrow',
    // Flow templates
    'list-row-horizontal-icon-arrow',
    'sequence-timeline-badge-card',
    'list-zigzag-badge-card',
    'flow-linear-numbered',
    'cycle-radial-process',
    'sequence-snake-flow',
    'sequence-roadmap-horizontal',
    'sequence-stairs-progression',
    'sequence-ascending-bars',
    // Hierarchy templates
    'list-pyramid-value-card',
    'hierarchy-tree-org',
    'mind-map-radial',
    // Comparison templates
    'list-row-horizontal-comparison',
    'compare-binary-vs',
    'compare-quadrant-matrix',
    'compare-swot-analysis',
    // Distribution templates
    'list-pyramid-distribution',
    'list-sector-pie',
    // Relation templates
    'relation-network-circular',
    'relation-venn-diagram',
    'relation-circle-connections',
    // Statistical templates
    'chart-bar-horizontal',
    'chart-bar-vertical',
    'chart-line-trend',
    'chart-line-multi-series',
    'chart-funnel-conversion',
    'compare-table-features'
  ]
}

/**
 * Select icon based on label content
 */
export function selectIconForLabel(label: string): string | undefined {
  const lower = label.toLowerCase()

  const iconMap: Record<string, string[]> = {
    'chart-line': ['growth', 'increase', 'trend', 'revenue', 'sales', '增长', '收入'],
    'account-group': ['team', 'user', 'employee', 'people', 'staff', '团队', '用户', '员工'],
    'currency-usd': ['money', 'cost', 'price', 'budget', 'dollar', '成本', '价格', '预算'],
    'clock': ['time', 'hour', 'schedule', 'deadline', '时间', '小时'],
    'check-circle': ['complete', 'done', 'success', 'achieve', '完成', '成功'],
    'alert': ['warning', 'risk', 'danger', 'issue', '警告', '风险'],
    'lightbulb': ['idea', 'insight', 'solution', 'innovation', '想法', '洞察'],
    'target': ['goal', 'target', 'objective', 'aim', '目标'],
    'rocket': ['launch', 'start', 'begin', 'growth', '启动', '开始'],
    'cog': ['setting', 'config', 'process', 'system', '设置', '流程'],
    'shield-check': ['security', 'protect', 'safe', '安全', '保护'],
    'heart': ['health', 'satisfaction', 'love', 'care', '健康', '满意度']
  }

  for (const [icon, keywords] of Object.entries(iconMap)) {
    if (keywords.some(kw => lower.includes(kw))) {
      return icon
    }
  }

  return undefined
}

/**
 * Format number for display
 */
export function formatNumber(value: number | string): string {
  if (typeof value === 'string') {
    // Already formatted
    if (value.includes('%') || value.includes('$') || value.includes('K') || value.includes('M')) {
      return value
    }
    value = parseFloat(value)
    if (isNaN(value)) return String(value)
  }

  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`
  }
  if (value % 1 !== 0) {
    return value.toFixed(2)
  }
  return String(value)
}
