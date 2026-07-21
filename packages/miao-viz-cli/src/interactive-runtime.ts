import { CLIENT_DATA_ENGINE_CSS, CLIENT_DATA_ENGINE_JS } from './client-data-engine'
import { INTERACTIVE_CSS, INTERACTIVE_JS } from './interactive-runtime-assets'
import type { AgentGlobalFilter, AgentReportSpec } from './types'
import type { SvgTheme } from './themes/types'

export interface InteractiveHtmlOptions {
  enabled?: boolean
}

export interface RuntimeState {
  filters: Record<string, unknown>
  selection?: {
    field: string
    value: unknown
  }
}

export function shouldEnableInteractiveRuntime(spec: AgentReportSpec, options: InteractiveHtmlOptions = {}): boolean {
  if (options.enabled === true) return true
  if (options.enabled === false) return false
  if ((spec.interactions?.globalFilters?.length ?? 0) > 0) return true
  return spec.charts.some(chart => Boolean(chart.interaction || chart.drilldownPreset || chart.sortable))
}

export function applyInteractiveFilters(
  rows: Record<string, unknown>[],
  filters: AgentGlobalFilter[],
  state: RuntimeState
): Record<string, unknown>[] {
  return rows.filter(row => filters.every(filter => matchesFilter(row[filter.field], filter.type, state.filters[filter.field])))
}

export function selectDetailRows(
  rows: Record<string, unknown>[],
  state: RuntimeState,
  limit = 100
): { rows: Record<string, unknown>[]; total: number } {
  const selection = state.selection
  const selected = selection
    ? rows.filter(row => sameValue(row[selection.field], selection.value))
    : rows
  return { rows: selected.slice(0, limit), total: selected.length }
}

export function renderInteractiveAssets(rows: Record<string, unknown>[], theme: SvgTheme): string {
  return `
  <script type="application/json" id="miao-viz-data">${escapeScriptJson(rows)}</script>
  <script type="application/json" id="miao-viz-runtime-theme">${escapeScriptJson(theme)}</script>
  <script>${CLIENT_DATA_ENGINE_JS}</script>
  <style>${CLIENT_DATA_ENGINE_CSS}${INTERACTIVE_CSS}</style>
  <script>${INTERACTIVE_JS}</script>`
}

function matchesFilter(value: unknown, type: AgentGlobalFilter['type'], filterValue: unknown): boolean {
  if (filterValue == null || filterValue === '') return true
  if (type === 'select') return sameValue(value, filterValue)

  const range = Array.isArray(filterValue) ? filterValue : []
  const [min, max] = range
  const current = comparableValue(value)
  if (current == null) return false
  const minValue = comparableValue(min)
  const maxValue = comparableValue(max)
  if (minValue != null && current < minValue) return false
  if (maxValue != null && current > maxValue) return false
  return true
}

function sameValue(a: unknown, b: unknown): boolean {
  return String(a ?? '') === String(b ?? '')
}

function comparableValue(value: unknown): number | undefined {
  if (value == null || value === '') return undefined
  const numberValue = Number(value)
  if (Number.isFinite(numberValue)) return numberValue
  const dateValue = new Date(String(value)).getTime()
  return Number.isFinite(dateValue) ? dateValue : undefined
}

function escapeScriptJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}
