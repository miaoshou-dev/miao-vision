export const CATEGORY_AXIS_LAYOUT_DEFAULTS = {
  estimatedCharacterWidth: 7,
  minimumLabelGap: 12,
  horizontalBottomMargin: 48,
  rotatedBottomMargin: 88,
  horizontalMaxLength: 18,
  rotatedMaxLength: 18,
  rotationDegrees: -35
} as const

export interface CategoryAxisLayout {
  rotate: boolean
  bottomMargin: number
  maxLabelLength: number
  rotationDegrees: number
}

export function computeCategoryAxisLayout(
  labels: string[],
  plotWidth: number,
  forceRotate = false
): CategoryAxisLayout {
  const config = CATEGORY_AXIS_LAYOUT_DEFAULTS
  const slotWidth = plotWidth / Math.max(labels.length, 1)
  const longest = labels.reduce((max, label) => Math.max(max, label.length), 0)
  const estimatedWidth = longest * config.estimatedCharacterWidth
  const rotate = forceRotate || estimatedWidth + config.minimumLabelGap > slotWidth
  const horizontalFit = Math.max(4, Math.floor((slotWidth - config.minimumLabelGap) / config.estimatedCharacterWidth))
  return {
    rotate,
    bottomMargin: rotate ? config.rotatedBottomMargin : config.horizontalBottomMargin,
    maxLabelLength: rotate ? config.rotatedMaxLength : Math.min(config.horizontalMaxLength, horizontalFit),
    rotationDegrees: config.rotationDegrees
  }
}
