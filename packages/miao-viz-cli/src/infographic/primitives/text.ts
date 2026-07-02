import { escapeHtml } from './svg'

export function textEl(x: number, y: number, content: string, attrs: string = ''): string {
  return `<text x="${x}" y="${y}" ${attrs}>${escapeHtml(content)}</text>`
}

export type TextBlockOptions = {
  x: number
  y: number
  width: number
  text: string
  fontSize: number
  lineHeight?: number
  fill: string
  anchor?: 'start' | 'middle' | 'end'
  fontWeight?: number | string
  maxLines?: number
  opacity?: number
  fontStyle?: string
}

export function svgTextBlock(options: TextBlockOptions): string {
  const {
    x,
    y,
    width,
    text,
    fontSize,
    lineHeight = Math.round(fontSize * 1.35),
    fill,
    anchor = 'start',
    fontWeight,
    maxLines = 2,
    opacity,
    fontStyle
  } = options
  const lines = wrapSvgText(text, width, fontSize, maxLines)
  const attrs = [
    `x="${x}"`,
    `y="${y}"`,
    `font-size="${fontSize}"`,
    `fill="${fill}"`,
    anchor !== 'start' ? `text-anchor="${anchor}"` : '',
    fontWeight ? `font-weight="${fontWeight}"` : '',
    opacity !== undefined ? `opacity="${opacity}"` : '',
    fontStyle ? `font-style="${fontStyle}"` : ''
  ].filter(Boolean).join(' ')
  const tspans = lines.map((line, i) =>
    `<tspan x="${x}" dy="${i === 0 ? 0 : lineHeight}">${escapeHtml(line)}</tspan>`
  ).join('')
  return `<text ${attrs}>${tspans}</text>`
}

function wrapSvgText(text: string, width: number, fontSize: number, maxLines: number): string[] {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (!clean) return ['']
  const maxChars = Math.max(4, Math.floor(width / (fontSize * 0.56)))
  const words = clean.split(' ')
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (next.length <= maxChars) {
      current = next
      continue
    }
    if (current) lines.push(current)
    current = word.length > maxChars ? `${word.slice(0, Math.max(1, maxChars - 3))}...` : word
    if (lines.length === maxLines) break
  }
  if (lines.length < maxLines && current) lines.push(current)
  if (lines.length > maxLines) lines.length = maxLines

  const consumed = lines.join(' ').replace(/\.\.\.$/, '')
  if (clean.length > consumed.length && lines.length > 0) {
    const last = lines[lines.length - 1]
    lines[lines.length - 1] = last.length > maxChars - 3
      ? `${last.slice(0, Math.max(1, maxChars - 3))}...`
      : `${last}...`
  }
  return lines
}
