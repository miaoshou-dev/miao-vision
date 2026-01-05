/**
 * Data Display Plugin
 *
 * Components for displaying data: BigValue, DataTable, Value, Delta, Sparkline, KPIGrid,
 * Progress, Funnel, CalendarHeatmap, Sankey, Treemap, Histogram, BoxPlot, Gauge, BulletChart,
 * Waterfall, Radar, Heatmap, BarChart, PieChart, Image, BubbleChart
 */

import type { ComponentRegistry } from '@core/registry'

// Component registrations
import { bigValueRegistration } from './bigvalue'
import { dataTableRegistration } from './datatable'
import { valueRegistration } from './value'
import { deltaRegistration } from './delta'
import { sparklineRegistration } from './sparkline'
import { kpiGridRegistration } from './kpigrid'
import { progressRegistration } from './progress'
import { funnelRegistration } from './funnel'
import { calendarHeatmapRegistration } from './calendar-heatmap'
import { sankeyRegistration } from './sankey'
import { treemapRegistration } from './treemap'
import { histogramRegistration } from './histogram'
import { boxPlotRegistration } from './boxplot'
import { gaugeRegistration } from './gauge'
import { bulletChartRegistration } from './bullet-chart'
import { waterfallRegistration } from './waterfall'
import { radarRegistration } from './radar'
import { heatmapRegistration } from './heatmap'
import { barChartRegistration } from './bar-chart'
import { pieChartRegistration } from './pie-chart'
import { lineChartRegistration } from './line-chart'
import { areaChartRegistration } from './area-chart'
import { scatterChartRegistration } from './scatter-chart'
import { imageRegistration } from './image'
import { bubbleChartRegistration } from './bubble-chart'
import { infographicRegistration } from './infographic/definition'

// Re-export registrations for direct import
export { bigValueRegistration, dataTableRegistration, valueRegistration, deltaRegistration, sparklineRegistration, kpiGridRegistration, progressRegistration, funnelRegistration, calendarHeatmapRegistration, sankeyRegistration, treemapRegistration, histogramRegistration, boxPlotRegistration, gaugeRegistration, bulletChartRegistration, waterfallRegistration, radarRegistration, heatmapRegistration, barChartRegistration, pieChartRegistration, lineChartRegistration, areaChartRegistration, scatterChartRegistration, imageRegistration, bubbleChartRegistration, infographicRegistration }

// Re-export components
export { default as BigValue } from './bigvalue/BigValue.svelte'
export { default as DataTable } from './datatable/DataTable.svelte'
export { default as Value } from './value/Value.svelte'
export { default as Delta } from './delta/Delta.svelte'
export { default as Sparkline } from './sparkline/Sparkline.svelte'
export { default as KPIGrid } from './kpigrid/KPIGrid.svelte'
export { default as Progress } from './progress/Progress.svelte'
export { default as Funnel } from './funnel/Funnel.svelte'
export { default as CalendarHeatmap } from './calendar-heatmap/CalendarHeatmap.svelte'
export { default as Sankey } from './sankey/Sankey.svelte'
export { default as Treemap } from './treemap/Treemap.svelte'
export { default as Histogram } from './histogram/Histogram.svelte'
export { default as BoxPlot } from './boxplot/BoxPlot.svelte'
export { default as Gauge } from './gauge/Gauge.svelte'
export { default as BulletChart } from './bullet-chart/BulletChart.svelte'
export { default as Waterfall } from './waterfall/Waterfall.svelte'
export { default as Radar } from './radar/Radar.svelte'
export { default as Heatmap } from './heatmap/Heatmap.svelte'
export { default as BarChart } from './bar-chart/BarChart.svelte'
export { default as PieChart } from './pie-chart/PieChart.svelte'
export { default as LineChart } from './line-chart/LineChart.svelte'
export { default as AreaChart } from './area-chart/AreaChart.svelte'
export { default as ScatterChart } from './scatter-chart/ScatterChart.svelte'
export { default as Image } from './image/Image.svelte'
export { default as BubbleChart } from './bubble-chart/BubbleChart.svelte'
export { default as Infographic } from './infographic/Infographic.svelte'
export { default as InfographicRenderer } from './infographic/InfographicRenderer.svelte'

