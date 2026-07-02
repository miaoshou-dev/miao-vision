import type { SvgTheme } from '../../themes/types'
import type { KpiStripData } from '../types'
import { escapeHtml } from '../primitives/svg'

export function renderKpiStrip(data: KpiStripData, _theme: SvgTheme, palette: string[]): string {
  const parts = data.items.map((item, i) => {
    const val = escapeHtml(item.value.toLocaleString())
    const label = escapeHtml(item.label)
    const unit = item.unit ? ` <span class="mv-visual-unit">${escapeHtml(item.unit)}</span>` : ''
    const delta = item.delta ? ` <span class="mv-visual-delta">${escapeHtml(item.delta)}</span>` : ''
    const color = palette[i % palette.length]
    return `<div class="mv-visual-kpi" style="border-top-color:${color}">
      <strong>${val}${unit}${delta}</strong>
      <span>${label}</span>
    </div>`
  }).join('\n')
  return `<div class="mv-visual-kpi-strip">${parts}</div>`
}
