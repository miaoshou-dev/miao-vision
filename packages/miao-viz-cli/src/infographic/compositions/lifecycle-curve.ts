import type { InfographicSpec, InfographicStyle } from '../../article-infographic'
import { extractLifecyclePoints } from './helpers'
import { getInfographicTokens } from '../primitives/theme'

export const lifecycleCurveStyles = `
.mv-lifecycle { padding: 0; border: none; }
.mv-lifecycle-header { display: grid; gap: 18px; margin-bottom: 32px; }
.mv-lifecycle-header h1 { font-size: 44px; margin: 0; line-height: 1.1; }
.mv-lifecycle-header .mv-lead { margin: 0; font-size: 18px; color: var(--muted); }
.mv-lifecycle-kpi { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 28px; }
.mv-lifecycle-kpi-item { flex: 1; min-width: 120px; background: var(--card); border: 1px solid var(--line); border-top: 3px solid var(--accent); border-radius: 6px; padding: 14px; text-align: center; }
.mv-lifecycle-kpi-item strong { display: block; font-size: 32px; font-family: Charter, Georgia, serif; font-variant-numeric: tabular-nums; line-height: 1; color: var(--ink); }
.mv-lifecycle-kpi-item span { display: block; margin-top: 4px; font-size: 12px; color: var(--muted); }
.mv-lifecycle-curve-wrap { background: var(--card); border: 1px solid var(--line); border-radius: 8px; padding: 24px; margin-bottom: 28px; overflow-x: auto; }
.mv-lifecycle-curve-wrap svg { display: block; width: 100%; min-width: 640px; }
.mv-lifecycle-actions { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); margin-bottom: 28px; }
.mv-lifecycle-action-card { background: var(--card); border: 1px solid var(--line); border-left: 3px solid var(--accent); border-radius: 6px; padding: 16px; }
.mv-lifecycle-action-card h3 { margin: 0 0 6px; font-size: 14px; font-weight: 800; color: var(--accent); }
.mv-lifecycle-action-card p { margin: 0; color: var(--muted); font-size: 14px; line-height: 1.5; }
.mv-lifecycle-readout { background: var(--card); border: 1px solid var(--line); border-radius: 6px; padding: 20px; }
.mv-lifecycle-readout p { margin: 0; color: var(--muted); font-size: 15px; line-height: 1.55; }
`

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function renderLifecycleCurve(spec: InfographicSpec, style: InfographicStyle): string {
  const tokens = getInfographicTokens(style)
  const points = extractLifecyclePoints(spec)
  if (points.length < 2) return `<p class="mv-muted">Insufficient lifecycle data.</p>`

  const svgWidth = 800
  const svgHeight = 340
  const padding = { top: 20, right: 40, bottom: 50, left: 50 }
  const plotW = svgWidth - padding.left - padding.right
  const plotH = svgHeight - padding.top - padding.bottom

  const values = points.map(p => p.value)
  const maxVal = Math.max(...values)
  const minVal = Math.min(...values)
  const range = maxVal - minVal || 1
  const pad = range * 0.08
  const yMin = Math.max(0, minVal - pad)
  const yMax = maxVal + pad

  function xPos(i: number): number {
    return padding.left + (points.length > 1 ? (i / (points.length - 1)) * plotW : plotW / 2)
  }

  function yPos(v: number): number {
    return padding.top + plotH - ((v - yMin) / (yMax - yMin)) * plotH
  }

  const coords = points.map((p, i) => ({ x: xPos(i), y: yPos(p.value), label: p.label, value: p.value, unit: p.unit }))

  function buildSmoothPath(pts: { x: number; y: number }[]): string {
    if (pts.length === 1) return ''
    if (pts.length === 2) return `M ${pts[0].x},${pts[0].y} L ${pts[1].x},${pts[1].y}`
    let d = `M ${pts[0].x},${pts[0].y}`
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)]
      const p1 = pts[i]
      const p2 = pts[i + 1]
      const p3 = pts[Math.min(pts.length - 1, i + 2)]
      const tension = 0.3
      const cp1x = p1.x + (p2.x - p0.x) * tension
      const cp1y = p1.y + (p2.y - p0.y) * tension
      const cp2x = p2.x - (p3.x - p1.x) * tension
      const cp2y = p2.y - (p3.y - p1.y) * tension
      d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`
    }
    return d
  }

  const pathD = buildSmoothPath(coords)

  const areaD = pathD
    ? `${pathD} L ${coords[coords.length - 1].x},${padding.top + plotH} L ${coords[0].x},${padding.top + plotH} Z`
    : ''

  const curveSvg = `<svg viewBox="0 0 ${svgWidth} ${svgHeight}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="lifecycle-area" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${tokens.accent}" stop-opacity="0.2" />
        <stop offset="100%" stop-color="${tokens.accent}" stop-opacity="0.02" />
      </linearGradient>
    </defs>

    ${points.length > 2 ? `<path d="${areaD}" fill="url(#lifecycle-area)" />` : ''}
    ${pathD ? `<path d="${pathD}" fill="none" stroke="${tokens.accent}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />` : ''}

    ${coords.map(c => `
      <circle cx="${c.x}" cy="${c.y}" r="5" fill="${tokens.card}" stroke="${tokens.accent}" stroke-width="2.5" />
      <text x="${c.x}" y="${c.y - 14}" text-anchor="middle" fill="${tokens.ink}" font-size="13" font-weight="700" font-family="Inter, sans-serif">${escapeHtml(c.label)}</text>
      <text x="${c.x}" y="${c.y - 28}" text-anchor="middle" fill="${tokens.accent}" font-size="15" font-weight="800" font-family="Charter, Georgia, serif">${c.value}${c.unit ? escapeHtml(c.unit) : ''}</text>
    `).join('')}
  </svg>`

  const kpiHtml = points.map(p => `<div class="mv-lifecycle-kpi-item">
    <strong>${p.value}${p.unit ? `<span class="mv-visual-unit">${escapeHtml(p.unit)}</span>` : ''}</strong>
    <span>${escapeHtml(p.label)}</span>
  </div>`).join('\n')

  const actionCards = points
    .filter(p => p.action)
    .map(p => `<div class="mv-lifecycle-action-card">
      <h3>${escapeHtml(p.label)}</h3>
      <p>${escapeHtml(p.action!)}</p>
    </div>`).join('\n')

  const titleHtml = spec.title ? `<h1>${escapeHtml(spec.title)}</h1>` : ''
  const subtitleHtml = spec.subtitle ? `<p class="mv-lead">${escapeHtml(spec.subtitle)}</p>` : ''

  return `<section class="mv-lifecycle">
    <div class="mv-lifecycle-header">${titleHtml}${subtitleHtml}</div>
    <div class="mv-lifecycle-kpi">${kpiHtml}</div>
    <div class="mv-lifecycle-curve-wrap">${curveSvg}</div>
    ${actionCards ? `<div class="mv-lifecycle-actions">${actionCards}</div>` : ''}
    ${spec.summary ? `<div class="mv-lifecycle-readout"><p>${escapeHtml(spec.summary)}</p></div>` : ''}
  </section>`
}
