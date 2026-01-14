<script lang="ts">
  /**
   * PieDistribution Template Renderer
   *
   * Renders proportional distribution as a pie/donut chart.
   * Best for: Market share, budget allocation, percentage breakdown
   *
   * Structure: ListSector (with default label rendering)
   */
  import { ListSector } from '@plugins/data-display/infographic'
  import type { SectorItemData } from '../../adapters/sector-adapter'

  interface Props {
    items: SectorItemData[]
    width: number
    height: number
    palette?: string
  }

  let { items, width, height, palette }: Props = $props()

  // Convert SectorItemData[] to ListSector's expected format
  const sectorItems = $derived(
    items.map((item, index) => ({
      id: item.id || `sector-${index}`,
      label: item.label,
      value: item.value,
      color: item.color
    }))
  )

  // Calculate total value for center display
  const totalValue = $derived(
    items.reduce((sum, item) => sum + (item.value || 0), 0)
  )
</script>

<ListSector
  items={sectorItems}
  {width}
  {height}
  innerRadius={0.4}
  showLabels={true}
  labelPosition="outside"
  proportional={true}
  showCenter={true}
  centerLabel="Total"
  centerValue={totalValue > 0 ? String(Math.round(totalValue)) : undefined}
  {palette}
/>
