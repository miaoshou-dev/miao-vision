/**
 * Decorative Elements for Infographics
 *
 * Provides SVG decorations like dividers, badges, backgrounds, and annotations.
 */

/**
 * Divider styles
 */
export type DividerStyle =
  | 'solid'
  | 'dashed'
  | 'dotted'
  | 'double'
  | 'gradient'
  | 'arrow'
  | 'ornament'

/**
 * Badge shapes
 */
export type BadgeShape =
  | 'circle'
  | 'pill'
  | 'ribbon'
  | 'star'
  | 'shield'
  | 'hexagon'
  | 'diamond'

/**
 * Divider configuration
 */
export interface DividerConfig {
  style?: DividerStyle
  color?: string
  strokeWidth?: number
  length?: number
  opacity?: number
}

/**
 * Badge configuration
 */
export interface BadgeConfig {
  shape?: BadgeShape
  color?: string
  textColor?: string
  size?: number
  borderWidth?: number
  borderColor?: string
}

/**
 * Generate horizontal divider SVG
 */
export function createDivider(
  x: number,
  y: number,
  config: DividerConfig = {}
): string {
  const {
    style = 'solid',
    color = '#6366f1',
    strokeWidth = 1,
    length = 100,
    opacity = 1
  } = config

  const x2 = x + length

  switch (style) {
    case 'solid':
      return `<line x1="${x}" y1="${y}" x2="${x2}" y2="${y}" stroke="${color}" stroke-width="${strokeWidth}" opacity="${opacity}" />`

    case 'dashed':
      return `<line x1="${x}" y1="${y}" x2="${x2}" y2="${y}" stroke="${color}" stroke-width="${strokeWidth}" stroke-dasharray="8 4" opacity="${opacity}" />`

    case 'dotted':
      return `<line x1="${x}" y1="${y}" x2="${x2}" y2="${y}" stroke="${color}" stroke-width="${strokeWidth}" stroke-dasharray="2 4" stroke-linecap="round" opacity="${opacity}" />`

    case 'double':
      const gap = strokeWidth * 3
      return `
        <line x1="${x}" y1="${y - gap / 2}" x2="${x2}" y2="${y - gap / 2}" stroke="${color}" stroke-width="${strokeWidth}" opacity="${opacity}" />
        <line x1="${x}" y1="${y + gap / 2}" x2="${x2}" y2="${y + gap / 2}" stroke="${color}" stroke-width="${strokeWidth}" opacity="${opacity}" />
      `.trim()

    case 'gradient':
      const gradId = `divider-grad-${Math.random().toString(36).substr(2, 9)}`
      return `
        <defs>
          <linearGradient id="${gradId}" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="${color}" stop-opacity="0" />
            <stop offset="50%" stop-color="${color}" stop-opacity="${opacity}" />
            <stop offset="100%" stop-color="${color}" stop-opacity="0" />
          </linearGradient>
        </defs>
        <line x1="${x}" y1="${y}" x2="${x2}" y2="${y}" stroke="url(#${gradId})" stroke-width="${strokeWidth}" />
      `.trim()

    case 'arrow':
      const mid = x + length / 2
      const arrowSize = strokeWidth * 4
      return `
        <line x1="${x}" y1="${y}" x2="${mid - arrowSize}" y2="${y}" stroke="${color}" stroke-width="${strokeWidth}" opacity="${opacity}" />
        <polygon points="${mid - arrowSize},${y - arrowSize / 2} ${mid},${y} ${mid - arrowSize},${y + arrowSize / 2}" fill="${color}" opacity="${opacity}" />
        <line x1="${mid + arrowSize}" y1="${y}" x2="${x2}" y2="${y}" stroke="${color}" stroke-width="${strokeWidth}" opacity="${opacity}" />
      `.trim()

    case 'ornament':
      const ornSize = strokeWidth * 6
      const midX = x + length / 2
      return `
        <line x1="${x}" y1="${y}" x2="${midX - ornSize}" y2="${y}" stroke="${color}" stroke-width="${strokeWidth}" opacity="${opacity}" />
        <circle cx="${midX}" cy="${y}" r="${ornSize / 2}" fill="${color}" opacity="${opacity}" />
        <line x1="${midX + ornSize}" y1="${y}" x2="${x2}" y2="${y}" stroke="${color}" stroke-width="${strokeWidth}" opacity="${opacity}" />
      `.trim()

    default:
      return `<line x1="${x}" y1="${y}" x2="${x2}" y2="${y}" stroke="${color}" stroke-width="${strokeWidth}" opacity="${opacity}" />`
  }
}

