import type { ReviewRunSnapshot } from './review-events'

export interface ReviewHistoryItem {
  runId: string
  parentRunId?: string
  kind: ReviewRunSnapshot['kind']
  title: string
  status: ReviewRunSnapshot['status']
  startedAt: string
  finishedAt?: string
  durationMs?: number
  artifact?: {
    primaryPath: string
    format?: string
    verified: boolean
    deliveryStatus: string
    specHash?: string
    dataFingerprint?: string
  }
}

export function summarizeRunHistory(run: ReviewRunSnapshot): ReviewHistoryItem {
  const end = run.finishedAt ? Date.parse(run.finishedAt) : undefined
  const start = Date.parse(run.startedAt)
  return {
    runId: run.runId,
    ...(run.parentRunId ? { parentRunId: run.parentRunId } : {}),
    kind: run.kind,
    title: run.title,
    status: run.status,
    startedAt: run.startedAt,
    ...(run.finishedAt ? { finishedAt: run.finishedAt } : {}),
    ...(end !== undefined && Number.isFinite(start) ? { durationMs: Math.max(0, end - start) } : {}),
    ...(run.artifact ? {
      artifact: {
        primaryPath: run.artifact.primaryPath,
        ...(run.artifact.delivery ? { format: run.artifact.delivery.format } : {}),
        verified: run.artifact.verified,
        deliveryStatus: run.artifact.deliveryStatus,
        ...(run.artifact.fingerprints ? run.artifact.fingerprints : {})
      }
    } : {})
  }
}
