import { describe, expect, it } from 'vitest'
import { normalizePosterTimelineRows, posterTimelineInputSchema, resolvePosterTimelineMedia, validatePosterTimelineRoles } from './poster-timeline-input'
import { reportSpecSchema } from '../spec-schema'

const rows = [
  { year: '1900', name: 'Origin', body: 'First event' },
  { year: '2000', name: 'Modern', body: 'Second event' }
]

describe('poster timeline input contract', () => {
  it('requires explicit role bindings and sorts by order', () => {
    const roles = { order: 'year', timeLabel: 'year', title: 'name', description: 'body' }
    expect(validatePosterTimelineRoles(rows, roles)).toMatchObject({ ok: true })
    const events = normalizePosterTimelineRows([...rows].reverse(), roles)
    expect(events.map(event => event.title)).toEqual(['Origin', 'Modern'])
  })

  it('reports missing required roles without guessing columns', () => {
    expect(validatePosterTimelineRoles(rows, { order: 'year', title: 'name' })).toEqual({ ok: false, missing: ['timeLabel', 'description'] })
  })

  it('validates events and deterministically degrades missing local media', () => {
    const parsed = posterTimelineInputSchema.safeParse({ roles: { order: 'year', timeLabel: 'year', title: 'name', description: 'body' }, events: normalizePosterTimelineRows(rows, { order: 'year', timeLabel: 'year', title: 'name', description: 'body' }) })
    expect(parsed.success).toBe(true)
    const media = resolvePosterTimelineMedia([{ ...parsed.success ? parsed.data.events[0] : { order: 1, timeLabel: 'x', title: 'x', description: 'x' }, mediaPath: '/tmp/missing.png' }], new Set())
    expect(media.missingMedia).toEqual(['/tmp/missing.png'])
    expect(media.events[0].mediaPath).toBeUndefined()
  })

  it('accepts explicit poster.timeline role bindings in the public spec', () => {
    const result = reportSpecSchema.safeParse({ layout: { preset: 'poster' }, poster: {
      template: 'data-poster-ranking', chartId: 'chart', hero: { title: 'Timeline' }, footer: { source: 'local' },
      timeline: { roles: { order: 'year', timeLabel: 'year', title: 'name', description: 'body' } }
    }, charts: [{ id: 'chart', type: 'bar', encoding: { x: { field: 'year' }, y: { field: 'year' } } }] })
    expect(result.success).toBe(true)
  })
})
