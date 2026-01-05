/**
 * Pattern Fill System
 *
 * Provides SVG pattern definitions for textured fills.
 * Supports diagonal lines, dots, crosshatch, waves, and more.
 *
 * @example
 * ```svelte
 * <svg>
 *   <defs>
 *     {@html patternDefToSVG(createPatternDef('diagonalLines', '#6366f1', { spacing: 8 }))}
 *   </defs>
 *   <rect fill="url(#diagonalLines-pattern)" />
 * </svg>
 * ```
 */

/**
 * Available pattern types
 */
export type PatternType =
  | 'diagonalLines'
  | 'diagonalLinesReverse'
  | 'crosshatch'
  | 'dots'
  | 'dotsLarge'
  | 'horizontalLines'
  | 'verticalLines'
  | 'grid'
  | 'waves'
  | 'zigzag'
  | 'triangles'
  | 'hexagons'
  | 'checkerboard'

/**
 * Pattern configuration options
 */
export interface PatternConfig {
  /** Pattern spacing/size */
  spacing?: number
  /** Stroke width for line patterns */
  strokeWidth?: number
  /** Opacity (0-1) */
  opacity?: number
  /** Rotation angle in degrees */
  rotation?: number
  /** Background color (optional) */
  backgroundColor?: string
}

/**
 * Pattern definition for SVG
 */
export interface PatternDef {
  id: string
  type: PatternType
  color: string
  config: Required<PatternConfig>
  svg: string
}

/**
 * Default pattern configuration
 */
const DEFAULT_CONFIG: Required<PatternConfig> = {
  spacing: 8,
  strokeWidth: 1,
  opacity: 1,
  rotation: 0,
  backgroundColor: ''
}

/**
 * Create a pattern definition
 */
export function createPatternDef(
  type: PatternType,
  color: string,
  config: PatternConfig = {},
  customId?: string
): PatternDef {
  const cfg = { ...DEFAULT_CONFIG, ...config }
  const id = customId || `${type}-pattern`

  return {
    id,
    type,
    color,
    config: cfg,
    svg: generatePatternSVG(type, id, color, cfg)
  }
}

/**
 * Generate SVG pattern element
 */
function generatePatternSVG(
  type: PatternType,
  id: string,
  color: string,
  config: Required<PatternConfig>
): string {
  const { spacing, strokeWidth, opacity, rotation, backgroundColor } = config

  const bgRect = backgroundColor
    ? `<rect width="100%" height="100%" fill="${backgroundColor}" />`
    : ''

  const transform = rotation !== 0 ? ` patternTransform="rotate(${rotation})"` : ''

  switch (type) {
    case 'diagonalLines':
      return `
        <pattern id="${id}" width="${spacing}" height="${spacing}" patternUnits="userSpaceOnUse"${transform}>
          ${bgRect}
          <path d="M0,${spacing} l${spacing},-${spacing} M-${spacing / 4},${spacing / 4} l${spacing / 2},-${spacing / 2} M${spacing * 0.75},${spacing * 1.25} l${spacing / 2},-${spacing / 2}"
            stroke="${color}" stroke-width="${strokeWidth}" opacity="${opacity}" />
        </pattern>
      `.trim()

    case 'diagonalLinesReverse':
      return `
        <pattern id="${id}" width="${spacing}" height="${spacing}" patternUnits="userSpaceOnUse"${transform}>
          ${bgRect}
          <path d="M0,0 l${spacing},${spacing} M-${spacing / 4},${spacing * 0.75} l${spacing / 2},${spacing / 2} M${spacing * 0.75},-${spacing / 4} l${spacing / 2},${spacing / 2}"
            stroke="${color}" stroke-width="${strokeWidth}" opacity="${opacity}" />
        </pattern>
      `.trim()

    case 'crosshatch':
      return `
        <pattern id="${id}" width="${spacing}" height="${spacing}" patternUnits="userSpaceOnUse"${transform}>
          ${bgRect}
          <path d="M0,${spacing} l${spacing},-${spacing} M0,0 l${spacing},${spacing}"
            stroke="${color}" stroke-width="${strokeWidth}" opacity="${opacity}" />
        </pattern>
      `.trim()

    case 'dots':
      const dotRadius = spacing / 6
      return `
        <pattern id="${id}" width="${spacing}" height="${spacing}" patternUnits="userSpaceOnUse"${transform}>
          ${bgRect}
          <circle cx="${spacing / 2}" cy="${spacing / 2}" r="${dotRadius}"
            fill="${color}" opacity="${opacity}" />
        </pattern>
      `.trim()

    case 'dotsLarge':
      const largeRadius = spacing / 4
      return `
        <pattern id="${id}" width="${spacing}" height="${spacing}" patternUnits="userSpaceOnUse"${transform}>
          ${bgRect}
          <circle cx="${spacing / 2}" cy="${spacing / 2}" r="${largeRadius}"
            fill="${color}" opacity="${opacity}" />
        </pattern>
      `.trim()

    case 'horizontalLines':
      return `
        <pattern id="${id}" width="${spacing}" height="${spacing}" patternUnits="userSpaceOnUse"${transform}>
          ${bgRect}
          <line x1="0" y1="${spacing / 2}" x2="${spacing}" y2="${spacing / 2}"
            stroke="${color}" stroke-width="${strokeWidth}" opacity="${opacity}" />
        </pattern>
      `.trim()

    case 'verticalLines':
      return `
        <pattern id="${id}" width="${spacing}" height="${spacing}" patternUnits="userSpaceOnUse"${transform}>
          ${bgRect}
          <line x1="${spacing / 2}" y1="0" x2="${spacing / 2}" y2="${spacing}"
            stroke="${color}" stroke-width="${strokeWidth}" opacity="${opacity}" />
        </pattern>
      `.trim()

    case 'grid':
      return `
        <pattern id="${id}" width="${spacing}" height="${spacing}" patternUnits="userSpaceOnUse"${transform}>
          ${bgRect}
          <path d="M${spacing},0 L0,0 0,${spacing}"
            fill="none" stroke="${color}" stroke-width="${strokeWidth}" opacity="${opacity}" />
        </pattern>
      `.trim()

    case 'waves':
      const amplitude = spacing / 3
      return `
        <pattern id="${id}" width="${spacing * 2}" height="${spacing}" patternUnits="userSpaceOnUse"${transform}>
          ${bgRect}
          <path d="M0,${spacing / 2} Q${spacing / 2},${spacing / 2 - amplitude} ${spacing},${spacing / 2} T${spacing * 2},${spacing / 2}"
            fill="none" stroke="${color}" stroke-width="${strokeWidth}" opacity="${opacity}" />
        </pattern>
      `.trim()

    case 'zigzag':
      return `
        <pattern id="${id}" width="${spacing * 2}" height="${spacing}" patternUnits="userSpaceOnUse"${transform}>
          ${bgRect}
          <path d="M0,${spacing} L${spacing},0 L${spacing * 2},${spacing}"
            fill="none" stroke="${color}" stroke-width="${strokeWidth}" opacity="${opacity}" />
        </pattern>
      `.trim()

    case 'triangles':
      return `
        <pattern id="${id}" width="${spacing}" height="${spacing}" patternUnits="userSpaceOnUse"${transform}>
          ${bgRect}
          <polygon points="${spacing / 2},${spacing / 4} ${spacing / 4},${spacing * 0.75} ${spacing * 0.75},${spacing * 0.75}"
            fill="${color}" opacity="${opacity}" />
        </pattern>
      `.trim()

    case 'hexagons':
      const hex = spacing / 2
      const h = hex * Math.sqrt(3) / 2
      return `
        <pattern id="${id}" width="${hex * 3}" height="${h * 2}" patternUnits="userSpaceOnUse"${transform}>
          ${bgRect}
          <polygon points="${hex},0 ${hex * 2},0 ${hex * 2.5},${h} ${hex * 2},${h * 2} ${hex},${h * 2} ${hex * 0.5},${h}"
            fill="none" stroke="${color}" stroke-width="${strokeWidth}" opacity="${opacity}" />
        </pattern>
      `.trim()

    case 'checkerboard':
      const size = spacing / 2
      return `
        <pattern id="${id}" width="${spacing}" height="${spacing}" patternUnits="userSpaceOnUse"${transform}>
          ${bgRect}
          <rect x="0" y="0" width="${size}" height="${size}" fill="${color}" opacity="${opacity}" />
          <rect x="${size}" y="${size}" width="${size}" height="${size}" fill="${color}" opacity="${opacity}" />
        </pattern>
      `.trim()

    default:
      return `<pattern id="${id}" width="${spacing}" height="${spacing}" patternUnits="userSpaceOnUse" />`
  }
}

