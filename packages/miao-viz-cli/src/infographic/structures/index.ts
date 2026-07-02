import type { SvgTheme } from '../../themes/types'
import type { InfographicVisualType, TypedInfographicVisual, VisualDataMap } from '../types'
import type { InfographicStyle } from '../../article-infographic'
import { getTheme } from '../../themes'
import { visualCard } from '../primitives/layout'

import { renderKpiStrip } from './kpi-strip'
import { renderMetricBars } from './metric-bars'
import { renderProcessFlow } from './process-flow'
import { renderConceptContrast } from './concept-contrast'
import { renderTimelinePath } from './timeline-path'
import { renderPartToWhole } from './part-to-whole'
import { renderBeforeAfter } from './before-after'
import { renderTradeoffMatrix } from './tradeoff-matrix'
import { renderRankedListChart } from './ranked-list-chart'
import { renderSystemDiagram } from './system-diagram'
import { renderCalloutDiagram } from './callout-diagram'
import { renderIconCluster } from './icon-cluster'

function articleStyleToTheme(style: InfographicStyle): SvgTheme {
  const map: Record<string, string> = { editorial: 'editorial', executive: 'minimal', minimal: 'minimal' }
  return getTheme(map[style] ?? 'default').svg
}

const STRUCTURES: { [K in InfographicVisualType]: (data: VisualDataMap[K], theme: SvgTheme, palette: string[]) => string } = {
  'kpi-strip': renderKpiStrip,
  'metric-bars': renderMetricBars,
  'process-flow': renderProcessFlow,
  'concept-contrast': renderConceptContrast,
  'timeline-path': renderTimelinePath,
  'part-to-whole': renderPartToWhole,
  'before-after': renderBeforeAfter,
  'tradeoff-matrix': renderTradeoffMatrix,
  'ranked-list-chart': renderRankedListChart,
  'system-diagram': renderSystemDiagram,
  'callout-diagram': renderCalloutDiagram,
  'icon-cluster': renderIconCluster
}

export function renderVisual(visual: TypedInfographicVisual, style: InfographicStyle): string {
  const theme = articleStyleToTheme(style)
  const palette = theme.palette
  const render = STRUCTURES[visual.type]
  const content = render(visual.data as never, theme, palette)
  return visualCard('', content, visual.caption)
}
