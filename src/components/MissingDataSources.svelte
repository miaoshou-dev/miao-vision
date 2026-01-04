<script lang="ts">
  interface Props {
    missingTables: string[]
    onDismiss?: () => void
  }

  let { missingTables, onDismiss }: Props = $props()
</script>

<div class="missing-data-warning">
  <div class="warning-icon">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
    </svg>
  </div>
  <div class="warning-content">
    <h4>Data Sources Not Found</h4>
    <p>The following data sources are required but not loaded:</p>
    <ul class="missing-list">
      {#each missingTables as table}
        <li><code>{table}</code></li>
      {/each}
    </ul>
    <p class="hint">Please upload the required data files to view this report.</p>
  </div>
  {#if onDismiss}
    <button class="dismiss-btn" onclick={onDismiss} aria-label="Dismiss">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
      </svg>
    </button>
  {/if}
</div>

<style>
  .missing-data-warning {
    display: flex;
    gap: 16px;
    padding: 16px 20px;
    background: rgba(251, 191, 36, 0.1);
    border: 1px solid rgba(251, 191, 36, 0.3);
    border-radius: 8px;
    margin-bottom: 20px;
  }

  .warning-icon {
    color: #fbbf24;
    flex-shrink: 0;
  }

  .warning-content {
    flex: 1;
  }

  .warning-content h4 {
    margin: 0 0 8px;
    font-size: 14px;
    font-weight: 600;
    color: #fbbf24;
  }

  .warning-content p {
    margin: 0 0 8px;
    font-size: 13px;
    color: #d0d0d0;
  }

  .missing-list {
    margin: 8px 0;
    padding-left: 20px;
  }

  .missing-list li {
    margin: 4px 0;
    color: #d0d0d0;
    font-size: 13px;
  }

  .missing-list code {
    background: rgba(0, 0, 0, 0.3);
    padding: 2px 6px;
    border-radius: 4px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    color: #fbbf24;
  }

  .hint {
    font-style: italic;
    color: #9ca3af !important;
  }

  .dismiss-btn {
    background: none;
    border: none;
    color: #9ca3af;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    transition: all 0.2s;
    align-self: flex-start;
  }

  .dismiss-btn:hover {
    color: #e0e0e0;
    background: rgba(255, 255, 255, 0.1);
  }
</style>
