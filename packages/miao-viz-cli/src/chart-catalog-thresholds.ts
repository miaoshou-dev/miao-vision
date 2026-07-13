export const CHART_THRESHOLDS = {
  bar: {
    warningMaxCategories: 12,
    hardMaxCategories: 30
  },
  pie: {
    maxSlices: 7
  },
  line: {
    minTimePeriods: 3
  },
  histogram: {
    minRows: 20
  },
  scatter: {
    minMeasures: 2
  }
} as const
