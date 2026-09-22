import { describe, expect, it } from 'vitest'
import { resolvePosterStyle } from './poster/poster-style-resolver'
import { POSTER_THEME_REGISTRY } from './poster/poster-theme'

const base = {
  intent: { raw: '', coverage: 'full' as const, assumptions: [], visualTasks: [{ family: 'ranking' as const, confidence: 0.9, rationale: [] }] },
  fields: [], evidence: [], availableCompositions: ['ranked-story', 'comparison-story', 'flow-story'],
  availableThemes: POSTER_THEME_REGISTRY.map(theme => theme.id)
}

describe('poster style resolver', () => {
  it('uses explicit user mood before semantic defaults', () => {
    const result = resolvePosterStyle({ ...base, userBrief: '做成严肃的政策简报', userTheme: 'atmospheric-dark' })
    expect(result.themeId).toBe('atmospheric-dark')
    expect(result.confidence).toBeGreaterThan(0.9)
    expect(result.overrideable).toBe(true)
  })

  it('selects a visual theme from brief cues without business-topic enums', () => {
    const result = resolvePosterStyle({ ...base, userBrief: '做一个权威、适合新闻传播的全球出口额排名' })
    expect(result.themeId).toBe('newsroom-bold')
    expect(result.compositionId).toBe('ranked-story')
    expect(result.rationale.length).toBeGreaterThan(0)
  })

  it('falls back for unknown business topics and reports unknown explicit themes', () => {
    const result = resolvePosterStyle({ ...base, userBrief: '一个全新的小众行业指标', userTheme: 'unknown-topic-theme' })
    expect(result.themeId).toBe('editorial-light')
    expect(result.warnings).toContain("unknown user theme 'unknown-topic-theme'")
  })

  it('chooses flow composition when the brief requests flows', () => {
    const result = resolvePosterStyle({ ...base, userBrief: '展示进出口贸易流向和路径' })
    expect(result.compositionId).toBe('flow-story')
  })

  it('chooses comparison composition when it is available for a comparison brief', () => {
    const result = resolvePosterStyle({ ...base, userBrief: '比较进口和出口', userComposition: undefined, availableCompositions: ['ranked-story', 'comparison-story'], intent: { ...base.intent, visualTasks: [{ family: 'comparison', confidence: 0.9, rationale: [] }] } })
    expect(result.compositionId).toBe('comparison-story')
  })
})
