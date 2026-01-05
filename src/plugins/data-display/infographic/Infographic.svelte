<script lang="ts">
  /**
   * Infographic Container Component
   *
   * The root container for infographic visualizations.
   * Provides:
   * - Theme context (ThemeColors)
   * - SVG defs for gradients
   * - Background rendering
   * - Responsive sizing
   */
  import { setContext } from 'svelte'
  import type { ThemeSeed, ThemeColors, ThemeConfig, GradientDef } from './theme'
  import {
    generateThemeColors,
    getPreset,
    DEFAULT_PRESET,
    shouldApplyGradient,
    createGradientDef,
    gradientDefToSVG
  } from './theme'

  interface Props {
    /** Width in pixels */
    width?: number
    /** Height in pixels */
    height?: number
    /** Theme preset name or custom ThemeSeed */
    theme?: string | ThemeSeed
    /** Theme configuration overrides */
    config?: ThemeConfig
    /** Additional CSS class */
    class?: string
    /** Padding in pixels */
    padding?: number
    /** Children content */
    children?: import('svelte').Snippet
  }

  let {
    width = 800,
    height = 400,
    theme = DEFAULT_PRESET,
    config,
    class: className = '',
    padding = 24,
    children
  }: Props = $props()

  // Generate theme colors from preset or seed
  const themeColors = $derived.by(() => {
    if (typeof theme === 'string') {
      const preset = getPreset(theme)
      if (preset) {
        return generateThemeColors(preset.seed)
      }
      // Fallback: treat as color hex
      return generateThemeColors({ colorPrimary: theme })
    }
    return generateThemeColors(theme)
  })

  // Merge config from preset and props
  const mergedConfig = $derived.by(() => {
    if (typeof theme === 'string') {
      const preset = getPreset(theme)
      return { ...preset?.config, ...config }
    }
    return config || {}
  })

  // Check if gradients are enabled
  const gradientsEnabled = $derived(shouldApplyGradient(mergedConfig?.stylize?.gradient))

  // Gradient config for child components
  const gradientConfig = $derived(
    mergedConfig?.stylize?.gradient === true ? {} : mergedConfig?.stylize?.gradient || undefined
  )

  // Set context for child components (no state mutation functions)
  setContext('infographic-theme', {
    get colors() { return themeColors },
    get config() { return mergedConfig },
    get gradientsEnabled() { return gradientsEnabled },
    get gradientConfig() { return gradientConfig }
  })

  // Content area dimensions
  const contentWidth = $derived(width - padding * 2)
  const contentHeight = $derived(height - padding * 2)
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 {width} {height}"
  {width}
  {height}
  class="infographic {className}"
  style:font-family="Inter, system-ui, sans-serif"
>
  <!-- Background -->
  <rect
    x="0"
    y="0"
    {width}
    {height}
    fill={themeColors.colorBg}
    rx="8"
  />

  <!-- Content area -->
  <g transform="translate({padding}, {padding})">
    {#if children}
      {@render children()}
    {/if}
  </g>
</svg>

<style>
  .infographic {
    display: block;
    max-width: 100%;
    height: auto;
  }
</style>
