<script lang="ts">
  /**
   * InfographicRenderer Component
   *
   * Markdown-integrated renderer that wraps the Infographic system.
   * Used by the component registry for ```infographic blocks.
   */
  import Infographic from './Infographic.svelte'
  import { ListRowHorizontal, ListZigzag } from './structures'
  import { IconArrowNode, BadgeCard, ValueCard } from './items'
  import type { InfographicItem, InfographicConfig } from './definition'
  import type { ThemeColors } from './theme'

  interface Props {
    items: InfographicItem[]
    config: InfographicConfig
  }

  let { items, config }: Props = $props()

  // Calculate dimensions based on item count
  const calculatedWidth = $derived(config.width || Math.min(900, 120 * items.length + 100))
  const calculatedHeight = $derived(() => {
    if (config.layout === 'zigzag') {
      const rows = Math.ceil(items.length / 4)
      return config.height || Math.max(200, rows * 120 + 40)
    }
    return config.height || 200
  })

  // Content dimensions (accounting for padding)
  const padding = 24
  const contentWidth = $derived(calculatedWidth - padding * 2)
  const contentHeight = $derived(calculatedHeight() - padding * 2)
</script>

<div class="infographic-renderer">
  <Infographic
    theme={config.theme}
    width={calculatedWidth}
    height={calculatedHeight()}
    {padding}
  >
    {#if config.layout === 'zigzag'}
      <ListZigzag
        {items}
        width={contentWidth}
        height={contentHeight}
        palette={config.palette}
        showConnectors={config.showArrows}
      >
        {#snippet item({ data, themeColors, width, height, gradientId })}
          {#if config.itemType === 'badge-card'}
            <BadgeCard
              label={data.label}
              desc={data.desc}
              value={data.value}
              icon={data.icon}
              {themeColors}
              {width}
              {height}
              {gradientId}
            />
          {:else if config.itemType === 'value-card'}
            <ValueCard
              label={data.label}
              value={data.value ?? data.label}
              desc={data.desc}
              icon={data.icon}
              {themeColors}
              {width}
              {height}
              {gradientId}
            />
          {:else}
            <IconArrowNode
              label={data.label}
              desc={data.desc}
              icon={data.icon}
              {themeColors}
              {width}
              {height}
              {gradientId}
            />
          {/if}
        {/snippet}
      </ListZigzag>
    {:else}
      <ListRowHorizontal
        {items}
        width={contentWidth}
        height={contentHeight}
        showArrows={config.showArrows}
        palette={config.palette}
      >
        {#snippet item({ data, themeColors, width, height, gradientId })}
          {#if config.itemType === 'badge-card'}
            <BadgeCard
              label={data.label}
              desc={data.desc}
              value={data.value}
              icon={data.icon}
              {themeColors}
              {width}
              {height}
              {gradientId}
            />
          {:else if config.itemType === 'value-card'}
            <ValueCard
              label={data.label}
              value={data.value ?? data.label}
              desc={data.desc}
              icon={data.icon}
              {themeColors}
              {width}
              {height}
              {gradientId}
            />
          {:else}
            <IconArrowNode
              label={data.label}
              desc={data.desc}
              icon={data.icon}
              {themeColors}
              {width}
              {height}
              {gradientId}
            />
          {/if}
        {/snippet}
      </ListRowHorizontal>
    {/if}
  </Infographic>
</div>

<style>
  .infographic-renderer {
    display: flex;
    justify-content: center;
    padding: 1rem 0;
  }
</style>
