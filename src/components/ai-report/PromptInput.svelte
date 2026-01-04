<script lang="ts">
  import type { ReportStyle } from '@core/ai'

  interface Props {
    prompt: string
    style: ReportStyle
    onPromptChange: (prompt: string) => void
    onStyleChange: (style: ReportStyle) => void
  }

  let { prompt, style, onPromptChange, onStyleChange }: Props = $props()

  const styleOptions: Array<{ value: ReportStyle; label: string; desc: string }> = [
    { value: 'professional', label: 'Professional', desc: 'Formal, data-driven analysis' },
    { value: 'concise', label: 'Concise', desc: 'Dashboard-like, minimal text' },
    { value: 'visual', label: 'Visual', desc: 'Chart-heavy, light on text' },
    { value: 'narrative', label: 'Narrative', desc: 'Story-driven with explanations' }
  ]

  const promptTemplates = [
    {
      title: 'Sales Analysis',
      prompt: 'Analyze sales performance, show top products, revenue trends, and key metrics'
    },
    {
      title: 'Customer Insights',
      prompt: 'Analyze customer data, segment by behavior, show retention and growth trends'
    },
    {
      title: 'Financial Overview',
      prompt: 'Create a financial summary with KPIs, expense breakdown, and profitability analysis'
    },
    {
      title: 'Performance Dashboard',
      prompt: 'Build a performance dashboard with key metrics, trends, and comparative analysis'
    }
  ]

  function applyTemplate(template: { prompt: string }) {
    onPromptChange(template.prompt)
  }
</script>

<div class="prompt-input">
  <div class="section">
    <label class="section-label">Describe Your Report</label>
    <textarea
      class="prompt-textarea"
      placeholder="e.g., Analyze sales trends, show top 10 products by revenue, compare performance across regions..."
      value={prompt}
      oninput={(e) => onPromptChange(e.currentTarget.value)}
      rows={4}
    ></textarea>
  </div>

  <div class="section">
    <label class="section-label">Quick Templates</label>
    <div class="template-grid">
      {#each promptTemplates as template}
        <button
          class="template-btn"
          onclick={() => applyTemplate(template)}
        >
          <span class="template-title">{template.title}</span>
          <span class="template-desc">{template.prompt.slice(0, 40)}...</span>
        </button>
      {/each}
    </div>
  </div>

  <div class="section">
    <label class="section-label">Report Style</label>
    <div class="style-options">
      {#each styleOptions as option}
        <button
          class="style-option"
          class:selected={style === option.value}
          onclick={() => onStyleChange(option.value)}
        >
          <span class="style-label">{option.label}</span>
          <span class="style-desc">{option.desc}</span>
        </button>
      {/each}
    </div>
  </div>
</div>

<style>
  .prompt-input {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .section-label {
    font-size: 13px;
    font-weight: 600;
    color: #e0e0e0;
  }

  .prompt-textarea {
    width: 100%;
    padding: 12px;
    background: #1e1e1e;
    border: 1px solid #333;
    border-radius: 8px;
    color: #e0e0e0;
    font-size: 14px;
    font-family: inherit;
    resize: vertical;
    min-height: 100px;
    transition: border-color 0.2s;
  }

  .prompt-textarea:focus {
    outline: none;
    border-color: #60a5fa;
  }

  .prompt-textarea::placeholder {
    color: #6b7280;
  }

  .template-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .template-btn {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
    padding: 10px 12px;
    background: #1e1e1e;
    border: 1px solid #333;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
  }

  .template-btn:hover {
    border-color: #4b5563;
    background: #252525;
  }

  .template-title {
    font-size: 13px;
    font-weight: 500;
    color: #e0e0e0;
  }

  .template-desc {
    font-size: 11px;
    color: #6b7280;
  }

  .style-options {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .style-option {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
    padding: 12px;
    background: #1e1e1e;
    border: 2px solid #333;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
  }

  .style-option:hover {
    border-color: #4b5563;
  }

  .style-option.selected {
    border-color: #60a5fa;
    background: rgba(96, 165, 250, 0.1);
  }

  .style-label {
    font-size: 14px;
    font-weight: 500;
    color: #e0e0e0;
  }

  .style-desc {
    font-size: 12px;
    color: #9ca3af;
  }

  .style-option.selected .style-label {
    color: #60a5fa;
  }
</style>
