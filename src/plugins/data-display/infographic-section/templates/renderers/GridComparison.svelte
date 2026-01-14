<script lang="ts">
  /**
   * GridComparison Template Renderer
   *
   * Renders items in a grid layout using BadgeCard items.
   * Best for: Feature comparison, multi-metric display, category overview
   *
   * Structure: ListGrid + BadgeCard
   */
  import { ListGrid, BadgeCard } from '@plugins/data-display/infographic'
  import type { GridItem } from '../../adapters/grid-adapter'

  interface Props {
    items: GridItem[]
    width: number
    height: number
    palette?: string
  }

  let { items, width, height, palette }: Props = $props()

  // Calculate optimal column count based on item count
  const columns = $derived(
    items.length <= 2 ? items.length :
    items.length <= 4 ? 2 :
    items.length <= 6 ? 3 :
    4
  )
</script>

<ListGrid
  {items}
  {width}
  {height}
  {columns}
  {palette}
>
  {#snippet item({ data, themeColors, width: itemWidth, height: itemHeight, gradientId })}
    {#if data}
      <BadgeCard
        label={data.label || ''}
        value={data.value !== undefined ? String(data.value) : undefined}
        desc={data.desc || ''}
        icon={data.icon}
        {themeColors}
        width={itemWidth}
        height={itemHeight}
        {gradientId}
      />
    {/if}
  {/snippet}
</ListGrid>
