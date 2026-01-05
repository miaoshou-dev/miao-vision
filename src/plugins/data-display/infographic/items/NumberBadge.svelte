<script lang="ts">
  /**
   * NumberBadge Item Component
   *
   * A circular badge displaying a number (step indicator, rank, etc.)
   * Commonly used in sequences, lists, and process flows.
   */
  import type { ThemeColors } from '../theme'
  import { gradientUrl } from '../theme'

  interface Props {
    /** Number to display */
    number: number | string
    /** Optional label below the number */
    label?: string
    /** Badge size */
    size?: number
    /** Theme colors */
    themeColors: ThemeColors
    /** Gradient ID if gradients enabled */
    gradientId?: string
    /** Variant style */
    variant?: 'filled' | 'outline' | 'subtle'
    /** Shape */
    shape?: 'circle' | 'rounded' | 'square'
  }

  let {
    number,
    label,
    size = 40,
    themeColors,
    gradientId,
    variant = 'filled',
    shape = 'circle'
  }: Props = $props()

  const fill = $derived(
    variant === 'filled'
      ? (gradientId ? gradientUrl(gradientId) : themeColors.colorPrimary)
      : variant === 'subtle'
        ? themeColors.colorPrimaryBg || 'rgba(255,255,255,0.1)'
        : 'none'
  )

  const stroke = $derived(
    variant === 'outline' || variant === 'subtle'
      ? themeColors.colorPrimary
      : 'none'
  )

  const textColor = $derived(
    variant === 'filled'
      ? themeColors.colorWhite
      : themeColors.colorPrimary
  )

  const radius = $derived(
    shape === 'circle' ? size / 2
    : shape === 'rounded' ? size / 4
    : size / 8
  )

  const displayNumber = $derived(
    typeof number === 'number' && number > 99 ? '99+' : String(number)
  )

  const fontSize = $derived(
    displayNumber.length > 2 ? size * 0.35 : size * 0.45
  )
</script>

<g class="number-badge">
  <!-- Badge background -->
  {#if shape === 'circle'}
    <circle
      cx={size / 2}
      cy={size / 2}
      r={size / 2 - 1}
      {fill}
      {stroke}
      stroke-width={variant === 'outline' ? 2 : 0}
    />
  {:else}
    <rect
      x="1"
      y="1"
      width={size - 2}
      height={size - 2}
      rx={radius}
      {fill}
      {stroke}
      stroke-width={variant === 'outline' ? 2 : 0}
    />
  {/if}

  <!-- Number -->
  <text
    x={size / 2}
    y={label ? size / 2 - 2 : size / 2}
    text-anchor="middle"
    dominant-baseline="middle"
    fill={textColor}
    font-size={fontSize}
    font-weight="700"
  >
    {displayNumber}
  </text>

  <!-- Label below -->
  {#if label}
    <text
      x={size / 2}
      y={size + 12}
      text-anchor="middle"
      fill={themeColors.colorText || '#fff'}
      font-size="10"
    >
      {label.length > 10 ? label.slice(0, 9) + '…' : label}
    </text>
  {/if}
</g>
