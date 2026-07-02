import { escapeHtml } from './svg'

export function rectEl(x: number, y: number, w: number, h: number, attrs: string = ''): string {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" ${attrs}/>`
}

export function bar(x: number, y: number, w: number, h: number, fill: string, label: string = ''): string {
  const title = label ? `<title>${escapeHtml(label)}</title>` : ''
  return `<rect x="${x}" y="${y}" width="${Math.max(w, 1)}" height="${h}" fill="${fill}" rx="2">${title}</rect>`
}

export function arrowHeadId(uid: string): string {
  return `arr-${uid}`
}

export function arrowDef(uid: string, color: string): string {
  return `<marker id="${arrowHeadId(uid)}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="${color}"/></marker>`
}

export function visualCard(title: string, svgContent: string, caption?: string): string {
  const cap = caption ? `<p class="mv-visual-caption">${escapeHtml(caption)}</p>` : ''
  return `<div class="mv-visual-card">
    <h3 class="mv-visual-label">${escapeHtml(title)}</h3>
    <div class="mv-visual-svg">${svgContent}</div>
    ${cap}
  </div>`
}
