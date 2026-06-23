import type { AgentChartSpec, AgentDataTransform } from './types'
import type { ThemeName } from './themes/types'

export type SlideLayout =
  | 'cover'
  | 'title-only'
  | 'text-points'
  | 'text-chart'
  | 'metrics-chart'
  | 'chart-full'
  | 'table-full'
  | 'ending'

export interface SlideMetric {
  label: string
  value?: string | number
  format?: string
  data?: {
    transform?: AgentDataTransform[]
  }
}

export interface SlideSpec {
  layout: SlideLayout
  eyebrow?: string
  title?: string
  claim?: string
  bullets?: string[]
  callout?: string
  annotation?: string
  metrics?: SlideMetric[]
  charts?: AgentChartSpec[]
}

export interface DeckSpec {
  title?: string
  description?: string
  theme?: ThemeName
  slides: SlideSpec[]
}
