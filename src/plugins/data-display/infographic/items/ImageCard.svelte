<script lang="ts">
  /**
   * ImageCard Item Component
   *
   * A card displaying an image with optional label, description, and overlay.
   * Supports various aspect ratios and image fit modes.
   *
   * @example
   * ```svelte
   * <ImageCard
   *   src="/images/photo.jpg"
   *   label="Product Photo"
   *   desc="High-quality product image"
   *   themeColors={colors}
   *   width={200}
   *   height={150}
   * />
   * ```
   */
  import type { ThemeColors } from '../theme'
  import { gradientUrl } from '../theme'

  /**
   * Image fit mode
   * - cover: Scale image to cover container (may crop)
   * - contain: Scale image to fit within container (may have gaps)
   * - fill: Stretch image to fill container
   */
  export type ImageFit = 'cover' | 'contain' | 'fill'

  /**
   * Label position
   */
  export type LabelPosition = 'top' | 'bottom' | 'overlay-top' | 'overlay-bottom'

  interface Props {
    /** Image source URL */
    src: string
    /** Alt text for accessibility */
    alt?: string
    /** Main label/title */
    label?: string
    /** Description text */
    desc?: string
    /** Theme colors */
    themeColors: ThemeColors
    /** Card width */
    width?: number
    /** Card height */
    height?: number
    /** Gradient ID */
    gradientId?: string
    /** Border radius */
    borderRadius?: number
    /** Image fit mode */
    fit?: ImageFit
    /** Label position */
    labelPosition?: LabelPosition
    /** Show border around image */
    showBorder?: boolean
    /** Overlay opacity (0-1) for overlay label positions */
    overlayOpacity?: number
    /** Placeholder color when image is loading */
    placeholderColor?: string
  }

  let {
    src,
    alt = '',
    label,
    desc,
    themeColors,
    width = 200,
    height = 150,
    gradientId,
    borderRadius = 8,
    fit = 'cover',
    labelPosition = 'bottom',
    showBorder = false,
    overlayOpacity = 0.7,
    placeholderColor
  }: Props = $props()

  // Layout calculations
  const isOverlay = $derived(
    labelPosition === 'overlay-top' || labelPosition === 'overlay-bottom'
  )
  const labelHeight = $derived(label || desc ? 40 : 0)
  const imageHeight = $derived(
    isOverlay ? height : height - labelHeight
  )
  const imageY = $derived(
    labelPosition === 'top' ? labelHeight : 0
  )

  // Label area position
  const labelAreaY = $derived.by(() => {
    switch (labelPosition) {
      case 'top':
        return 0
      case 'overlay-top':
        return 0
      case 'overlay-bottom':
        return height - labelHeight
      case 'bottom':
      default:
        return height - labelHeight
    }
  })

  // Image preserveAspectRatio based on fit
  const aspectRatio = $derived.by(() => {
    switch (fit) {
      case 'contain':
        return 'xMidYMid meet'
      case 'fill':
        return 'none'
      case 'cover':
      default:
        return 'xMidYMid slice'
    }
  })

  // Unique clip path ID
  const clipId = $derived(`img-clip-${Math.random().toString(36).slice(2, 8)}`)

  // Fill color for placeholder or border
  const borderFill = $derived(
    gradientId ? gradientUrl(gradientId) : themeColors.colorPrimary
  )
  const bgColor = $derived(
    placeholderColor || themeColors.colorBgElevated
  )
</script>

<g class="image-card">
  <!-- Clip path for rounded corners -->
  <defs>
    <clipPath id={clipId}>
      <rect
        x="0"
        y="0"
        {width}
        {height}
        rx={borderRadius}
      />
    </clipPath>
  </defs>

  <!-- Card background / placeholder -->
  <rect
    x="0"
    y="0"
    {width}
    {height}
    rx={borderRadius}
    fill={bgColor}
    stroke={showBorder ? borderFill : 'none'}
    stroke-width={showBorder ? 2 : 0}
  />

  <!-- Image -->
  <image
    href={src}
    x="0"
    y={imageY}
    {width}
    height={imageHeight}
    preserveAspectRatio={aspectRatio}
    clip-path="url(#{clipId})"
  >
    <title>{alt || label || 'Image'}</title>
  </image>

  <!-- Label area (non-overlay) -->
  {#if (label || desc) && !isOverlay}
    <rect
      x="0"
      y={labelAreaY}
      {width}
      height={labelHeight}
      fill={themeColors.colorBgElevated}
    />
    {#if label}
      <text
        x={width / 2}
        y={labelAreaY + (desc ? 14 : labelHeight / 2)}
        text-anchor="middle"
        dominant-baseline="middle"
        fill={themeColors.colorText}
        font-size="12"
        font-weight="600"
      >
        {label}
      </text>
    {/if}
    {#if desc}
      <text
        x={width / 2}
        y={labelAreaY + (label ? 28 : labelHeight / 2)}
        text-anchor="middle"
        dominant-baseline="middle"
        fill={themeColors.colorTextSecondary}
        font-size="10"
      >
        {desc}
      </text>
    {/if}
  {/if}

  <!-- Overlay label -->
  {#if (label || desc) && isOverlay}
    <rect
      x="0"
      y={labelAreaY}
      {width}
      height={labelHeight}
      fill={themeColors.colorBg}
      opacity={overlayOpacity}
    />
    {#if label}
      <text
        x={width / 2}
        y={labelAreaY + (desc ? 14 : labelHeight / 2)}
        text-anchor="middle"
        dominant-baseline="middle"
        fill={themeColors.colorWhite}
        font-size="12"
        font-weight="600"
      >
        {label}
      </text>
    {/if}
    {#if desc}
      <text
        x={width / 2}
        y={labelAreaY + (label ? 28 : labelHeight / 2)}
        text-anchor="middle"
        dominant-baseline="middle"
        fill={themeColors.colorTextSecondary}
        font-size="10"
      >
        {desc}
      </text>
    {/if}
  {/if}
</g>
