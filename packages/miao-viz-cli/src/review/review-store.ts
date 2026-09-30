import { EventEmitter } from 'node:events'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { reviewEventSchema, type ReviewEvent, type ReviewRunSnapshot, type ReviewRunStatus, now, createRunSnapshot } from './review-events'
import { summarizeRunHistory, type ReviewHistoryItem } from './review-history'
import type { RevisionPlan, RevisionRequest } from './review-revision'

export interface StoredRevision { request: RevisionRequest, plan: RevisionPlan }

export class ReviewStore {
  private readonly runs = new Map<string, ReviewRunSnapshot>()
  private readonly revisions = new Map<string, StoredRevision>()
  private readonly emitter = new EventEmitter()
  private readonly maxRuns: number
  private readonly persistencePath?: string

  constructor(maxRuns = 20, persistencePath?: string) {
    this.maxRuns = maxRuns
    this.persistencePath = persistencePath
    this.emitter.setMaxListeners(100)
    this.restore()
  }

  create(input: Pick<ReviewRunSnapshot, 'runId' | 'kind' | 'title' | 'parentRunId'>): ReviewRunSnapshot {
    const run = createRunSnapshot(input)
    this.runs.set(run.runId, run)
    this.trim()
    this.persist()
    return this.snapshot(run.runId)!
  }

  get(runId: string): ReviewRunSnapshot | undefined {
    return this.snapshot(runId)
  }

  list(): ReviewRunSnapshot[] {
    return [...this.runs.values()].map(run => this.snapshot(run.runId)!).reverse()
  }

  history(): ReviewHistoryItem[] {
    return this.list().map(summarizeRunHistory)
  }

  saveRevision(request: RevisionRequest, plan: RevisionPlan): StoredRevision {
    const revision = { request: structuredClone(request), plan: structuredClone(plan) }
    this.revisions.set(request.revisionId, revision)
    this.persist()
    return structuredClone(revision)
  }

  revision(revisionId: string): StoredRevision | undefined {
    const revision = this.revisions.get(revisionId)
    return revision ? structuredClone(revision) : undefined
  }

  updateRevision(revisionId: string, plan: RevisionPlan): StoredRevision | undefined {
    const revision = this.revisions.get(revisionId)
    if (!revision) return undefined
    revision.plan = structuredClone(plan)
    this.persist()
    return structuredClone(revision)
  }

  publish(event: ReviewEvent): void {
    const parsed = reviewEventSchema.parse(event)
    const run = this.runs.get(parsed.runId)
    if (!run) throw new Error(`Unknown review run: ${parsed.runId}`)
    const lastSequence = run.events.at(-1)?.sequence ?? -1
    if (parsed.sequence <= lastSequence) throw new Error(`Review event sequence must increase for ${parsed.runId}`)
    run.events.push(parsed)
    if (parsed.type === 'run.stage') {
      run.currentStage = parsed.stage
      run.status = parsed.status === 'failed' ? 'failed' : parsed.status === 'completed' ? 'running' : 'running'
    } else if (parsed.type === 'artifact.updated') {
      run.artifact = parsed
    } else if (parsed.type === 'run.issue') {
      run.issues.push(parsed)
      if (parsed.severity === 'error') run.status = 'failed'
      else if (run.status !== 'failed') run.status = 'warning'
    } else if (parsed.type === 'run.completed') {
      run.status = parsed.status
      run.finishedAt = parsed.timestamp
    }
    this.emitter.emit(parsed.runId, parsed)
    this.persist()
  }

  on(runId: string, listener: (event: ReviewEvent) => void): () => void {
    this.emitter.on(runId, listener)
    return () => this.emitter.off(runId, listener)
  }

  status(runId: string, status: ReviewRunStatus): void {
    const run = this.runs.get(runId)
    if (!run) throw new Error(`Unknown review run: ${runId}`)
    run.status = status
    this.persist()
  }

  private snapshot(runId: string): ReviewRunSnapshot | undefined {
    const run = this.runs.get(runId)
    return run ? structuredClone(run) : undefined
  }

  private trim(): void {
    while (this.runs.size > this.maxRuns) {
      const first = this.runs.keys().next().value
      if (first) this.runs.delete(first)
    }
  }

  private restore(): void {
    if (!this.persistencePath || !existsSync(this.persistencePath)) return
    try {
      const raw = JSON.parse(readFileSync(this.persistencePath, 'utf8')) as ReviewRunSnapshot[] | { runs?: ReviewRunSnapshot[], revisions?: StoredRevision[] }
      const stored = Array.isArray(raw) ? raw : raw.runs ?? []
      for (const run of stored.slice(-this.maxRuns)) {
        if (!run || typeof run.runId !== 'string' || !['report', 'deck', 'article'].includes(run.kind) || !Array.isArray(run.events)) continue
        if (run.events.some(event => !reviewEventSchema.safeParse(event).success)) continue
        this.runs.set(run.runId, run)
      }
      if (!Array.isArray(raw)) for (const revision of raw.revisions ?? []) {
        if (revision?.request?.revisionId && revision?.plan?.revisionId === revision.request.revisionId) this.revisions.set(revision.request.revisionId, revision)
      }
    } catch { /* A corrupt review cache must not prevent rendering. */ }
  }

  private persist(): void {
    if (!this.persistencePath) return
    try {
      mkdirSync(dirname(this.persistencePath), { recursive: true })
      const temporary = `${this.persistencePath}.tmp`
      writeFileSync(temporary, JSON.stringify({ runs: [...this.runs.values()], revisions: [...this.revisions.values()] }), 'utf8')
      renameSync(temporary, this.persistencePath)
    } catch { /* Review history is optional and must not fail the CLI workflow. */ }
  }
}

export function stageEvent(runId: string, sequence: number, stage: Extract<ReviewEvent, { type: 'run.stage' }>['stage'], status: Extract<ReviewEvent, { type: 'run.stage' }>['status'], message?: string, code?: string): ReviewEvent {
  return { type: 'run.stage', runId, sequence, timestamp: now(), stage, status, ...(message ? { message } : {}), ...(code ? { code } : {}) }
}
