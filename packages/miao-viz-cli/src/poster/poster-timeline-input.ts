import { z } from 'zod'

export const posterTimelineRoles = ['order', 'timeLabel', 'title', 'description', 'era', 'mediaPath', 'source'] as const
export type PosterTimelineRole = typeof posterTimelineRoles[number]

export interface PosterTimelineRoleBindings {
  order: string
  timeLabel: string
  title: string
  description: string
  era?: string
  mediaPath?: string
  source?: string
}

export interface PosterTimelineEvent {
  order: number
  timeLabel: string
  title: string
  description: string
  era?: string
  mediaPath?: string
  source?: string
}

export const posterTimelineRoleBindingsSchema: z.ZodType<PosterTimelineRoleBindings> = z.object({
  order: z.string().min(1), timeLabel: z.string().min(1), title: z.string().min(1), description: z.string().min(1),
  era: z.string().min(1).optional(), mediaPath: z.string().min(1).optional(), source: z.string().min(1).optional()
}).strict()

export const posterTimelineEventSchema: z.ZodType<PosterTimelineEvent> = z.object({
  order: z.number().finite(), timeLabel: z.string().min(1), title: z.string().min(1), description: z.string().min(1),
  era: z.string().optional(), mediaPath: z.string().optional(), source: z.string().optional()
}).strict()

export const posterTimelineInputSchema = z.object({
  roles: posterTimelineRoleBindingsSchema,
  events: z.array(posterTimelineEventSchema).min(1)
}).strict()

export function normalizePosterTimelineRows(rows: Record<string, unknown>[], roles: PosterTimelineRoleBindings): PosterTimelineEvent[] {
  return rows.map(row => ({
    order: Number(row[roles.order]), timeLabel: String(row[roles.timeLabel] ?? ''), title: String(row[roles.title] ?? ''),
    description: String(row[roles.description] ?? ''),
    ...(roles.era ? { era: String(row[roles.era] ?? '') } : {}),
    ...(roles.mediaPath ? { mediaPath: String(row[roles.mediaPath] ?? '') } : {}),
    ...(roles.source ? { source: String(row[roles.source] ?? '') } : {})
  })).sort((a, b) => a.order - b.order)
}

export function validatePosterTimelineRoles(rows: Record<string, unknown>[], roles: Partial<PosterTimelineRoleBindings>): { ok: true; value: PosterTimelineRoleBindings } | { ok: false; missing: PosterTimelineRole[] } {
  const required: PosterTimelineRole[] = ['order', 'timeLabel', 'title', 'description']
  const missing = required.filter(role => !roles[role] || !rows.some(row => Object.prototype.hasOwnProperty.call(row, roles[role]!)))
  return missing.length ? { ok: false, missing } : { ok: true, value: roles as PosterTimelineRoleBindings }
}

export function resolvePosterTimelineMedia(events: PosterTimelineEvent[], existingFiles: Set<string>): { events: PosterTimelineEvent[]; missingMedia: string[] } {
  const missingMedia: string[] = []
  const normalized = events.map(event => {
    if (!event.mediaPath || existingFiles.has(event.mediaPath)) return event
    missingMedia.push(event.mediaPath)
    return { ...event, mediaPath: undefined }
  })
  return { events: normalized, missingMedia }
}