/**
 * Convert pattern definition to SVG defs content
 */
export function patternDefToSVG(def: PatternDef): string {
  return def.svg
}

/**
 * Get pattern fill URL reference
 */
export function patternUrl(patternId: string): string {
  return `url(#${patternId})`
}

/**
 * Create multiple pattern definitions for a palette
 */
export function createPatternPalette(
  types: PatternType[],
  colors: string[],
  config: PatternConfig = {}
): PatternDef[] {
  return types.map((type, i) =>
    createPatternDef(type, colors[i % colors.length], config, `${type}-${i}`)
  )
}

/**
 * Pattern type display names
 */
export const PATTERN_NAMES: Record<PatternType, string> = {
  diagonalLines: 'Diagonal Lines',
  diagonalLinesReverse: 'Diagonal Lines (Reverse)',
  crosshatch: 'Crosshatch',
  dots: 'Dots',
  dotsLarge: 'Dots (Large)',
  horizontalLines: 'Horizontal Lines',
  verticalLines: 'Vertical Lines',
  grid: 'Grid',
  waves: 'Waves',
  zigzag: 'Zigzag',
  triangles: 'Triangles',
  hexagons: 'Hexagons',
  checkerboard: 'Checkerboard'
}

/**
 * Get all available pattern types
 */
export function getPatternTypes(): PatternType[] {
  return Object.keys(PATTERN_NAMES) as PatternType[]
}

/**
 * Check if a pattern type exists
 */
export function hasPatternType(type: string): type is PatternType {
  return type in PATTERN_NAMES
}

/**
 * Preset pattern configurations
 */
export const PATTERN_PRESETS: Record<string, { type: PatternType; config: PatternConfig }> = {
  subtle: { type: 'dots', config: { spacing: 12, opacity: 0.3 } },
  dense: { type: 'diagonalLines', config: { spacing: 4, strokeWidth: 1 } },
  bold: { type: 'crosshatch', config: { spacing: 10, strokeWidth: 2 } },
  modern: { type: 'grid', config: { spacing: 16, strokeWidth: 0.5, opacity: 0.5 } },
  playful: { type: 'waves', config: { spacing: 12, strokeWidth: 1.5 } },
  technical: { type: 'hexagons', config: { spacing: 20, strokeWidth: 1 } },
  classic: { type: 'horizontalLines', config: { spacing: 6, strokeWidth: 1 } }
}

/**
 * Create pattern from preset name
 */
export function createPresetPattern(presetName: string, color: string): PatternDef | null {
  const preset = PATTERN_PRESETS[presetName]
  if (!preset) return null
  return createPatternDef(preset.type, color, preset.config, `${presetName}-pattern`)
}
