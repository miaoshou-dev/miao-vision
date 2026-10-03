import { describe, expect, it } from 'vitest'
import { readFileSync, mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { recordFunnelEvent, sanitizeFunnelEvent } from './funnel-events'

describe('anonymous funnel events', () => {
  it('writes a versioned JSONL event without source data', () => {
    const path = join(mkdtempSync(join(tmpdir(), 'miao-funnel-')), 'events.jsonl')
    const event = recordFunnelEvent(path, { name: 'first_report_success', source: 'web', host: 'cli', installMethod: 'npm', durationMs: 1200 })
    expect(event).toMatchObject({ name: 'first_report_success', schemaVersion: 1, durationMs: 1200 })
    expect(readFileSync(path, 'utf8')).not.toContain('sales.csv')
  })

  it('removes unsafe characters from optional diagnostic dimensions', () => {
    expect(sanitizeFunnelEvent({ errorCode: 'FIELD_NOT_FOUND; cat secret', cliVersion: 'v0.6.0\nTOKEN' })).toMatchObject({
      errorCode: 'FIELD_NOT_FOUNDcatsecret', cliVersion: '0.6.0'
    })
  })

  it('accepts Pi as an agent host', () => {
    const path = join(mkdtempSync(join(tmpdir(), 'miao-funnel-')), 'events.jsonl')
    expect(recordFunnelEvent(path, { name: 'install_verify', source: 'npm', host: 'pi', installMethod: 'plugin' }).host).toBe('pi')
  })
})
