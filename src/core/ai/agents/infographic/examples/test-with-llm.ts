#!/usr/bin/env npx tsx
/**
 * Manual Integration Test for Infographic Agent with LLM
 *
 * Run with:
 *   DEEPSEEK_API_KEY=your_key npx tsx src/core/ai/agents/infographic/examples/test-with-llm.ts
 *
 * Or set the API key in your environment and run:
 *   npx tsx src/core/ai/agents/infographic/examples/test-with-llm.ts
 */

import { InfographicAgent } from '../agent'
import type { LLMProvider, ChatMessage, CompletionOptions, CompletionResponse, StreamChunk } from '../../../types'

/**
 * Simple DeepSeek provider for Node.js testing (no Vite dependency)
 */
class TestDeepSeekProvider implements LLMProvider {
  readonly name = 'deepseek' as const
  private apiKey: string
  private model: string
  private baseUrl: string

  constructor(config: { apiKey: string; model?: string; baseUrl?: string }) {
    this.apiKey = config.apiKey
    this.model = config.model || 'deepseek-chat'
    this.baseUrl = config.baseUrl || 'https://api.deepseek.com'
  }

  isConfigured(): boolean {
    return !!this.apiKey
  }

  async complete(messages: ChatMessage[], options: CompletionOptions = {}): Promise<CompletionResponse> {
    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: options.model || this.model,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 4000,
        stream: false
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`DeepSeek API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json() as any
    return {
      content: data.choices[0]?.message?.content || '',
      usage: {
        inputTokens: data.usage?.prompt_tokens || 0,
        outputTokens: data.usage?.completion_tokens || 0
      }
    }
  }

  async *stream(messages: ChatMessage[], options: CompletionOptions = {}): AsyncGenerator<StreamChunk> {
    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: options.model || this.model,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 4000,
        stream: true
      })
    })

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body')

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ') && line !== 'data: [DONE]') {
          try {
            const json = JSON.parse(line.slice(6))
            const content = json.choices?.[0]?.delta?.content || ''
            if (content) {
              yield { content, done: false }
            }
          } catch {}
        }
      }
    }
    yield { content: '', done: true }
  }
}

const JVM_ARTICLE = `# JVM Performance Tuning Guide

## Executive Summary

After 3 months of systematic optimization, we achieved remarkable performance improvements in our JVM-based application.

## Performance Results

Response time reduced from 450ms to 85ms (81% improvement). GC pause time reduced from 120ms to 8ms (93% reduction). Memory usage optimized from 8GB to 4.5GB (44% reduction). Throughput increased by 156%.

## Memory Optimization Journey

The optimization went through 4 phases over 4 months:

- January: Started with initial 8GB heap configuration, 45% average utilization
- February: Conducted deep analysis and identified memory leaks
- March: Applied first optimizations, reduced heap to 6GB
- April: Fine-tuned settings, achieved optimal 4.5GB configuration

## Garbage Collector Comparison

We evaluated 4 different garbage collectors for our workload:

- G1GC: 12ms average pause time, 98.5% throughput - balanced choice for most workloads
- ZGC: 2ms average pause time, 97.8% throughput - best for latency-sensitive applications
- Shenandoah: 3ms average pause time, 97.2% throughput - good low-pause alternative
- ParallelGC: 85ms average pause time, 99.1% throughput - best raw throughput

## Current Production Status

Our production environment now shows healthy metrics across all dimensions:

- CPU Usage: 65% average utilization
- Memory: 72% heap utilization
- GC Overhead: 2.1% of total CPU time
- JIT Compilation: 95% of hot methods compiled`

async function main() {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) {
    console.error('❌ DEEPSEEK_API_KEY not set')
    console.log('\nUsage:')
    console.log('  DEEPSEEK_API_KEY=your_key npx tsx src/core/ai/agents/infographic/examples/test-with-llm.ts')
    process.exit(1)
  }

  console.log('🚀 Creating Infographic Agent with DeepSeek provider...\n')

  const provider = new TestDeepSeekProvider({
    apiKey,
    model: 'deepseek-chat'
  })

  const agent = new InfographicAgent({
    provider,
    verbose: true,
    includeFewShot: true,
    temperatures: {
      outliner: 0.3,
      narrative: 0.5,
      generator: 0.4
    }
  })

  console.log('📄 Input Article:')
  console.log('─'.repeat(60))
  console.log(JVM_ARTICLE.substring(0, 500) + '...\n')

  console.log('🔄 Running three-phase pipeline...\n')

  try {
    const result = await agent.run({
      article: JVM_ARTICLE,
      style: 'detailed',
      language: 'en'
    })

    if (!result.success) {
      console.error('❌ Pipeline failed:', result.error)
      process.exit(1)
    }

    console.log('\n' + '═'.repeat(60))
    console.log('📊 PHASE 1: Article Outline')
    console.log('═'.repeat(60))

    if (result.debug?.outline) {
      const outline = result.debug.outline
      console.log(`Theme: ${outline.theme}`)
      console.log(`Type: ${outline.type}`)
      console.log(`\nStructure (${outline.structure.length} points):`)
      outline.structure.forEach((point, i) => {
        console.log(`\n  ${i + 1}. ${point.point}`)
        console.log(`     Importance: ${point.importance}`)
        if (point.relationToNext) console.log(`     → ${point.relationToNext}`)
        point.support.forEach(s => console.log(`       • ${s}`))
      })

      if (outline.dataPoints.length > 0) {
        console.log(`\nData Points (${outline.dataPoints.length}):`)
        outline.dataPoints.forEach(d => {
          console.log(`  • ${d.label}: ${d.value}${d.unit ? ' ' + d.unit : ''}`)
        })
      }
    }

    console.log('\n' + '═'.repeat(60))
    console.log('🎨 PHASE 2: Narrative Plan')
    console.log('═'.repeat(60))

    if (result.debug?.narrativePlan) {
      const plan = result.debug.narrativePlan
      console.log(`Title: ${plan.title}`)
      console.log(`Metaphor: ${plan.visualMetaphor}`)
      console.log(`Flow: ${plan.flowDirection}`)
      console.log(`Theme: ${plan.theme}`)
      console.log(`\nSections (${plan.sections.length}):`)
      plan.sections.forEach((section, i) => {
        console.log(`\n  ${i + 1}. [${section.role}] ${section.title}`)
        console.log(`     Visual: ${section.visualType}`)
        console.log(`     Purpose: ${section.visualPurpose}`)
        console.log(`     Elements: ${section.elements.length}`)
        section.elements.slice(0, 4).forEach(e => {
          const parts = [e.label]
          if (e.value) parts.push(`= ${e.value}`)
          if (e.description) parts.push(`(${e.description})`)
          console.log(`       • ${parts.join(' ')}`)
        })
      })
    }

    console.log('\n' + '═'.repeat(60))
    console.log('📐 PHASE 3: Generated Infographic')
    console.log('═'.repeat(60))

    if (result.infographic) {
      const infographic = result.infographic
      console.log(`Title: ${infographic.title}`)
      console.log(`Theme: ${infographic.theme}`)
      console.log(`Layout: ${infographic.layout.direction}`)
      console.log(`\nSections (${infographic.sections.length}):`)

      infographic.sections.forEach((section, i) => {
        console.log(`\n  ─── Section ${i + 1}: ${section.templateId} ───`)
        if (section.heading) {
          console.log(`  Title: ${section.heading.title}`)
          if (section.heading.subtitle) console.log(`  Subtitle: ${section.heading.subtitle}`)
        }
        if (section.insight) {
          console.log(`  Insight: ${section.insight.text}`)
        }
        console.log(`  Items (${section.items.length}):`)
        section.items.forEach(item => {
          const parts = [`    • ${item.label}`]
          if (item.value) parts.push(`value="${item.value}"`)
          if (item.desc) parts.push(`desc="${item.desc}"`)
          if (item.trend) parts.push(`trend=${item.trend}`)
          if (item.icon) parts.push(`icon=${item.icon}`)
          console.log(parts.join(' | '))
        })
      })

      console.log('\n' + '═'.repeat(60))
      console.log('📝 Generated Markdown')
      console.log('═'.repeat(60))
      console.log(infographic.markdown)
    }

    console.log('\n✅ Test completed successfully!')

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

main()
