<script lang="ts">
  /**
   * KpiRowBadge Template Renderer
   *
   * Renders KPI metrics in a horizontal row using BadgeCard items.
   * Best for: Key metrics display (revenue, users, growth rates)
   *
   * Structure: ListRowHorizontal + BadgeCard
   */
  import { ListRowHorizontal, BadgeCard } from '@plugins/data-display/infographic'
  import type { RowItem } from '../../adapters/row-adapter'

  interface Props {
    items: RowItem[]
    width: number
    height: number
    palette?: string
  }

  let { items, width, height, palette }: Props = $props()

  // Add trend icon to item if trend is specified
  function getTrendIcon(trend?: string): string | undefined {
    if (trend === 'up') return 'trending-up'
    if (trend === 'down') return 'trending-down'
    if (trend === 'flat') return 'minus'
    return undefined
  }
</script>

<ListRowHorizontal
  {items}
  {width}
  {height}
  showArrows={false}
  {palette}
>
  {#snippet item({ data, themeColors, width: itemWidth, height: itemHeight, gradientId })}
    {#if data}
      {@const rowData = data as RowItem}
      <BadgeCard
        label={rowData.label || ''}
        value={rowData.value !== undefined ? String(rowData.value) : undefined}
        desc={rowData.desc || rowData.trend || ''}
        icon={rowData.icon || getTrendIcon(rowData.trend)}
        {themeColors}
        width={itemWidth}
        height={itemHeight}
        {gradientId}
      />
    {/if}
  {/snippet}
</ListRowHorizontal>
