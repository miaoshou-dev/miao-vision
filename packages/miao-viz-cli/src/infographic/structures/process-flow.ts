import type { SvgTheme } from '../../themes/types'
import type { ProcessFlowData } from '../types'
import { escapeHtml } from '../primitives/svg'

export function renderProcessFlow(data: ProcessFlowData, _theme: SvgTheme, palette: string[]): string {
  const nodes = data.items
    .map((item, i) => {
      const label = item.label ?? `Step ${i + 1}`
      const text = item.text ?? ''
      const color = palette[i % palette.length]
      return `<article class="mv-visual-process-node" style="--node-color:${color}">
      <div class="mv-visual-process-head">
        <span>${i + 1}</span>
        <strong>${escapeHtml(label)}</strong>
      </div>
      <p>${escapeHtml(text)}</p>
    </article>`
    })
    .join('\n')

  return `<div class="mv-visual-process-grid">${nodes}</div>`
}
