import type { InfographicSpec, InfographicStyle } from '../../article-infographic'
import type { CompositionRenderer } from './types'
import { renderArticleLinear } from './article-linear'
import { renderLifecycleCurve } from './lifecycle-curve'
import { countOrderedPhasePoints } from './helpers'

const REGISTRY: Record<string, CompositionRenderer | undefined> = {}

registerComposition('article-linear', renderArticleLinear)
registerComposition('lifecycle-curve', renderLifecycleCurve)

export function registerComposition(type: string, renderer: CompositionRenderer): void {
  REGISTRY[type] = renderer
}

export function renderInfographicComposition(spec: InfographicSpec, style: InfographicStyle): string {
  const type = spec.composition?.type ?? 'article-linear'
  const render = REGISTRY[type]
  if (!render) return renderArticleLinear(spec, style)

  if (type === 'lifecycle-curve' && countOrderedPhasePoints(spec) < 3) {
    return renderArticleLinear(spec, style)
  }

  return render(spec, style)
}
