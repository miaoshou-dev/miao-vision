import type { ChartCatalogItem } from './chart-catalog-types'

export const P0_CHART_CATALOG: ChartCatalogItem[] = [
  {
    id: 'dot', displayName: 'Dot Plot', compactFor: 'compare,change,rank', requires: 'dimension+measure',
    transformRecipe: 'agg>sort', avoid: 'dim>30', requiredEncodings: ['x', 'y'],
    allowedTransforms: ['aggregate', 'sort', 'limit', 'filter'], intents: ['comparison', 'ranking', 'change'],
    variants: [
      { id: 'standard', requires: 'dimension+measure', bestFor: ['compact comparison'] },
      { id: 'lollipop', requires: 'dimension+measure', bestFor: ['ranked values with a visible zero baseline'] },
      { id: 'dumbbell', requiredEncodings: ['x', 'start', 'end'], requires: 'dimension+two comparable measures', bestFor: ['two-period or two-group comparison'], avoid: ['more than 20 categories'] }
    ],
    fallback: [{ chartType: 'bar', variant: 'grouped', reason: 'Use grouped bars when the two endpoints cannot be validated.' }],
    bestFor: ['category comparison', 'two-period change'], antiPatterns: ['more than 30 categories'], rules: []
  },
  {
    id: 'bullet', displayName: 'Bullet Chart', compactFor: 'target,attainment', requires: 'value+target',
    transformRecipe: 'single_value', avoid: 'missing_target', requiredEncodings: ['value', 'target'],
    allowedTransforms: ['aggregate', 'filter'], intents: ['summary', 'target-attainment'],
    variants: [{ id: 'standard', requires: 'value+target+(optional ranges)', bestFor: ['actual versus target'] }],
    fallback: [{ chartType: 'progress', reason: 'Use progress when only a maximum is available.' }, { chartType: 'bigvalue', reason: 'Use bigvalue when no target exists.' }],
    bestFor: ['target attainment', 'actual versus benchmark'], antiPatterns: ['without a target'], rules: []
  },
  {
    id: 'range', displayName: 'Range Chart', compactFor: 'interval,uncertainty', requires: 'ordered+lower+upper',
    transformRecipe: 'sort(x)', avoid: 'lower>upper', requiredEncodings: ['x', 'lower', 'upper'],
    allowedTransforms: ['aggregate', 'sort', 'limit', 'filter'], intents: ['uncertainty', 'trend'],
    variants: [{ id: 'standard', requires: 'x+lower+upper', bestFor: ['confidence or min-max intervals'] }],
    fallback: [{ chartType: 'line', reason: 'Use line when only a central estimate exists.' }, { chartType: 'table', reason: 'Use table when interval order is invalid.' }],
    bestFor: ['forecast interval', 'uncertainty', 'min-max range'], antiPatterns: ['lower values above upper values'], rules: []
  }
]
