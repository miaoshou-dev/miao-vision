/**
 * useArticleProcessor — Svelte 5 composable
 *
 * Encapsulates all AI / demo processing state and handlers so that
 * ArticleToInfographicDemo.svelte stays focused on layout and wiring.
 */
import { DeepSeekProvider } from '@core/ai/providers/deepseek'
import { createArticleToReportPipeline, type PipelineProgress, type ArticleToReportResult } from '@core/ai/infographic'
import { InfographicAgent, streamUITreePatches, type InfographicVariant, type InfographicProgress } from '@core/ai/agents/infographic'
import type { UITree } from '@/types/ui-tree'
import type { UITreePatch } from '@core/viz'
import { generateDemoMarkdown } from './demo-article-parser'
import { DEMO_TEMPLATES } from './data'

export function useArticleProcessor(
  getArticle: () => string,
  getApiKey: () => string,
  getSelectedArticle: () => string,
  getUseCustom: () => boolean,
  getCustomArticle: () => string
) {
  let isProcessing = $state(false)
  let progress = $state<PipelineProgress | null>(null)
  let result = $state<ArticleToReportResult | null>(null)
  let error = $state<string | null>(null)
  let agentProgress = $state<InfographicProgress | null>(null)
  let uiTree = $state<UITree | null>(null)
  let streamSource = $state<AsyncIterable<UITreePatch> | null>(null)

  // Style variant state
  let showStyleSelector = $state(false)
  let styleVariants = $state<InfographicVariant[]>([])
  let processingStartTime = $state(0)

  async function processArticle() {
    const article = getArticle()
    if (!article.trim()) {
      error = 'Please enter or select an article'
      return
    }

    isProcessing = true
    error = null
    result = null
    uiTree = null
    streamSource = null
    agentProgress = null
    progress = { stage: 'analyzing', progress: 0, message: 'Starting...' }

    if (getApiKey().trim()) {
      await processWithAI()
    } else {
      await simulateDemoProcessing()
    }
  }

  async function processWithAI() {
    try {
      const provider = new DeepSeekProvider({ apiKey: getApiKey().trim() })
      if (!provider.isConfigured()) throw new Error('Please enter a valid API key')
      await processWithNewAgent(provider)
    } catch (e) {
      error = e instanceof Error ? e.message : 'AI processing failed'
      result = { success: false }
      isProcessing = false
    }
  }

  async function processWithNewAgent(provider: DeepSeekProvider) {
    try {
      const agent = new InfographicAgent({
        provider,
        verbose: true,
        includeFewShot: true,
        temperatures: { outliner: 0.3, narrative: 0.5, generator: 0.4 }
      })

      processingStartTime = Date.now()

      for await (const p of agent.streamWithVariants({ article: getArticle() })) {
        agentProgress = p

        if (p.done && p.variants && p.variants.length > 0) {
          styleVariants = p.variants
          showStyleSelector = true
          isProcessing = false
        }
      }
    } catch (e) {
      error = e instanceof Error ? e.message : 'New agent processing failed'
      result = { success: false }
      isProcessing = false
    }
  }

  async function processWithLegacyPipeline(provider: DeepSeekProvider) {
    try {
      const pipeline = createArticleToReportPipeline({
        provider,
        language: 'en',
        includeTitle: true,
        includeSummary: true,
        maxSections: 6
      })

      for await (const p of pipeline.convertStream(getArticle())) {
        progress = p
        if (p.stage === 'complete' && p.data?.markdown) {
          result = {
            success: true,
            markdown: p.data.markdown,
            stats: {
              analysisTime: 0, planningTime: 0, generationTime: 0, totalTime: 0,
              sectionCount: p.data.infographicPlan?.sections.length || 0,
              chartCount: p.data.plan?.charts.length || 0
            }
          }
        } else if (p.stage === 'error') {
          throw new Error(p.message)
        }
      }
    } catch (e) {
      error = e instanceof Error ? e.message : 'AI processing failed'
      result = { success: false }
    } finally {
      isProcessing = false
    }
  }

  async function simulateDemoProcessing() {
    const stages: PipelineProgress[] = [
      { stage: 'analyzing', progress: 20, message: 'Analyzing article structure...' },
      { stage: 'analyzing', progress: 40, message: 'Extracting data points...' },
      { stage: 'planning',  progress: 60, message: 'Planning chart layouts...' },
      { stage: 'generating', progress: 80, message: 'Generating infographics...' },
      { stage: 'complete',  progress: 100, message: 'Complete!' }
    ]

    for (const s of stages) {
      progress = s
      await new Promise(r => setTimeout(r, 500))
    }

    result = {
      success: true,
      markdown: generateDemoMarkdown(getSelectedArticle(), getUseCustom(), getCustomArticle(), DEMO_TEMPLATES),
      stats: { analysisTime: 1200, planningTime: 300, generationTime: 500, totalTime: 2000, sectionCount: 3, chartCount: 3 }
    }
    isProcessing = false
  }

  function handleStyleSelect(variant: InfographicVariant) {
    const totalTime = Date.now() - processingStartTime
    result = {
      success: true,
      markdown: variant.infographic.markdown,
      stats: {
        analysisTime: 0, planningTime: 0, generationTime: 0, totalTime,
        sectionCount: variant.infographic.sections.length,
        chartCount: variant.infographic.sections.length
      }
    }
    uiTree = null
    streamSource = streamUITreePatches(variant.infographic, 100)
    showStyleSelector = false
  }

  function handleSwitchStyle() {
    if (styleVariants.length > 0) showStyleSelector = true
  }

  function handleStyleCancel() {
    showStyleSelector = false
    if (!result) {
      styleVariants = []
      progress = null
      uiTree = null
      streamSource = null
    }
  }

  return {
    // State (exposed via getters for reactivity)
    get isProcessing() { return isProcessing },
    get progress() { return progress },
    get result() { return result },
    get error() { return error },
    get agentProgress() { return agentProgress },
    get uiTree() { return uiTree },
    get streamSource() { return streamSource },
    get showStyleSelector() { return showStyleSelector },
    get styleVariants() { return styleVariants },
    // Handlers
    processArticle,
    handleStyleSelect,
    handleSwitchStyle,
    handleStyleCancel,
    // Legacy pipeline (kept as named export for direct use if needed)
    processWithLegacyPipeline
  }
}
