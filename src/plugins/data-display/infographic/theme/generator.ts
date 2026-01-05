/**
 * Theme Colors Generator
 *
 * Generates 8 derived colors from a ThemeSeed using:
 * - Oklch perceptually uniform color space (via culori)
 * - WCAG accessibility contrast ratios
 * - Dark/Light mode automatic detection
 */

import {
  parse,
  formatHex,
  wcagLuminance,
  wcagContrast,
  oklch,
  type Oklch
} from 'culori'
import type { ThemeSeed, ThemeColors } from './types'

// Color constants
const WHITE = '#ffffff'
const BLACK = '#000000'
const DARK_BG = '#1a1a2e'
const LIGHT_BG = '#ffffff'

// WCAG contrast thresholds
const WCAG_TEXT_CONTRAST = 7.0 // AAA level for normal text
const WCAG_PRIMARY_CONTRAST = 3.0 // AA level for large text/UI

/**
 * Check if a color is dark based on WCAG luminance
 */
export function isDarkColor(color: string): boolean {
  const parsed = parse(color)
  if (!parsed) return false
  return wcagLuminance(parsed) < 0.5
}

/**
 * Detect if background should use dark mode
 */
export function detectDarkMode(colorBg: string): boolean {
  return isDarkColor(colorBg)
}

/**
 * Convert any color to Oklch color space
 */
function toOklch(color: string): Oklch | undefined {
  const parsed = parse(color)
  if (!parsed) return undefined
  return oklch(parsed)
}

/**
 * Adjust lightness in Oklch color space
 * @param color - Input color
 * @param delta - Lightness adjustment (-1 to 1)
 */
function adjustLightness(color: string, delta: number): string {
  const lch = toOklch(color)
  if (!lch) return color

  const newL = Math.max(0, Math.min(1, (lch.l || 0) + delta))
  const adjusted = { ...lch, l: newL }
  return formatHex(adjusted) || color
}

/**
 * Adjust chroma (saturation) in Oklch color space
 */
function adjustChroma(color: string, factor: number): string {
  const lch = toOklch(color)
  if (!lch) return color

  const newC = Math.max(0, (lch.c || 0) * factor)
  const adjusted = { ...lch, c: newC }
  return formatHex(adjusted) || color
}

/**
 * Find a text color that meets WCAG contrast on given background
 */
function findContrastingText(
  bgColor: string,
  preferredColor: string,
  targetContrast: number
): string {
  const bg = parse(bgColor)
  const preferred = parse(preferredColor)
  if (!bg || !preferred) return isDarkColor(bgColor) ? WHITE : BLACK

  // Check if preferred color already meets contrast
  if (wcagContrast(bg, preferred) >= targetContrast) {
    return formatHex(preferred) || preferredColor
  }

  // Progressively adjust lightness to meet contrast
  const lch = toOklch(preferredColor)
  if (!lch) return isDarkColor(bgColor) ? WHITE : BLACK

  const bgIsDark = isDarkColor(bgColor)
  const step = bgIsDark ? 0.05 : -0.05
  let l = lch.l || 0.5

  for (let i = 0; i < 20; i++) {
    l = Math.max(0, Math.min(1, l + step))
    const adjusted = { ...lch, l }
    const adjustedHex = formatHex(adjusted)
    if (adjustedHex) {
      const adjustedParsed = parse(adjustedHex)
      if (adjustedParsed && wcagContrast(bg, adjustedParsed) >= targetContrast) {
        return adjustedHex
      }
    }
  }

  // Fallback to pure black/white
  return bgIsDark ? WHITE : BLACK
}

/**
 * Generate primary background (light tinted version of primary)
 */
function generatePrimaryBg(
  colorPrimary: string,
  isDarkMode: boolean
): string {
  const lch = toOklch(colorPrimary)
  if (!lch) return isDarkMode ? '#2a2a4a' : '#f0f4ff'

  if (isDarkMode) {
    // Dark mode: darker, less saturated version
    return formatHex({ ...lch, l: 0.2, c: (lch.c || 0) * 0.3 }) || '#2a2a4a'
  } else {
    // Light mode: very light tinted version
    return formatHex({ ...lch, l: 0.95, c: (lch.c || 0) * 0.2 }) || '#f0f4ff'
  }
}