/**
 * Generate badge SVG path
 */
export function createBadgePath(
  cx: number,
  cy: number,
  config: BadgeConfig = {}
): string {
  const { shape = 'circle', size = 24 } = config
  const r = size / 2

  switch (shape) {
    case 'circle':
      return `M ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy}`

    case 'pill':
      const pw = size * 1.5
      const ph = size * 0.6
      const pr = ph / 2
      return `M ${cx - pw / 2 + pr} ${cy - ph / 2}
              h ${pw - ph}
              a ${pr} ${pr} 0 0 1 ${pr} ${pr}
              v 0
              a ${pr} ${pr} 0 0 1 -${pr} ${pr}
              h -${pw - ph}
              a ${pr} ${pr} 0 0 1 -${pr} -${pr}
              v 0
              a ${pr} ${pr} 0 0 1 ${pr} -${pr} Z`

    case 'ribbon':
      const rw = size * 1.8
      const rh = size * 0.7
      const tail = rh * 0.3
      return `M ${cx - rw / 2} ${cy - rh / 2}
              h ${rw}
              l -${tail} ${rh / 2}
              l ${tail} ${rh / 2}
              h -${rw}
              l ${tail} -${rh / 2}
              l -${tail} -${rh / 2} Z`

    case 'star':
      const points = 5
      const outerR = r
      const innerR = r * 0.4
      let path = ''
      for (let i = 0; i < points * 2; i++) {
        const radius = i % 2 === 0 ? outerR : innerR
        const angle = (Math.PI * i) / points - Math.PI / 2
        const px = cx + radius * Math.cos(angle)
        const py = cy + radius * Math.sin(angle)
        path += `${i === 0 ? 'M' : 'L'} ${px} ${py} `
      }
      return path + 'Z'

    case 'shield':
      const sw = size * 0.9
      const sh = size * 1.1
      return `M ${cx} ${cy - sh / 2}
              L ${cx + sw / 2} ${cy - sh / 3}
              L ${cx + sw / 2} ${cy + sh / 6}
              Q ${cx + sw / 4} ${cy + sh / 2} ${cx} ${cy + sh / 2}
              Q ${cx - sw / 4} ${cy + sh / 2} ${cx - sw / 2} ${cy + sh / 6}
              L ${cx - sw / 2} ${cy - sh / 3} Z`

    case 'hexagon':
      const hw = r
      const hh = hw * Math.sqrt(3) / 2
      return `M ${cx} ${cy - hw}
              L ${cx + hh} ${cy - hw / 2}
              L ${cx + hh} ${cy + hw / 2}
              L ${cx} ${cy + hw}
              L ${cx - hh} ${cy + hw / 2}
              L ${cx - hh} ${cy - hw / 2} Z`

    case 'diamond':
      return `M ${cx} ${cy - r}
              L ${cx + r * 0.7} ${cy}
              L ${cx} ${cy + r}
              L ${cx - r * 0.7} ${cy} Z`

    default:
      return `M ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy}`
  }
}

/**
 * Generate complete badge SVG
 */