// Re-export types
export type { BigValueConfig, BigValueData } from './bigvalue/types'
export type { DataTableConfig, DataTableData, ColumnConfig } from './datatable/types'
export type { ValueConfig, ValueData } from './value/types'
export type { DeltaConfig, DeltaData, DeltaDirection } from './delta/types'
export type { SparklineConfig, SparklineData } from './sparkline/types'
export type { KPIGridConfig, KPIGridData, KPICardConfig } from './kpigrid/types'
export type { ProgressConfig, ProgressData } from './progress/types'
export type { FunnelConfig, FunnelData, FunnelStage } from './funnel/types'
export type { CalendarHeatmapConfig, CalendarHeatmapData, CalendarDay, CalendarWeek } from './calendar-heatmap/types'
export type { SankeyConfig, SankeyData, SankeyNode, SankeyLink } from './sankey/types'
export type { TreemapConfig, TreemapData, TreemapTile } from './treemap/types'
export type { HistogramConfig, HistogramData, HistogramBin } from './histogram/types'
export type { BoxPlotConfig, BoxPlotData, BoxPlotStats } from './boxplot/types'
export type { GaugeConfig, GaugeData, GaugeThreshold } from './gauge/types'
export type { BulletChartConfig, BulletChartData, BulletItem } from './bullet-chart/types'
export type { WaterfallConfig, WaterfallData, WaterfallBar, WaterfallBarType } from './waterfall/types'
export type { RadarConfig, RadarData, RadarAxis, RadarSeries, RadarPoint, RadarGridLevel } from './radar/types'
export type { HeatmapConfig, HeatmapData, HeatmapCell } from './heatmap/types'
export type { BarChartConfig, BarChartData, BarItem } from './bar-chart/types'
export type { PieChartConfig, PieChartData, PieSlice } from './pie-chart/types'
export type { LineChartConfig, LineChartData, LineSeries, LinePoint } from './line-chart/types'
export type { AreaChartConfig, AreaChartData, AreaSeries, AreaPoint } from './area-chart/types'
export type { ScatterChartConfig, ScatterChartData, ScatterPoint } from './scatter-chart/types'
export type { ImageConfig } from './image/types'
export type { BubbleChartConfig, BubbleChartData, BubbleItem } from './bubble-chart/types'
export type { InfographicConfig, InfographicItem, InfographicProps } from './infographic/definition'

// Re-export shared utilities
export { formatValue, formatNumber, formatCurrency, formatPercent } from './shared/formatter'

/**
 * Register all data display plugins with the component registry
 */
export function registerDataDisplayPlugins(registry: ComponentRegistry): void {
  console.log('📊 Registering data display plugins...')

  registry.register(bigValueRegistration)
  registry.register(dataTableRegistration)
  registry.register(valueRegistration)
  registry.register(deltaRegistration)
  registry.register(sparklineRegistration)
  registry.register(kpiGridRegistration)
  registry.register(progressRegistration)
  registry.register(funnelRegistration)
  registry.register(calendarHeatmapRegistration)
  registry.register(sankeyRegistration)
  registry.register(treemapRegistration)
  registry.register(histogramRegistration)
  registry.register(boxPlotRegistration)
  registry.register(gaugeRegistration)
  registry.register(bulletChartRegistration)
  registry.register(waterfallRegistration)
  registry.register(radarRegistration)
  registry.register(heatmapRegistration)
  registry.register(barChartRegistration)
  registry.register(pieChartRegistration)
  registry.register(lineChartRegistration)
  registry.register(areaChartRegistration)
  registry.register(scatterChartRegistration)
  registry.register(imageRegistration)
  registry.register(bubbleChartRegistration)
  registry.register(infographicRegistration)

  console.log('✅ Data display plugins registered: bigvalue, datatable, value, delta, sparkline, kpigrid, progress, funnel, calendar-heatmap, sankey, treemap, histogram, boxplot, gauge, bullet, waterfall, radar, heatmap, bar, pie, line, area, scatter, image, bubble, infographic')
}

/**
 * All data display plugin registrations
 */
export const dataDisplayPlugins = [
  bigValueRegistration,
  dataTableRegistration,
  valueRegistration,
  deltaRegistration,
  sparklineRegistration,
  kpiGridRegistration,
  progressRegistration,
  funnelRegistration,
  calendarHeatmapRegistration,
  sankeyRegistration,
  treemapRegistration,
  histogramRegistration,
  boxPlotRegistration,
  gaugeRegistration,
  bulletChartRegistration,
  waterfallRegistration,
  radarRegistration,
  heatmapRegistration,
  barChartRegistration,
  pieChartRegistration,
  lineChartRegistration,
  areaChartRegistration,
  scatterChartRegistration,
  imageRegistration,
  bubbleChartRegistration,
  infographicRegistration
]
