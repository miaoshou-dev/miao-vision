<script lang="ts">
  /**
   * StyleCard - Individual style variant card
   *
   * Shows preview, name, description, and selection state
   */
  import type { InfographicVariant } from '@core/ai/agents/infographic/types'

  interface Props {
    variant: InfographicVariant
    selected: boolean
    onSelect: () => void
  }

  let { variant, selected, onSelect }: Props = $props()

  // Style-specific icons and colors
  const styleConfig = {
    executive: {
      icon: '📊',
      gradient: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
      accentColor: '#3b82f6'
    },
    storytelling: {
      icon: '📈',
      gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
      accentColor: '#06b6d4'
    },
    analytical: {
      icon: '🔍',
      gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
      accentColor: '#8b5cf6'
    }
  }

  const config = $derived(styleConfig[variant.id])
</script>

<button
  class="style-card"
  class:selected
  onclick={onSelect}
  style="--accent-color: {config.accentColor}; --gradient: {config.gradient}"
>
  <!-- Preview thumbnail -->
  <div class="card-preview">
    <div class="preview-icon">{config.icon}</div>
    <div class="preview-sections">
      {#each variant.infographic.sections.slice(0, 3) as section, i}
        <div
          class="preview-section"
          class:kpi={section.templateId.includes('kpi') || section.templateId.includes('badge')}
          class:flow={section.templateId.includes('flow') || section.templateId.includes('timeline')}
          class:grid={section.templateId.includes('grid') || section.templateId.includes('compare')}
          style="animation-delay: {i * 0.1}s"
        >
          {#if section.templateId.includes('kpi') || section.templateId.includes('badge')}
            <div class="mini-kpi">
              {#each Array(Math.min(section.items.length, 3)) as _, j}
                <div class="mini-box"></div>
              {/each}
            </div>
          {:else if section.templateId.includes('flow') || section.templateId.includes('timeline')}
            <div class="mini-flow">
              {#each Array(Math.min(section.items.length, 4)) as _, j}
                <div class="mini-dot"></div>
                {#if j < Math.min(section.items.length, 4) - 1}
                  <div class="mini-line"></div>
                {/if}
              {/each}
            </div>
          {:else}
            <div class="mini-grid">
              {#each Array(Math.min(section.items.length, 4)) as _}
                <div class="mini-cell"></div>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  </div>

  <!-- Card info -->
  <div class="card-info">
    <h3 class="card-title">{variant.name}</h3>
    <p class="card-description">{variant.description}</p>

    <div class="card-meta">
      <span class="meta-item">
        <span class="meta-icon">📑</span>
        {variant.preview.sectionCount} sections
      </span>
      {#if variant.preview.hasKPI}
        <span class="meta-tag">KPI</span>
      {/if}
      {#if variant.preview.hasTimeline}
        <span class="meta-tag">Timeline</span>
      {/if}
      {#if variant.preview.hasComparison}
        <span class="meta-tag">Compare</span>
      {/if}
    </div>
  </div>

  <!-- Selection indicator -->
  <div class="selection-indicator">
    {#if selected}
      <div class="check-circle">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M13.5 4.5L6 12L2.5 8.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
    {:else}
      <div class="empty-circle"></div>
    {/if}
  </div>
</button>

<style>
  .style-card {
    position: relative;
    display: flex;
    flex-direction: column;
    background: #232338;
    border: 2px solid #2d2d44;
    border-radius: 12px;
    padding: 1rem;
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: left;
  }

  .style-card:hover {
    border-color: #3d3d5c;
    transform: translateY(-2px);
  }

  .style-card.selected {
    border-color: var(--accent-color);
    background: linear-gradient(180deg, rgba(99, 102, 241, 0.1) 0%, transparent 100%);
  }

  .card-preview {
    position: relative;
    background: #1a1a2e;
    border-radius: 8px;
    padding: 1rem;
    min-height: 100px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  .preview-icon {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    font-size: 1.25rem;
    opacity: 0.6;
  }

  .preview-sections {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    width: 100%;
  }

  .preview-section {
    animation: fade-slide-in 0.3s ease forwards;
    opacity: 0;
  }

  @keyframes fade-slide-in {
    from {
      opacity: 0;
      transform: translateY(4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .mini-kpi {
    display: flex;
    gap: 0.375rem;
    justify-content: center;
  }

  .mini-box {
    width: 32px;
    height: 24px;
    background: var(--gradient);
    border-radius: 4px;
    opacity: 0.7;
  }

  .mini-flow {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0;
  }

  .mini-dot {
    width: 12px;
    height: 12px;
    background: var(--gradient);
    border-radius: 50%;
    opacity: 0.8;
  }

  .mini-line {
    width: 16px;
    height: 2px;
    background: var(--accent-color);
    opacity: 0.5;
  }

  .mini-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.25rem;
    max-width: 80px;
    margin: 0 auto;
  }

  .mini-cell {
    width: 100%;
    aspect-ratio: 1.5;
    background: var(--gradient);
    border-radius: 3px;
    opacity: 0.6;
  }

  .card-info {
    padding-top: 0.75rem;
  }

  .card-title {
    font-size: 1rem;
    font-weight: 600;
    color: #f0f0f0;
    margin: 0;
  }

  .card-description {
    font-size: 0.8125rem;
    color: #888;
    margin: 0.375rem 0 0;
    line-height: 1.4;
  }

  .card-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.75rem;
  }

  .meta-item {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.75rem;
    color: #666;
  }

  .meta-icon {
    font-size: 0.875rem;
  }

  .meta-tag {
    font-size: 0.625rem;
    padding: 0.125rem 0.375rem;
    background: rgba(99, 102, 241, 0.2);
    color: #a5b4fc;
    border-radius: 4px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .selection-indicator {
    position: absolute;
    top: 0.75rem;
    left: 0.75rem;
  }

  .check-circle {
    width: 24px;
    height: 24px;
    background: var(--gradient);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    animation: pop-in 0.2s ease;
  }

  @keyframes pop-in {
    0% { transform: scale(0); }
    70% { transform: scale(1.1); }
    100% { transform: scale(1); }
  }

  .empty-circle {
    width: 24px;
    height: 24px;
    border: 2px solid #3d3d5c;
    border-radius: 50%;
    transition: border-color 0.15s;
  }

  .style-card:hover .empty-circle {
    border-color: #4d4d6c;
  }
</style>