/**
 * Generate text color for primary background
 */
function generatePrimaryText(
  colorPrimary: string,
  colorPrimaryBg: string,
  isDarkMode: boolean
): string {
  // Try using primary color as text
  return findContrastingText(
    colorPrimaryBg,
    colorPrimary,
    WCAG_PRIMARY_CONTRAST
  )
}

/**
 * Generate main text color
 */
function generateTextColor(colorBg: string, isDarkMode: boolean): string {
  if (isDarkMode) {
    return '#ffffff' // Pure white for dark mode
  }
  return '#1a1a2e' // Dark blue-gray for light mode
}

/**
 * Generate secondary text color
 */
function generateTextSecondary(
  colorBg: string,
  colorText: string,
  isDarkMode: boolean
): string {
  const lch = toOklch(colorText)
  if (!lch) return isDarkMode ? '#a0a0b0' : '#666680'

  // Reduce lightness contrast for secondary text
  const targetL = isDarkMode
    ? Math.max(0.5, (lch.l || 0) - 0.25)
    : Math.min(0.6, (lch.l || 0) + 0.25)

  return formatHex({ ...lch, l: targetL, c: (lch.c || 0) * 0.5 }) ||
    (isDarkMode ? '#a0a0b0' : '#666680')
}

/**
 * Generate elevated background (cards, popups)
 */
function generateBgElevated(colorBg: string, isDarkMode: boolean): string {
  if (isDarkMode) {
    return adjustLightness(colorBg, 0.05)
  }
  return adjustLightness(colorBg, -0.02)
}

/**
 * Generate complete ThemeColors from ThemeSeed
 *
 * @example
 * ```typescript
 * const colors = generateThemeColors({
 *   colorPrimary: '#6366f1',
 *   colorBg: '#1a1a2e',
 *   isDarkMode: true
 * })
 * ```
 */
export function generateThemeColors(seed: ThemeSeed): ThemeColors {
  const { colorPrimary } = seed

  // Determine dark mode
  const colorBg = seed.colorBg || (seed.isDarkMode ? DARK_BG : LIGHT_BG)
  const isDarkMode = seed.isDarkMode ?? detectDarkMode(colorBg)

  // Generate all derived colors
  const colorPrimaryBg = generatePrimaryBg(colorPrimary, isDarkMode)
  const colorPrimaryText = generatePrimaryText(
    colorPrimary,
    colorPrimaryBg,
    isDarkMode
  )
  const colorText = generateTextColor(colorBg, isDarkMode)
  const colorTextSecondary = generateTextSecondary(
    colorBg,
    colorText,
    isDarkMode
  )
  const colorBgElevated = generateBgElevated(colorBg, isDarkMode)

  return {
    colorPrimary,
    colorPrimaryBg,
    colorPrimaryText,
    colorText,
    colorTextSecondary,
    colorWhite: WHITE,
    colorBg,
    colorBgElevated,
    isDarkMode
  }
}

/**
 * Generate theme colors for a specific item in a palette
 * Each item gets its own ThemeColors based on its palette color
 */
export function generateItemThemeColors(
  paletteColor: string,
  baseColors: ThemeColors
): ThemeColors {
  return generateThemeColors({
    colorPrimary: paletteColor,
    colorBg: baseColors.colorBg,
    isDarkMode: baseColors.isDarkMode
  })
}

/**
 * Lighten a color by percentage
 */
export function lighten(color: string, amount: number): string {
  return adjustLightness(color, amount / 100)
}

/**
 * Darken a color by percentage
 */
export function darken(color: string, amount: number): string {
  return adjustLightness(color, -amount / 100)
}

/**
 * Desaturate a color by factor
 */
export function desaturate(color: string, factor: number): string {
  return adjustChroma(color, 1 - factor)
}

/**
 * Get WCAG contrast ratio between two colors
 */
export function getContrast(color1: string, color2: string): number {
  const c1 = parse(color1)
  const c2 = parse(color2)
  if (!c1 || !c2) return 1
  return wcagContrast(c1, c2)
}
