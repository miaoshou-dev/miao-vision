import type { SvgTheme } from '../themes/types'

export interface PosterTheme {
  background: string
  ink: string
  muted: string
  accent: string
  grid: string
  paper: string
  font: string
  displayFont: string
  svg: SvgTheme
}

export interface PosterThemeDefinition {
  id: string
  label: string
  description: string
  tokens: PosterTheme
  supportedMoods: string[]
  supportedDensities: Array<'compact' | 'balanced' | 'airy'>
}

export const posterEditorialTheme: PosterTheme = {
  background: '#f8f2df',
  paper: '#fffaf0',
  ink: '#171513',
  muted: '#665e53',
  accent: '#ff4b2b',
  grid: '#dfd5bd',
  font: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  displayFont: 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif',
  svg: {
    palette: ['#ff4b2b'],
    background: '#f8f2df',
    axisColor: '#8f8068',
    labelColor: '#665e53'
  }
}

export const POSTER_THEME_REGISTRY: PosterThemeDefinition[] = [
  {
    id: 'editorial-light', label: 'Editorial Light', description: 'Paper-like editorial data poster',
    tokens: posterEditorialTheme, supportedMoods: ['clear', 'general', 'light', 'educational'], supportedDensities: ['balanced', 'airy']
  },
  {
    id: 'atmospheric-dark', label: 'Atmospheric Dark', description: 'Immersive dark poster with restrained texture',
    tokens: { ...posterEditorialTheme, background: '#17352d', paper: '#24483d', ink: '#edf5e8', muted: '#b7d0bf', accent: '#b8dfb1', grid: '#356252', displayFont: 'Georgia, "Times New Roman", serif', svg: { ...posterEditorialTheme.svg, background: '#17352d', axisColor: '#8db6a0', labelColor: '#c6dfcc', palette: ['#b8dfb1'] } },
    supportedMoods: ['atmospheric', 'nature', 'immersive', 'documentary'], supportedDensities: ['balanced', 'airy']
  },
  {
    id: 'newsroom-bold', label: 'Newsroom Bold', description: 'High contrast newsroom visual language',
    tokens: { ...posterEditorialTheme, background: '#101a2b', paper: '#1d2d47', ink: '#f7f1df', muted: '#b7c3d4', accent: '#ffb02e', grid: '#40526e', displayFont: 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif', svg: { ...posterEditorialTheme.svg, background: '#101a2b', axisColor: '#8192ab', labelColor: '#d9e1ed', palette: ['#ffb02e'] } },
    supportedMoods: ['serious', 'authoritative', 'bold', 'newsroom'], supportedDensities: ['compact', 'balanced']
  }
]

export function getPosterTheme(id?: string, override?: { mood?: string; palette?: string; density?: 'compact' | 'balanced' | 'airy' }): PosterTheme {
  const base = POSTER_THEME_REGISTRY.find(theme => theme.id === id)?.tokens ?? posterEditorialTheme
  const moodAccent = override?.mood === 'serious' || override?.mood === 'authoritative' ? '#d64545' : override?.mood === 'playful' || override?.mood === 'energetic' ? '#ff7a45' : override?.mood === 'calm' || override?.mood === 'nature' ? '#5aa67a' : undefined
  const accent = override?.palette === 'warm' ? '#ff7a45' : override?.palette === 'cool' ? '#54b7d9' : override?.palette === 'mono' ? base.ink : moodAccent ?? base.accent
  if (accent === base.accent) return base
  return { ...base, accent, svg: { ...base.svg, palette: [accent] } }
}
