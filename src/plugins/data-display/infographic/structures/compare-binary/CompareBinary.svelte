<script lang="ts">
  /**
   * CompareBinary Structure Component
   *
   * Renders a left-right (VS) comparison layout.
   * Great for pros/cons, option A vs B, before/after.
   *
   * @example
   * ```svelte
   * <CompareBinary
   *   left={{ title: 'Option A', items: [...] }}
   *   right={{ title: 'Option B', items: [...] }}
   *   showVsDivider={true}
   * />
   * ```
   */
  import { getContext } from 'svelte'
  import type { ThemeColors, ThemeConfig, GradientConfig } from '../../theme'
  import { getPaletteColor, generateItemThemeColors, createGradientDef, gradientDefToSVG } from '../../theme'
  import { getIconPath } from '../../icons/mdi-paths'
  import type { CompareBinaryProps, CompareSideData } from './types'
  import { COMPARE_BINARY_DEFAULTS } from './types'

  interface InfographicContext {
    colors: ThemeColors
    config: ThemeConfig
    gradientsEnabled: boolean
    gradientConfig?: GradientConfig
  }

  interface Props extends CompareBinaryProps {
    /** Side rendering snippet */
    item?: import('svelte').Snippet<[{
      side: CompareSideData
      position: 'left' | 'right'
      themeColors: ThemeColors
      width: number
      height: number
      gradientId?: string
    }]>
  }

  let {
    left,
    right,
    width = COMPARE_BINARY_DEFAULTS.width,
    height = COMPARE_BINARY_DEFAULTS.height,
    showVsDivider = COMPARE_BINARY_DEFAULTS.showVsDivider,
    vsLabel = COMPARE_BINARY_DEFAULTS.vsLabel,
    gap = COMPARE_BINARY_DEFAULTS.gap,
    headerHeight = COMPARE_BINARY_DEFAULTS.headerHeight,
    palette,
    item: itemSnippet
  }: Props = $props()

  const ctx = getContext<InfographicContext>('infographic-theme')
  const instanceId = Math.random().toString(36).slice(2, 8)

  // Calculate dimensions
  const sideWidth = $derived((width - gap) / 2)
  const contentHeight = $derived(height - headerHeight)

  // Get theme colors for each side
  function getSideThemeColors(side: CompareSideData, index: number): ThemeColors {
    const color = side.color || getPaletteColor(palette || ctx?.config?.palette, index, 2)
    return generateItemThemeColors(color, ctx?.colors || {
      colorPrimary: color,
      colorPrimaryBg: '#1a1a2e',
      colorPrimaryText: '#ffffff',
      colorText: '#ffffff',
      colorTextSecondary: '#a0a0b0',
      colorWhite: '#ffffff',
      colorBg: '#1a1a2e',
      colorBgElevated: '#2a2a4a',
      isDarkMode: true
    })
  }

  const leftTheme = $derived(getSideThemeColors(left, 0))
  const rightTheme = $derived(getSideThemeColors(right, 1))

  // Generate gradient definitions
  const gradientDefs = $derived.by(() => {
    if (!ctx?.gradientsEnabled) return []
    return [
      createGradientDef(`grad-${instanceId}-left`, leftTheme.colorPrimary, ctx?.gradientConfig),
      createGradientDef(`grad-${instanceId}-right`, rightTheme.colorPrimary, ctx?.gradientConfig)
    ]
  })

  // Calculate item row height
  const maxItems = $derived(Math.max(left.items.length, right.items.length))
  const itemHeight = $derived(maxItems > 0 ? Math.min(40, (contentHeight - 20) / maxItems) : 40)

  // Get icon path helper
  function getIcon(iconName?: string): string | null {
    return iconName ? getIconPath(iconName) : null
  }
</script>

