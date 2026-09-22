import { agentError } from '../errors'
import type { AgentReportSpec, AgentResult } from '../types'
import { POSTER_THEME_REGISTRY } from './poster-theme'
import { getPosterComposition } from './poster-composition'
import { getPosterRenderMode, getPosterTemplateComposition } from './poster-render-dispatch'

export function validatePosterSpec(spec: AgentReportSpec): AgentResult<true> {
  if (spec.layout?.preset !== 'poster') {
    if (spec.poster) return agentError('POSTER_LAYOUT_MISMATCH', "poster config requires layout.preset: 'poster'.", { path: 'poster' })
    return { ok: true, value: true }
  }
  if (!spec.poster) return agentError('POSTER_CONFIG_MISSING', "layout.preset: 'poster' requires poster configuration.", { path: 'poster' })
  const poster = spec.poster
  const compositionId = poster.composition ?? 'ranked-story'
  const templateComposition = getPosterTemplateComposition(poster.template)
  if (templateComposition && templateComposition !== compositionId) {
    return agentError('POSTER_TEMPLATE_COMPOSITION_MISMATCH', `Poster template '${poster.template}' requires composition '${templateComposition}'.`, {
      path: 'poster.composition', templateId: poster.template, compositionId, expectedComposition: templateComposition,
      repairHint: `Use composition '${templateComposition}' or change poster.template.`
    })
  }
  if (!['ranked-story', 'share-story', 'timeline-story', 'trend-story', 'comparison-story', 'flow-story', 'geo-ranking-story'].includes(compositionId)) {
    return agentError('POSTER_COMPOSITION_UNKNOWN', `Poster composition '${compositionId}' is not registered.`, {
      path: 'poster.composition', compositionId, availableCompositions: ['ranked-story', 'share-story', 'timeline-story', 'trend-story', 'comparison-story', 'flow-story', 'geo-ranking-story'], repairHint: 'Use a registered composition or omit composition.'
    })
  }
  if (compositionId === 'comparison-story' && !poster.secondaryChartId) return agentError('POSTER_COMPARISON_CHART_MISSING', 'comparison-story requires secondaryChartId.', { path: 'poster.secondaryChartId', repairHint: 'Add a second bar chart or use ranked-story.' })
  if (poster.theme && !POSTER_THEME_REGISTRY.some(theme => theme.id === poster.theme)) {
    return agentError('POSTER_THEME_UNKNOWN', `Poster theme '${poster.theme}' is not registered.`, {
      path: 'poster.theme', themeId: poster.theme, availableThemes: POSTER_THEME_REGISTRY.map(theme => theme.id), repairHint: 'Use a registered theme or omit theme for fallback.'
    })
  }
  if (poster.slots) {
    const ids = new Set<string>()
    for (const slot of poster.slots) {
      if (ids.has(slot.id)) return agentError('POSTER_SLOT_DUPLICATE', `Poster slot '${slot.id}' is duplicated.`, { path: 'poster.slots', slotId: slot.id })
      ids.add(slot.id)
    }
    const composition = getPosterComposition(poster.composition)
    const roles = new Set(poster.slots.map(slot => slot.role))
    const missing = composition.requiredRoles.filter(role => !roles.has(role))
    if (missing.length) return agentError('POSTER_SLOT_REQUIRED', `Poster composition '${composition.id}' is missing required slots: ${missing.join(', ')}.`, { path: 'poster.slots', missingRoles: missing, repairHint: 'Add the required slots or omit slots to use defaults.' })
    const invalid = poster.slots.find(slot => slot.role === 'ranking' && slot.block !== 'chart')
    if (invalid) return agentError('POSTER_SLOT_TYPE_INVALID', 'The ranking slot only supports the chart block in phase one.', { path: 'poster.slots', slotId: invalid.id, allowedBlocks: ['chart'] })
  }
  const chartIndex = spec.charts.findIndex(chart => chart.id === poster.chartId)
  if (chartIndex < 0) return agentError('POSTER_CHART_NOT_FOUND', `Poster chart '${poster.chartId}' was not found in charts.`, { path: 'poster.chartId', chartId: poster.chartId })
  const chart = spec.charts[chartIndex]
  const renderMode = getPosterRenderMode(poster)
  if (renderMode === 'trend') {
    if (chart.type !== 'line' && chart.type !== 'area') return agentError('POSTER_TREND_CHART_INVALID', 'Trend poster requires a line or area chart.', { path: `charts[${chartIndex}].type`, repairHint: 'Use type: line or area.' })
    if (!chart.encoding?.x?.field || !chart.encoding?.y?.field) return agentError('POSTER_TREND_ENCODING_MISSING', 'Trend poster requires x time and y measure encodings.', { path: `charts[${chartIndex}].encoding`, repairHint: 'Bind x to time and y to a measure.' })
    return { ok: true, value: true }
  }
  if (renderMode === 'timeline') {
    if (!poster.timeline?.roles) return agentError('POSTER_TIMELINE_ROLE_MISSING', 'Timeline poster requires explicit poster.timeline.roles.', { path: 'poster.timeline.roles', repairHint: 'Bind order, timeLabel, title, and description fields.' })
    if (chart.type !== 'infographic-flow' && chart.type !== 'line') return agentError('POSTER_TIMELINE_CHART_INVALID', 'Timeline poster requires an infographic-flow or line chart placeholder.', { path: `charts[${chartIndex}].type`, repairHint: 'Use type: infographic-flow.' })
    return { ok: true, value: true }
  }
  const flowTypes = ['funnel', 'sankey', 'infographic-flow']
  if (renderMode === 'flow' && !flowTypes.includes(chart.type)) {
    return agentError('POSTER_CHART_INVALID', 'flow-story requires a funnel, sankey, or infographic-flow chart.', { path: `charts[${chartIndex}]`, chartType: chart.type, allowedTypes: flowTypes })
  }
  if (renderMode !== 'flow' && renderMode !== 'share' && (chart.type !== 'bar' || chart.variant === 'horizontal' || chart.variant === 'diverging' || chart.variant === 'stacked')) {
    return agentError('POSTER_CHART_INVALID', 'Poster main chart must be a standard vertical bar chart.', { path: `charts[${chartIndex}]`, chartType: chart.type, variant: chart.variant })
  }
  const xField = chart.encoding?.x?.field
  const yField = chart.encoding?.y?.field
  if (!xField) return agentError('POSTER_CATEGORY_FIELD_MISSING', 'Poster chart requires a categorical x encoding.', { path: `charts[${chartIndex}].encoding.x.field` })
  if (!yField) return agentError('POSTER_VALUE_FIELD_MISSING', 'Poster chart requires a quantitative y encoding.', { path: `charts[${chartIndex}].encoding.y.field` })
  if (renderMode !== 'flow' && renderMode !== 'share' && chart.encoding?.color?.field) return agentError('POSTER_CHART_INVALID', 'Poster ranking chart does not support a color series in the first version.', { path: `charts[${chartIndex}].encoding.color` })
  if (renderMode === 'share') {
    if (chart.type !== 'bar' || chart.variant !== 'horizontal' || chart.style?.barMode !== 'stacked' || !chart.encoding?.color?.field) {
      return agentError('POSTER_SHARE_CHART_INVALID', 'Share poster requires a horizontal stacked bar with a color series.', { path: `charts[${chartIndex}]`, repairHint: 'Set variant: horizontal, style.barMode: stacked, and encoding.color.field.' })
    }
    if (!poster.share || poster.share.normalize !== '100%') return agentError('POSTER_SHARE_NORMALIZE_REQUIRED', "Share poster requires poster.share.normalize: '100%'.", { path: 'poster.share.normalize', repairHint: "Set normalize to '100%'." })
  }
  if (poster.secondaryChartId && !spec.charts.some(chart => chart.id === poster.secondaryChartId)) return agentError('POSTER_CHART_NOT_FOUND', `Poster secondary chart '${poster.secondaryChartId}' was not found in charts.`, { path: 'poster.secondaryChartId', chartId: poster.secondaryChartId })
  if (poster.secondaryChartId) {
    const secondary = spec.charts.find(chart => chart.id === poster.secondaryChartId)!
    if (secondary.type !== 'bar' || secondary.variant === 'horizontal' || secondary.variant === 'diverging' || secondary.variant === 'stacked') return agentError('POSTER_CHART_INVALID', 'Poster secondary chart must be a standard vertical bar chart.', { path: 'poster.secondaryChartId', chartType: secondary.type, variant: secondary.variant })
    if (!secondary.encoding?.x?.field) return agentError('POSTER_CATEGORY_FIELD_MISSING', 'Poster secondary chart requires a categorical x encoding.', { path: 'poster.secondaryChartId.encoding.x.field' })
    if (!secondary.encoding?.y?.field) return agentError('POSTER_VALUE_FIELD_MISSING', 'Poster secondary chart requires a quantitative y encoding.', { path: 'poster.secondaryChartId.encoding.y.field' })
  }
  return { ok: true, value: true }
}
