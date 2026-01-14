/**
 * DeepSeek LLM Provider
 *
 * Implements the LLMProvider interface for DeepSeek API.
 * DeepSeek uses OpenAI-compatible API format.
 *
 * @module core/ai/providers/deepseek
 */

import type {
  LLMProvider,
  LLMProviderType,
  ChatMessage,
  CompletionOptions,
  CompletionResponse,
  StreamChunk,
  ProviderConfig
} from '../types'

// Use proxy to bypass CORS
// - Development: Vite dev server proxy
// - Production: Vercel API route
const DEFAULT_BASE_URL = import.meta.env.DEV
  ? '/api/deepseek'  // Vite dev server proxy
  : '/api/llm'       // Vercel API route proxy
const DEFAULT_MODEL = 'deepseek-chat'

/**
 * DeepSeek API request body
 */
interface DeepSeekRequest {
  model: string
  messages: Array<{ role: string; content: string }>
  temperature?: number
  max_tokens?: number
  stop?: string[]
  stream?: boolean
}

/**
 * DeepSeek API response
 */
interface DeepSeekResponse {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

/**
 * DeepSeek streaming chunk
 */
interface DeepSeekStreamChunk {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    delta: {
      role?: string
      content?: string
    }
    finish_reason: string | null
  }>
}

/**
 * DeepSeek LLM Provider implementation
 */
export class DeepSeekProvider implements LLMProvider {
  readonly name: LLMProviderType = 'deepseek'

  private config: ProviderConfig

  constructor(config: ProviderConfig = {}) {
    this.config = {
      baseUrl: config.baseUrl || DEFAULT_BASE_URL,
      model: config.model || DEFAULT_MODEL,
      temperature: config.temperature ?? 0.7,
      maxTokens: config.maxTokens ?? 2048,
      apiKey: config.apiKey
    }
  }

  /**
   * Update configuration
   */
  configure(config: Partial<ProviderConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Check if API key is configured
   */
  isConfigured(): boolean {
    return !!this.config.apiKey && this.config.apiKey.length > 0
  }

  /**
   * Complete a chat conversation
   */
  async complete(
    messages: ChatMessage[],
    options: CompletionOptions = {}
  ): Promise<CompletionResponse> {
    if (!this.isConfigured()) {
      throw new Error('DeepSeek API key not configured')
    }

    const requestBody: DeepSeekRequest = {
      model: options.model || this.config.model || DEFAULT_MODEL,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      temperature: options.temperature ?? this.config.temperature,
      max_tokens: options.maxTokens ?? this.config.maxTokens,
      stream: false
    }

    if (options.stop) {
      requestBody.stop = options.stop
    }

    const response = await fetch(`${this.config.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`DeepSeek API error: ${response.status} - ${errorText}`)
    }

    const data: DeepSeekResponse = await response.json()

    return {
      content: data.choices[0]?.message?.content || '',
      model: data.model,
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens
      } : undefined,
      finishReason: this.mapFinishReason(data.choices[0]?.finish_reason)
    }
  }

  /**
   * Stream a chat completion
   */
  async *stream(
    messages: ChatMessage[],
    options: CompletionOptions = {}
  ): AsyncGenerator<StreamChunk, void, unknown> {
    if (!this.isConfigured()) {
      throw new Error('DeepSeek API key not configured')
    }

    const requestBody: DeepSeekRequest = {
      model: options.model || this.config.model || DEFAULT_MODEL,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      temperature: options.temperature ?? this.config.temperature,
      max_tokens: options.maxTokens ?? this.config.maxTokens,
      stream: true
    }

    if (options.stop) {
      requestBody.stop = options.stop
    }

    const response = await fetch(`${this.config.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`DeepSeek API error: ${response.status} - ${errorText}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('Failed to get response reader')
    }

    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          yield { content: '', done: true }
          break
        }

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || trimmed === 'data: [DONE]') {
            continue
          }

          if (trimmed.startsWith('data: ')) {
            try {
              const json: DeepSeekStreamChunk = JSON.parse(trimmed.slice(6))
              const content = json.choices[0]?.delta?.content || ''
              const isDone = json.choices[0]?.finish_reason !== null

              if (content) {
                yield { content, done: isDone }
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  /**
   * Map DeepSeek finish reason to standard format
   */
  private mapFinishReason(
    reason?: string
  ): CompletionResponse['finishReason'] {
    switch (reason) {
      case 'stop':
        return 'stop'
      case 'length':
        return 'length'
      case 'content_filter':
        return 'content_filter'
      default:
        return undefined
    }
  }
}

/**
 * Create a DeepSeek provider instance
 */
export function createDeepSeekProvider(config?: ProviderConfig): DeepSeekProvider {
  return new DeepSeekProvider(config)
}
