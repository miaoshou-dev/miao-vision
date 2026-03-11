/**
 * Infographic Agent Test
 *
 * Tests the three-phase pipeline with the JVM Performance example.
 * Run with: npx vitest run src/core/ai/agents/infographic/infographic-agent.test.ts
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { InfographicAgent } from './agent'
import { ArticleOutliner } from './outliner'
import { NarrativePlanner } from './narrative'
import { InfographicGenerator } from './generator'
import type { LLMProvider } from '../../types'

// JVM Performance Tuning article
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

describe('InfographicAgent', () => {
  describe('quickGenerate (rule-based, no LLM)', () => {
    it('should generate infographic from JVM article using rules', () => {
      // Create agent without LLM provider
      const agent = new InfographicAgent({
        provider: createMockProvider(),
        verbose: true
      })

      const result = agent.quickGenerate(JVM_ARTICLE, 'detailed')

      // Verify structure
      expect(result.title).toBeDefined()
      expect(result.sections).toBeDefined()
      expect(result.sections.length).toBeGreaterThan(0)

      console.log('\n=== Quick Generate Result ===')
      console.log('Title:', result.title)
      console.log('Sections:', result.sections.length)
      result.sections.forEach((section, i) => {
        console.log(`\nSection ${i + 1}: ${section.templateId}`)
        console.log('  Heading:', section.heading?.title)
        console.log('  Items:', section.items.length)
        section.items.slice(0, 3).forEach(item => {
          console.log(`    - ${item.label}: ${item.value || ''} ${item.desc || ''}`)
        })
      })
    })
  })

  describe('ArticleOutliner (Phase 1)', () => {
    it('should extract outline with quickAnalyze', () => {
      const outliner = new ArticleOutliner({
        provider: createMockProvider()
      })

      const outline = outliner.quickAnalyze(JVM_ARTICLE)

      console.log('\n=== Quick Outline Result ===')
      console.log('Theme:', outline.theme?.substring(0, 80))
      console.log('Type:', outline.type)
      console.log('Points:', outline.structure.length)
      outline.structure.forEach((point, i) => {
        console.log(`\n${i + 1}. ${point.point}`)
        point.support.forEach(s => console.log(`   - ${s}`))
      })
      console.log('\nData Points:', outline.dataPoints.length)
      outline.dataPoints.forEach(d => {
        console.log(`  - ${d.label}: ${d.value}`)
      })

      // Verify extraction
      expect(outline.structure.length).toBeGreaterThan(0)
    })
  })

  describe('NarrativePlanner (Phase 2)', () => {
    it('should create fallback plan from outline', () => {
      const outliner = new ArticleOutliner({
        provider: createMockProvider()
      })
      const planner = new NarrativePlanner({
        provider: createMockProvider()
      })

      const outline = outliner.quickAnalyze(JVM_ARTICLE)
      const plan = planner.createFallbackPlan(outline, 'detailed')

      console.log('\n=== Fallback Narrative Plan ===')
      console.log('Title:', plan.title)
      console.log('Metaphor:', plan.visualMetaphor)
      console.log('Sections:', plan.sections.length)
      plan.sections.forEach((section, i) => {
        console.log(`\n${i + 1}. [${section.role}] ${section.title}`)
        console.log(`   Visual Type: ${section.visualType}`)
        console.log(`   Elements: ${section.elements.length}`)
        section.elements.slice(0, 3).forEach(e => {
          console.log(`     - ${e.label}${e.value ? ': ' + e.value : ''}`)
        })
      })

      expect(plan.sections.length).toBeGreaterThan(0)
    })
  })

  describe('InfographicGenerator (Phase 3)', () => {
    it('should generate infographic from narrative plan', () => {
      const outliner = new ArticleOutliner({
        provider: createMockProvider()
      })
      const planner = new NarrativePlanner({
        provider: createMockProvider()
      })
      const generator = new InfographicGenerator({
        useLLM: false,
        verbose: true
      })

      const outline = outliner.quickAnalyze(JVM_ARTICLE)
      const plan = planner.createFallbackPlan(outline, 'detailed')
      const infographic = generator.generateRuleBased(plan, 'en')

      console.log('\n=== Generated Infographic ===')
      console.log('Title:', infographic.title)
      console.log('Theme:', infographic.theme)
      console.log('Layout:', infographic.layout.direction)
      console.log('Sections:', infographic.sections.length)

      infographic.sections.forEach((section, i) => {
        console.log(`\n--- Section ${i + 1}: ${section.templateId} ---`)
        console.log('Heading:', section.heading?.title)
        if (section.insight) {
          console.log('Insight:', section.insight.text)
        }
        console.log('Items:')
        section.items.forEach(item => {
          const parts = [item.label]
          if (item.value) parts.push(`value="${item.value}"`)
          if (item.desc) parts.push(`desc="${item.desc}"`)
          if (item.trend) parts.push(`trend=${item.trend}`)
          console.log(`  - ${parts.join(' | ')}`)
        })
      })

      console.log('\n=== Markdown Output ===')
      console.log(infographic.markdown)

      expect(infographic.sections.length).toBeGreaterThan(0)
    })
  })
})

/**
 * Create a mock LLM provider for testing
 */
function createMockProvider(): LLMProvider {
  return {
    name: 'mock',
    isConfigured: () => false,
    complete: async () => ({ content: '', usage: { inputTokens: 0, outputTokens: 0 } }),
    stream: async function* () {
      yield { content: '', done: true }
    }
  }
}
