<script lang="ts">
  import './VersionCompare.css'
  import type { ReportVersion } from '@/types/version'
  import { versionStore } from '@app/stores/version.svelte'
  import { compareVersions, getDiffSummary, compareMarkdownStructure } from '@core/version'

  interface Props {
    /** Report ID to show versions for */
    reportId: string

    /** Show/hide modal */
    show?: boolean

    /** Optional: Pre-selected version to compare from */
    fromVersion?: ReportVersion

    /** Optional: Pre-selected version to compare to */
    toVersion?: ReportVersion

    /** Callback when dialog is closed */
    onClose?: () => void
  }

  let { reportId, show = $bindable(false), fromVersion, toVersion, onClose }: Props = $props()

  // Local state
  let selectedFrom = $state<ReportVersion | null>(fromVersion || null)
  let selectedTo = $state<ReportVersion | null>(toVersion || null)
  let showStructuralDiff = $state(false)
  let viewMode = $state<'side-by-side' | 'inline'>('side-by-side')

  // Computed diff result
  let diffResult = $derived.by(() => {
    if (selectedFrom && selectedTo) {
      return compareVersions(selectedFrom, selectedTo, {
        semanticCleanup: true,
        ignoreWhitespace: false
      })
    }
    return null
  })

  // Computed markdown structural diff
  let markdownDiff = $derived.by(() => {
    if (selectedFrom && selectedTo && showStructuralDiff) {
      return compareMarkdownStructure(selectedFrom, selectedTo)
    }
    return null
  })

  // Computed diff summary
  let diffSummary = $derived.by(() => {
    if (diffResult) {
      return getDiffSummary(diffResult, markdownDiff || undefined)
    }
    return ''
  })

  let originalLines = $derived(selectedFrom ? selectedFrom.content.split('\n') : [])
  let modifiedLines = $derived(selectedTo ? selectedTo.content.split('\n') : [])
  let inlineLines = $derived.by(() => {
    const maxLines = Math.max(originalLines.length, modifiedLines.length)
    return Array.from({ length: maxLines }, (_, index) => ({
      index,
      original: originalLines[index],
      modified: modifiedLines[index]
    }))
  })

  function lineClass(original: string | undefined, modified: string | undefined): string {
    if (original === undefined && modified !== undefined) return 'added'
    if (original !== undefined && modified === undefined) return 'removed'
    if (original !== modified) return 'modified'
    return ''
  }

  // Format timestamp
  function formatTimestamp(date: Date): string {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Load versions when report ID changes
  $effect(() => {
    if (reportId && show) {
      versionStore.loadVersions(reportId)
    }
  })

  // Set initial selections if provided
  $effect(() => {
    if (fromVersion) selectedFrom = fromVersion
    if (toVersion) selectedTo = toVersion
  })

  function handleClose() {
    show = false
    onClose?.()
  }
</script>

{#if show}
  <div class="modal-overlay" onclick={handleClose}>
    <div class="modal-dialog" onclick={(e) => e.stopPropagation()}>
      <div class="version-compare">
        <header class="compare-header">
          <h2>Compare Versions</h2>
          <button class="close-btn" onclick={handleClose} title="Close">
            ✕
          </button>
        </header>

  <div class="compare-content">
    <!-- Version Selectors -->
    <div class="version-selectors">
      <div class="selector-group">
        <label for="from-version">Compare from (older):</label>
        <select
          id="from-version"
          class="version-select"
          value={selectedFrom?.id || ''}
          onchange={(e) => {
            const version = versionStore.state.versions.find(v => v.id === e.currentTarget.value)
            selectedFrom = version || null
          }}
        >
          <option value="">Select version...</option>
          {#each versionStore.state.versions as version}
            <option value={version.id}>
              v{version.version} - {formatTimestamp(version.timestamp)}
              {#if version.metadata.description}
                - {version.metadata.description}
              {/if}
            </option>
          {/each}
        </select>
      </div>

      <div class="selector-arrow">→</div>

      <div class="selector-group">
        <label for="to-version">Compare to (newer):</label>
        <select
          id="to-version"
          class="version-select"
          value={selectedTo?.id || ''}
          onchange={(e) => {
            const version = versionStore.state.versions.find(v => v.id === e.currentTarget.value)
            selectedTo = version || null
          }}
        >
          <option value="">Select version...</option>
          {#each versionStore.state.versions as version}
            <option value={version.id}>
              v{version.version} - {formatTimestamp(version.timestamp)}
              {#if version.metadata.description}
                - {version.metadata.description}
              {/if}
            </option>
          {/each}
        </select>
      </div>
    </div>

    <!-- Diff Options -->
    {#if selectedFrom && selectedTo}
      <div class="diff-options">
        <div class="diff-stats">
          <span class="stats-label">Changes:</span>
          <span class="stats-value">{diffSummary}</span>
          <span class="stats-detail">
            {diffResult?.stats.changePercentage.toFixed(1)}% modified
          </span>
        </div>

        <div class="options-controls">
          <button
            type="button"
            class="option-btn"
            class:active={viewMode === 'side-by-side'}
            onclick={() => viewMode = 'side-by-side'}
          >
            Side-by-side
          </button>
          <button
            type="button"
            class="option-btn"
            class:active={viewMode === 'inline'}
            onclick={() => viewMode = 'inline'}
          >
            Inline
          </button>
          <button
            type="button"
            class="option-btn"
            class:active={showStructuralDiff}
            onclick={() => showStructuralDiff = !showStructuralDiff}
          >
            Structural Diff
          </button>
        </div>
      </div>
    {/if}

    <!-- Diff Viewer -->
    <div class="diff-viewer">
      {#if !selectedFrom || !selectedTo}
        <div class="empty-state">
          <div class="empty-icon">⇄</div>
          <div class="empty-title">Select Two Versions to Compare</div>
          <div class="empty-hint">
            Choose an older version (from) and a newer version (to) to see the differences
          </div>
        </div>
      {:else}
        <div class="text-diff-container">
          {#if viewMode === 'side-by-side'}
            <div class="text-diff-grid">
              <section class="text-diff-pane">
                <div class="diff-pane-header">From v{selectedFrom.version}</div>
                <pre class="diff-code">{#each inlineLines as line}<span class:modified={lineClass(line.original, line.modified) === 'modified'} class:removed={lineClass(line.original, line.modified) === 'removed'}>{line.original ?? ''}</span>{'\n'}{/each}</pre>
              </section>
              <section class="text-diff-pane">
                <div class="diff-pane-header">To v{selectedTo.version}</div>
                <pre class="diff-code">{#each inlineLines as line}<span class:modified={lineClass(line.original, line.modified) === 'modified'} class:added={lineClass(line.original, line.modified) === 'added'}>{line.modified ?? ''}</span>{'\n'}{/each}</pre>
              </section>
            </div>
          {:else}
            <pre class="diff-code inline">{#each inlineLines as line}{@const cls = lineClass(line.original, line.modified)}{#if cls === 'added'}<span class="added">+ {line.modified}</span>{'\n'}{:else if cls === 'removed'}<span class="removed">- {line.original}</span>{'\n'}{:else if cls === 'modified'}<span class="removed">- {line.original}</span>{'\n'}<span class="added">+ {line.modified}</span>{'\n'}{:else}<span>  {line.original}</span>{'\n'}{/if}{/each}</pre>
          {/if}
        </div>

        <!-- Structural Diff Panel -->
        {#if showStructuralDiff && markdownDiff}
          <div class="structural-diff-panel">
            <h3>Structural Changes</h3>

            <!-- Headings -->
            {#if markdownDiff.headings.added.length > 0 || markdownDiff.headings.removed.length > 0 || markdownDiff.headings.modified.length > 0}
              <div class="diff-section">
                <h4>Headings</h4>
                {#if markdownDiff.headings.added.length > 0}
                  <div class="diff-group added">
                    <span class="diff-label">Added ({markdownDiff.headings.added.length}):</span>
                    <ul>
                      {#each markdownDiff.headings.added as heading}
                        <li>{'#'.repeat(heading.level)} {heading.text}</li>
                      {/each}
                    </ul>
                  </div>
                {/if}
                {#if markdownDiff.headings.removed.length > 0}
                  <div class="diff-group removed">
                    <span class="diff-label">Removed ({markdownDiff.headings.removed.length}):</span>
                    <ul>
                      {#each markdownDiff.headings.removed as heading}
                        <li>{'#'.repeat(heading.level)} {heading.text}</li>
                      {/each}
                    </ul>
                  </div>
                {/if}
                {#if markdownDiff.headings.modified.length > 0}
                  <div class="diff-group modified">
                    <span class="diff-label">Modified ({markdownDiff.headings.modified.length}):</span>
                    <ul>
                      {#each markdownDiff.headings.modified as heading}
                        <li>
                          <span class="old-text">{heading.oldText}</span>
                          →
                          <span class="new-text">{heading.newText}</span>
                        </li>
                      {/each}
                    </ul>
                  </div>
                {/if}
              </div>
            {/if}

            <!-- Code Blocks (SQL) -->
            {#if markdownDiff.codeBlocks.added.length > 0 || markdownDiff.codeBlocks.removed.length > 0}
              <div class="diff-section">
                <h4>Code Blocks</h4>
                {#if markdownDiff.codeBlocks.added.length > 0}
                  <div class="diff-group added">
                    <span class="diff-label">Added ({markdownDiff.codeBlocks.added.length}):</span>
                    <ul>
                      {#each markdownDiff.codeBlocks.added as block}
                        <li>
                          <code>{block.lang}</code> block
                        </li>
                      {/each}
                    </ul>
                  </div>
                {/if}
                {#if markdownDiff.codeBlocks.removed.length > 0}
                  <div class="diff-group removed">
                    <span class="diff-label">Removed ({markdownDiff.codeBlocks.removed.length}):</span>
                    <ul>
                      {#each markdownDiff.codeBlocks.removed as block}
                        <li>
                          <code>{block.lang}</code> block
                        </li>
                      {/each}
                    </ul>
                  </div>
                {/if}
              </div>
            {/if}

            <!-- Components -->
            {#if markdownDiff.components.added.length > 0 || markdownDiff.components.removed.length > 0}
              <div class="diff-section">
                <h4>Components</h4>
                {#if markdownDiff.components.added.length > 0}
                  <div class="diff-group added">
                    <span class="diff-label">Added ({markdownDiff.components.added.length}):</span>
                    <ul>
                      {#each markdownDiff.components.added as comp}
                        <li>&lt;{comp} /&gt;</li>
                      {/each}
                    </ul>
                  </div>
                {/if}
                {#if markdownDiff.components.removed.length > 0}
                  <div class="diff-group removed">
                    <span class="diff-label">Removed ({markdownDiff.components.removed.length}):</span>
                    <ul>
                      {#each markdownDiff.components.removed as comp}
                        <li>&lt;{comp} /&gt;</li>
                      {/each}
                    </ul>
                  </div>
                {/if}
              </div>
            {/if}
          </div>
        {/if}
      {/if}
    </div>
  </div>
      </div>
    </div>
  </div>
{/if}

