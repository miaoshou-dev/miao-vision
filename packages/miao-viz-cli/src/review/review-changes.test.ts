import { describe, expect, it } from 'vitest'
import { createRunSnapshot, type ReviewRunSnapshot } from './review-events'
import { summarizeReviewChanges } from './review-changes'

const hash = (char: string) => char.repeat(64)

function run(runId: string, parentRunId?: string): ReviewRunSnapshot {
  const value = createRunSnapshot({ runId, kind: 'report', title: runId, ...(parentRunId ? { parentRunId } : {}) })
  value.artifact = {
    type: 'artifact.updated', runId, sequence: 0, timestamp: new Date().toISOString(), kind: 'report',
    primaryPath: `/tmp/${runId}.html`, verified: true, deliveryStatus: 'ready',
    fingerprints: { specHash: hash(runId === 'old' ? 'a' : 'b'), dataFingerprint: hash('d') },
    composition: {
      theme: runId === 'old' ? 'minimal' : 'magazine',
      charts: runId === 'old' ? [{ id: 'sales', type: 'bar', hash: hash('a') }] : [{ id: 'sales', type: 'bar', hash: hash('b') }, { id: 'trend', type: 'line', hash: hash('c') }],
      insights: [], evidence: []
    }
  }
  return value
}

describe('review change summary', () => {
  it('compares a revision with its parent', () => {
    expect(summarizeReviewChanges(run('new', 'old'), run('old'))).toMatchObject({
      comparable: true, specChanged: true, dataChanged: false,
      theme: { before: 'minimal', after: 'magazine', changed: true },
      charts: { added: ['trend'], removed: [], modified: ['sales'] }
    })
  })
})
