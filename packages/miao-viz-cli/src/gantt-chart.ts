import type { AgentChartSpec } from './types'
import { escapeHtml } from './svg-renderer-utils'
import { isProjectDate } from './project-config'
import type { ChartCatalogItem } from './chart-catalog-types'

export const PROJECT_STATUS_LABELS: Record<string, string> = { todo: '待开始', in_progress: '进行中', done: '已完成', blocked: '阻塞', cancelled: '已取消' }
const colors: Record<string, string> = { todo: '#64748b', in_progress: '#2563eb', done: '#15803d', blocked: '#b91c1c', cancelled: '#9ca3af' }
const day = (value: unknown): number | null => typeof value === 'string' && isProjectDate(value) ? Date.parse(value) / 86400000 : null
export function renderGanttChart(chart: AgentChartSpec, rows: Record<string, unknown>[]): string {
  const field = (channel: string, fallback: string) => chart.encoding?.[channel]?.field ?? fallback
  const title = field('label', 'title'), start = field('start', 'start_date'), end = field('end', 'due_date'), status = field('color', 'status'), stage = field('group', 'stage')
  const tasks = [...rows].sort((a, b) => String(a[stage] ?? '').localeCompare(String(b[stage] ?? '')) || String(a[end] ?? '9999').localeCompare(String(b[end] ?? '9999')))
  const dated = tasks.filter(task => day(task[end]) !== null)
  if (!dated.length) return '<p class="gantt-empty">暂无已排期任务</p>'
  const cutoff = day(chart.style?.cutoff), all = dated.flatMap(task => [day(task[start]), day(task[end]), day(task.baseline_start), day(task.baseline_end)]).filter((value): value is number => value !== null)
  if (cutoff !== null) all.push(cutoff)
  const min = Math.min(...all) - 1, max = Math.max(...all) + 1, width = 960, left = 290, plot = 560
  const x = (value: number) => left + (value - min) / (max - min) * plot
  let y = 54, currentStage = '', body = ''
  for (const task of dated) {
    const group = String(task[stage] ?? '未分组')
    if (group !== currentStage) { body += `<text x="12" y="${y}" font-weight="700">${escapeHtml(group)}</text>`; y += 28; currentStage = group }
    const label = String(task[title] ?? ''), rawStatus = String(task[status] ?? ''), statusLabel = PROJECT_STATUS_LABELS[rawStatus] ?? rawStatus
    const from = day(task[start]), to = day(task[end])!, baseFrom = day(task.baseline_start), baseTo = day(task.baseline_end)
    const overdue = cutoff !== null && to < cutoff && !['done', 'cancelled'].includes(rawStatus)
    body += `<g class="gantt-task" data-task-id="${escapeHtml(String(task.task_id ?? ''))}"><title>${escapeHtml(label)} · ${escapeHtml(statusLabel)} · ${escapeHtml(String(task[start] ?? '未提供开始日'))} → ${escapeHtml(String(task[end]))}</title><text x="12" y="${y + 12}">${escapeHtml(label.length > 28 ? label.slice(0, 27) + '…' : label)}</text>`
    if (baseFrom !== null && baseTo !== null) body += `<rect class="gantt-baseline" x="${x(baseFrom)}" y="${y + 18}" width="${Math.max(3, x(baseTo) - x(baseFrom))}" height="5" fill="#cbd5e1"/>`
    const color = colors[rawStatus] ?? '#64748b'
    if (from !== null && from <= to) body += `<rect class="gantt-bar" x="${x(from)}" y="${y}" width="${Math.max(4, x(to) - x(from))}" height="14" rx="3" fill="${color}"/>`
    else body += `<circle class="gantt-due-point" cx="${x(to)}" cy="${y + 7}" r="5" fill="${color}"/>`
    if (task.is_milestone === true) body += `<path class="gantt-milestone" d="M ${x(to)} ${y - 2} l 7 9 l -7 9 l -7 -9 Z" fill="${color}" stroke="white"/>`
    body += `<text x="860" y="${y + 12}">${escapeHtml(statusLabel)}${overdue ? ' · 逾期' : ''}</text></g>`
    y += 38
  }
  const ticks = Array.from({ length: 5 }, (_, i) => min + (max - min) * i / 4).map(value => `<line x1="${x(value)}" x2="${x(value)}" y1="35" y2="${y}" stroke="#e2e8f0"/><text x="${x(value)}" y="22" text-anchor="middle">${new Date(Math.round(value) * 86400000).toISOString().slice(0, 10)}</text>`).join('')
  const marker = cutoff === null ? '' : `<line class="gantt-cutoff" x1="${x(cutoff)}" x2="${x(cutoff)}" y1="35" y2="${y}" stroke="#0f172a" stroke-dasharray="4 4"/><text x="${x(cutoff)}" y="${y + 16}" text-anchor="middle">报告截止日</text>`
  return `<div class="project-gantt-scroll"><svg class="project-gantt" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escapeHtml(chart.title ?? '项目排期 Gantt')}" viewBox="0 0 ${width} ${y + 32}" width="${width}" height="${y + 32}" style="font:12px system-ui;max-width:100%;height:auto"><desc>任务条为当前计划，浅色条为首次基准计划；只有截止日的任务显示日期点。完成状态不等同客户验收。</desc>${ticks}${body}${marker}</svg></div>`
}
export const GANTT_CATALOG: ChartCatalogItem = {
  id: 'gantt', displayName: '项目排期 Gantt', requiredEncodings: ['label', 'end'], allowedTransforms: ['sort', 'limit', 'filter'],
  compactFor: 'project schedule', transformRecipe: 'validate(date)>group(stage)>sort(end)>limit(15)', avoid: 'missing_dates,inferred_start,critical_path_without_dependencies', insightPattern: 'task schedule as of {cutoff}', requires: 'task label + due date; optional start date', bestFor: ['task scheduling', 'milestones', 'baseline comparison'], antiPatterns: ['invented start dates', 'inferred critical paths'], intents: ['flow'],
  rules: [{ code: 'GANTT_TEMPORAL_ENCODING', severity: 'error', expression: 'start/end are temporal; label/end exist', message: 'Gantt requires a label and temporal end; start is optional.', validate: chart => {
    if (!chart.encoding?.label?.field || !chart.encoding?.end?.field) return { code: 'GANTT_MISSING_ENCODING', severity: 'error', message: 'Gantt requires label and end encodings.', chartId: chart.id }
    if (['start', 'end'].some(key => chart.encoding?.[key]?.type && chart.encoding[key]!.type !== 'temporal')) return { code: 'GANTT_TEMPORAL_ENCODING', severity: 'error', message: 'Gantt start/end encodings must be temporal.', chartId: chart.id }
    return null
  } }]
}
