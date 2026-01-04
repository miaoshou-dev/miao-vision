<script lang="ts">
  import type { ReportPlan } from '@core/ai'

  interface Props {
    plan: ReportPlan | null
    isLoading: boolean
    error: string | null
    onRemoveSection?: (index: number) => void
    onReorderSection?: (fromIndex: number, toIndex: number) => void
    onRetry?: () => void
  }

  let { plan, isLoading, error, onRemoveSection, onReorderSection, onRetry }: Props = $props()

  // Section type icons and labels
  const sectionTypeInfo: Record<string, { icon: string; label: string; color: string }> = {
    kpi: { icon: '📊', label: 'KPI Metrics', color: '#60a5fa' },
    trend: { icon: '📈', label: 'Trend Analysis', color: '#34d399' },
    ranking: { icon: '🏆', label: 'Ranking', color: '#fbbf24' },
    comparison: { icon: '⚖️', label: 'Comparison', color: '#a78bfa' },
    distribution: { icon: '📉', label: 'Distribution', color: '#f472b6' },
    table: { icon: '📋', label: 'Data Table', color: '#6b7280' },
    insight: { icon: '💡', label: 'Insights', color: '#fb923c' }
  }

  function getSectionInfo(type: string) {
    return sectionTypeInfo[type] || { icon: '📄', label: type, color: '#6b7280' }
  }

  function moveUp(index: number) {
    if (index > 0 && onReorderSection) {
      onReorderSection(index, index - 1)
    }
  }

  function moveDown(index: number) {
    if (plan && index < plan.sections.length - 1 && onReorderSection) {
      onReorderSection(index, index + 1)
    }
  }
</script>

<div class="plan-preview">
  {#if isLoading}
    <div class="loading-state">
      <div class="loading-spinner"></div>
      <p>Analyzing data and creating report plan...</p>
      <span class="loading-hint">This may take a few seconds</span>
    </div>
  {:else if error}
    <div class="error-state">
      <div class="error-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
        </svg>
      </div>
      <p class="error-title">Failed to create plan</p>
      <p class="error-message">{error}</p>
      {#if onRetry}
        <button class="retry-btn" onclick={onRetry}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
          </svg>
          Retry
        </button>
      {/if}
    </div>
  {:else if plan}
    <div class="plan-content">
      <div class="plan-header">
        <h3>{plan.title}</h3>
        {#if plan.description}
          <p class="plan-description">{plan.description}</p>
        {/if}
      </div>

      <div class="sections-header">
        <span class="sections-title">Report Sections</span>
        <span class="sections-count">{plan.sections.length} sections</span>
      </div>

      <div class="sections-list">
        {#each plan.sections as section, index}
          {@const info = getSectionInfo(section.type)}
          <div class="section-card">
            <div class="section-drag-handle">
              <button
                class="reorder-btn"
                onclick={() => moveUp(index)}
                disabled={index === 0}
                title="Move up"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/>
                </svg>
              </button>
              <button
                class="reorder-btn"
                onclick={() => moveDown(index)}
                disabled={index === plan.sections.length - 1}
                title="Move down"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/>
                </svg>
              </button>
            </div>

            <div class="section-content">
              <div class="section-header">
                <span class="section-icon" style="color: {info.color}">{info.icon}</span>
                <span class="section-title">{section.title}</span>
                <span class="section-type-badge" style="background: {info.color}20; color: {info.color}">
                  {info.label}
                </span>
              </div>

              {#if section.description}
                <p class="section-description">{section.description}</p>
              {/if}

              <div class="section-meta">
                <span class="meta-item">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M4 7v10c0 1.1.9 2 2 2h12a2 2 0 002-2V7M4 7l8-4 8 4M4 7l8 4 8-4"/>
                  </svg>
                  {section.dataSource}
                </span>
              </div>
            </div>

            {#if onRemoveSection}
              <button
                class="remove-btn"
                onclick={() => onRemoveSection(index)}
                title="Remove section"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
                </svg>
              </button>
            {/if}
          </div>
        {/each}
      </div>

      <div class="plan-footer">
        <p class="footer-hint">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
          </svg>
          Review the plan above. Click "Generate" to create the report.
        </p>
      </div>
    </div>
  {:else}
    <div class="empty-state">
      <p>No plan available</p>
    </div>
  {/if}
</div>

<style>
  .plan-preview {
    min-height: 300px;
  }

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px 24px;
    text-align: center;
  }

  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #333;
    border-top-color: #60a5fa;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin-bottom: 16px;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .loading-state p {
    margin: 0;
    font-size: 15px;
    color: #e0e0e0;
  }

  .loading-hint {
    margin-top: 8px;
    font-size: 13px;
    color: #6b7280;
  }

  .error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 48px 24px;
    text-align: center;
  }

  .error-icon {
    color: #ef4444;
    margin-bottom: 16px;
  }

  .error-title {
    margin: 0 0 8px;
    font-size: 16px;
    font-weight: 500;
    color: #e0e0e0;
  }

  .error-message {
    margin: 0;
    font-size: 14px;
    color: #ef4444;
  }

  .retry-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 16px;
    padding: 10px 20px;
    background: linear-gradient(135deg, #60a5fa, #a78bfa);
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .retry-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(96, 165, 250, 0.3);
  }

  .plan-content {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .plan-header h3 {
    margin: 0 0 4px;
    font-size: 18px;
    font-weight: 600;
    color: #e0e0e0;
  }

  .plan-description {
    margin: 0;
    font-size: 14px;
    color: #9ca3af;
  }

  .sections-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 8px;
    border-bottom: 1px solid #333;
  }

  .sections-title {
    font-size: 13px;
    font-weight: 600;
    color: #9ca3af;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .sections-count {
    font-size: 12px;
    color: #6b7280;
  }

  .sections-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 280px;
    overflow-y: auto;
  }

  .section-card {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 12px;
    background: #1e1e1e;
    border: 1px solid #333;
    border-radius: 8px;
    transition: border-color 0.2s;
  }

  .section-card:hover {
    border-color: #4b5563;
  }

  .section-drag-handle {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .reorder-btn {
    background: none;
    border: none;
    color: #6b7280;
    cursor: pointer;
    padding: 2px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }

  .reorder-btn:hover:not(:disabled) {
    color: #e0e0e0;
    background: #333;
  }

  .reorder-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .section-content {
    flex: 1;
    min-width: 0;
  }

  .section-header {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .section-icon {
    font-size: 16px;
  }

  .section-title {
    font-size: 14px;
    font-weight: 500;
    color: #e0e0e0;
  }

  .section-type-badge {
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 500;
  }

  .section-description {
    margin: 6px 0 0;
    font-size: 12px;
    color: #9ca3af;
  }

  .section-meta {
    display: flex;
    gap: 12px;
    margin-top: 8px;
  }

  .meta-item {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    color: #6b7280;
  }

  .meta-item svg {
    opacity: 0.7;
  }

  .remove-btn {
    background: none;
    border: none;
    color: #6b7280;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    transition: all 0.2s;
    flex-shrink: 0;
  }

  .remove-btn:hover {
    color: #ef4444;
    background: rgba(239, 68, 68, 0.1);
  }

  .plan-footer {
    padding-top: 12px;
    border-top: 1px solid #333;
  }

  .footer-hint {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    font-size: 13px;
    color: #6b7280;
  }

  .footer-hint svg {
    flex-shrink: 0;
  }

  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 48px;
    color: #6b7280;
  }
</style>
