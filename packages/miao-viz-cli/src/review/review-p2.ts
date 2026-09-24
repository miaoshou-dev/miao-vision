import type { ReviewRunSnapshot } from './review-events'
import { summarizeReviewChanges } from './review-changes'

export function artifactSpecMap(run: ReviewRunSnapshot): unknown {
  const composition = run.artifact?.composition
  return {
    runId: run.runId,
    sourceSpecPath: composition?.sourceSpecPath,
    items: [
      ...(composition?.title ? [{ kind: 'title', ...composition.title }] : []),
      ...(composition?.slides ?? []).flatMap(item => [
        { kind: 'slide', ...item },
        ...(item.title ? [{ kind: 'slideTitle', id: `${item.id}-title`, path: `${item.path}.title`, title: item.title, slideIndex: item.slideIndex }] : []),
        ...(item.claim ? [{ kind: 'slideClaim', id: `${item.id}-claim`, path: `${item.path}.claim`, title: item.claim, slideIndex: item.slideIndex }] : []),
        ...(item.charts ?? []).map(chart => ({ kind: 'chart', ...chart, slideIndex: item.slideIndex }))
      ]),
      ...(composition?.charts ?? []).map(item => ({ kind: 'chart', ...item })),
      ...(composition?.insights ?? []).map(item => ({ kind: 'insight', ...item })),
      ...(composition?.evidence ?? []).map(item => ({ kind: 'evidence', ...item }))
    ]
  }
}

export function revisionActions(run: ReviewRunSnapshot, parent?: ReviewRunSnapshot): unknown {
  const changes = summarizeReviewChanges(run, parent)
  const actions: Array<{ id: string; label: string; prompt: string }> = []
  for (const issue of run.issues) actions.push({
    id: `fix-${issue.code.toLowerCase()}`, label: `Fix ${issue.code}`,
    prompt: `Revise Miao Vision run ${run.runId}. Fix ${issue.code}: ${issue.message}. Preserve verified evidence and rerun validation before rendering.`
  })
  if (run.artifact?.verified !== true) actions.push({
    id: 'verify-evidence', label: 'Repair evidence',
    prompt: `Revise Miao Vision run ${run.runId}. Repair missing or failed evidence references, keep claims grounded in context evidence, then run spec validate --verify.`
  })
  actions.push({
    id: 'refine-visual', label: 'Refine selected visual',
    prompt: `Revise Miao Vision run ${run.runId}. Inspect the selected chart or insight through its Spec path, improve its visual hierarchy without changing the underlying data, then render as a child of this run.`
  })
  return { runId: run.runId, parentRunId: run.parentRunId, changes, actions }
}

export function visualDiff(run: ReviewRunSnapshot, parent?: ReviewRunSnapshot): unknown {
  return {
    runId: run.runId, parentRunId: run.parentRunId, comparable: Boolean(parent?.artifact && run.artifact),
    beforeUrl: parent?.artifact ? `/artifacts/${encodeURIComponent(parent.runId)}/primary` : undefined,
    afterUrl: run.artifact ? `/artifacts/${encodeURIComponent(run.runId)}/primary` : undefined,
    structural: summarizeReviewChanges(run, parent)
  }
}

export function batchSummary(runs: ReviewRunSnapshot[]): unknown {
  const counts = { total: runs.length, pending: 0, running: 0, ready: 0, warning: 0, failed: 0 }
  for (const run of runs) counts[run.status] += 1
  return { counts, runs: runs.map(run => ({ runId: run.runId, title: run.title, kind: run.kind, status: run.status, startedAt: run.startedAt, issueCount: run.issues.length })) }
}
