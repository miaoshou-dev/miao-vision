import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import * as YAML from 'yaml'
import { saveReviewTitle } from './review-title-edit'
import type { ReviewRunSnapshot } from './review-events'

describe('poster title edits', () => {
  it('edits the displayed hero title when the report title differs, preserving evidence and rejecting stale writes', () => {
    const root = mkdtempSync(join(tmpdir(), 'poster-edit-'))
    const source = join(root, 'spec.yaml'), html = join(root, 'poster.html')
    const spec = { title: 'Report metadata', layout: { preset: 'poster' }, poster: { hero: { title: 'Poster title', subtitle: 'Keep subtitle' }, footer: { source: 'Keep source' } }, charts: [] }
    writeFileSync(source, YAML.stringify(spec))
    writeFileSync(html, '<title>Poster title</title><h1>Poster title</h1><p>Keep evidence</p>')
    const run: ReviewRunSnapshot = { runId: 'poster', kind: 'report', title: 'report artifact', status: 'ready', startedAt: new Date().toISOString(), events: [], issues: [], artifact: { type: 'artifact.updated', runId: 'poster', sequence: 0, timestamp: new Date().toISOString(), kind: 'report', primaryPath: html, verified: true, deliveryStatus: 'ready', composition: { sourceSpecPath: source, title: { id: 'title', path: 'title', title: 'Report metadata' }, charts: [], insights: [], evidence: [], poster: [{ id: 'poster-hero-title', kind: 'posterTitle', path: 'poster.hero.title', title: 'Poster title' }] } } }
    const hash = createHash('sha256').update(readFileSync(source)).digest('hex')
    saveReviewTitle(run, 'New <title>', 'Poster title', hash)
    expect(YAML.parse(readFileSync(source, 'utf8'))).toEqual({ ...spec, poster: { ...spec.poster, hero: { ...spec.poster.hero, title: 'New <title>' } } })
    expect(readFileSync(html, 'utf8')).toBe('<title>New &lt;title&gt;</title><h1>New &lt;title&gt;</h1><p>Keep evidence</p>')
    expect(run.artifact?.composition?.poster?.[0].title).toBe('New <title>')
    expect(() => saveReviewTitle(run, 'Stale', 'Poster title', hash)).toThrow()
  })
})
