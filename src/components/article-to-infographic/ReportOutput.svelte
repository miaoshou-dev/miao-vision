<script lang="ts">
  /**
   * ReportOutput - Output panel for generated infographic report
   */
  import MarkdownInfographicPreview from './MarkdownInfographicPreview.svelte'
  import UISpecInfographicRenderer from './UISpecInfographicRenderer.svelte'
  import StreamingUISpecRenderer from './StreamingUISpecRenderer.svelte'
  import PhaseStepper from './PhaseStepper.svelte'
  import ExportBar from './ExportBar.svelte'
  import type { PipelineProgress, ArticleToReportResult } from '@core/ai/infographic'
  import type { InfographicProgress, InfographicVariant } from '@core/ai/agents/infographic'
  import type { UITree } from '@/types/ui-tree'
  import type { UITreePatch } from '@core/viz'

  interface Props {
    progress: PipelineProgress | null
    result: ArticleToReportResult | null
    isProcessing: boolean
    error?: string | null
    onRetry?: () => void
    /** Rich phase progress from InfographicAgent (takes priority over progress) */
    agentProgress?: InfographicProgress | null
    /** Cached variants for style switching without re-generation */
    cachedVariants?: InfographicVariant[]
    onSwitchStyle?: () => void
    /** Structured UITree (static, batch rendering) */
    uiTree?: UITree | null
    /** Async patch stream for progressive rendering (takes priority over uiTree) */
    streamSource?: AsyncIterable<UITreePatch> | null
  }

  let {
    progress, result, isProcessing, error = null, onRetry,
    agentProgress = null, cachedVariants = [], onSwitchStyle,
    uiTree = null, streamSource = null
  }: Props = $props()

  const canSwitchStyle = $derived(cachedVariants.length > 1 && !isProcessing && !error)
  const canExport = $derived(
    !isProcessing && !error && (!!streamSource || !!uiTree || !!result?.markdown)
  )

  // StreamingUISpecRenderer instance (bound via bind:this)
  let streamingRenderer: StreamingUISpecRenderer | undefined = $state()
  let previewEl: HTMLElement | undefined = $state()

  // Start streaming when a new source is provided
  $effect(() => {
    if (streamSource && streamingRenderer) {
      streamingRenderer.stream(streamSource)
    }
  })
</script>

