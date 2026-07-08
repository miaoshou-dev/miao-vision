import type { ThemeName, ReportTheme } from './types'
import { standardWhiteTheme } from './standard-white-theme'
import { magazineTheme } from './magazine-theme'
import { standardDarkTheme } from './standard-dark-theme'
import { minimalTheme } from './minimal-theme'
import { nytTheme } from './nyt-theme'
import { bloombergTheme } from './bloomberg-theme'
import { tableauTheme } from './tableau-theme'

const THEMES: Record<ThemeName, ReportTheme> = {
  'standard-white': standardWhiteTheme,
  magazine: magazineTheme,
  'standard-dark': standardDarkTheme,
  minimal: minimalTheme,
  nyt: nytTheme,
  bloomberg: bloombergTheme,
  tableau: tableauTheme
}

const LEGACY_ALIASES: Record<string, ThemeName> = {
  default: 'standard-white',
  editorial: 'magazine',
  dark: 'standard-dark'
}

export function getTheme(name: string | undefined): ReportTheme {
  const resolved = (name && (name in THEMES ? name : LEGACY_ALIASES[name])) ?? 'standard-white'
  return THEMES[resolved as ThemeName]
}

export type { ThemeName, LayoutName, ReportTheme, SvgTheme } from './types'
