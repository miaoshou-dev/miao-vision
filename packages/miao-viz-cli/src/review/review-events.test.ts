import { describe, expect, it } from 'vitest'
import { reviewEventSchema } from './review-events'
import { ReviewStore, stageEvent } from './review-store'

describe('review runtime events', () => {
  it('keeps a monotonic event stream and derives run status', () => {
    const store = new ReviewStore()
    store.create({ runId: 'run-1', kind: 'report', title: 'Sales' })
    store.publish(stageEvent('run-1', 0, 'input_resolved', 'completed', 'Input resolved'))
    store.publish(stageEvent('run-1', 1, 'rendered', 'completed', 'Artifact rendered'))
    store.publish({ type: 'run.completed', runId: 'run-1', sequence: 2, timestamp: new Date().toISOString(), status: 'ready' })
    expect(store.get('run-1')).toMatchObject({ status: 'ready', currentStage: 'rendered' })
    expect(store.get('run-1')?.events).toHaveLength(3)
  })

  it('rejects duplicate event sequence numbers', () => {
    const store = new ReviewStore()
    store.create({ runId: 'run-2', kind: 'article', title: 'Article' })
    const event = stageEvent('run-2', 0, 'input_resolved', 'completed')
    store.publish(event)
    expect(() => store.publish(event)).toThrow('sequence must increase')
  })

  it('validates structured issues', () => {
    expect(reviewEventSchema.safeParse({
      type: 'run.issue', runId: 'run-3', sequence: 0,
      timestamp: new Date().toISOString(), severity: 'error',
      code: 'EVIDENCE_PATH_INVALID', message: 'Missing evidence'
    }).success).toBe(true)
  })

  it('accepts evidence coverage on artifact updates', () => {
    const parsed = reviewEventSchema.safeParse({
      type: 'artifact.updated', runId: 'run-4', sequence: 0,
      timestamp: new Date().toISOString(), kind: 'report', primaryPath: '/tmp/report.html',
      verified: false, deliveryStatus: 'needs_review',
      coverage: {
        objectCoverage: 0.8, claimCheckCoverage: 0.5, eligibleObjects: 5, coveredObjects: 4,
        requiredClaimChecks: 2, passedClaimChecks: 1, invalidReferences: 0, failedClaimChecks: 1, empty: false
      },
      evidence: { metricCount: 2, highlightCount: 1, missingCount: 1 }
    })
    expect(parsed.success).toBe(true)
  })
})
