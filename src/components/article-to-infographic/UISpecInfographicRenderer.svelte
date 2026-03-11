<script lang="ts">
  /**
   * UISpecInfographicRenderer
   *
   * Walks a UITree and renders each visible 'infographic-section' element
   * using InfographicSection.svelte.
   *
   * Supports:
   * - `visible` directive: static boolean or DynamicValue resolved via context
   * - `repeat` directive: renders element once per item in a state array
   * - Dynamic props: DynamicValue references resolved against context (T3)
   */
  import { untrack } from 'svelte'
  import { InfographicSection } from '@plugins/data-display/infographic-section'
  import { UIStateStore, resolveVisible, resolveDynamicValues } from '@core/viz'
  import type { UITree, UIElement } from '@/types/ui-tree'
  import type { InfographicSectionData } from '@plugins/data-display/infographic-section'

  interface Props {
    tree: UITree
    /** Optional initial state to seed the UIStateStore */
    initialState?: Record<string, unknown>
  }

  let { tree, initialState }: Props = $props()

  // Build the state store once, seeded from initialState prop.
  // untrack: intentional — we only want the seed value, not a reactive dependency.
  const store = untrack(() => new UIStateStore(initialState ?? {}))

  // Merged data context: tree.data (read-only) + store state
  const context = $derived(store.buildContext(tree.data ?? {}))

  const rootEl = $derived(tree.elements[tree.root])

  // Collect visible section elements, respecting the `visible` directive
  const sectionElements = $derived(
    (rootEl?.children ?? [])
      .map((key) => tree.elements[key])
      .filter((el): el is UIElement => {
        if (!el || el.type !== 'infographic-section') return false
        return resolveVisible(el.visible, context)
      })
  )

  // Layout props from root element
  const direction = $derived((rootEl?.props.direction as string) ?? 'top_to_bottom')
  const maxWidth = $derived((rootEl?.props.maxWidth as number) ?? 900)
  const gap = $derived((rootEl?.props.gap as number) ?? 24)
  const title = $derived(rootEl?.props.title as string | undefined)
  const isRow = $derived(direction === 'left_to_right')

  /**
   * Resolve props for a section element.
   * When called with a repeat item context, $item is injected.
   */
  function resolveElementData(
    el: UIElement,
    itemContext?: Record<string, unknown>
  ): InfographicSectionData {
    const resolveCtx = itemContext ? { ...context, $item: itemContext } : context
    const resolved = resolveDynamicValues(el.props, resolveCtx)
    return resolved.data as InfographicSectionData
  }

  /**
   * Expand a repeat directive into an array of item contexts.
   * Returns [undefined] (single render) when no repeat is present.
   */
  function getRepeatItems(el: UIElement): Array<Record<string, unknown> | undefined> {
    if (!el.repeat) return [undefined]
    const arr = store.get(el.repeat.statePath)
    if (!Array.isArray(arr)) return [undefined]
    return arr as Array<Record<string, unknown>>
  }

  interface RenderEntry {
    key: string
    el: UIElement
    itemCtx: Record<string, unknown> | undefined
  }

  const renderEntries = $derived<RenderEntry[]>(
    sectionElements.flatMap((el) => {
      const items = getRepeatItems(el)
      return items.map((itemCtx, i) => ({
        key: itemCtx ? `${el.key}-${i}` : el.key,
        el,
        itemCtx,
      }))
    })
  )
</script>

<div
  class="uitree-infographic"
  style:max-width="{maxWidth}px"
  style:gap="{gap}px"
  style:flex-direction={isRow ? 'row' : 'column'}
>
  {#if title}
    <h1 class="infographic-title">{title}</h1>
  {/if}

  {#each renderEntries as entry (entry.key)}
    <InfographicSection
      data={resolveElementData(entry.el, entry.itemCtx)}
    />
  {/each}
</div>

<style>
  .uitree-infographic {
    display: flex;
    flex-wrap: wrap;
    margin: 0 auto;
    width: 100%;
  }

  .infographic-title {
    width: 100%;
    font-size: 1.5rem;
    font-weight: 700;
    color: #f3f4f6;
    margin: 0 0 0.5rem;
    text-align: center;
  }
</style>
