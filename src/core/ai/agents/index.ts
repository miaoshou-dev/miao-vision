/**
 * AI Agents Module
 *
 * Independent AI agents for different tasks.
 * Each agent has its own prompts, types, and processing logic.
 *
 * @module core/ai/agents
 *
 * @example
 * ```typescript
 * import { createInfographicAgent } from '@core/ai/agents'
 *
 * const agent = createInfographicAgent({ provider })
 * const result = await agent.run({ article: '...' })
 * ```
 */

// Shared types
export * from './shared'

// Infographic Agent
export * from './infographic'
