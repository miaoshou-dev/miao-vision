import type { InfographicStyle } from '../../article-infographic'

export interface InfographicColorTokens {
  bg: string
  ink: string
  muted: string
  card: string
  accent: string
  line: string
}

const INFOGRAPHIC_PALETTES: Record<string, InfographicColorTokens> = {
  editorial: { bg: '#f7efe2', ink: '#241b16', muted: '#75695d', card: '#fffaf2', accent: '#b64f2a', line: '#dfcdb7' },
  executive: { bg: '#f4f0e8', ink: '#18212f', muted: '#667085', card: '#ffffff', accent: '#1f5d8c', line: '#d7c9b8' },
  minimal: { bg: '#ffffff', ink: '#161616', muted: '#666666', card: '#ffffff', accent: '#111111', line: '#d8d8d8' }
}

export function getInfographicTokens(style: InfographicStyle): InfographicColorTokens {
  return INFOGRAPHIC_PALETTES[style] ?? INFOGRAPHIC_PALETTES.editorial
}
