import { EventEmitter } from 'node:events'
import { reviewEventSchema, type ReviewEvent, type ReviewRunSnapshot, type ReviewRunStatus, now, createRunSnapshot } from './review-events'
import { summarizeRunHistory, type ReviewHistoryItem } from './review-history'

export class ReviewStore {
  private readonly runs = new Map<string, ReviewRunSnapshot>()
  private readonly emitter = new EventEmitter()
  private readonly maxRuns: number

  constructor(maxRuns = 20) {
    this.maxRuns = maxRuns
    this.emitter.setMaxListeners(100)
  }

  create(input: Pick<ReviewRunSnapshot, 'runId' | 'kind' | 'title' | 'parentRunId'>): ReviewRunSnapshot {
    const run = createRunSnapshot(input)
    this.runs.set(run.runId, run)
    this.trim()
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
  }

  on(runId: string, listener: (event: ReviewEvent) => void): () => void {
    this.emitter.on(runId, listener)
    return () => this.emitter.off(runId, listener)
  }

  status(runId: string, status: ReviewRunStatus): void {
    const run = this.runs.get(runId)
    if (!run) throw new Error(`Unknown review run: ${runId}`)
    run.status = status
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
}

export function stageEvent(runId: string, sequence: number, stage: ReviewEvent['stage'], status: Extract<ReviewEvent, { type: 'run.stage' }>['status'], message?: string, code?: string): ReviewEvent {
  return { type: 'run.stage', runId, sequence, timestamp: now(), stage, status, ...(message ? { message } : {}), ...(code ? { code } : {}) }
}
