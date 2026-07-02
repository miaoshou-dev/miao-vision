import type { SvgTheme } from '../../themes/types'
import { escapeHtml } from './svg'

export function formatTick(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return value % 1 === 0 ? String(Math.round(value)) : value.toFixed(1)
}

export interface Tick {
  value: number
  position: number
}

export function numericTicks(min: number, max: number, count: number = 4, start?: number, end?: number): Tick[] {
  const span = max - min || 1
  const s = start ?? min
  const e = end ?? max
  const totalSpan = e - s || 1
  return Array.from({ length: count + 1 }, (_, i) => ({
    value: s + (i / count) * totalSpan,
    position: min + (i / count) * span
  }))
}

export function gridLines(ticks: Tick[], x0: number, chartWidth: number, theme: SvgTheme, skipFirst: boolean = true): string {
  return ticks
    .filter((_, i) => !skipFirst || i > 0)
    .map(t =>
      `<line x1="${x0}" y1="${t.position}" x2="${x0 + chartWidth}" y2="${t.position}" stroke="${theme.axisColor}" stroke-opacity="0.4" stroke-dasharray="4 3" />`
    )
    .join('\n')
}

export function axisLine(x1: number, y1: number, x2: number, y2: number, theme: SvgTheme): string {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${theme.axisColor}" />`
}

export function verticalTickLabels(ticks: Tick[], x: number, theme: SvgTheme, offsetX: number = -6, offsetY: number = 4): string {
  return ticks
    .map(t =>
      `<text x="${(x + offsetX)}" y="${(t.position + offsetY)}" text-anchor="end" fill="${theme.labelColor}" font-size="11">${escapeHtml(formatTick(t.value))}</text>`
    )
    .join('\n')
}
