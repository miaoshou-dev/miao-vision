<script lang="ts">
  /**
   * Article-to-Infographic Demo
   *
   * Demonstrates the AI-powered article analysis and multi-chart generation.
   */
  import { ArticleInput, ReportOutput } from './article-to-infographic'
  import {
    createArticleToReportPipeline,
    type PipelineProgress,
    type ArticleToReportResult
  } from '@core/ai/infographic'
  import type { LLMProvider } from '@core/ai/types'

  // Sample articles
  const SAMPLE_ARTICLES: Record<string, string> = {
    quarterly: `# Q4 2024 Performance Report

Our company achieved remarkable growth in Q4 2024. Here are the key highlights:

## Key Metrics
- Revenue: $12.5 million (up 45% YoY)
- Active Users: 158,000 (up 32% QoQ)
- Customer Satisfaction (NPS): 72 points
- Market Share: 23% in our segment

## Growth Journey
Step 1: Product Launch - We released 3 major features in October
Step 2: Market Expansion - Entered 5 new markets in November
Step 3: Partnership Growth - Signed 12 strategic partnerships
Step 4: Scale Operations - Doubled our support team capacity

## Team Comparison: Engineering vs Sales
Engineering team delivered 47 features with 99.9% uptime.
Sales team closed 234 deals worth $8.2M total.

## Revenue Breakdown
- Enterprise: 45% ($5.6M)
- SMB: 35% ($4.4M)
- Self-serve: 20% ($2.5M)`,

    techTrends: `# Technology Trends 2025

## Top Investment Areas
1. Artificial Intelligence - $150B market, 40% CAGR
2. Cloud Computing - $120B market, 25% CAGR
3. Cybersecurity - $80B market, 35% CAGR
4. Edge Computing - $45B market, 30% CAGR

## AI Adoption Timeline
Phase 1 (2024): Foundation - Basic AI integration
Phase 2 (2025): Expansion - Enterprise-wide deployment
Phase 3 (2026): Optimization - AI-driven operations

## Market Distribution
- North America: 42%
- Europe: 28%
- Asia Pacific: 22%
- Rest of World: 8%`,

    startup: `# Startup Growth Playbook

## Funding Milestones
- Seed Round: $500K for MVP development
- Series A: $5M for market validation
- Series B: $25M for scaling operations
- Series C: $100M for global expansion

## Key Performance Indicators
Monthly Recurring Revenue (MRR): Track growth
Customer Acquisition Cost (CAC): < 1/3 of LTV
Lifetime Value (LTV): Target 3x CAC minimum
Churn Rate: Keep below 5% monthly

## Go-to-Market Process
1. Identify target market and ideal customer
2. Build minimum viable product
3. Launch beta program with early adopters
4. Iterate based on user feedback
5. Scale marketing and sales`
  }

  // State
  let selectedArticle = $state<string>('quarterly')
  let customArticle = $state('')
  let useCustom = $state(false)
  let isProcessing = $state(false)
  let progress = $state<PipelineProgress | null>(null)
  let result = $state<ArticleToReportResult | null>(null)
  let error = $state<string | null>(null)
  let apiKey = $state('')

  const currentArticle = $derived(useCustom ? customArticle : SAMPLE_ARTICLES[selectedArticle])

  // Mock provider for demo
  function createMockProvider(): LLMProvider {
    return {
      name: 'deepseek',
      isConfigured: () => apiKey.length > 0,
      complete: async () => ({
        content: '{}',
        model: 'mock',
        usage: { promptTokens: 100, completionTokens: 200, totalTokens: 300 }
      }),
      stream: async function* () {
        yield { content: '{}', done: true }
      }
    }
  }

  // Generate demo markdown
  function generateDemoMarkdown(): string {
    return `# Performance Report

> AI-generated infographic report from article analysis.

## Key Metrics

\`\`\`infographic
template: list-row-badge-card
theme: dark-vibrant
palette: vibrant
width: 800
height: 150
data:
  -
    label: "Revenue"
    value: "$12.5M"
    trend: "up"
  -
    label: "Users"
    value: "158K"
    trend: "up"
  -
    label: "NPS"
    value: "72"
  -
    label: "Market Share"
    value: "23%"
\`\`\`

---

## Growth Journey

\`\`\`infographic
template: flow-linear-numbered
theme: dark-vibrant
palette: ocean
width: 800
height: 200
data:
  -
    label: "Product Launch"
    desc: "October 2024"
  -
    label: "Market Expansion"
    desc: "November 2024"
  -
    label: "Partnerships"
    desc: "December 2024"
  -
    label: "Scale Ops"
    desc: "Q1 2025"
\`\`\`

---

## Revenue Distribution

\`\`\`infographic
template: list-sector-pie
theme: dark-vibrant
palette: sunset
width: 500
height: 400
data:
  -
    label: "Enterprise"
    value: 45
  -
    label: "SMB"
    value: 35
  -
    label: "Self-serve"
    value: 20
\`\`\``
  }

  // Process article
  async function processArticle() {
    if (!currentArticle.trim()) {
      error = 'Please enter or select an article'
      return
    }

    isProcessing = true
    error = null
    result = null
    progress = { stage: 'analyzing', progress: 0, message: 'Starting...' }

    try {
      const provider = createMockProvider()

      if (!provider.isConfigured()) {
        error = 'Enter an API key to use real AI. Showing demo results...'
        await simulateDemoProcessing()
        return
      }

      const pipeline = createArticleToReportPipeline({
        provider,
        language: 'en',
        maxSections: 6
      })

      for await (const event of pipeline.convertStream(currentArticle)) {
        progress = event
        if (event.stage === 'complete' && event.data?.markdown) {
          result = {
            success: true,
            markdown: event.data.markdown,
            analysis: event.data.analysis,
            chartPlan: event.data.plan,
            infographicPlan: event.data.infographicPlan
          }
        } else if (event.stage === 'error') {
          error = event.message
        }
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Processing failed'
    } finally {
      isProcessing = false
    }
  }

  // Simulate demo processing
  async function simulateDemoProcessing() {
    const stages: PipelineProgress[] = [
      { stage: 'analyzing', progress: 20, message: 'Analyzing article structure...' },
      { stage: 'analyzing', progress: 40, message: 'Extracting data points...' },
      { stage: 'planning', progress: 60, message: 'Planning chart layouts...' },
      { stage: 'generating', progress: 80, message: 'Generating infographics...' },
      { stage: 'complete', progress: 100, message: 'Complete!' }
    ]

    for (const s of stages) {
      progress = s
      await new Promise(r => setTimeout(r, 500))
    }

    result = {
      success: true,
      markdown: generateDemoMarkdown(),
      stats: {
        analysisTime: 1200,
        planningTime: 300,
        generationTime: 500,
        totalTime: 2000,
        sectionCount: 3,
        chartCount: 3
      }
    }
    isProcessing = false
  }

  // Handlers
  function handleArticleChange(value: string) {
    if (useCustom) {
      customArticle = value
    } else {
      selectedArticle = value
    }
  }
</script>

<div class="demo-container">
  <header class="demo-header">
    <h1>Article → Infographic AI</h1>
    <p class="subtitle">Convert text articles into visual infographic reports using AI</p>
  </header>

  <div class="demo-layout">
    <ArticleInput
      {selectedArticle}
      {customArticle}
      {useCustom}
      {apiKey}
      {isProcessing}
      {error}
      sampleArticles={SAMPLE_ARTICLES}
      onProcess={processArticle}
      onArticleChange={handleArticleChange}
      onCustomToggle={(v) => useCustom = v}
      onApiKeyChange={(v) => apiKey = v}
    />

    <ReportOutput {progress} {result} {isProcessing} />
  </div>

  <footer class="demo-footer">
    <h3>How it works</h3>
    <ol class="how-it-works">
      <li><strong>Article Analysis:</strong> AI identifies KPIs, processes, and trends</li>
      <li><strong>Data Extraction:</strong> Numbers and metrics are extracted</li>
      <li><strong>Chart Planning:</strong> Optimal visualizations are selected</li>
      <li><strong>Layout Generation:</strong> Charts are arranged in a report</li>
    </ol>
  </footer>
</div>

<style>
  .demo-container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 2rem;
    color: #f3f4f6;
  }

  .demo-header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .demo-header h1 {
    font-size: 2rem;
    font-weight: 700;
    background: linear-gradient(135deg, #60a5fa, #a78bfa);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .subtitle {
    color: #9ca3af;
    margin-top: 0.5rem;
  }

  .demo-layout {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
  }

  .demo-footer {
    margin-top: 2rem;
    padding: 1.5rem;
    background: #111827;
    border-radius: 12px;
    border: 1px solid #1f2937;
  }

  .demo-footer h3 {
    font-size: 1.125rem;
    margin-bottom: 1rem;
  }

  .how-it-works {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
    list-style: none;
    padding: 0;
  }

  .how-it-works li {
    padding: 1rem;
    background: #1f2937;
    border-radius: 8px;
    font-size: 0.875rem;
  }

  .how-it-works strong {
    color: #60a5fa;
  }

  @media (max-width: 1024px) {
    .demo-layout {
      grid-template-columns: 1fr;
    }
  }
</style>
