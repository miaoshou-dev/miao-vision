/**
 * Infographic Theme System Types
 *
 * Based on AntV Infographic's color algorithm:
 * - Uses Oklch perceptually uniform color space
 * - WCAG accessibility compliance
 * - Dark/Light mode support
 */

/**
 * Theme seed - minimal input to generate full theme
 */
export interface ThemeSeed {
  /** Primary color (hex, rgb, hsl, etc.) */
  colorPrimary: string
  /** Background color (optional, defaults to white/dark) */
  colorBg?: string
  /** Force dark mode detection */
  isDarkMode?: boolean
}

/**
 * Generated theme colors - 8 derived colors from seed
 */
export interface ThemeColors {
  /** Original primary color */
  colorPrimary: string
  /** Light tinted background for primary color */
  colorPrimaryBg: string
  /** Text color on primary background (WCAG >= 7) */
  colorPrimaryText: string
  /** Main text color (darkest) */
  colorText: string
  /** Secondary text color */
  colorTextSecondary: string
  /** Pure white */
  colorWhite: string
  /** Canvas background color */
  colorBg: string
  /** Elevated card background color */
  colorBgElevated: string
  /** Whether in dark mode */
  isDarkMode: boolean
}

/**
 * Palette function type - generates color based on position
 * @param ratio - Position ratio (0-1) in sequence
 * @param index - Item index (0-based)
 * @param count - Total item count
 * @returns Color string
 */
export type PaletteFunction = (
  ratio: number,
  index: number,
  count: number
) => string

/**
 * Palette type - colors for multi-item visualizations
 * - string[]: Array of colors (cyclic)
 * - string: Single color name from preset
 * - PaletteFunction: Dynamic color generator
 */
export type Palette = string[] | string | PaletteFunction

/**
 * Gradient configuration
 */
export interface GradientConfig {
  /** Gradient colors (auto-inferred if not provided) */
  colors?: string[]
  /** Gradient angle in degrees (default: 225) */
  angle?: number
  /** Whether to enable gradient */
  enabled?: boolean
}

/**
 * SVG gradient definition for rendering
 */
export interface GradientDef {
  /** Unique gradient ID */
  id: string
  /** Gradient type */
  type: 'linear' | 'radial'
  /** Gradient stops */
  stops: GradientStop[]
  /** For linear gradient: angle or coordinates */
  angle?: number
  x1?: string
  y1?: string
  x2?: string
  y2?: string
}

export interface GradientStop {
  offset: string
  color: string
  opacity?: number
}

/**
 * Dynamic attributes - support static or computed values
 */
export type DynamicAttributes<T extends object> = {
  [K in keyof T]?: T[K] | ((value: T[K], node: SVGElement) => T[K] | undefined)
}

/**
 * Base shape attributes
 */
export interface ShapeAttributes {
  fill?: string
  stroke?: string
  strokeWidth?: number
  opacity?: number
  rx?: number
  ry?: number
}

/**
 * Text attributes
 */
export interface TextAttributes {
  fill?: string
  fontSize?: number
  fontWeight?: string | number
  fontFamily?: string
  textAnchor?: 'start' | 'middle' | 'end'
  dominantBaseline?: 'auto' | 'middle' | 'hanging'
}

/**
 * Icon attributes
 */
export interface IconAttributes {
  fill?: string
  size?: number
  name?: string
}

/**
 * Complete theme configuration
 */
export interface ThemeConfig {
  /** Background color */
  colorBg?: string
  /** Primary color */
  colorPrimary?: string
  /** Global base styles */
  base?: {
    global?: DynamicAttributes<ShapeAttributes & TextAttributes>
    shape?: ShapeAttributes
    text?: TextAttributes
  }
  /** Color palette for multi-item */
  palette?: Palette
  /** Title text style */
  title?: TextAttributes
  /** Description text style */
  desc?: TextAttributes
  /** Shape style */
  shape?: ShapeAttributes
  /** Item-level styles */
  item?: {
    icon?: DynamicAttributes<IconAttributes>
    label?: DynamicAttributes<TextAttributes>
    desc?: DynamicAttributes<TextAttributes>
    value?: DynamicAttributes<TextAttributes>
    shape?: DynamicAttributes<ShapeAttributes>
  }
  /** Stylize effects (gradient, shadow, etc.) */
  stylize?: StylizeConfig | null
  /** Custom element styles by name */
  elements?: Record<string, ShapeAttributes | TextAttributes>
}

/**
 * Stylize configuration for visual effects
 */
export interface StylizeConfig {
  /** Enable gradient fills */
  gradient?: GradientConfig | boolean
  /** Enable drop shadows */
  shadow?: boolean
  /** Enable glow effects */
  glow?: boolean
}

/**
 * Theme preset definition
 */
export interface ThemePreset {
  name: string
  seed: ThemeSeed
  config?: Partial<ThemeConfig>
}
