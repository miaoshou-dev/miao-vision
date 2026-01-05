<script lang="ts">
  /**
   * Icon Component
   *
   * Renders MDI icons as inline SVG.
   * Supports custom size, color, and additional styles.
   */
  import { getIconPath } from './mdi-paths'

  interface Props {
    /** Icon name from MDI set */
    name: string
    /** Icon size in pixels (default: 24) */
    size?: number
    /** Icon color (default: currentColor) */
    color?: string
    /** Additional CSS class */
    class?: string
    /** Rotation in degrees */
    rotate?: number
    /** Flip horizontal */
    flipH?: boolean
    /** Flip vertical */
    flipV?: boolean
  }

  let {
    name,
    size = 24,
    color = 'currentColor',
    class: className = '',
    rotate = 0,
    flipH = false,
    flipV = false
  }: Props = $props()

  const path = $derived(getIconPath(name))

  const transform = $derived(() => {
    const transforms: string[] = []
    if (rotate !== 0) {
      transforms.push(`rotate(${rotate} 12 12)`)
    }
    if (flipH) {
      transforms.push('scale(-1, 1) translate(-24, 0)')
    }
    if (flipV) {
      transforms.push('scale(1, -1) translate(0, -24)')
    }
    return transforms.length > 0 ? transforms.join(' ') : undefined
  })
</script>

{#if path}
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width={size}
    height={size}
    class="infographic-icon {className}"
    aria-hidden="true"
  >
    <path
      d={path}
      fill={color}
      transform={transform()}
    />
  </svg>
{:else}
  <!-- Fallback: show placeholder for unknown icons -->
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width={size}
    height={size}
    class="infographic-icon infographic-icon--missing {className}"
    aria-hidden="true"
  >
    <rect
      x="2"
      y="2"
      width="20"
      height="20"
      rx="2"
      fill="none"
      stroke={color}
      stroke-width="2"
      stroke-dasharray="4"
    />
    <text
      x="12"
      y="16"
      text-anchor="middle"
      fill={color}
      font-size="10"
    >?</text>
  </svg>
{/if}

<style>
  .infographic-icon {
    display: inline-block;
    vertical-align: middle;
    flex-shrink: 0;
  }

  .infographic-icon--missing {
    opacity: 0.5;
  }
</style>
