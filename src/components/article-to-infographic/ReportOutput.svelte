<script lang="ts">
  /**
   * ReportOutput - Output panel for generated infographic report
   */
  import { Infographic } from '@plugins/data-display/infographic'
  import type { PipelineProgress, ArticleToReportResult } from '@core/ai/infographic'

  interface Props {
    progress: PipelineProgress | null
    result: ArticleToReportResult | null
    isProcessing: boolean
  }

  let { progress, result, isProcessing }: Props = $props()
</script>

<div class="output-panel">
  <div class="panel-header">
    <h2>Generated Report</h2>
    {#if result?.stats}
      <span class="stats">
        {result.stats.chartCount} charts in {(result.stats.totalTime / 1000).toFixed(1)}s
      </span>
    {/if}
  </div>

  {#if progress && isProcessing}
    <div class="progress-section">
      <div class="progress-bar">
        <div class="progress-fill" style="width: {progress.progress}%"></div>
      </div>
      <p class="progress-message">{progress.message}</p>
      <p class="progress-stage">Stage: {progress.stage}</p>
    </div>
  {/if}

  {#if result?.markdown}
    <div class="result-preview">
      <h3>Preview</h3>
      <div class="infographic-preview">
        <Infographic
          content={result.markdown}
          theme="dark-vibrant"
        />
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

  .stats {
    font-size: 0.875rem;
    color: #9ca3af;
  }

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
</style>
