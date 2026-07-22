import type { AgentChartSpec } from './types'
import type { SvgTheme } from './themes/types'

const SAFE = {
  qualitative: ['#0072B2', '#E69F00', '#009E73', '#CC79A7', '#56B4E9', '#D55E00'],
  sequential: ['#deebf7', '#9ecae1', '#6baed6', '#3182bd', '#08519c'],
  diverging: ['#b2182b', '#ef8a62', '#f7f7f7', '#67a9cf', '#2166ac'],
  status: ['#009E73', '#E69F00', '#D55E00', '#6b7280']
}

export function chartPalette(chart: AgentChartSpec, theme: SvgTheme): string[] {
  const type = chart.colorScale?.type
  if (!type) return theme.palette
  if (type === 'focus-context') return [theme.palette[0], '#a8b0ba']
  const palette = SAFE[type]
  if (type === 'diverging' && chart.colorScale?.semantic === 'favorable-neutral-unfavorable') return [...palette].reverse()
  return palette
}

export function stableCategoryColor(value: unknown, palette: string[]): string {
  const text = String(value ?? '')
  let hash = 2166136261
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619)
  return palette[Math.abs(hash) % palette.length]
}
