/**
 * Infographic Theme System
 *
 * Provides:
 * - ThemeColors generation from primary color
 * - Palette system for multi-item colors
 * - Gradient auto-inference
 * - Pre-built theme presets
 *
 * @example
 * ```typescript
 * import {
 *   generateThemeColors,
 *   getPaletteColor,
 *   createGradientDef,
 *   THEME_PRESETS
 * } from './theme'
 *
 * // Generate colors from primary
 * const colors = generateThemeColors({
 *   colorPrimary: '#6366f1',
 *   isDarkMode: true
 * })
 *
 * // Get palette colors for items
 * const itemColor = getPaletteColor('vibrant', 0, 5)
 *
 * // Create gradient for SVG
 * const gradient = createGradientDef('grad-1', '#6366f1')
 * ```
 */

// Types
export type {
  ThemeSeed,
  ThemeColors,
  ThemeConfig,
  ThemePreset,
  Palette,
  PaletteFunction,
  GradientConfig,
  GradientDef,
  GradientStop,
  StylizeConfig,
  DynamicAttributes,
  ShapeAttributes,
  TextAttributes,
  IconAttributes
} from './types'

// Generator
export {
  generateThemeColors,
  generateItemThemeColors,
  isDarkColor,
  detectDarkMode,
  lighten,
  darken,
  desaturate,
  getContrast
} from './generator'

// Palette
export {
  PALETTES,
  DEFAULT_PALETTE,
  getPaletteColor,
  getPaletteColors,
  createGradientPalette,
  createRainbowPalette,
  hasPalette,
  getPaletteNames,
  registerPalette
} from './palette'

// Gradient
export {
  inferGradientColors,
  angleToGradientCoords,
  createGradientDef,
  createMultiStopGradient,
  createRadialGradient,
  gradientDefToSVG,
  gradientUrl,
  shouldApplyGradient,
  GRADIENT_PRESETS
} from './gradient'

// Presets
export {
  THEME_PRESETS,
  DARK_PRESETS,
  LIGHT_PRESETS,
  DEFAULT_PRESET,
  BRAND_COLORS,
  getPreset,
  getPresetNames,
  getDarkPresetNames,
  getLightPresetNames,
  hasPreset,
  createPreset,
  createBrandPreset
} from './presets'

// Patterns
export type { PatternType, PatternConfig, PatternDef } from './patterns'
export {
  createPatternDef,
  patternDefToSVG,
  patternUrl,
  createPatternPalette,
  PATTERN_NAMES,
  getPatternTypes,
  hasPatternType,
  PATTERN_PRESETS,
  createPresetPattern
} from './patterns'
