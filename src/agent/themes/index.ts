import type { ThemeName, ReportTheme } from './types'
import { defaultTheme } from './default-theme'
import { editorialTheme } from './editorial-theme'
import { darkTheme } from './dark-theme'
import { minimalTheme } from './minimal-theme'

const THEMES: Record<ThemeName, ReportTheme> = {
  default: defaultTheme,
  editorial: editorialTheme,
  dark: darkTheme,
  minimal: minimalTheme
}

export function getTheme(name: string | undefined): ReportTheme {
  if (name && name in THEMES) return THEMES[name as ThemeName]
  return THEMES.default
}

export type { ThemeName, LayoutName, ReportTheme, SvgTheme } from './types'
