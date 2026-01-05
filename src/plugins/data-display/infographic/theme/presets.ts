/**
 * Theme Presets
 *
 * Pre-configured themes for common use cases.
 * Each preset includes:
 * - ThemeSeed (colorPrimary, colorBg, isDarkMode)
 * - Optional ThemeConfig overrides
 */

import type { ThemePreset, ThemeConfig } from './types'

/**
 * Dark mode presets
 */
export const DARK_PRESETS: Record<string, ThemePreset> = {
  // Vibrant dark theme with indigo accent
  'dark-vibrant': {
    name: 'Dark Vibrant',
    seed: {
      colorPrimary: '#6366f1',
      colorBg: '#1a1a2e',
      isDarkMode: true
    },
    config: {
      palette: 'vibrant',
      stylize: { gradient: true }
    }
  },

  // Professional dark theme with blue accent
  'dark-business': {
    name: 'Dark Business',
    seed: {
      colorPrimary: '#3b82f6',
      colorBg: '#0f172a',
      isDarkMode: true
    },
    config: {
      palette: 'business',
      stylize: { gradient: { angle: 180 } }
    }
  },

  // Ocean dark theme with cyan accent
  'dark-ocean': {
    name: 'Dark Ocean',
    seed: {
      colorPrimary: '#06b6d4',
      colorBg: '#0c1929',
      isDarkMode: true
    },
    config: {
      palette: 'ocean',
      stylize: { gradient: true }
    }
  },

  // Sunset dark theme with orange accent
  'dark-sunset': {
    name: 'Dark Sunset',
    seed: {
      colorPrimary: '#f97316',
      colorBg: '#1c1917',
      isDarkMode: true
    },
    config: {
      palette: 'sunset',
      stylize: { gradient: true }
    }
  },

  // Forest dark theme with green accent
  'dark-forest': {
    name: 'Dark Forest',
    seed: {
      colorPrimary: '#22c55e',
      colorBg: '#0a1f0a',
      isDarkMode: true
    },
    config: {
      palette: 'forest',
      stylize: { gradient: true }
    }
  },

  // Purple dark theme
  'dark-purple': {
    name: 'Dark Purple',
    seed: {
      colorPrimary: '#a855f7',
      colorBg: '#1a0a2e',
      isDarkMode: true
    },
    config: {
      palette: 'monoPurple',
      stylize: { gradient: true }
    }
  },

  // Rose dark theme
  'dark-rose': {
    name: 'Dark Rose',
    seed: {
      colorPrimary: '#f43f5e',
      colorBg: '#1f0a0a',
      isDarkMode: true
    },
    config: {
      palette: 'sunset',
      stylize: { gradient: true }
    }
  },

  // Minimal dark theme with neutral colors
  'dark-minimal': {
    name: 'Dark Minimal',
    seed: {
      colorPrimary: '#9ca3af',
      colorBg: '#111827',
      isDarkMode: true
    },
    config: {
      palette: 'neutral',
      stylize: null
    }
  }
}

/**
 * Light mode presets
 */
