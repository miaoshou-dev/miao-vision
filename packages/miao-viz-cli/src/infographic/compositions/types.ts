import type { InfographicSpec, InfographicStyle, InfographicCompositionType } from '../../article-infographic'

export type CompositionRenderer = (spec: InfographicSpec, style: InfographicStyle) => string

export type CompositionRegistry = Record<InfographicCompositionType, CompositionRenderer>
