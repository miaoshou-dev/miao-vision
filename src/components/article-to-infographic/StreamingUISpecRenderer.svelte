<script lang="ts">
  /**
   * StreamingUISpecRenderer
   *
   * Renders a UITree that is built progressively via UITreePatch objects.
   * Each patch is applied in order, and the reactive `tree` triggers
   * a re-render after every section is added.
   *
   * Usage:
   *   1. Mount this component (starts empty).
   *   2. Call stream(asyncPatchGenerator) to start consuming patches.
   *   3. Sections appear one-by-one as patches arrive.
   */
  import { untrack } from 'svelte'
  import { applyPatch, emptyUITree } from '@core/viz'
  import UISpecInfographicRenderer from './UISpecInfographicRenderer.svelte'
  import type { UITreePatch } from '@core/viz'
  import type { UITree } from '@/types/ui-tree'

  interface Props {
    /** Optional initial tree (defaults to empty) */
    initialTree?: UITree
    /** Show a spinner while streaming */
    loading?: boolean
  }

  let { initialTree, loading = false }: Props = $props()

  // untrack: intentional seed — we don't want to re-init when prop changes
  let tree = $state<UITree>(untrack(() => initialTree ?? emptyUITree()))
  let isStreaming = $state(false)
  let sectionCount = $state(0)
  let isDone = $state(false)
  let doneVisible = $state(false)
  let _dismissTimer: ReturnType<typeof setTimeout> | null = null

  const hasContent = $derived(tree.root !== '' && Object.keys(tree.elements).length > 0)

  /**
   * Consume an async generator of UITreePatch objects, applying each one
   * to the tree. The reactive `tree` state triggers re-renders.
   */
  export async function stream(source: AsyncIterable<UITreePatch>): Promise<void> {
    isStreaming = true
    isDone = false
    doneVisible = false
    sectionCount = 0
    if (_dismissTimer) clearTimeout(_dismissTimer)

    try {
      for await (const patch of source) {
        tree = applyPatch(tree, patch)

        if (patch.op === 'appendChild') {
          sectionCount += 1
        }

        if (patch.op === 'complete') break
      }
    } finally {
      isStreaming = false
      isDone = true
      doneVisible = true
      // Auto-dismiss after 3s
      _dismissTimer = setTimeout(() => { doneVisible = false }, 3000)
    }
  }

  /**
   * Reset the tree to empty (or a provided initial state).
   */
  export function reset(newTree?: UITree): void {
    tree = newTree ?? emptyUITree()
    isStreaming = false
    isDone = false
    doneVisible = false
    sectionCount = 0
    if (_dismissTimer) clearTimeout(_dismissTimer)
  }
</script>

<div class="streaming-renderer">
  {#if hasContent}
    <UISpecInfographicRenderer {tree} />
  {/if}

  {#if isStreaming || (loading && !hasContent)}
    <div class="stream-status">
      <span class="spinner"></span>
      {#if sectionCount > 0}
        <span>{sectionCount} section{sectionCount !== 1 ? 's' : ''} loaded…</span>
      {:else}
        <span>Generating…</span>
      {/if}
    </div>
  {:else if isDone && doneVisible}
    <div class="stream-done">
      <svg class="done-icon" viewBox="0 0 16 16" width="14" height="14">
        <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" stroke-width="1.5"/>
        <path d="M5 8l2 2 4-4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span>{sectionCount} section{sectionCount !== 1 ? 's' : ''} generated</span>
    </div>
  {/if}
</div>

<style>
  .streaming-renderer {
    position: relative;
  }

  .stream-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    color: #9ca3af;
    font-size: 0.875rem;
  }

  .spinner {
    display: inline-block;
    width: 0.875rem;
    height: 0.875rem;
    border: 2px solid rgba(99, 102, 241, 0.3);
    border-top-color: #6366f1;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    flex-shrink: 0;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .stream-done {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    color: #4ade80;
    font-size: 0.8rem;
    animation: fade-out 0.5s ease 2.5s forwards;
  }

  .done-icon {
    flex-shrink: 0;
    color: #4ade80;
  }

  @keyframes fade-out {
    to { opacity: 0; }
  }
</style>
