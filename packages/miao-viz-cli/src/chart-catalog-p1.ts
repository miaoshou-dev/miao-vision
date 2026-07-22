import type { ChartCatalogItem } from './chart-catalog-types'

export const P1_CHART_CATALOG: ChartCatalogItem[] = [
  {
    id: 'pareto', displayName: 'Pareto Chart', compactFor: 'ranking,cumulative', requires: 'dimension+nonnegative measure', transformRecipe: 'agg>sort(desc)', avoid: 'negative_values,unsorted',
    requiredEncodings: ['x', 'y'], allowedTransforms: ['aggregate', 'sort', 'limit', 'filter'], intents: ['ranking', 'composition'],
    fallback: [{ chartType: 'bar', variant: 'horizontal', reason: 'Use ranked bars when cumulative contribution is not meaningful.' }],
    bestFor: ['ranked contribution and cumulative share'], antiPatterns: ['negative values', 'unordered rows'], rules: []
  },
  {
    id: 'combo-bar-line', displayName: 'Bar + Line Combo', compactFor: 'scale+rate', requires: 'ordered dimension+two measures with different units', transformRecipe: 'agg>sort(asc)', avoid: 'same_units,missing_axis_labels',
    requiredEncodings: ['x', 'y', 'lineY'], allowedTransforms: ['aggregate', 'sort', 'limit', 'filter'], intents: ['trend', 'comparison'],
    fallback: [{ chartType: 'bar', reason: 'Split into separate bar and line charts when unit compatibility is unclear.' }],
    bestFor: ['volume and rate over the same ordered dimension'], antiPatterns: ['two measures with the same unit', 'more than two quantitative scales'], rules: []
  }
]
