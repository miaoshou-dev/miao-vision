/**
 * SequenceSnake Layout Calculations
 *
 * Pure functions for calculating snake/serpentine sequence positions.
 * All functions are side-effect free and easily testable.
 *
 * @module plugins/data-display/infographic/structures/sequence-snake/layout
 */

import type {
  SnakeItem,
  SnakeItemLayout,
  SnakeConnection,
  SnakeLayout
} from './types'
import { SEQUENCE_SNAKE_DEFAULTS } from './types'
import type { ThemeColors, Palette } from '../../theme'
import { getPaletteColor, generateItemThemeColors } from '../../theme'

/**
 * Calculate the number of rows needed for the snake layout
 *
 * @param itemCount - Total number of items
 * @param itemsPerRow - Items per row
 * @returns Number of rows
 */
export function calculateRowCount(itemCount: number, itemsPerRow: number): number {
  return Math.ceil(itemCount / itemsPerRow)
}

/**
 * Calculate row and column for an item index
 *
 * @param index - Item index (0-based)
 * @param itemsPerRow - Items per row
 * @returns { row, column, isReversed }
 */
export function getItemPosition(
  index: number,
  itemsPerRow: number
): { row: number; column: number; isReversed: boolean } {
  const row = Math.floor(index / itemsPerRow)
  const positionInRow = index % itemsPerRow
  const isReversed = row % 2 === 1 // Odd rows are reversed

  // For reversed rows, flip the column position
  const column = isReversed
    ? itemsPerRow - 1 - positionInRow
    : positionInRow

  return { row, column, isReversed }
}

/**
 * Calculate X position for an item
 *
 * @param column - Column index
 * @param itemWidth - Width of each item
 * @param horizontalGap - Gap between items horizontally
 * @returns X coordinate
 */
export function calculateItemX(
  column: number,
  itemWidth: number,
  horizontalGap: number
): number {
  return column * (itemWidth + horizontalGap)
}

/**
 * Calculate Y position for an item
 *
 * @param row - Row index
 * @param itemHeight - Height of each item
 * @param verticalGap - Gap between rows
 * @returns Y coordinate
 */
export function calculateItemY(
  row: number,
  itemHeight: number,
  verticalGap: number
): number {
  return row * (itemHeight + verticalGap)
}

/**
 * Generate connection path between two items
 *
 * @param from - Source item layout
 * @param to - Target item layout
 * @param lineStyle - Line style (straight or curved)
 * @returns SVG path data and connection type
 */
