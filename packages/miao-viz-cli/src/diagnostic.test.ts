import { describe, expect, it } from 'vitest'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { diagnoseEnvironment } from './diagnostic'
import packageJson from '../package.json'

describe('environment diagnostics', () => {
  it('returns safe metadata and a first-report action for a healthy environment', () => {
    const root = mkdtempSync(join(tmpdir(), 'miao-viz-diagnose-'))
    const input = join(root, 'sales.csv')
    writeFileSync(input, 'month,sales\n2026-01,1\n')
    const result = diagnoseEnvironment({ input, output: root, host: 'cli' })
    expect(result).toMatchObject({ ok: true, value: { executable: expect.any(String), cliVersion: packageJson.version, input: { readable: true }, output: { writable: true } } })
    expect(JSON.stringify(result)).not.toContain('month,sales')
  })

  it('distinguishes missing input files with a retryable action', () => {
    const root = mkdtempSync(join(tmpdir(), 'miao-viz-diagnose-'))
    mkdirSync(join(root, 'out'))
    const result = diagnoseEnvironment({ input: join(root, 'missing.csv'), output: join(root, 'out'), host: 'cli' })
    expect(result).toMatchObject({ ok: false, code: 'FILE_NOT_FOUND', nextActions: [{ safeToRetry: true }] })
  })
})
