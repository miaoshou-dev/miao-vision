import { appendFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'

export const funnelEventNames = [
  'landing_view', 'example_open', 'install_click', 'install_verify',
  'first_report_start', 'first_report_success', 'first_report_failure', 'repeat_report_start'
] as const
export type FunnelEventName = typeof funnelEventNames[number]
export const funnelEventSchema = z.object({
  name: z.enum(funnelEventNames), eventId: z.string().uuid(), occurredAt: z.string().datetime(),
  source: z.enum(['web', 'github', 'npm', 'community', 'unknown']),
  host: z.enum(['codex', 'claude-code', 'openclaw', 'pi', 'cli', 'unknown']),
  installMethod: z.enum(['plugin', 'npm', 'skill', 'unknown']),
  cliVersion: z.string().optional(), errorCode: z.string().optional(), durationMs: z.number().int().nonnegative().optional(),
  schemaVersion: z.literal(1)
})
export type FunnelEvent = z.infer<typeof funnelEventSchema>

export interface FunnelEventInput extends Omit<FunnelEvent, 'eventId' | 'occurredAt' | 'schemaVersion'> {
  eventId?: string
  occurredAt?: string
}

export function createFunnelEvent(input: FunnelEventInput): FunnelEvent {
  return funnelEventSchema.parse({
    ...input, eventId: input.eventId ?? randomUUID(), occurredAt: input.occurredAt ?? new Date().toISOString(), schemaVersion: 1
  })
}

export function recordFunnelEvent(path: string, input: FunnelEventInput): FunnelEvent {
  const event = createFunnelEvent(input)
  mkdirSync(dirname(path), { recursive: true })
  appendFileSync(path, `${JSON.stringify(event)}\n`, 'utf8')
  return event
}

export function sanitizeFunnelEvent(input: Partial<FunnelEventInput>): FunnelEventInput {
  return {
    name: input.name ?? 'landing_view', source: input.source ?? 'unknown', host: input.host ?? 'unknown',
    installMethod: input.installMethod ?? 'unknown',
    ...(input.cliVersion ? { cliVersion: input.cliVersion.replace(/[^0-9.]/g, '').slice(0, 32) } : {}),
    ...(input.errorCode ? { errorCode: input.errorCode.replace(/[^A-Z0-9_]/gi, '').slice(0, 80) } : {}),
    ...(input.durationMs !== undefined && Number.isFinite(input.durationMs) ? { durationMs: Math.max(0, Math.round(input.durationMs)) } : {})
  }
}