export function generateConnectionPath(
  from: SnakeItemLayout,
  to: SnakeItemLayout,
  lineStyle: 'straight' | 'curved'
): { pathData: string; type: 'horizontal' | 'vertical' | 'turn' } {
  const fromCenterX = from.x + from.width / 2
  const fromCenterY = from.y + from.height / 2
  const toCenterX = to.x + to.width / 2
  const toCenterY = to.y + to.height / 2

  // Determine connection type
  const sameRow = from.row === to.row
  const type: 'horizontal' | 'vertical' | 'turn' = sameRow
    ? 'horizontal'
    : from.column === to.column
      ? 'vertical'
      : 'turn'

  // Calculate connection points (edge of items)
  let startX: number, startY: number, endX: number, endY: number

  if (sameRow) {
    // Horizontal connection
    if (fromCenterX < toCenterX) {
      startX = from.x + from.width
      endX = to.x
    } else {
      startX = from.x
      endX = to.x + to.width
    }
    startY = fromCenterY
    endY = toCenterY
  } else {
    // Vertical or turn connection
    startX = fromCenterX
    startY = from.y + from.height
    endX = toCenterX
    endY = to.y
  }

  let pathData: string

  if (type === 'horizontal') {
    if (lineStyle === 'straight') {
      pathData = `M ${startX} ${startY} L ${endX} ${endY}`
    } else {
      // Curved horizontal
      const midX = (startX + endX) / 2
      pathData = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`
    }
  } else if (type === 'turn') {
    // Turn connection (end of row to start of next row)
    const midY = (startY + endY) / 2

    if (lineStyle === 'straight') {
      pathData = `M ${startX} ${startY} L ${startX} ${midY} L ${endX} ${midY} L ${endX} ${endY}`
    } else {
      // Curved turn - S-curve
      pathData = `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`
    }
  } else {
    // Vertical connection
    if (lineStyle === 'straight') {
      pathData = `M ${startX} ${startY} L ${endX} ${endY}`
    } else {
      const midY = (startY + endY) / 2
      pathData = `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`
    }
  }

  return { pathData, type }
}

/**
 * Calculate complete snake layout
 *
 * @param items - Items to layout
 * @param options - Layout options
 * @returns Complete layout with all positions and connections
 */
export function calculateSnakeLayout(
  items: SnakeItem[],
  options: {
    width?: number
    height?: number
    itemsPerRow?: number
    horizontalGap?: number
    verticalGap?: number
    itemWidth?: number
    itemHeight?: number
    showConnections?: boolean
    lineStyle?: 'straight' | 'curved'
    palette?: Palette
    baseColors: ThemeColors
    gradientsEnabled?: boolean
    instanceId?: string
  }
): SnakeLayout {
  const {
    itemsPerRow = SEQUENCE_SNAKE_DEFAULTS.itemsPerRow,
    horizontalGap = SEQUENCE_SNAKE_DEFAULTS.horizontalGap,
    verticalGap = SEQUENCE_SNAKE_DEFAULTS.verticalGap,
    itemWidth = SEQUENCE_SNAKE_DEFAULTS.itemWidth,
    itemHeight = SEQUENCE_SNAKE_DEFAULTS.itemHeight,
    showConnections = SEQUENCE_SNAKE_DEFAULTS.showConnections,
    lineStyle = SEQUENCE_SNAKE_DEFAULTS.lineStyle,
    palette,
    baseColors,
    gradientsEnabled = false,
    instanceId = 'snake'
  } = options

  const rowCount = calculateRowCount(items.length, itemsPerRow)
  const itemLayouts: SnakeItemLayout[] = []
  const connections: SnakeConnection[] = []

  // Calculate item positions
  items.forEach((item, index) => {
    const { row, column, isReversed } = getItemPosition(index, itemsPerRow)
    const x = calculateItemX(column, itemWidth, horizontalGap)
    const y = calculateItemY(row, itemHeight, verticalGap)

    const color = item.color || getPaletteColor(palette, index, items.length)
    const themeColors = generateItemThemeColors(color, baseColors)
    const gradientId = gradientsEnabled ? `grad-${instanceId}-${index}` : undefined

    itemLayouts.push({
      item,
      index,
      x,
      y,
      width: itemWidth,
      height: itemHeight,
      row,
      column,
      isReversed,
      themeColors,
      gradientId
    })
  })

  // Calculate connections between adjacent items
  if (showConnections && itemLayouts.length > 1) {
    for (let i = 0; i < itemLayouts.length - 1; i++) {
      const from = itemLayouts[i]
      const to = itemLayouts[i + 1]
      const { pathData, type } = generateConnectionPath(from, to, lineStyle)

      connections.push({
        from,
        to,
        pathData,
        type
      })
    }
  }

  // Calculate total dimensions
  const totalWidth = itemsPerRow * itemWidth + (itemsPerRow - 1) * horizontalGap
  const totalHeight = rowCount * itemHeight + (rowCount - 1) * verticalGap

  return {
    items: itemLayouts,
    connections,
    rowCount,
    itemsPerRow,
    totalWidth,
    totalHeight
  }
}

/**
 * Find item at a given point
 *
 * @param x - X coordinate
 * @param y - Y coordinate
 * @param layout - Snake layout
 * @returns Item index or -1 if not found
 */
export function findItemAtPoint(
  x: number,
  y: number,
  layout: SnakeLayout
): number {
  for (const item of layout.items) {
    if (
      x >= item.x &&
      x <= item.x + item.width &&
      y >= item.y &&
      y <= item.y + item.height
    ) {
      return item.index
    }
  }
  return -1
}

/**
 * Get items in a specific row
 *
 * @param layout - Snake layout
 * @param row - Row index
 * @returns Items in that row (in display order, not original order)
 */
export function getItemsInRow(
  layout: SnakeLayout,
  row: number
): SnakeItemLayout[] {
  return layout.items
    .filter((item) => item.row === row)
    .sort((a, b) => a.column - b.column)
}

/**
 * Check if an item is at the end of a row (where a turn happens)
 *
 * @param index - Item index
 * @param itemsPerRow - Items per row
 * @param totalItems - Total number of items
 * @returns True if item is at row end
 */
export function isRowEnd(
  index: number,
  itemsPerRow: number,
  totalItems: number
): boolean {
  // Not row end if it's the last item
  if (index === totalItems - 1) return false

  // Row end if next item is on a different row
  const currentRow = Math.floor(index / itemsPerRow)
  const nextRow = Math.floor((index + 1) / itemsPerRow)

  return currentRow !== nextRow
}
