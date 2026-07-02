import type { InfographicSpec, InfographicCompositionType } from '../../article-infographic'

export interface LifecyclePoint {
  label: string
  value: number
  unit?: string
  text?: string
  action?: string
}

export function countOrderedPhasePoints(spec: InfographicSpec): number {
  for (const section of spec.sections) {
    if (!section.visual) continue
    if (section.visual.type === 'metric-bars') {
      const items = (section.visual.data as { items?: Array<{ label?: string; value?: number }> }).items
      if (items && items.length >= 3) return items.length
    }
  }
  for (const section of spec.sections) {
    if (section.visual && section.visual.type === 'timeline-path') {
      const numeric = section.items.filter(i => i.value && !Number.isNaN(Number(i.value)))
      if (numeric.length >= 3) return numeric.length
    }
  }
  for (const section of spec.sections) {
    if (section.type === 'facts') {
      const numeric = section.items.filter(i => i.value && !Number.isNaN(Number(i.value)))
      if (numeric.length >= 3) return numeric.length
    }
  }
  return 0
}

export function hasKpiVisual(spec: InfographicSpec): boolean {
  return spec.sections.some(s => s.visual?.type === 'kpi-strip')
}

export function hasCompositionType(spec: InfographicSpec, type: InfographicCompositionType): boolean {
  return spec.composition?.type === type
}

export function extractLifecyclePoints(spec: InfographicSpec): LifecyclePoint[] {
  for (const section of spec.sections) {
    if (!section.visual) continue
    if (section.visual.type === 'metric-bars') {
      const raw = section.visual.data as { items?: Array<{ label: string; value: number; unit?: string }> }
      if (!raw.items || raw.items.length === 0) continue
      const hasNumeric = raw.items.some(i => typeof i.value === 'number' && !Number.isNaN(i.value))
      if (!hasNumeric) continue
      return raw.items.map(item => {
        const match = section.items.find(si => si.label === item.label)
        return {
          label: item.label,
          value: item.value,
          unit: item.unit,
          text: item.label,
          action: match?.text,
        }
      })
    }
  }
  for (const section of spec.sections) {
    if (!section.visual || section.visual.type !== 'timeline-path') continue
    const items = section.items
    const numeric = items.filter(i => i.value && !Number.isNaN(Number(i.value)))
    if (numeric.length < 3) continue
    return numeric.map((item, i) => ({
      label: item.label ?? `Step ${i + 1}`,
      value: Number(item.value),
      text: item.text,
    }))
  }
  for (const section of spec.sections) {
    if (section.type !== 'facts') continue
    const items = section.items.filter(i => i.value && !Number.isNaN(Number(i.value)))
    if (items.length < 3) continue
    return items.map(item => ({
      label: item.label ?? '',
      value: Number(item.value),
      text: item.text,
    }))
  }
  return []
}
