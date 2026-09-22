import { describe, expect, it } from 'vitest'
import { resolveGeoPosterCapability } from './poster-geo-capability'

const base = { chartId: 'geo', hero: { title: 'Geo' }, footer: { source: 'local' }, canvas: { width: 800, height: 1000 } }

describe('geo poster capability', () => {
  it('falls back deterministically when no local map resource exists', () => {
    const result = resolveGeoPosterCapability(base)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toMatchObject({ compositionId: 'geo-ranking-story', status: 'fallback' })
  })

  it('blocks unregistered map resources with a repair hint', () => {
    const result = resolveGeoPosterCapability({ ...base, geo: { resourcePath: './map.geojson' } })
    expect(result).toMatchObject({ ok: false, code: 'GEO_MAP_NOT_REGISTERED', fallback: 'geo-ranking-story' })
  })
})
