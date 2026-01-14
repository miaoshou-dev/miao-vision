<script lang="ts">
  /**
   * ArticleInput - Input panel for article-to-infographic demo
   */

  interface Props {
    selectedArticle: string
    customArticle: string
    useCustom: boolean
    apiKey: string
    isProcessing: boolean
    error: string | null
    sampleArticles: Record<string, string>
    onProcess: () => void
    onArticleChange: (article: string) => void
    onCustomToggle: (useCustom: boolean) => void
    onApiKeyChange: (key: string) => void
  }

  let {
    selectedArticle,
    customArticle,
    useCustom,
    apiKey,
    isProcessing,
    error,
    sampleArticles,
    onProcess,
    onArticleChange,
    onCustomToggle,
    onApiKeyChange
  }: Props = $props()

  const currentArticle = $derived(useCustom ? customArticle : sampleArticles[selectedArticle])
</script>

<div class="input-panel">
  <div class="panel-header">
    <h2>Input Article</h2>
    <label class="toggle">
      <input
        type="checkbox"
        checked={useCustom}
        onchange={(e) => onCustomToggle(e.currentTarget.checked)}
      />
      <span>Custom article</span>
    </label>
  </div>

  {#if !useCustom}
    <div class="article-selector">
      <label>Select sample article:</label>
      <select
        value={selectedArticle}
        onchange={(e) => onArticleChange(e.currentTarget.value)}
      >
        <option value="quarterly">Q4 Performance Report</option>
        <option value="techTrends">Technology Trends 2025</option>
        <option value="startup">Startup Growth Playbook</option>
      </select>
    </div>
  {/if}

  <textarea
    class="article-input"
    placeholder="Paste your article here..."
    value={currentArticle}
    oninput={(e) => {
      if (useCustom) {
        onArticleChange(e.currentTarget.value)
      }
    }}
    disabled={!useCustom}
    rows="15"
  ></textarea>

  <div class="api-key-section">
    <label>
      DeepSeek API Key:
      <input
        type="password"
        value={apiKey}
        oninput={(e) => onApiKeyChange(e.currentTarget.value)}
        placeholder="Enter API key for AI analysis"
      />
    </label>
    <p class="api-hint">
      {apiKey ? '✓ AI mode enabled' : 'Without API key: uses pattern matching demo'}
    </p>
  </div>

  <button
    class="process-btn"
    onclick={onProcess}
    disabled={isProcessing || !currentArticle?.trim()}
  >
    {#if isProcessing}
      Processing...
    {:else}
      Generate Infographic Report
    {/if}
  </button>

  {#if error}
    <div class="error-message">{error}</div>
  {/if}
</div>

<style>
  .input-panel {
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

  .toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: #9ca3af;
    cursor: pointer;
  }

  .toggle input {
    accent-color: #60a5fa;
  }

  .article-selector {
    margin-bottom: 1rem;
  }

  .article-selector label {
    display: block;
    font-size: 0.875rem;
    color: #9ca3af;
    margin-bottom: 0.5rem;
  }

  .article-selector select {
    width: 100%;
    padding: 0.5rem;
    background: #1f2937;
    border: 1px solid #374151;
    border-radius: 6px;
    color: #f3f4f6;
  }

  .article-input {
    width: 100%;
    padding: 1rem;
    background: #1f2937;
    border: 1px solid #374151;
    border-radius: 8px;
    color: #f3f4f6;
    font-family: monospace;
    font-size: 0.875rem;
    resize: vertical;
  }

  .article-input:disabled {
    opacity: 0.7;
  }

  .api-key-section {
    margin-top: 1rem;
  }

  .api-key-section label {
    display: block;
    font-size: 0.875rem;
    color: #9ca3af;
  }

  .api-key-section input {
    width: 100%;
    margin-top: 0.5rem;
    padding: 0.5rem;
    background: #1f2937;
    border: 1px solid #374151;
    border-radius: 6px;
    color: #f3f4f6;
  }

  .api-hint {
    margin-top: 0.5rem;
    font-size: 0.75rem;
    color: #6b7280;
  }

  .process-btn {
    width: 100%;
    margin-top: 1rem;
    padding: 0.75rem;
    background: linear-gradient(135deg, #3b82f6, #8b5cf6);
    border: none;
    border-radius: 8px;
    color: white;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.2s;
  }

  .process-btn:hover:not(:disabled) {
    opacity: 0.9;
  }

  .process-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .error-message {
    margin-top: 1rem;
    padding: 0.75rem;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 6px;
    color: #fca5a5;
    font-size: 0.875rem;
  }
</style>
