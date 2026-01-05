/**
 * Palette System
 *
 * Provides color palettes for multi-item visualizations.
 * Supports:
 * - Static arrays (cyclic)
 * - Preset names
 * - Dynamic functions
 */

import type { Palette, PaletteFunction } from './types'

/**
 * Built-in palette presets
 */
export const PALETTES: Record<string, string[]> = {
  // Vibrant modern palette
  vibrant: [
    '#6366f1', // Indigo
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#f43f5e', // Rose
    '#f97316', // Orange
    '#eab308', // Yellow
    '#22c55e', // Green
    '#06b6d4', // Cyan
  ],

  // Professional business palette
  business: [
    '#3b82f6', // Blue
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#8b5cf6', // Violet
    '#06b6d4', // Cyan
  ],

  // Ocean palette
  ocean: [
    '#0ea5e9', // Sky
    '#06b6d4', // Cyan
    '#14b8a6', // Teal
    '#22c55e', // Green
    '#3b82f6', // Blue
    '#6366f1', // Indigo
  ],

  // Sunset palette
  sunset: [
    '#f43f5e', // Rose
    '#f97316', // Orange
    '#eab308', // Yellow
    '#f59e0b', // Amber
    '#ec4899', // Pink
    '#8b5cf6', // Violet
  ],

  // Forest palette
  forest: [
    '#22c55e', // Green
    '#10b981', // Emerald
    '#14b8a6', // Teal
    '#84cc16', // Lime
    '#059669', // Green-600
    '#0d9488', // Teal-600
  ],

  // Monochrome blue
  monoBlue: [
    '#1e40af', // Blue-800
    '#2563eb', // Blue-600
    '#3b82f6', // Blue-500
    '#60a5fa', // Blue-400
    '#93c5fd', // Blue-300
    '#bfdbfe', // Blue-200
  ],

  // Monochrome purple
  monoPurple: [
    '#6b21a8', // Purple-800
    '#7c3aed', // Violet-600
    '#8b5cf6', // Violet-500
    '#a78bfa', // Violet-400
    '#c4b5fd', // Violet-300
    '#ddd6fe', // Violet-200
  ],

  // Neutral grayscale
  neutral: [
    '#374151', // Gray-700
    '#4b5563', // Gray-600
    '#6b7280', // Gray-500
    '#9ca3af', // Gray-400
    '#d1d5db', // Gray-300
    '#e5e7eb', // Gray-200
  ],

  // Categorical (for distinct categories)
  categorical: [
    '#3b82f6', // Blue
    '#ef4444', // Red
    '#22c55e', // Green
    '#f59e0b', // Amber
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#06b6d4', // Cyan
    '#f97316', // Orange
  ],

  // Pastel palette
  pastel: [
    '#c4b5fd', // Violet-300
    '#fbcfe8', // Pink-200
    '#fde68a', // Amber-200
    '#a7f3d0', // Emerald-200
    '#bae6fd', // Sky-200
    '#fecaca', // Red-200
  ],

  // Dark mode optimized
  darkMode: [
    '#818cf8', // Indigo-400
    '#a78bfa', // Violet-400
    '#f472b6', // Pink-400
    '#fb7185', // Rose-400
    '#fb923c', // Orange-400
    '#facc15', // Yellow-400
    '#4ade80', // Green-400
    '#22d3ee', // Cyan-400
  ],
}

/**
 * Default palette when none specified
 */
export const DEFAULT_PALETTE = 'vibrant'

/**
 * Get color from palette at specific index
 *
 * @param palette - Palette definition (array, name, or function)
 * @param index - Item index
 * @param total - Total item count
 * @returns Color string
 *
 * @example
 * ```typescript
 * // From array (cyclic)
 * getPaletteColor(['#f00', '#0f0', '#00f'], 0, 3) // '#f00'
 * getPaletteColor(['#f00', '#0f0', '#00f'], 5, 6) // '#0f0' (wraps)
 *
 * // From preset name
 * getPaletteColor('vibrant', 0, 5) // '#6366f1'
 *
 * // From function
 * getPaletteColor((ratio) => `hsl(${ratio * 360}, 70%, 50%)`, 0, 5)
 * ```
 */
export function getPaletteColor(
  palette: Palette | undefined,
  index: number,
  total: number
): string {
  // Handle undefined/null
  if (!palette) {
    return getPaletteColor(PALETTES[DEFAULT_PALETTE], index, total)
  }

  // Handle function palette
  if (typeof palette === 'function') {
    const ratio = total > 1 ? index / (total - 1) : 0
    return palette(ratio, index, total)
  }

  // Handle string (preset name)
  if (typeof palette === 'string') {
    const presetColors = PALETTES[palette]
    if (presetColors) {
      return getPaletteColor(presetColors, index, total)
    }
    // If not found, treat as single color
    return palette
  }

  // Handle array (cyclic)
  if (Array.isArray(palette) && palette.length > 0) {
    return palette[index % palette.length]
  }

  // Fallback
  return PALETTES[DEFAULT_PALETTE][index % PALETTES[DEFAULT_PALETTE].length]
}

/**
 * Get multiple colors from palette
 */
export function getPaletteColors(
  palette: Palette | undefined,
  count: number
): string[] {
  return Array.from({ length: count }, (_, i) =>
    getPaletteColor(palette, i, count)
  )
}

/**
 * Create a gradient palette function
 */
export function createGradientPalette(
  startColor: string,
  endColor: string
): PaletteFunction {
  return (ratio: number) => {
    // Simple linear interpolation in hex
    // For production, should use proper color space interpolation
    return interpolateColor(startColor, endColor, ratio)
  }
}

/**
 * Simple hex color interpolation
 */
function interpolateColor(
  color1: string,
  color2: string,
  ratio: number
): string {
  const hex1 = color1.replace('#', '')
  const hex2 = color2.replace('#', '')

  const r1 = parseInt(hex1.slice(0, 2), 16)
  const g1 = parseInt(hex1.slice(2, 4), 16)
  const b1 = parseInt(hex1.slice(4, 6), 16)

  const r2 = parseInt(hex2.slice(0, 2), 16)
  const g2 = parseInt(hex2.slice(2, 4), 16)
  const b2 = parseInt(hex2.slice(4, 6), 16)

  const r = Math.round(r1 + (r2 - r1) * ratio)
  const g = Math.round(g1 + (g2 - g1) * ratio)
  const b = Math.round(b1 + (b2 - b1) * ratio)

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

/**
 * Create HSL-based rainbow palette
 */
export function createRainbowPalette(
  saturation = 70,
  lightness = 50
): PaletteFunction {
  return (ratio: number) => {
    const hue = Math.round(ratio * 360)
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`
  }
}

/**
 * Check if a palette name exists
 */
export function hasPalette(name: string): boolean {
  return name in PALETTES
}

/**
 * Get all available palette names
 */
export function getPaletteNames(): string[] {
  return Object.keys(PALETTES)
}

/**
 * Register a custom palette
 */
export function registerPalette(name: string, colors: string[]): void {
  PALETTES[name] = colors
}
