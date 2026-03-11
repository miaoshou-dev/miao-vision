/**
 * Shared AI Agent Types
 *
 * Common types and interfaces for all AI agents.
 * Provides a unified foundation for agent development.
 *
 * @module core/ai/agents/shared/types
 */

import type { LLMProvider, ChatMessage, CompletionOptions } from '../../types'

// Re-export commonly used types
export type { LLMProvider, ChatMessage, CompletionOptions }

/**
 * Agent execution phase for streaming progress
 */
export interface AgentPhase {
  name: string
  description: string
  progress: number // 0-100
}

/**
 * Streaming progress update
 */
export interface StreamProgress<T = unknown> {
  phase: string
  progress: number
  message?: string
  data?: Partial<T>
  done?: boolean
}

/**
 * Agent configuration
 */
export interface AgentConfig {
  /** LLM provider instance */
  provider: LLMProvider
  /** Temperature for generation (0-2) */
  temperature?: number
  /** Maximum tokens */
  maxTokens?: number
  /** Enable verbose logging */
  verbose?: boolean
  /** Language preference */
  language?: 'zh' | 'en'
}

/**
 * Agent evaluation metrics base
 */
export interface EvalMetrics {
  /** Overall score 0-100 */
  score: number
  /** Breakdown by dimension */
  dimensions: Record<string, number>
  /** Optional feedback */
  feedback?: string
}

/**
 * Base Agent interface
 *
 * All agents should implement this interface for consistency.
 */
export interface Agent<TInput, TOutput> {
  /** Agent identifier */
  readonly name: string
  /** Agent version */
  readonly version: string

  /**
   * Execute the agent synchronously
   */
  execute(input: TInput): Promise<TOutput>

  /**
   * Execute with streaming progress
   */
  stream(input: TInput): AsyncGenerator<StreamProgress<TOutput>, TOutput, unknown>

  /**
   * Get current configuration
   */
  getConfig(): AgentConfig

  /**
   * Update LLM provider
   */
  setProvider(provider: LLMProvider): void

  /**
   * Check if agent is ready
   */
  isReady(): boolean
}

/**
 * Multi-phase agent interface
 *
 * For agents that have distinct processing phases.
 */
export interface MultiPhaseAgent<TInput, TOutput> extends Agent<TInput, TOutput> {
  /** Get phase definitions */
  getPhases(): AgentPhase[]

  /** Execute a specific phase (for debugging/testing) */
  executePhase<T>(phaseName: string, input: unknown): Promise<T>
}

/**
 * Result wrapper with success/error handling
 */
export interface AgentResult<T> {
  success: boolean
  data?: T
  error?: string
  metadata?: {
    duration: number
    tokensUsed?: number
    model?: string
  }
}

/**
 * Create a successful result
 */
export function ok<T>(data: T, metadata?: AgentResult<T>['metadata']): AgentResult<T> {
  return { success: true, data, metadata }
}

/**
 * Create an error result
 */
export function err<T>(error: string): AgentResult<T> {
  return { success: false, error }
}
