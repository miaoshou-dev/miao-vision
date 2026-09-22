import type { ReviewRunSnapshot } from './review-events'

export interface ReviewChangeSummary {
  runId: string
  parentRunId?: string
  comparable: boolean
  theme?: { before?: string; after?: string; changed: boolean }
  dataChanged?: boolean
  specChanged?: boolean
  charts: { added: string[]; removed: string[]; modified: string[] }
  insights: { added: string[]; removed: string[]; modified: string[] }
  evidence: { added: string[]; removed: string[]; modified: string[] }
}

export function summarizeReviewChanges(run: ReviewRunSnapshot, parent?: ReviewRunSnapshot): ReviewChangeSummary {
  const current = run.artifact
  const previous = parent?.artifact
  const comparable = Boolean(current?.composition && previous?.composition)
  return {
    runId: run.runId,
    ...(run.parentRunId ? { parentRunId: run.parentRunId } : {}),
    comparable,
    ...(comparable ? {
      theme: {
        ...(previous?.composition?.theme ? { before: previous.composition.theme } : {}),
        ...(current?.composition?.theme ? { after: current.composition.theme } : {}),
        changed: previous?.composition?.theme !== current?.composition?.theme
      },
      dataChanged: previous?.fingerprints?.dataFingerprint !== current?.fingerprints?.dataFingerprint,
      specChanged: previous?.fingerprints?.specHash !== current?.fingerprints?.specHash,
      charts: diffEntries(previous?.composition?.charts ?? [], current?.composition?.charts ?? []),
      insights: diffEntries(previous?.composition?.insights ?? [], current?.composition?.insights ?? []),
      evidence: diffEntries(previous?.composition?.evidence ?? [], current?.composition?.evidence ?? [])
    } : { charts: emptyDiff(), insights: emptyDiff(), evidence: emptyDiff() })
  }
}

function diffEntries(before: Array<{ id: string; hash: string }>, after: Array<{ id: string; hash: string }>): { added: string[]; removed: string[]; modified: string[] } {
  const left = new Map(before.map(item => [item.id, item.hash]))
  const right = new Map(after.map(item => [item.id, item.hash]))
  return {
    added: [...right.keys()].filter(id => !left.has(id)),
    removed: [...left.keys()].filter(id => !right.has(id)),
    modified: [...right.keys()].filter(id => left.has(id) && left.get(id) !== right.get(id))
  }
}

function emptyDiff(): { added: string[]; removed: string[]; modified: string[] } {
  return { added: [], removed: [], modified: [] }
}
