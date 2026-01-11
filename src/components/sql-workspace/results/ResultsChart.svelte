<script lang="ts">
  /**
   * ResultsChart Component
   *
   * Full-featured chart visualization for query results.
   * Uses vgplot for bar, line, scatter, histogram charts.
   * Custom SVG rendering for pie charts.
   */

  import type { QueryResult } from '@/types/database'
  import type { ResultsChartConfig, ColumnStatistics } from './types'
  import { inferColumnType } from './types'
  import { MosaicChartAdapter } from './MosaicChartAdapter'
  import type { MosaicChartSpec } from './MosaicChartAdapter'

  // Sub-components
  import { ChartConfigPanel, ChartPreview } from './components'

  // Pure logic functions
  import {
    prepareChartData,
    getSmartAggregation,
    getResultHash,
    getConfigHash,
    isVgplotSupported,
    renderPieChart,
    exportSVG,
    exportPNG,
    DEFAULT_CHART_DIMENSIONS
  } from './logic'

  interface Props {
    result: QueryResult
    config: ResultsChartConfig
    onConfigChange: (config: ResultsChartConfig) => void
  }

  let { result, config, onConfigChange }: Props = $props()

  // vgplot state
  let mosaicChartSpec = $state<MosaicChartSpec | null>(null)
  let mosaicLoading = $state(false)
  let mosaicError = $state<string | null>(null)
  let chartContainer = $state<HTMLDivElement | null>(null)

  // UX state
  let userHasInteracted = $state(false)

  // Cache state
  let cachedTableName = $state<string | null>(null)
  let cachedResultHash = $state<string>('')
  let cachedConfigHash = $state<string>('')

  // Chart options
  let chartWidth = $state(DEFAULT_CHART_DIMENSIONS.width)
  let chartHeight = $state(DEFAULT_CHART_DIMENSIONS.height)
  let chartTitle = $state('')
  let xLabel = $state('')
  let yLabel = $state('')
  let showAdvanced = $state(false)
  let dataLimit = $state(DEFAULT_CHART_DIMENSIONS.dataLimit)
  let sortOrder = $state<'desc' | 'asc' | 'none'>('none')

  // Derived: Column types
  const columnTypes = $derived(
    result.columns.reduce((acc, col) => {
      const values = result.data.map(row => row[col])
      acc[col] = inferColumnType(values)
      return acc
    }, {} as Record<string, ColumnStatistics['type']>)
  )

  const numericColumns = $derived(
    result.columns.filter(col => columnTypes[col] === 'number')
  )

  const categoricalColumns = $derived(
    result.columns.filter(col => columnTypes[col] === 'string' || columnTypes[col] === 'date')
  )

  const allColumns = $derived(result.columns)
  const canRender = $derived(Boolean(config.xColumn && config.yColumns.length > 0))

  // Auto-suggest config if not set
  $effect(() => {
    if (!config.xColumn && allColumns.length > 0) {
      const xCol = categoricalColumns.length > 0 ? categoricalColumns[0] : allColumns[0]
      const yCol = numericColumns.length > 0 ? numericColumns[0] : (allColumns.length > 1 ? allColumns[1] : allColumns[0])
      const smartAgg = getSmartAggregation(result.data, xCol)
      onConfigChange({
        ...config,
        xColumn: xCol,
        yColumns: yCol ? [yCol] : [],
        aggregation: smartAgg as any
      })
    }
  })

  // Render vgplot chart
  $effect(() => {
    if (!userHasInteracted && !config.type) {
      mosaicChartSpec = null
      return
    }

    if (!isVgplotSupported(config.type) || !canRender) {
      mosaicChartSpec = null
      return
    }

    const currentResultHash = getResultHash(result)
    const currentConfigHash = getConfigHash(config, {
      width: chartWidth,
      height: chartHeight,
      title: chartTitle,
      xLabel,
      yLabel,
      sort: sortOrder
    })

    const dataChanged = currentResultHash !== cachedResultHash
    const configChanged = currentConfigHash !== cachedConfigHash

    if (!dataChanged && !configChanged && mosaicChartSpec) {
      return
    }

    mosaicLoading = true
    mosaicError = null

    const timeoutId = setTimeout(() => {
      async function render() {
        try {
          const adapterConfig: ResultsChartConfig = {
            ...config,
            width: chartWidth,
            height: chartHeight,
            title: chartTitle || undefined,
            xLabel: xLabel || undefined,
            yLabel: yLabel || undefined,
            sort: sortOrder,
            showGrid: true
          }

          const tableNameToUse = dataChanged ? undefined : cachedTableName || undefined
          const spec = await MosaicChartAdapter.buildChart(result, adapterConfig, tableNameToUse)
          mosaicChartSpec = spec

          if (dataChanged) {
            cachedTableName = spec.tableName
            cachedResultHash = currentResultHash
          }
          if (configChanged) {
            cachedConfigHash = currentConfigHash
          }
        } catch (error) {
          mosaicError = error instanceof Error ? error.message : 'Failed to render chart'
          mosaicChartSpec = null
        } finally {
          mosaicLoading = false
        }
      }
      render()
    }, 50)

    return () => clearTimeout(timeoutId)
  })

  // Append chart to container
  $effect(() => {
    if (mosaicChartSpec && chartContainer) {
      chartContainer.innerHTML = ''
      chartContainer.appendChild(mosaicChartSpec.plot)
    }
  })

  // Pie chart SVG (custom rendering)
  const chartSVG = $derived.by(() => {
    if (config.type === 'pie') {
      const data = prepareChartData(result.data, config, { dataLimit, sortOrder })
      return renderPieChart(data, { width: chartWidth, height: chartHeight, title: chartTitle })
    }
    return ''
  })

  // Event handlers
  function handleChartTypeSelect(type: string) {
    if (type) userHasInteracted = true
    onConfigChange({ ...config, type: type as any })
  }

  function handleExportSVG() {
    if (isVgplotSupported(config.type) && chartContainer) {
      const svgElement = chartContainer.querySelector('svg')
      if (svgElement) {
        const svgClone = svgElement.cloneNode(true) as SVGElement
        svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
        const svgString = new XMLSerializer().serializeToString(svgClone)
        exportSVG(`<?xml version="1.0" encoding="UTF-8"?>\n${svgString}`, config.type || 'chart')
      }
    } else {
      exportSVG(chartSVG, config.type || 'chart')
    }
  }

  async function handleExportPNG() {
    await exportPNG(chartContainer, config.type || 'chart')
  }

  function saveConfiguration() {
    const configData = {
      version: '1.0',
      chartConfig: {
        type: config.type,
        xColumn: config.xColumn,
        yColumns: config.yColumns,
        groupColumn: config.groupColumn,
        aggregation: config.aggregation
      },
      advancedOptions: { width: chartWidth, height: chartHeight, title: chartTitle, xLabel, yLabel, sort: sortOrder, dataLimit },
      savedAt: new Date().toISOString()
    }
    const blob = new Blob([JSON.stringify(configData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `chart-config-${config.type}-${Date.now()}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  function loadConfiguration() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      try {
        const configData = JSON.parse(await file.text())
        if (!configData.version || !configData.chartConfig) throw new Error('Invalid format')
        onConfigChange({
          ...config,
          type: configData.chartConfig.type || config.type,
          xColumn: configData.chartConfig.xColumn || config.xColumn,
          yColumns: configData.chartConfig.yColumns || config.yColumns,
          groupColumn: configData.chartConfig.groupColumn,
          aggregation: configData.chartConfig.aggregation || config.aggregation
        })
        if (configData.advancedOptions) {
          chartWidth = configData.advancedOptions.width || chartWidth
          chartHeight = configData.advancedOptions.height || chartHeight
          chartTitle = configData.advancedOptions.title || ''
          xLabel = configData.advancedOptions.xLabel || ''
          yLabel = configData.advancedOptions.yLabel || ''
          sortOrder = configData.advancedOptions.sort || 'none'
          dataLimit = configData.advancedOptions.dataLimit || 20
        }
      } catch {
        alert('Failed to load configuration file.')
      }
    }
    input.click()
  }
</script>

<div class="results-chart">
  <ChartConfigPanel
    {config}
    {allColumns}
    {columnTypes}
    {chartWidth}
    {chartHeight}
    {chartTitle}
    {xLabel}
    {yLabel}
    {dataLimit}
    {sortOrder}
    {showAdvanced}
    {onConfigChange}
    onChartTypeSelect={handleChartTypeSelect}
    onWidthChange={(w) => chartWidth = w}
    onHeightChange={(h) => chartHeight = h}
    onTitleChange={(t) => chartTitle = t}
    onXLabelChange={(l) => xLabel = l}
    onYLabelChange={(l) => yLabel = l}
    onDataLimitChange={(l) => dataLimit = l}
    onSortOrderChange={(o) => sortOrder = o}
    onAdvancedToggle={() => showAdvanced = !showAdvanced}
    onSaveConfig={saveConfiguration}
    onLoadConfig={loadConfiguration}
  />

  <ChartPreview
    chartType={config.type}
    {userHasInteracted}
    {canRender}
    {mosaicLoading}
    {mosaicError}
    {mosaicChartSpec}
    {chartSVG}
    bind:chartContainer
    onExportPNG={handleExportPNG}
    onExportSVG={handleExportSVG}
  />
</div>

<style>
  .results-chart {
    display: flex;
    height: 100%;
    background: #111827;
  }
</style>
