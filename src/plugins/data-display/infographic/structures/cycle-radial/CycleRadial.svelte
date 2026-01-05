<script lang="ts">
  /**
   * CycleRadial Structure Component
   *
   * Renders items in a circular cycle with connecting arrows.
   * Great for PDCA cycles, life cycles, process loops.
   *
   * @example
   * ```svelte
   * <CycleRadial
   *   items={pdcaItems}
   *   showArrows={true}
   *   showCenter={true}
   *   centerLabel="PDCA"
   * />
   * ```
   */
  import { getContext } from 'svelte'
  import type { ThemeColors, ThemeConfig, GradientConfig } from '../../theme'
  import { getPaletteColor, generateItemThemeColors, createGradientDef, gradientDefToSVG } from '../../theme'
  import type { CycleItem, CycleRadialProps, NodePosition } from './types'
  import { CYCLE_RADIAL_DEFAULTS } from './types'

  interface InfographicContext {
    colors: ThemeColors
    config: ThemeConfig
    gradientsEnabled: boolean
    gradientConfig?: GradientConfig
  }

  interface Props extends CycleRadialProps {
    /** Item rendering snippet */
    item?: import('svelte').Snippet<[{
      item: CycleItem
      position: NodePosition
      themeColors: ThemeColors
      width: number
      height: number
      gradientId?: string
    }]>
  }

  let {
    items,
    width = CYCLE_RADIAL_DEFAULTS.width,
    height = CYCLE_RADIAL_DEFAULTS.height,
    radiusRatio = CYCLE_RADIAL_DEFAULTS.radiusRatio,
    startAngle = CYCLE_RADIAL_DEFAULTS.startAngle,
    showArrows = CYCLE_RADIAL_DEFAULTS.showArrows,
    arrowStyle = CYCLE_RADIAL_DEFAULTS.arrowStyle,
    showCenter = CYCLE_RADIAL_DEFAULTS.showCenter,
    centerLabel,
    centerDesc,
    nodeSize = CYCLE_RADIAL_DEFAULTS.nodeSize,
    palette,
    item: itemSnippet
  }: Props = $props()

  const ctx = getContext<InfographicContext>('infographic-theme')
  const instanceId = Math.random().toString(36).slice(2, 8)

  // Calculate center and radius
  const centerX = $derived(width / 2)
  const centerY = $derived(height / 2)
  const radius = $derived(Math.min(width, height) / 2 * radiusRatio)

  // Calculate node positions around the circle
  const nodePositions = $derived.by(() => {
    const count = items.length
    if (count === 0) return []

    const angleStep = 360 / count
    const positions: NodePosition[] = []

    items.forEach((item, index) => {
      const angle = startAngle + index * angleStep
      const angleRad = (angle * Math.PI) / 180
      const x = centerX + radius * Math.cos(angleRad)
      const y = centerY + radius * Math.sin(angleRad)

      const color = item.color || getPaletteColor(palette || ctx?.config?.palette, index, count)
      const themeColors = generateItemThemeColors(color, ctx?.colors || {
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

      const gradientId = ctx?.gradientsEnabled ? `grad-${instanceId}-${index}` : undefined

      positions.push({
        item,
        index,
        x,
        y,
        angle,
        themeColors,
        gradientId
      })
    })

    return positions
  })

  // Generate gradient definitions
  const gradientDefs = $derived.by(() => {
    if (!ctx?.gradientsEnabled) return []
    return nodePositions
      .filter(p => p.gradientId)
      .map(p => createGradientDef(p.gradientId!, p.themeColors.colorPrimary, ctx?.gradientConfig))
  })

  // Generate arrow path between two nodes - follows circular arc
  function getArrowPath(from: NodePosition, to: NodePosition): string {
    // Start point: on the circle, offset clockwise from the from node
    const startAngle = from.angle + 30
    const startAngleRad = (startAngle * Math.PI) / 180
    const startX = centerX + radius * Math.cos(startAngleRad)
    const startY = centerY + radius * Math.sin(startAngleRad)

    // End point: on the circle, offset counter-clockwise from the to node
    const endAngle = to.angle - 30
    const endAngleRad = (endAngle * Math.PI) / 180
    const endX = centerX + radius * Math.cos(endAngleRad)
    const endY = centerY + radius * Math.sin(endAngleRad)

    if (arrowStyle === 'straight') {
      return `M ${startX} ${startY} L ${endX} ${endY}`
    }

    // Use SVG arc command to draw along the circle
    // A rx ry x-axis-rotation large-arc-flag sweep-flag x y
    // sweep-flag = 1 means clockwise
    return `M ${startX} ${startY} A ${radius} ${radius} 0 0 1 ${endX} ${endY}`
  }

  // Arrow marker ID
  const arrowMarkerId = `arrow-${instanceId}`
</script>

<g class="cycle-radial">
  <!-- Definitions -->
  <defs>
    <!-- Arrow marker -->
    <marker
      id={arrowMarkerId}
      markerWidth="10"
      markerHeight="10"
      refX="9"
      refY="3"
      orient="auto"
      markerUnits="strokeWidth"
    >
      <path d="M0,0 L0,6 L9,3 z" fill={ctx?.colors?.colorTextSecondary || '#666'} />
    </marker>
    <!-- Gradient definitions -->
    {#each gradientDefs as gradDef}
      {@html gradientDefToSVG(gradDef)}
    {/each}
  </defs>

  <!-- Connection arrows -->
  {#if showArrows && arrowStyle !== 'none' && items.length > 1}
    <g class="cycle-arrows">
      {#each nodePositions as pos, i}
        {@const nextPos = nodePositions[(i + 1) % nodePositions.length]}
        <path
          d={getArrowPath(pos, nextPos)}
          fill="none"
          stroke={ctx?.colors?.colorTextSecondary || '#666'}
          stroke-width="2"
          stroke-linecap="round"
          marker-end="url(#{arrowMarkerId})"
        />
      {/each}
    </g>
  {/if}

  <!-- Center element -->
  {#if showCenter}
    <g class="cycle-center">
      <circle
        cx={centerX}
        cy={centerY}
        r={nodeSize * 0.6}
        fill={ctx?.colors?.colorBgElevated || '#2a2a4a'}
        stroke={ctx?.colors?.colorTextSecondary || '#666'}
        stroke-width="2"
      />
      {#if centerLabel}
        <text
          x={centerX}
          y={centerDesc ? centerY - 8 : centerY}
          text-anchor="middle"
          dominant-baseline="middle"
          fill={ctx?.colors?.colorText || '#fff'}
          font-size="14"
          font-weight="600"
        >
          {centerLabel}
        </text>
      {/if}
      {#if centerDesc}
        <text
          x={centerX}
          y={centerY + 10}
          text-anchor="middle"
          dominant-baseline="middle"
          fill={ctx?.colors?.colorTextSecondary || '#a0a0b0'}
          font-size="11"
        >
          {centerDesc}
        </text>
      {/if}
    </g>
  {/if}

  <!-- Nodes -->
  <g class="cycle-nodes">
    {#each nodePositions as pos}
      <g transform="translate({pos.x - nodeSize / 2}, {pos.y - nodeSize / 2})">
        {#if itemSnippet}
          {@render itemSnippet({
            item: pos.item,
            position: pos,
            themeColors: pos.themeColors,
            width: nodeSize,
            height: nodeSize,
            gradientId: pos.gradientId
          })}
        {:else}
          <!-- Default circular node -->
          {@const hasDesc = pos.item.desc && nodeSize >= 70}
          <circle
            cx={nodeSize / 2}
            cy={nodeSize / 2}
            r={nodeSize / 2 - 2}
            fill={pos.gradientId ? `url(#${pos.gradientId})` : pos.themeColors.colorPrimary}
          />
          <text
            x={nodeSize / 2}
            y={hasDesc ? nodeSize / 2 - 8 : nodeSize / 2}
            text-anchor="middle"
            dominant-baseline="middle"
            fill={pos.themeColors.colorWhite}
            font-size={Math.min(13, nodeSize / 6)}
            font-weight="600"
          >
            {pos.item.label.length > 10 ? pos.item.label.slice(0, 9) + '…' : pos.item.label}
          </text>
          {#if hasDesc && pos.item.desc}
            <text
              x={nodeSize / 2}
              y={nodeSize / 2 + 10}
              text-anchor="middle"
              dominant-baseline="middle"
              fill={pos.themeColors.colorTextSecondary}
              font-size={Math.min(10, nodeSize / 8)}
            >
              {pos.item.desc.length > 12 ? pos.item.desc.slice(0, 11) + '…' : pos.item.desc}
            </text>
          {/if}
        {/if}
      </g>
    {/each}
  </g>
</g>