export const LIGHT_PRESETS: Record<string, ThemePreset> = {
  // Clean light theme with blue accent
  'light-blue': {
    name: 'Light Blue',
    seed: {
      colorPrimary: '#3b82f6',
      colorBg: '#ffffff',
      isDarkMode: false
    },
    config: {
      palette: 'business',
      stylize: { gradient: { angle: 225 } }
    }
  },

  // Indigo light theme
  'light-indigo': {
    name: 'Light Indigo',
    seed: {
      colorPrimary: '#6366f1',
      colorBg: '#fafafa',
      isDarkMode: false
    },
    config: {
      palette: 'vibrant',
      stylize: { gradient: true }
    }
  },

  // Emerald light theme
  'light-emerald': {
    name: 'Light Emerald',
    seed: {
      colorPrimary: '#10b981',
      colorBg: '#f0fdf4',
      isDarkMode: false
    },
    config: {
      palette: 'forest',
      stylize: { gradient: true }
    }
  },

  // Warm light theme
  'light-warm': {
    name: 'Light Warm',
    seed: {
      colorPrimary: '#f59e0b',
      colorBg: '#fffbeb',
      isDarkMode: false
    },
    config: {
      palette: 'sunset',
      stylize: { gradient: true }
    }
  },

  // Rose light theme
  'light-rose': {
    name: 'Light Rose',
    seed: {
      colorPrimary: '#f43f5e',
      colorBg: '#fff1f2',
      isDarkMode: false
    },
    config: {
      palette: 'sunset',
      stylize: { gradient: true }
    }
  },

  // Neutral light theme
  'light-neutral': {
    name: 'Light Neutral',
    seed: {
      colorPrimary: '#6b7280',
      colorBg: '#f9fafb',
      isDarkMode: false
    },
    config: {
      palette: 'neutral',
      stylize: null
    }
  },

  // Paper-like light theme
  'light-paper': {
    name: 'Light Paper',
    seed: {
      colorPrimary: '#78716c',
      colorBg: '#faf5f0',
      isDarkMode: false
    },
    config: {
      palette: 'neutral',
      stylize: null
    }
  }
}

/**
 * All presets combined
 */
export const THEME_PRESETS: Record<string, ThemePreset> = {
  ...DARK_PRESETS,
  ...LIGHT_PRESETS
}

/**
 * Default preset name
 */
export const DEFAULT_PRESET = 'dark-vibrant'

/**
 * Get preset by name
 */
export function getPreset(name: string): ThemePreset | undefined {
  return THEME_PRESETS[name]
}

/**
 * Get all preset names
 */
export function getPresetNames(): string[] {
  return Object.keys(THEME_PRESETS)
}

/**
 * Get dark preset names
 */
export function getDarkPresetNames(): string[] {
  return Object.keys(DARK_PRESETS)
}

/**
 * Get light preset names
 */
export function getLightPresetNames(): string[] {
  return Object.keys(LIGHT_PRESETS)
}

/**
 * Check if preset exists
 */
export function hasPreset(name: string): boolean {
  return name in THEME_PRESETS
}

/**
 * Create custom preset
 */
export function createPreset(
  name: string,
  colorPrimary: string,
  options: {
    colorBg?: string
    isDarkMode?: boolean
    palette?: string
    gradient?: boolean
  } = {}
): ThemePreset {
  const {
    colorBg,
    isDarkMode = false,
    palette = 'vibrant',
    gradient = true
  } = options

  return {
    name,
    seed: {
      colorPrimary,
      colorBg,
      isDarkMode
    },
    config: {
      palette,
      stylize: gradient ? { gradient: true } : null
    }
  }
}

/**
 * Brand color quick presets
 */
export const BRAND_COLORS: Record<string, string> = {
  // Tech companies
  google: '#4285f4',
  facebook: '#1877f2',
  twitter: '#1da1f2',
  github: '#333333',
  microsoft: '#00a4ef',
  apple: '#000000',
  amazon: '#ff9900',
  netflix: '#e50914',
  spotify: '#1db954',
  slack: '#4a154b',

  // Design tools
  figma: '#f24e1e',
  sketch: '#f7b500',
  adobe: '#ff0000',

  // Messaging
  whatsapp: '#25d366',
  telegram: '#0088cc',
  discord: '#5865f2'
}

/**
 * Create preset from brand color
 */
export function createBrandPreset(
  brandName: keyof typeof BRAND_COLORS,
  isDarkMode: boolean = true
): ThemePreset {
  const color = BRAND_COLORS[brandName]
  if (!color) {
    throw new Error(`Unknown brand: ${brandName}`)
  }

  return createPreset(
    `brand-${brandName}`,
    color,
    { isDarkMode, gradient: true }
  )
}