export function createBadge(
  cx: number,
  cy: number,
  text: string,
  config: BadgeConfig = {}
): string {
  const {
    shape = 'circle',
    color = '#6366f1',
    textColor = '#ffffff',
    size = 24,
    borderWidth = 0,
    borderColor = color
  } = config

  const path = createBadgePath(cx, cy, { shape, size })
  const fontSize = size * 0.4

  return `
    <g class="badge">
      <path d="${path}" fill="${color}" ${borderWidth > 0 ? `stroke="${borderColor}" stroke-width="${borderWidth}"` : ''} />
      <text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" fill="${textColor}" font-size="${fontSize}" font-weight="600">
        ${text}
      </text>
    </g>
  `.trim()
}

/**
 * Create decorative corner ornaments
 */
export function createCornerOrnament(
  x: number,
  y: number,
  corner: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight',
  size: number = 20,
  color: string = '#6366f1'
): string {
  const transforms: Record<typeof corner, string> = {
    topLeft: '',
    topRight: `scale(-1, 1) translate(${-2 * x - size}, 0)`,
    bottomLeft: `scale(1, -1) translate(0, ${-2 * y - size})`,
    bottomRight: `scale(-1, -1) translate(${-2 * x - size}, ${-2 * y - size})`
  }

  return `
    <g transform="${transforms[corner]}">
      <path d="M ${x} ${y + size} L ${x} ${y} L ${x + size} ${y}"
            fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" />
      <circle cx="${x + size * 0.3}" cy="${y + size * 0.3}" r="2" fill="${color}" />
    </g>
  `.trim()
}

/**
 * Create decorative frame
 */
export function createFrame(
  x: number,
  y: number,
  width: number,
  height: number,
  config: {
    color?: string
    strokeWidth?: number
    cornerRadius?: number
    style?: 'solid' | 'dashed' | 'double' | 'ornate'
  } = {}
): string {
  const {
    color = '#6366f1',
    strokeWidth = 1,
    cornerRadius = 0,
    style = 'solid'
  } = config

  if (style === 'ornate') {
    const ornSize = 12
    return `
      <rect x="${x}" y="${y}" width="${width}" height="${height}"
            fill="none" stroke="${color}" stroke-width="${strokeWidth}" rx="${cornerRadius}" />
      ${createCornerOrnament(x, y, 'topLeft', ornSize, color)}
      ${createCornerOrnament(x + width, y, 'topRight', ornSize, color)}
      ${createCornerOrnament(x, y + height, 'bottomLeft', ornSize, color)}
      ${createCornerOrnament(x + width, y + height, 'bottomRight', ornSize, color)}
    `.trim()
  }

  const dashArray = style === 'dashed' ? 'stroke-dasharray="8 4"' : ''

  if (style === 'double') {
    const gap = strokeWidth * 3
    return `
      <rect x="${x}" y="${y}" width="${width}" height="${height}"
            fill="none" stroke="${color}" stroke-width="${strokeWidth}" rx="${cornerRadius}" />
      <rect x="${x + gap}" y="${y + gap}" width="${width - gap * 2}" height="${height - gap * 2}"
            fill="none" stroke="${color}" stroke-width="${strokeWidth}" rx="${Math.max(0, cornerRadius - gap)}" />
    `.trim()
  }

  return `<rect x="${x}" y="${y}" width="${width}" height="${height}"
          fill="none" stroke="${color}" stroke-width="${strokeWidth}" rx="${cornerRadius}" ${dashArray} />`
}

/**
 * Create annotation arrow with text
 */