<div class="output-panel">
  <div class="panel-header">
    <h2>Generated Report</h2>
    <div class="header-actions">
      {#if result?.stats}
        <span class="stats">
          {result.stats.chartCount} charts in {(result.stats.totalTime / 1000).toFixed(1)}s
        </span>
      {/if}
      {#if canSwitchStyle}
        <button class="switch-style-btn" onclick={onSwitchStyle}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M2 8a6 6 0 1 0 6-6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M2 4v4h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Switch Style
        </button>
      {/if}
    </div>
  </div>

  {#if isProcessing && agentProgress}
    <PhaseStepper {agentProgress} />
  {:else if progress && isProcessing}
    <div class="progress-section">
      <div class="progress-bar">
        <div class="progress-fill" style="width: {progress.progress}%"></div>
      </div>
      <p class="progress-message">{progress.message}</p>
      <p class="progress-stage">Stage: {progress.stage}</p>
    </div>
  {/if}

  {#if canExport}
    <ExportBar markdown={result?.markdown} {previewEl} />
  {/if}

  {#if error}
    <div class="error-state">
      <div class="error-icon">⚠</div>
      <p class="error-title">Generation Failed</p>
      <p class="error-detail">{error}</p>
      {#if onRetry}
        <button class="retry-btn" onclick={onRetry}>Retry</button>
      {/if}
    </div>
  {:else if streamSource}
    <div class="result-preview">
      <h3>Preview <span class="badge">UISpec Stream</span></h3>
      <div class="infographic-preview" bind:this={previewEl}>
        <StreamingUISpecRenderer bind:this={streamingRenderer} />
      </div>
      {#if result?.markdown}
        <details class="markdown-output">
          <summary>View Generated Markdown</summary>
          <pre>{result.markdown}</pre>
        </details>
      {/if}
    </div>
  {:else if uiTree}
    <div class="result-preview">
      <h3>Preview <span class="badge">UISpec</span></h3>
      <div class="infographic-preview" bind:this={previewEl}>
        <UISpecInfographicRenderer tree={uiTree} />
      </div>
      {#if result?.markdown}
        <details class="markdown-output">
          <summary>View Generated Markdown</summary>
          <pre>{result.markdown}</pre>
        </details>
      {/if}
    </div>
  {:else if result?.markdown}
    <div class="result-preview">
      <h3>Preview</h3>
      <div class="infographic-preview" bind:this={previewEl}>
        <MarkdownInfographicPreview markdown={result.markdown} />
      </div>
      <details class="markdown-output">
        <summary>View Generated Markdown</summary>
        <pre>{result.markdown}</pre>
      </details>
    </div>
  {:else if !isProcessing}
    <div class="empty-state">
      <p>Select an article and click "Generate" to see the AI-powered conversion</p>
    </div>
  {/if}
</div>

<style>
  .output-panel {
    background: #111827;
    border-radius: 12px;
    padding: 1.5rem;
    border: 1px solid #1f2937;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .panel-header h2 {
    font-size: 1.25rem;
    font-weight: 600;
    color: #f3f4f6;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .stats {
    font-size: 0.875rem;
    color: #9ca3af;
  }

  .switch-style-btn {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.75rem;
    background: rgba(99, 102, 241, 0.1);
    border: 1px solid rgba(99, 102, 241, 0.3);
    border-radius: 6px;
    color: #a5b4fc;
    font-size: 0.8rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
  }

  .switch-style-btn:hover {
    background: rgba(99, 102, 241, 0.2);
    border-color: rgba(99, 102, 241, 0.5);
  }

  /* Legacy progress bar */
  .progress-section {
    padding: 1rem;
    background: #1f2937;
    border-radius: 8px;
    margin-bottom: 1rem;
  }

  .progress-bar {
    height: 8px;
    background: #374151;
    border-radius: 4px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #3b82f6, #8b5cf6);
    transition: width 0.3s ease;
  }

  .progress-message {
    margin-top: 0.5rem;
    font-size: 0.875rem;
    color: #f3f4f6;
  }

  .progress-stage {
    font-size: 0.75rem;
    color: #9ca3af;
    text-transform: capitalize;
  }

  .result-preview h3 {
    font-size: 1rem;
    margin-bottom: 1rem;
    color: #9ca3af;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .badge {
    font-size: 0.6rem;
    font-weight: 600;
    padding: 0.1rem 0.4rem;
    background: rgba(139, 92, 246, 0.2);
    border: 1px solid rgba(139, 92, 246, 0.4);
    border-radius: 4px;
    color: #a78bfa;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .infographic-preview {
    background: #030712;
    border-radius: 8px;
    padding: 1rem;
    min-height: 400px;
    overflow: auto;
  }

  .markdown-output {
    margin-top: 1rem;
  }

  .markdown-output summary {
    cursor: pointer;
    color: #60a5fa;
    font-size: 0.875rem;
  }

  .markdown-output pre {
    margin-top: 0.5rem;
    padding: 1rem;
    background: #1f2937;
    border-radius: 6px;
    font-size: 0.75rem;
    overflow-x: auto;
    white-space: pre-wrap;
    color: #f3f4f6;
  }

  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 300px;
    color: #6b7280;
    text-align: center;
  }

  .error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 300px;
    gap: 0.75rem;
    text-align: center;
    padding: 2rem;
  }

  .error-icon {
    font-size: 2.5rem;
    color: #f87171;
  }

  .error-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: #fca5a5;
  }

  .error-detail {
    font-size: 0.875rem;
    color: #9ca3af;
    max-width: 360px;
    line-height: 1.5;
  }

  .retry-btn {
    margin-top: 0.5rem;
    padding: 0.5rem 1.5rem;
    background: rgba(239, 68, 68, 0.15);
    border: 1px solid rgba(239, 68, 68, 0.4);
    border-radius: 6px;
    color: #fca5a5;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
  }

  .retry-btn:hover {
    background: rgba(239, 68, 68, 0.25);
  }
</style>
