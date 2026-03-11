<script lang="ts">
  /**
   * StyleSelector - Multi-style selection overlay
   *
   * Displays 3 style variants for user selection:
   * - Executive: Minimal, conclusion-first
   * - Storytelling: Timeline, journey narrative
   * - Analytical: Comprehensive, detailed
   */
  import type { InfographicVariant, StyleVariantId } from '@core/ai/agents/infographic/types'
  import StyleCard from './StyleCard.svelte'

  interface Props {
    variants: InfographicVariant[]
    onSelect: (variant: InfographicVariant) => void
    onCancel: () => void
  }

  let { variants, onSelect, onCancel }: Props = $props()

  // Default to analytical (most complete)
  let selectedId = $state<StyleVariantId>('analytical')

  function handleSelect() {
    const selected = variants.find(v => v.id === selectedId)
    if (selected) {
      onSelect(selected)
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      onCancel()
    } else if (e.key === 'Enter') {
      handleSelect()
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="selector-overlay" role="dialog" aria-modal="true" aria-labelledby="selector-title">
  <div class="selector-container">
    <header class="selector-header">
      <h2 id="selector-title">Choose a Style</h2>
      <p class="selector-subtitle">Select the visual style that best fits your needs</p>
      <button class="close-btn" onclick={onCancel} aria-label="Close">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
    </header>

    <div class="style-grid">
      {#each variants as variant}
        <StyleCard
          {variant}
          selected={selectedId === variant.id}
          onSelect={() => selectedId = variant.id}
        />
      {/each}
    </div>

    <footer class="selector-footer">
      <button class="btn-secondary" onclick={onCancel}>
        Cancel
      </button>
      <button class="btn-primary" onclick={handleSelect}>
        Use This Style
      </button>
    </footer>
  </div>
</div>

<style>
  .selector-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 2rem;
    animation: fade-in 0.2s ease;
  }

  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .selector-container {
    background: #1a1a2e;
    border: 1px solid #2d2d44;
    border-radius: 16px;
    max-width: 900px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
    animation: slide-up 0.3s ease;
  }

  @keyframes slide-up {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .selector-header {
    position: relative;
    padding: 1.5rem 2rem;
    border-bottom: 1px solid #2d2d44;
    text-align: center;
  }

  .selector-header h2 {
    font-size: 1.5rem;
    font-weight: 600;
    color: #f0f0f0;
    margin: 0;
  }

  .selector-subtitle {
    font-size: 0.875rem;
    color: #888;
    margin: 0.5rem 0 0;
  }

  .close-btn {
    position: absolute;
    top: 1rem;
    right: 1rem;
    background: none;
    border: none;
    color: #666;
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 8px;
    transition: all 0.15s;
  }

  .close-btn:hover {
    color: #fff;
    background: rgba(255, 255, 255, 0.1);
  }

  .style-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    padding: 1.5rem 2rem;
  }

  .selector-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    padding: 1rem 2rem 1.5rem;
    border-top: 1px solid #2d2d44;
  }

  .btn-secondary,
  .btn-primary {
    padding: 0.625rem 1.25rem;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
  }

  .btn-secondary {
    background: transparent;
    border: 1px solid #3d3d5c;
    color: #aaa;
  }

  .btn-secondary:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: #4d4d6c;
    color: #fff;
  }

  .btn-primary {
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    border: none;
    color: #fff;
  }

  .btn-primary:hover {
    background: linear-gradient(135deg, #7c7ff5 0%, #9d78f8 100%);
    transform: translateY(-1px);
  }

  /* Responsive */
  @media (max-width: 768px) {
    .style-grid {
      grid-template-columns: 1fr;
    }

    .selector-container {
      margin: 1rem;
    }
  }
</style>
