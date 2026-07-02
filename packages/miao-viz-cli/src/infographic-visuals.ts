import type { InfographicVisual, InfographicStyle } from './article-infographic'
import { renderVisual } from './infographic/structures/index'

export function renderSectionVisual(visual: InfographicVisual, style: InfographicStyle): string {
  return renderVisual(visual as never, style)
}
