import type { InfographicSpec, InfographicStyle } from '../../article-infographic'
import type { InfographicCompositionType } from '../composition-decision'

export type CompositionRenderer = (spec: InfographicSpec, style: InfographicStyle) => string

export type CompositionRegistry = Record<InfographicCompositionType, CompositionRenderer>