export function createAnnotation(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  text: string,
  config: {
    color?: string
    textColor?: string
    fontSize?: number
    arrowSize?: number
  } = {}
): string {
  const {
    color = '#6366f1',
    textColor = color,
    fontSize = 12,
    arrowSize = 6
  } = config

  // Calculate arrow head
  const angle = Math.atan2(toY - fromY, toX - fromX)
  const ax1 = toX - arrowSize * Math.cos(angle - Math.PI / 6)
  const ay1 = toY - arrowSize * Math.sin(angle - Math.PI / 6)
  const ax2 = toX - arrowSize * Math.cos(angle + Math.PI / 6)
  const ay2 = toY - arrowSize * Math.sin(angle + Math.PI / 6)

  // Text position
  const textX = fromX
  const textY = fromY - fontSize / 2
  const textAnchor = toX > fromX ? 'start' : 'end'

  return `
    <g class="annotation">
      <line x1="${fromX}" y1="${fromY}" x2="${toX - arrowSize * 0.5 * Math.cos(angle)}" y2="${toY - arrowSize * 0.5 * Math.sin(angle)}"
            stroke="${color}" stroke-width="1" />
      <polygon points="${toX},${toY} ${ax1},${ay1} ${ax2},${ay2}" fill="${color}" />
      <text x="${textX}" y="${textY}" text-anchor="${textAnchor}" fill="${textColor}" font-size="${fontSize}">
        ${text}
      </text>
    </g>
  `.trim()
}

/**
 * Create callout bubble
 */
export function createCallout(
  x: number,
  y: number,
  width: number,
  height: number,
  pointerDirection: 'left' | 'right' | 'top' | 'bottom' = 'bottom',
  config: {
    color?: string
    borderColor?: string
    borderWidth?: number
    cornerRadius?: number
  } = {}
): string {
  const {
    color = '#ffffff',
    borderColor = '#e5e7eb',
    borderWidth = 1,
    cornerRadius = 8
  } = config

  const pointerSize = 10
  let pointerPath = ''

  switch (pointerDirection) {
    case 'bottom':
      pointerPath = `M ${x + width / 2 - pointerSize} ${y + height}
                     L ${x + width / 2} ${y + height + pointerSize}
                     L ${x + width / 2 + pointerSize} ${y + height}`
      break
    case 'top':
      pointerPath = `M ${x + width / 2 - pointerSize} ${y}
                     L ${x + width / 2} ${y - pointerSize}
                     L ${x + width / 2 + pointerSize} ${y}`
      break
    case 'left':
      pointerPath = `M ${x} ${y + height / 2 - pointerSize}
                     L ${x - pointerSize} ${y + height / 2}
                     L ${x} ${y + height / 2 + pointerSize}`
      break
    case 'right':
      pointerPath = `M ${x + width} ${y + height / 2 - pointerSize}
                     L ${x + width + pointerSize} ${y + height / 2}
                     L ${x + width} ${y + height / 2 + pointerSize}`
      break
  }

  return `
    <g class="callout">
      <rect x="${x}" y="${y}" width="${width}" height="${height}"
            fill="${color}" stroke="${borderColor}" stroke-width="${borderWidth}" rx="${cornerRadius}" />
      <path d="${pointerPath}" fill="${color}" stroke="${borderColor}" stroke-width="${borderWidth}" />
    </g>
  `.trim()
}

/**
 * Create highlight marker (for emphasizing areas)
 */
export function createHighlight(
  x: number,
  y: number,
  width: number,
  height: number,
  config: {
    color?: string
    opacity?: number
    style?: 'fill' | 'underline' | 'bracket'
  } = {}
): string {
  const { color = '#fef08a', opacity = 0.5, style = 'fill' } = config

  switch (style) {
    case 'fill':
      return `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${color}" opacity="${opacity}" />`

    case 'underline':
      return `<rect x="${x}" y="${y + height - 4}" width="${width}" height="4" fill="${color}" opacity="${opacity}" />`

    case 'bracket':
      const bracketHeight = height * 0.3
      return `
        <path d="M ${x + 4} ${y} L ${x} ${y} L ${x} ${y + height} L ${x + 4} ${y + height}"
              fill="none" stroke="${color}" stroke-width="2" />
        <path d="M ${x + width - 4} ${y} L ${x + width} ${y} L ${x + width} ${y + height} L ${x + width - 4} ${y + height}"
              fill="none" stroke="${color}" stroke-width="2" />
      `.trim()

    default:
      return `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${color}" opacity="${opacity}" />`
  }
}