<g class="compare-binary">
  <!-- Gradient definitions -->
  <defs>
    {#each gradientDefs as gradDef}
      {@html gradientDefToSVG(gradDef)}
    {/each}
  </defs>

  <!-- Left side -->
  <g class="compare-left" transform="translate(0, 0)">
    {#if itemSnippet}
      {@render itemSnippet({
        side: left,
        position: 'left',
        themeColors: leftTheme,
        width: sideWidth,
        height,
        gradientId: ctx?.gradientsEnabled ? `grad-${instanceId}-left` : undefined
      })}
    {:else}
      <!-- Header -->
      <rect
        x="0"
        y="0"
        width={sideWidth}
        height={headerHeight}
        rx="8"
        fill={ctx?.gradientsEnabled ? `url(#grad-${instanceId}-left)` : leftTheme.colorPrimary}
      />
      {#if left.icon}
        {@const iconPath = getIcon(left.icon)}
        {#if iconPath}
          <g transform="translate({sideWidth / 2 - 12}, 12)">
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path d={iconPath} fill={leftTheme.colorWhite} />
            </svg>
          </g>
        {/if}
      {/if}
      <text
        x={sideWidth / 2}
        y={left.icon ? headerHeight - 20 : headerHeight / 2}
        text-anchor="middle"
        dominant-baseline="middle"
        fill={leftTheme.colorWhite}
        font-size="16"
        font-weight="700"
      >
        {left.title}
      </text>
      {#if left.subtitle}
        <text
          x={sideWidth / 2}
          y={headerHeight - 8}
          text-anchor="middle"
          fill={leftTheme.colorWhite}
          font-size="11"
          opacity="0.8"
        >
          {left.subtitle}
        </text>
      {/if}

      <!-- Content area -->
      <rect
        x="0"
        y={headerHeight + 8}
        width={sideWidth}
        height={contentHeight - 8}
        rx="8"
        fill={ctx?.colors?.colorBgElevated || '#2a2a4a'}
      />

      <!-- Items -->
      {#each left.items as item, i}
        {@const itemY = headerHeight + 16 + i * itemHeight}
        {@const itemIcon = getIcon(item.icon)}
        <g transform="translate(12, {itemY})">
          {#if itemIcon}
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path d={itemIcon} fill={leftTheme.colorPrimary} />
            </svg>
          {:else}
            <circle cx="8" cy="8" r="4" fill={leftTheme.colorPrimary} />
          {/if}
          <text
            x="24"
            y="12"
            fill={ctx?.colors?.colorText || '#fff'}
            font-size="12"
          >
            {item.text.length > 25 ? item.text.slice(0, 24) + '…' : item.text}
          </text>
        </g>
      {/each}
    {/if}
  </g>

  <!-- Right side -->
  <g class="compare-right" transform="translate({sideWidth + gap}, 0)">
    {#if itemSnippet}
      {@render itemSnippet({
        side: right,
        position: 'right',
        themeColors: rightTheme,
        width: sideWidth,
        height,
        gradientId: ctx?.gradientsEnabled ? `grad-${instanceId}-right` : undefined
      })}
    {:else}
      <!-- Header -->
      <rect
        x="0"
        y="0"
        width={sideWidth}
        height={headerHeight}
        rx="8"
        fill={ctx?.gradientsEnabled ? `url(#grad-${instanceId}-right)` : rightTheme.colorPrimary}
      />
      {#if right.icon}
        {@const iconPath = getIcon(right.icon)}
        {#if iconPath}
          <g transform="translate({sideWidth / 2 - 12}, 12)">
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path d={iconPath} fill={rightTheme.colorWhite} />
            </svg>
          </g>
        {/if}
      {/if}
      <text
        x={sideWidth / 2}
        y={right.icon ? headerHeight - 20 : headerHeight / 2}
        text-anchor="middle"
        dominant-baseline="middle"
        fill={rightTheme.colorWhite}
        font-size="16"
        font-weight="700"
      >
        {right.title}
      </text>
      {#if right.subtitle}
        <text
          x={sideWidth / 2}
          y={headerHeight - 8}
          text-anchor="middle"
          fill={rightTheme.colorWhite}
          font-size="11"
          opacity="0.8"
        >
          {right.subtitle}
        </text>
      {/if}

      <!-- Content area -->
      <rect
        x="0"
        y={headerHeight + 8}
        width={sideWidth}
        height={contentHeight - 8}
        rx="8"
        fill={ctx?.colors?.colorBgElevated || '#2a2a4a'}
      />

      <!-- Items -->
      {#each right.items as item, i}
        {@const itemY = headerHeight + 16 + i * itemHeight}
        {@const itemIcon = getIcon(item.icon)}
        <g transform="translate(12, {itemY})">
          {#if itemIcon}
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path d={itemIcon} fill={rightTheme.colorPrimary} />
            </svg>
          {:else}
            <circle cx="8" cy="8" r="4" fill={rightTheme.colorPrimary} />
          {/if}
          <text
            x="24"
            y="12"
            fill={ctx?.colors?.colorText || '#fff'}
            font-size="12"
          >
            {item.text.length > 25 ? item.text.slice(0, 24) + '…' : item.text}
          </text>
        </g>
      {/each}
    {/if}
  </g>

  <!-- VS Divider -->
  {#if showVsDivider}
    <g class="vs-divider" transform="translate({width / 2}, {height / 2})">
      <circle
        cx="0"
        cy="0"
        r="24"
        fill={ctx?.colors?.colorBgElevated || '#2a2a4a'}
        stroke={ctx?.colors?.colorTextSecondary || '#666'}
        stroke-width="2"
      />
      <text
        x="0"
        y="0"
        text-anchor="middle"
        dominant-baseline="middle"
        fill={ctx?.colors?.colorText || '#fff'}
        font-size="14"
        font-weight="700"
      >
        {vsLabel}
      </text>
    </g>
  {/if}
</g>
