import type { AgentError, AgentResult } from './types'

export function ok<T>(value: T): AgentResult<T> {
  return { ok: true, value }
}

export function agentError(
  code: string,
  message: string,
  details: Record<string, unknown> = {}
): AgentError {
  return {
    ok: false,
    code,
    message,
    ...details
  }
}

export function isAgentError(value: unknown): value is AgentError {
  return Boolean(value && typeof value === 'object' && (value as AgentError).ok === false)
}
