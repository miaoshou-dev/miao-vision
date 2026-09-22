import { describe, expect, it } from 'vitest'
import { createRunSnapshot, type ReviewRunSnapshot } from './review-events'
import { artifactSpecMap, batchSummary, revisionActions, visualDiff } from './review-p2'

const hash = 'a'.repeat(64)
function run(id: string, parentRunId?: string): ReviewRunSnapshot {
  const value = createRunSnapshot({ runId: id, kind: 'report', title: id, ...(parentRunId ? { parentRunId } : {}) })
  value.artifact = {
    type: 'artifact.updated', runId: id, sequence: 0, timestamp: new Date().toISOString(), kind: 'report',
    primaryPath: `/tmp/${id}.html`, verified: false, deliveryStatus: 'needs_review',
    composition: { charts: [{ id: 'sales', type: 'bar', hash, path: 'charts[0]', evidenceIds: ['total'] }], insights: [], evidence: [] }
  }
  return value
}

describe('review P2 projections', () => {
  it('maps artifact nodes to spec paths and creates revision prompts', () => {
    const value = run('new', 'old')
    expect(artifactSpecMap(value)).toMatchObject({ items: [{ kind: 'chart', path: 'charts[0]', evidenceIds: ['total'] }] })
    expect(revisionActions(value, run('old'))).toMatchObject({ actions: expect.arrayContaining([expect.objectContaining({ id: 'verify-evidence' })]) })
  })

  it('returns visual comparison URLs and batch counts', () => {
    expect(visualDiff(run('new', 'old'), run('old'))).toMatchObject({ comparable: true, beforeUrl: '/artifacts/old/primary', afterUrl: '/artifacts/new/primary' })
    expect(batchSummary([run('one'), run('two')])).toMatchObject({ counts: { total: 2, pending: 2 } })
  })
})
