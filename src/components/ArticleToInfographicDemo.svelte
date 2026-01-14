<script lang="ts">
  /**
   * Article-to-Infographic Demo
   *
   * Demonstrates AI-powered article analysis and infographic generation.
   * Uses Vite dev server proxy to bypass CORS in development mode.
   */
  import { ArticleInput, ReportOutput } from './article-to-infographic'
  import { SAMPLE_ARTICLES, DEMO_TEMPLATES } from './article-to-infographic/data'
  import {
    createArticleToReportPipeline,
    type PipelineProgress,
    type ArticleToReportResult
  } from '@core/ai/infographic'
  import { DeepSeekProvider } from '@core/ai/providers/deepseek'

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

  // Generate markdown based on article type or parse custom content
  function generateDemoMarkdown(): string {
    // If using sample article, return corresponding template
    if (!useCustom && DEMO_TEMPLATES[selectedArticle]) {
      return DEMO_TEMPLATES[selectedArticle]
    }

    // For custom articles, generate a simple parsed output
    return generateCustomArticleMarkdown(customArticle)
  }

  // Improved parser for custom articles
  function generateCustomArticleMarkdown(article: string): string {
    const lines = article.split('\n')
    const title = lines.find(l => l.trim().startsWith('#'))?.replace(/^#+\s*/, '').trim() || 'Custom Report'

    // Extract all data points
    const kpiItems: { label: string; value: string; desc?: string }[] = []
    const listItems: { label: string; desc?: string }[] = []
    const timelineItems: { label: string; desc?: string }[] = []

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue

      // Match bullet points: - Item: Value or - Item (description)
      const bulletMatch = trimmed.match(/^[-*•]\s*(.+)$/)
      // Match numbered items: 1. Item or Step 1: Item
      const numberMatch = trimmed.match(/^(?:\d+\.|Step\s*\d+:?|Phase\s*\d+:?)\s*(.+)$/i)

      const content = bulletMatch?.[1] || numberMatch?.[1]

      if (content) {
        // Try to extract value from content like "Revenue: $12.5M" or "Users - 158K"
        const valuePatterns = [
          /^(.+?):\s*(\$?[\d,.]+[BMK]?%?|\d+%|[\d,.]+\s*(?:million|billion|points?|users?|deals?)?)/i,
          /^(.+?)\s*[-–—]\s*(\$?[\d,.]+[BMK]?%?|\d+%)/i,
          /^(.+?)\s+\((.+?)\)$/
        ]

        let extracted = false
        for (const pattern of valuePatterns) {
          const match = content.match(pattern)
          if (match) {
            const label = match[1].trim()
            const value = match[2].trim()

            // Check if value looks like a metric
            if (/[\d$%]/.test(value)) {
              kpiItems.push({ label: label.substring(0, 25), value: value.substring(0, 15) })
            } else {
              listItems.push({ label: label.substring(0, 30), desc: value.substring(0, 50) })
            }
            extracted = true
            break
          }
        }

        // If no pattern matched, add as list item
        if (!extracted) {
          // Check if it's a timeline/step item
          if (numberMatch) {
            timelineItems.push({ label: content.substring(0, 30) })
          } else {
            listItems.push({ label: content.substring(0, 40) })
          }
        }
      }
    }

    // Build sections based on extracted data
    const sections: string[] = []

    // KPI section if we have numeric values
    if (kpiItems.length > 0) {
      sections.push(`\`\`\`infographic-section
template: kpi-row-badge
heading:
  title: "Key Metrics"
  subtitle: "Extracted from article"
palette: vibrant
width: 800
height: 150
items:
${kpiItems.slice(0, 4).map(i => `  - label: "${i.label}"
    value: "${i.value}"`).join('\n')}
\`\`\``)
    }

    // Timeline section if we have numbered steps
    if (timelineItems.length >= 2) {
      sections.push(`\`\`\`infographic-section
template: flow-timeline
heading:
  title: "Process Steps"
  subtitle: "Key stages identified"
palette: ocean
width: 800
height: 200
items:
${timelineItems.slice(0, 5).map(i => `  - label: "${i.label}"${i.desc ? `
    desc: "${i.desc}"` : ''}`).join('\n')}
\`\`\``)
    }

    // List section for remaining items - use grid-comparison template (registered)
    if (listItems.length > 0) {
      sections.push(`\`\`\`infographic-section
template: grid-comparison
heading:
  title: "Key Points"
  subtitle: "Article highlights"
palette: forest
width: 800
height: 250
items:
${listItems.slice(0, 4).map(i => `  - label: "${i.label}"${i.desc ? `
    desc: "${i.desc}"` : ''}`).join('\n')}
\`\`\``)
    }

    // Fallback if nothing was extracted - use kpi-row-badge
    if (sections.length === 0) {
      // Create a simple summary from first few lines
      const contentLines = lines.filter(l => l.trim() && !l.trim().startsWith('#')).slice(0, 4)
      if (contentLines.length > 0) {
        sections.push(`\`\`\`infographic-section
template: kpi-row-badge
heading:
  title: "${title}"
  subtitle: "Article content"
palette: vibrant
width: 800
height: 150
items:
${contentLines.map((l, i) => `  - label: "Point ${i + 1}"
    value: "${l.trim().substring(0, 20).replace(/"/g, "'")}"`).join('\n')}
\`\`\``)
      }
    }

    return `# ${title}

> AI-generated infographic from custom article.

${sections.join('\n\n')}

> Note: For better AI-powered analysis with more accurate extraction, configure an API key.`
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

    // Use AI when API key is provided, otherwise use demo templates
    if (apiKey.trim()) {
      await processWithAI()
    } else {
      await simulateDemoProcessing()
    }
  }

  // Process with real AI (via Vite proxy)
  async function processWithAI() {
    try {
      console.log('[AI] Starting with Vite proxy...')
      const provider = new DeepSeekProvider({ apiKey: apiKey.trim() })

      if (!provider.isConfigured()) {
        throw new Error('Please enter a valid API key')
      }

      const pipeline = createArticleToReportPipeline({
        provider,
        language: 'en',
        includeTitle: true,
        includeSummary: true,
        maxSections: 6
      })

      for await (const p of pipeline.convertStream(currentArticle)) {
        console.log('[AI] Progress:', p.stage, p.message)
        progress = p

        if (p.stage === 'complete' && p.data?.markdown) {
          result = {
            success: true,
            markdown: p.data.markdown,
            stats: {
              analysisTime: 0,
              planningTime: 0,
              generationTime: 0,
              totalTime: 0,
              sectionCount: p.data.infographicPlan?.sections.length || 0,
              chartCount: p.data.plan?.charts.length || 0
            }
          }
        } else if (p.stage === 'error') {
          throw new Error(p.message)
        }
      }
    } catch (e) {
      console.error('[AI] Error:', e)
      error = e instanceof Error ? e.message : 'AI processing failed'
      result = { success: false }
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
