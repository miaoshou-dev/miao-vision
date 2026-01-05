<script lang="ts">
  /**
   * CompareTable Structure
   *
   * Comparison table for feature/option comparisons.
   * Supports checkmarks, values, and custom cell rendering.
   */
  import { getContext } from 'svelte'
  import type { ThemeColors } from '../../theme'
  import { getIconPath } from '../../icons'
  import type { CompareTableProps, CellLayout, TableColumn } from './types'

  let {
    columns = [],
    rows = [],
    showRowNumbers = false,
    striped = true,
    headerStyle = 'filled',
    cellPadding = 12,
    rowHeight = 44,
    headerHeight = 52,
    showBorders = true,
    cell,
    width = 700,
    height
  }: CompareTableProps = $props()

  // Get theme from context
  const themeColors = getContext<ThemeColors>('infographic-theme')

  // Calculate dimensions
  const labelColumnWidth = 150
  const totalWidth = $derived(width)
  const calculatedHeight = $derived(height || headerHeight + rows.length * rowHeight + 20)

  // Calculate column widths
  const columnWidths = $derived.by(() => {
    const totalWeight = columns.reduce((sum, col) => sum + (col.width || 1), 0)
    const availableWidth = totalWidth - labelColumnWidth - (showRowNumbers ? 40 : 0)
    return columns.map(col => (col.width || 1) / totalWeight * availableWidth)
  })

  // Calculate column X positions
  const columnXPositions = $derived.by(() => {
    const positions: number[] = []
    let x = labelColumnWidth + (showRowNumbers ? 40 : 0)
    columns.forEach((_, i) => {
      positions.push(x)
      x += columnWidths[i]
    })
    return positions
  })

  // Format cell value
  function formatCellValue(value: string | number | boolean): { text: string; isCheck: boolean; isX: boolean } {
    if (typeof value === 'boolean') {
      return { text: '', isCheck: value, isX: !value }
    }
    if (value === '✓' || value === 'yes' || value === 'true') {
      return { text: '', isCheck: true, isX: false }
    }
    if (value === '✗' || value === 'no' || value === 'false' || value === '-') {
      return { text: '', isCheck: false, isX: true }
    }
    return { text: String(value), isCheck: false, isX: false }
  }

  // Get header background based on style
  function getHeaderBg(): string {
    switch (headerStyle) {
      case 'filled': return themeColors.colorPrimary
      case 'underline': return 'transparent'
      case 'minimal': return 'transparent'
      default: return themeColors.colorPrimary
    }
  }

  // Get header text color
  function getHeaderTextColor(): string {
    return headerStyle === 'filled' ? 'white' : themeColors.colorText
  }

  // Get row background
  function getRowBg(index: number, highlight: boolean): string {
    if (highlight) return `${themeColors.colorPrimary}20`
    if (striped && index % 2 === 1) return `${themeColors.colorTextSecondary}10`
    return 'transparent'
  }
</script>

