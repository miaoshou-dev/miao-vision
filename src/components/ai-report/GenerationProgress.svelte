<script lang="ts">
  import type { ReportPlan, SectionProgress } from '@core/ai'

  type GenerationPhase = 'planning' | 'generating' | 'complete' | 'error'

  interface Props {
    phase: GenerationPhase
    plan: ReportPlan | null
    currentSection: SectionProgress | null
    error: string | null
    previewMarkdown: string
  }

  let { phase, plan, currentSection, error, previewMarkdown }: Props = $props()

  function getPhaseLabel(p: GenerationPhase): string {
    switch (p) {
      case 'planning':
        return 'Planning Report Structure...'
      case 'generating':
        return 'Generating Content...'
      case 'complete':
        return 'Report Complete'
      case 'error':
        return 'Generation Failed'
    }
  }

  function getSectionProgress(): number {
    if (!plan || !currentSection) return 0
    return ((currentSection.sectionIndex + 1) / plan.sections.length) * 100
  }
</script>

<div class="generation-progress">
  <div class="progress-header">
    <div class="phase-indicator" class:active={phase === 'planning' || phase === 'generating'} class:complete={phase === 'complete'} class:error={phase === 'error'}>
      {#if phase === 'planning' || phase === 'generating'}
        <div class="spinner"></div>
      {:else if phase === 'complete'}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
        </svg>
      {:else if phase === 'error'}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
        </svg>
      {/if}
    </div>
    <span class="phase-label">{getPhaseLabel(phase)}</span>
  </div>

  {#if error}
    <div class="error-message">
      <p>{error}</p>
    </div>
  {:else if phase === 'planning'}
    <div class="planning-preview">
      <p class="preview-hint">Analyzing data sources and designing report structure...</p>
    </div>
  {:else if plan}
    <div class="plan-overview">
      <div class="plan-header">
        <h4>{plan.title}</h4>
        {#if plan.description}
          <p class="plan-desc">{plan.description}</p>
        {/if}
      </div>

      <div class="sections-list">
        {#each plan.sections as section, i}
          <div
            class="section-item"
            class:complete={currentSection && i < currentSection.sectionIndex}
            class:active={currentSection && i === currentSection.sectionIndex}
            class:pending={!currentSection || i > currentSection.sectionIndex}
          >
            <div class="section-status">
              {#if currentSection && i < currentSection.sectionIndex}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                </svg>
              {:else if currentSection && i === currentSection.sectionIndex}
                <div class="mini-spinner"></div>
              {:else}
                <span class="section-num">{i + 1}</span>
              {/if}
            </div>
            <div class="section-info">
              <span class="section-title">{section.title}</span>
              <span class="section-type">{section.type}</span>
            </div>
          </div>
        {/each}
      </div>

      {#if phase === 'generating' && currentSection}
        <div class="progress-bar-container">
          <div class="progress-bar" style="width: {getSectionProgress()}%"></div>
        </div>
      {/if}
    </div>
  {/if}

  {#if previewMarkdown && phase !== 'error'}
    <div class="preview-section">
      <h5>Preview</h5>
      <div class="markdown-preview">
        <pre>{previewMarkdown.slice(0, 500)}{previewMarkdown.length > 500 ? '...' : ''}</pre>
      </div>
    </div>
  {/if}
</div>

<style>
  .generation-progress {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .progress-header {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .phase-indicator {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #2a2a2a;
    color: #9ca3af;
  }

  .phase-indicator.active {
    background: rgba(96, 165, 250, 0.2);
    color: #60a5fa;
  }

  .phase-indicator.complete {
    background: rgba(34, 197, 94, 0.2);
    color: #22c55e;
  }

  .phase-indicator.error {
    background: rgba(239, 68, 68, 0.2);
    color: #ef4444;
  }

  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid currentColor;
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .phase-label {
    font-size: 15px;
    font-weight: 500;
    color: #e0e0e0;
  }

  .error-message {
    padding: 12px 16px;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 8px;
  }

  .error-message p {
    margin: 0;
    color: #ef4444;
    font-size: 14px;
  }

  .planning-preview {
    padding: 24px;
    background: #1e1e1e;
    border-radius: 8px;
    text-align: center;
  }

  .preview-hint {
    margin: 0;
    color: #9ca3af;
    font-size: 14px;
  }

  .plan-overview {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .plan-header h4 {
    margin: 0;
    font-size: 16px;
    color: #e0e0e0;
  }

  .plan-desc {
    margin: 4px 0 0;
    font-size: 13px;
    color: #9ca3af;
  }

  .sections-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .section-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    background: #1e1e1e;
    border-radius: 6px;
    border: 1px solid transparent;
    transition: all 0.2s;
  }

  .section-item.active {
    border-color: #60a5fa;
    background: rgba(96, 165, 250, 0.1);
  }

  .section-item.complete {
    opacity: 0.7;
  }

  .section-item.pending {
    opacity: 0.5;
  }

  .section-status {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: #2a2a2a;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .section-item.complete .section-status {
    background: rgba(34, 197, 94, 0.2);
    color: #22c55e;
  }

  .section-item.active .section-status {
    background: rgba(96, 165, 250, 0.2);
    color: #60a5fa;
  }

  .section-num {
    font-size: 11px;
    font-weight: 500;
    color: #6b7280;
  }

  .mini-spinner {
    width: 12px;
    height: 12px;
    border: 2px solid currentColor;
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  .section-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .section-title {
    font-size: 13px;
    color: #e0e0e0;
  }

  .section-type {
    font-size: 11px;
    color: #6b7280;
    text-transform: uppercase;
  }

  .progress-bar-container {
    height: 4px;
    background: #2a2a2a;
    border-radius: 2px;
    overflow: hidden;
  }

  .progress-bar {
    height: 100%;
    background: linear-gradient(90deg, #60a5fa, #a78bfa);
    border-radius: 2px;
    transition: width 0.3s ease;
  }

  .preview-section {
    margin-top: 8px;
  }

  .preview-section h5 {
    margin: 0 0 8px;
    font-size: 12px;
    font-weight: 600;
    color: #9ca3af;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .markdown-preview {
    padding: 12px;
    background: #1e1e1e;
    border-radius: 6px;
    max-height: 200px;
    overflow-y: auto;
  }

  .markdown-preview pre {
    margin: 0;
    font-size: 12px;
    color: #9ca3af;
    white-space: pre-wrap;
    word-break: break-word;
    font-family: 'JetBrains Mono', monospace;
  }
</style>
