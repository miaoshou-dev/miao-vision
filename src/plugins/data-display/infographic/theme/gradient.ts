/**
 * Gradient Generation System
 *
 * Auto-infers gradient colors based on base color:
 * - Dark colors: lighten for gradient end
 * - Light colors: darken for gradient end
 */

import type { GradientConfig, GradientDef, GradientStop } from './types'
import { isDarkColor, lighten, darken } from './generator'

/** Default gradient angle (top-left to bottom-right) */
const DEFAULT_ANGLE = 225

/** Default lighten/darken amount */
const DEFAULT_ADJUSTMENT = 20

/**
 * Infer gradient colors from a base color
 *
 * @param baseColor - The base color to create gradient from
 * @param config - Optional gradient configuration
 * @returns Array of [startColor, endColor]
 *
 * @example
 * ```typescript
 * // Dark color -> lighten for end
 * inferGradientColors('#1a1a2e') // ['#1a1a2e', '#2a2a4a']
 *
 * // Light color -> darken for start
 * inferGradientColors('#ffffff') // ['#e0e0e0', '#ffffff']
 * ```
 */
export function inferGradientColors(
  baseColor: string,
  config?: GradientConfig
): [string, string] {
  // If colors explicitly provided, use them
  if (config?.colors && config.colors.length >= 2) {
    return [config.colors[0], config.colors[1]]
  }

  // Auto-infer based on color brightness
  if (isDarkColor(baseColor)) {
    // Dark color: start with base, end with lighter
    return [baseColor, lighten(baseColor, DEFAULT_ADJUSTMENT)]
  } else {
    // Light color: start with darker, end with base
    return [darken(baseColor, DEFAULT_ADJUSTMENT), baseColor]
  }
}

/**
 * Convert angle in degrees to SVG gradient coordinates
 *
 * @param angle - Angle in degrees (0 = top, 90 = right, 180 = bottom, 270 = left)
 * @returns Object with x1, y1, x2, y2 as percentages
 *
 * @example
 * ```typescript
 * angleToGradientCoords(0)   // { x1: '50%', y1: '0%', x2: '50%', y2: '100%' }
 * angleToGradientCoords(90)  // { x1: '0%', y1: '50%', x2: '100%', y2: '50%' }
 * angleToGradientCoords(225) // { x1: '0%', y1: '0%', x2: '100%', y2: '100%' }
 * ```
 */
export function angleToGradientCoords(angle: number): {
  x1: string
  y1: string
  x2: string
  y2: string
} {
  // Normalize angle to 0-360
  const normalizedAngle = ((angle % 360) + 360) % 360

  // Convert to radians (CSS angles: 0deg = top, clockwise)
  const radians = ((normalizedAngle - 90) * Math.PI) / 180

  // Calculate direction vector
  const dx = Math.cos(radians)
  const dy = Math.sin(radians)

  // Convert to percentage coordinates
  // Start from center, extend to edges
  const x1 = `${Math.round(50 - dx * 50)}%`
  const y1 = `${Math.round(50 - dy * 50)}%`
  const x2 = `${Math.round(50 + dx * 50)}%`
  const y2 = `${Math.round(50 + dy * 50)}%`

  return { x1, y1, x2, y2 }
}

/**
 * Create SVG gradient definition
 *
 * @param id - Unique gradient ID
 * @param baseColor - Base color for gradient
 * @param config - Gradient configuration
 * @returns GradientDef for SVG rendering
 */
export function createGradientDef(
  id: string,
  baseColor: string,
  config?: GradientConfig
): GradientDef {
  const [startColor, endColor] = inferGradientColors(baseColor, config)
  const angle = config?.angle ?? DEFAULT_ANGLE
  const coords = angleToGradientCoords(angle)

  return {
    id,
    type: 'linear',
    stops: [
      { offset: '0%', color: startColor },
      { offset: '100%', color: endColor }
    ],
    angle,
    ...coords
  }
}

/**
 * Create multi-stop gradient definition
 */
export function createMultiStopGradient(
  id: string,
  colors: string[],
  angle: number = DEFAULT_ANGLE
): GradientDef {
  const coords = angleToGradientCoords(angle)
  const stops: GradientStop[] = colors.map((color, i) => ({
    offset: `${Math.round((i / (colors.length - 1)) * 100)}%`,
    color
  }))

  return {
    id,
    type: 'linear',
    stops,
    angle,
    ...coords
  }
}

/**
 * Create radial gradient definition
 */
export function createRadialGradient(
  id: string,
  baseColor: string,
  config?: GradientConfig
): GradientDef {
  const [startColor, endColor] = inferGradientColors(baseColor, config)

  return {
    id,
    type: 'radial',
    stops: [
      { offset: '0%', color: startColor },
      { offset: '100%', color: endColor }
    ]
  }
}

/**
 * Generate SVG linearGradient element string
 */
export function gradientDefToSVG(def: GradientDef): string {
  if (def.type === 'radial') {
    const stops = def.stops
      .map((s) => `<stop offset="${s.offset}" stop-color="${s.color}"${s.opacity !== undefined ? ` stop-opacity="${s.opacity}"` : ''}/>`)
      .join('')
    return `<radialGradient id="${def.id}">${stops}</radialGradient>`
  }

  const stops = def.stops
    .map((s) => `<stop offset="${s.offset}" stop-color="${s.color}"${s.opacity !== undefined ? ` stop-opacity="${s.opacity}"` : ''}/>`)
    .join('')

  return `<linearGradient id="${def.id}" x1="${def.x1}" y1="${def.y1}" x2="${def.x2}" y2="${def.y2}">${stops}</linearGradient>`
}

/**
 * Create gradient URL reference for SVG fill/stroke
 */
export function gradientUrl(id: string): string {
  return `url(#${id})`
}

/**
 * Check if gradient should be applied
 */
export function shouldApplyGradient(
  config?: GradientConfig | boolean
): boolean {
  if (typeof config === 'boolean') return config
  if (!config) return false
  return config.enabled !== false
}

/**
 * Common gradient presets
 */
export const GRADIENT_PRESETS = {
  /** Diagonal gradient (top-left to bottom-right) */
  diagonal: { angle: 225 },

  /** Vertical gradient (top to bottom) */
  vertical: { angle: 180 },

  /** Horizontal gradient (left to right) */
  horizontal: { angle: 90 },

  /** Reverse diagonal (top-right to bottom-left) */
  reverseDiagonal: { angle: 315 },

  /** Subtle gradient with small adjustment */
  subtle: { angle: 225, adjustment: 10 },

  /** Strong gradient with large adjustment */
  strong: { angle: 225, adjustment: 30 }
} as const
