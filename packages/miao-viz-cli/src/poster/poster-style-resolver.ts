import type { AnalyzeEvidence, AnalyzeField, AnalyzeIntent } from '../context-schema'

export interface PosterStyleInput {
  userBrief?: string
  intent: AnalyzeIntent
  fields: AnalyzeField[]
  evidence: AnalyzeEvidence[]
  availableCompositions: string[]
  availableThemes: string[]
  userTheme?: string
  userComposition?: string
}

export interface PosterStyleDecision {
  compositionId: string
  themeId: string
  rationale: string[]
  confidence: number
  overrideable: boolean
  warnings?: string[]
}

const moodKeywords: Array<[string, string[]]> = [
  ['newsroom-bold', ['严肃', '权威', '政策', '新闻', 'serious', 'authoritative', 'policy', 'news']],
  ['atmospheric-dark', ['自然', '沉浸', '纪录片', '环保', 'nature', 'immersive', 'documentary', 'environment']],
  ['editorial-light', ['清晰', '科普', '教育', '简洁', 'clear', 'educational', 'simple']]
]

export function resolvePosterStyle(input: PosterStyleInput): PosterStyleDecision {
  const brief = `${input.userBrief ?? ''} ${input.intent.raw}`.toLowerCase()
  const rationale: string[] = []
  const warnings: string[] = []
  const composition = input.userComposition && input.availableCompositions.includes(input.userComposition)
    ? input.userComposition
    : chooseComposition(input, brief, rationale)
  let theme = input.userTheme && input.availableThemes.includes(input.userTheme) ? input.userTheme : ''
  if (input.userTheme && !theme) warnings.push(`unknown user theme '${input.userTheme}'`)
  if (!theme) theme = chooseTheme(input.availableThemes, brief, rationale)
  if (!theme) {
    theme = input.availableThemes[0] ?? 'editorial-light'
    rationale.push('no registered theme matched; used default fallback')
  }
  const confidence = input.userTheme || input.userComposition ? 0.98 : Math.min(0.95, 0.62 + (input.fields.length > 0 ? 0.12 : 0) + (input.evidence.length > 0 ? 0.12 : 0))
  return { compositionId: composition, themeId: theme, rationale, confidence, overrideable: true, ...(warnings.length ? { warnings } : {}) }
}

function chooseComposition(input: PosterStyleInput, brief: string, rationale: string[]): string {
  const candidates = input.availableCompositions
  const intent = input.intent.visualTasks?.[0]?.family
  const preferred = intent === 'geo' || /地图|地理|map|geographic/.test(brief) ? 'geo-ranking-story'
    : intent === 'flow' || /流向|流程|贸易流|flow|process/.test(brief) ? 'flow-story'
      : intent === 'comparison' || /对比|比较|compare|versus/.test(brief) ? 'comparison-story' : 'ranked-story'
  if (candidates.includes(preferred)) {
    rationale.push(`selected ${preferred} from user intent and data shape`)
    return preferred
  }
  const fallback = candidates.includes('ranked-story') ? 'ranked-story' : candidates[0] ?? 'ranked-story'
  rationale.push(`selected ${fallback} as the closest available composition`)
  return fallback
}

function chooseTheme(available: string[], brief: string, rationale: string[]): string {
  for (const [id, keywords] of moodKeywords) {
    if (available.includes(id) && keywords.some(keyword => brief.includes(keyword))) {
      rationale.push(`matched ${id} from brief mood and audience cues`)
      return id
    }
  }
  const defaultTheme = available.includes('editorial-light') ? 'editorial-light' : available[0]
  if (defaultTheme) rationale.push(`used ${defaultTheme} because no explicit visual mood was found`)
  return defaultTheme ?? ''
}
