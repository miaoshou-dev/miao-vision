import type { CliArgs } from '../cli-utils'
import type { ReviewEvent, ReviewStage } from './review-events'

export interface ReviewPublisher {
  readonly runId: string
  hasStage(stage: ReviewStage): Promise<boolean>
  publish(event: Omit<ReviewEvent, 'runId' | 'sequence' | 'timestamp'>): Promise<void>
}

export function reviewPublisherFromArgs(args: CliArgs, kind: 'report' | 'deck' | 'article', title: string): ReviewPublisher | undefined {
  const baseUrl = typeof args.flags['review-url'] === 'string' ? args.flags['review-url'] : undefined
  if (!baseUrl) return undefined
  const runId = typeof args.flags['review-run-id'] === 'string' ? args.flags['review-run-id'] : `run-${Date.now()}`
  const parentRunId = typeof args.flags['review-parent-run-id'] === 'string' ? args.flags['review-parent-run-id'] : undefined
  const publisher = new HttpReviewPublisher(baseUrl, runId)
  publisher.start(kind, title, parentRunId)
  return publisher
}

class HttpReviewPublisher implements ReviewPublisher {
  private sequence = 0
  private readonly stages = new Set<ReviewStage>()
  private ready: Promise<void> = Promise.resolve()
  constructor(private readonly baseUrl: string, public readonly runId: string) {}

  start(kind: 'report' | 'deck' | 'article', title: string, parentRunId?: string): void {
    this.ready = this.prepare(kind, title, parentRunId)
  }

  async hasStage(stage: ReviewStage): Promise<boolean> {
    await this.ready
    return this.stages.has(stage)
  }

  private async prepare(kind: 'report' | 'deck' | 'article', title: string, parentRunId?: string): Promise<void> {
    try {
      const response = await fetch(new URL(`/api/runs/${encodeURIComponent(this.runId)}`, this.baseUrl))
      if (response.ok) {
        const body = await response.json() as { value?: { events?: ReviewEvent[] } }
        const events = body.value?.events ?? []
        this.sequence = (events.at(-1)?.sequence ?? -1) + 1
        for (const event of events) if (event.type === 'run.stage') this.stages.add(event.stage)
        return
      }
    } catch {
      // Fall through to creation. Review connectivity never affects the CLI command.
    }
    await this.create(kind, title, parentRunId)
  }

  private async create(kind: 'report' | 'deck' | 'article', title: string, parentRunId?: string): Promise<void> {
    await this.post('/api/runs', { runId: this.runId, kind, title, ...(parentRunId ? { parentRunId } : {}) })
  }

  async publish(event: Omit<ReviewEvent, 'runId' | 'sequence' | 'timestamp'>): Promise<void> {
    await this.ready
    await this.post(`/api/runs/${encodeURIComponent(this.runId)}/events`, {
      ...event, runId: this.runId, sequence: this.sequence++, timestamp: new Date().toISOString()
    })
    if (event.type === 'run.stage') this.stages.add(event.stage)
  }

  private async post(path: string, payload: unknown): Promise<void> {
    try {
      await fetch(new URL(path, this.baseUrl), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) })
    } catch {
      // Review is an observability sidecar. A stopped viewer must never fail a render.
    }
  }
}

export async function publishStageOnce(publisher: ReviewPublisher | undefined, event: ReturnType<typeof stage>): Promise<void> {
  if (!publisher || await publisher.hasStage(event.stage)) return
  await publisher.publish(event)
}

export function stage(stage: ReviewStage, status: 'pending' | 'running' | 'completed' | 'warning' | 'failed' | 'skipped', message?: string, code?: string): Omit<ReviewEvent, 'runId' | 'sequence' | 'timestamp'> {
  return { type: 'run.stage', stage, status, ...(message ? { message } : {}), ...(code ? { code } : {}) }
}