<svg width={totalWidth} height={calculatedHeight} viewBox="0 0 {totalWidth} {calculatedHeight}">
  <!-- Header row -->
  <g class="header">
    <!-- Header background -->
    {#if headerStyle === 'filled'}
      <rect
        x="0"
        y="0"
        width={totalWidth}
        height={headerHeight}
        fill={getHeaderBg()}
        rx="6"
      />
    {/if}

    <!-- Row number header -->
    {#if showRowNumbers}
      <text
        x="20"
        y={headerHeight / 2 + 5}
        text-anchor="middle"
        fill={getHeaderTextColor()}
        font-size="12"
        font-weight="600"
      >
        #
      </text>
    {/if}

    <!-- Label column header -->
    <text
      x={(showRowNumbers ? 40 : 0) + cellPadding}
      y={headerHeight / 2 + 5}
      text-anchor="start"
      fill={getHeaderTextColor()}
      font-size="13"
      font-weight="600"
    >
      Feature
    </text>

    <!-- Column headers -->
    {#each columns as col, i}
      <g transform="translate({columnXPositions[i]}, 0)">
        {#if col.icon}
          <path
            d={getIconPath(col.icon)}
            transform="translate({columnWidths[i] / 2 - 10}, {headerHeight / 2 - 16}) scale(0.85)"
            fill={col.color || getHeaderTextColor()}
          />
          <text
            x={columnWidths[i] / 2}
            y={headerHeight / 2 + 16}
            text-anchor="middle"
            fill={getHeaderTextColor()}
            font-size="12"
            font-weight="600"
          >
            {col.header}
          </text>
        {:else}
          <text
            x={columnWidths[i] / 2}
            y={headerHeight / 2 + 5}
            text-anchor="middle"
            fill={col.color || getHeaderTextColor()}
            font-size="13"
            font-weight="600"
          >
            {col.header}
          </text>
        {/if}
      </g>
    {/each}

    <!-- Header underline -->
    {#if headerStyle === 'underline'}
      <line
        x1="0"
        y1={headerHeight}
        x2={totalWidth}
        y2={headerHeight}
        stroke={themeColors.colorPrimary}
        stroke-width="2"
      />
    {/if}
  </g>

  <!-- Data rows -->
  {#each rows as row, rowIndex}
    {@const y = headerHeight + rowIndex * rowHeight}
    <g class="row">
      <!-- Row background -->
      <rect
        x="0"
        y={y}
        width={totalWidth}
        height={rowHeight}
        fill={getRowBg(rowIndex, row.highlight || false)}
      />

      <!-- Row number -->
      {#if showRowNumbers}
        <text
          x="20"
          y={y + rowHeight / 2 + 5}
          text-anchor="middle"
          fill={themeColors.colorTextSecondary}
          font-size="11"
        >
          {rowIndex + 1}
        </text>
      {/if}

      <!-- Row label -->
      <text
        x={(showRowNumbers ? 40 : 0) + cellPadding}
        y={y + rowHeight / 2 + 5}
        text-anchor="start"
        fill={themeColors.colorText}
        font-size="13"
        font-weight={row.highlight ? '600' : '400'}
      >
        {row.label}
      </text>

      <!-- Cell values -->
      {#each columns as col, colIndex}
        {@const value = row.values[col.id]}
        {@const formatted = formatCellValue(value)}
        {@const cellX = columnXPositions[colIndex]}

        {#if cell}
          {@render cell({
            column: col,
            row,
            value,
            rowIndex,
            colIndex,
            x: cellX,
            y,
            width: columnWidths[colIndex],
            height: rowHeight,
            themeColors
          })}
        {:else}
          <g transform="translate({cellX}, {y})">
            {#if formatted.isCheck}
              <!-- Checkmark -->
              <circle
                cx={columnWidths[colIndex] / 2}
                cy={rowHeight / 2}
                r="10"
                fill={themeColors.colorPrimary}
                opacity="0.15"
              />
              <path
                d="M-4 0 L-1 3 L4 -3"
                transform="translate({columnWidths[colIndex] / 2}, {rowHeight / 2})"
                stroke={themeColors.colorPrimary}
                stroke-width="2"
                fill="none"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            {:else if formatted.isX}
              <!-- X mark -->
              <circle
                cx={columnWidths[colIndex] / 2}
                cy={rowHeight / 2}
                r="10"
                fill={themeColors.colorTextSecondary}
                opacity="0.1"
              />
              <path
                d="M-3 -3 L3 3 M3 -3 L-3 3"
                transform="translate({columnWidths[colIndex] / 2}, {rowHeight / 2})"
                stroke={themeColors.colorTextSecondary}
                stroke-width="1.5"
                fill="none"
                stroke-linecap="round"
              />
            {:else}
              <!-- Text value -->
              <text
                x={columnWidths[colIndex] / 2}
                y={rowHeight / 2 + 5}
                text-anchor="middle"
                fill={themeColors.colorText}
                font-size="12"
              >
                {formatted.text}
              </text>
            {/if}
          </g>
        {/if}
      {/each}

      <!-- Row border -->
      {#if showBorders}
        <line
          x1="0"
          y1={y + rowHeight}
          x2={totalWidth}
          y2={y + rowHeight}
          stroke={themeColors.colorTextSecondary}
          stroke-opacity="0.15"
        />
      {/if}
    </g>
  {/each}

  <!-- Outer border -->
  {#if showBorders}
    <rect
      x="0"
      y="0"
      width={totalWidth}
      height={calculatedHeight}
      fill="none"
      stroke={themeColors.colorTextSecondary}
      stroke-opacity="0.2"
      rx="6"
    />
  {/if}
</svg>
