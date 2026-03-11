<script lang="ts">
  /**
   * Article-to-Infographic Demo
   *
   * Demonstrates AI-powered article analysis and infographic generation.
   * UI state and layout only — processing logic lives in useArticleProcessor.
   */
  import { ArticleInput, ReportOutput } from './article-to-infographic'
  import { SAMPLE_ARTICLES } from './article-to-infographic/data'
  import { loadHistory, saveArticle, type ArticleHistoryItem } from './article-to-infographic/article-history'
  import { useArticleProcessor } from './article-to-infographic/use-article-processor.svelte'
  import StyleSelector from './article-to-infographic/StyleSelector.svelte'

  // Input state
  let selectedArticle = $state<string>('quarterly')
  let customArticle = $state('')
  let useCustom = $state(false)
  let apiKey = $state('')
  let articleHistory = $state<ArticleHistoryItem[]>(loadHistory())

  const currentArticle = $derived(useCustom ? customArticle : SAMPLE_ARTICLES[selectedArticle])

  // Processing logic (composable)
  const processor = useArticleProcessor(
    () => currentArticle,
    () => apiKey,
    () => selectedArticle,
    () => useCustom,
    () => customArticle
  )

  // Save custom articles to history before each generation
  async function handleProcess() {
    if (useCustom && currentArticle.trim()) {
      articleHistory = saveArticle(currentArticle)
    }
    await processor.processArticle()
  }

  function handleArticleChange(value: string) {
    if (useCustom) customArticle = value
    else selectedArticle = value
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
      isProcessing={processor.isProcessing}
      error={processor.error}
      sampleArticles={SAMPLE_ARTICLES}
      history={articleHistory}
      onProcess={handleProcess}
      onArticleChange={handleArticleChange}
      onCustomToggle={(v) => useCustom = v}
      onApiKeyChange={(v) => apiKey = v}
      onHistoryChange={(items) => articleHistory = items}
    />

    <ReportOutput
      progress={processor.progress}
      result={processor.result}
      isProcessing={processor.isProcessing}
      error={processor.error}
      onRetry={handleProcess}
      agentProgress={processor.agentProgress}
      uiTree={processor.uiTree}
      streamSource={processor.streamSource}
      cachedVariants={processor.styleVariants}
      onSwitchStyle={processor.handleSwitchStyle}
    />
  </div>

  <footer class="demo-footer">
    <h3>How it works</h3>
    <ol class="how-it-works">
      <li><strong>Article Analysis:</strong> AI identifies KPIs, processes, and trends</li>
      <li><strong>Data Extraction:</strong> Numbers and metrics are extracted</li>
      <li><strong>Style Options:</strong> 3 visual styles generated for selection</li>
      <li><strong>Layout Generation:</strong> Charts are arranged in a report</li>
    </ol>
  </footer>

  {#if processor.showStyleSelector && processor.styleVariants.length > 0}
    <StyleSelector
      variants={processor.styleVariants}
      onSelect={processor.handleStyleSelect}
      onCancel={processor.handleStyleCancel}
    />
  {/if}
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
    line-height: 1.4;
    padding-bottom: 0.3em;
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
