<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import * as vg from '@uwdata/vgplot'
  import * as d3 from 'd3'
  import { coordinator } from '@core/database'
  import type { ChartConfig } from '@/types/chart'

  /**
   * Quote a table name for SQL, handling fully qualified names
   * - Simple names: "table_name"
   * - Qualified names: catalog.schema.table (no quotes needed)
   */
  function quoteTableForSQL(tableName: string): string {
    return tableName.includes('.') ? tableName : `"${tableName}"`
  }

  interface Props {
    config: ChartConfig
  }

  let { config }: Props = $props()

  let chartContainer = $state<HTMLDivElement>()
  let plotElement: HTMLElement | SVGSVGElement | null = null
  let error = $state<string | null>(null)
  let loading = $state(false)
  let mounted = $state(false)

  onMount(() => {
    mounted = true
  })

  onDestroy(() => {
    mounted = false
    cleanup()
  })

  // Re-render when config changes
  $effect(() => {
    if (config && mounted && chartContainer) {
      renderChart()
    }
  })

  function cleanup() {
    try {
      if (plotElement && chartContainer) {
        // Check if the node is still in the DOM
        if (document.body.contains(chartContainer) && chartContainer.contains(plotElement)) {
          chartContainer.removeChild(plotElement)
        }
        plotElement = null
      }
      error = null
    } catch (err) {
      console.warn('Cleanup warning:', err)
    }
  }

  /**
   * Render pie/donut chart using D3
   * Since vgplot doesn't support arc marks, we use D3 directly
   */
  async function renderPieChart() {
    if (!chartContainer || !config) return

    try {
      const coord = coordinator()
      if (!coord) {
        throw new Error('Mosaic coordinator not initialized')
      }

      // Query data from the table
      // Don't quote fully qualified table names (catalog.schema.table)
      const tableName = config.data.table.includes('.') ? config.data.table : `"${config.data.table}"`
      const query = `SELECT "${config.data.x}" as label, "${config.data.y}" as value FROM ${tableName}`
      console.log('Pie chart query:', query)

      const result = await coord.query(query)
      const data: Array<{ label: string; value: number }> = []

      // Extract data from query result
      for (const row of result) {
        data.push({
          label: String(row.label),
          value: Number(row.value)
        })
      }

      console.log('Pie chart data:', data)

      if (data.length === 0) {
        throw new Error('No data available for pie chart')
      }

      // Chart dimensions
      const width = config.options.width || 500
      const height = config.options.height || 400
      const margin = 40

      // Calculate radius
      const radius = Math.min(width - margin * 2, height - margin * 2) / 2
      const innerRadius = config.options.innerRadius || 0
      const outerRadius = config.options.outerRadius || radius

      // Create SVG
      const svg = d3.create('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', [-width / 2, -height / 2, width, height])
        .attr('style', 'max-width: 100%; height: auto;')

      // Color scale
      const color = d3.scaleOrdinal<string>()
        .domain(data.map(d => d.label))
        .range(d3.schemeTableau10)

      // Create pie generator
      const pie = d3.pie<{ label: string; value: number }>()
        .value(d => d.value)
        .sort(null)
        .padAngle(config.options.padAngle ?? 0.02)

      // Create arc generator
      const arc = d3.arc<d3.PieArcDatum<{ label: string; value: number }>>()
        .innerRadius(innerRadius)
        .outerRadius(outerRadius)
        .cornerRadius(config.options.cornerRadius ?? 3)

      // Arc for labels (positioned outside)
      const labelArc = d3.arc<d3.PieArcDatum<{ label: string; value: number }>>()
        .innerRadius(outerRadius * 0.7)
        .outerRadius(outerRadius * 0.7)

      // Create arcs
      const arcs = pie(data)

      // Calculate total for percentages
      const total = d3.sum(data, d => d.value)

      // Draw slices
      svg.selectAll('path')
        .data(arcs)
        .join('path')
        .attr('fill', d => color(d.data.label))
        .attr('d', arc)
        .attr('stroke', '#1F2937')
        .attr('stroke-width', 1)
        .style('opacity', 0.9)
        .append('title')
        .text(d => `${d.data.label}: ${d.data.value} (${((d.data.value / total) * 100).toFixed(1)}%)`)

      // Add labels if enabled
      const showLabels = config.options.showLabels !== false
      const showPercentages = config.options.showPercentages !== false

      if (showLabels || showPercentages) {
        svg.selectAll('text')
          .data(arcs)
          .join('text')
          .attr('transform', d => `translate(${labelArc.centroid(d)})`)
          .attr('text-anchor', 'middle')
          .attr('fill', '#E5E7EB')
          .attr('font-size', '12px')
          .attr('font-weight', '500')
          .each(function(d) {
            const el = d3.select(this)
            const percentage = ((d.data.value / total) * 100).toFixed(1)

            // Only show label if slice is big enough
            if ((d.endAngle - d.startAngle) > 0.25) {
              if (showLabels && showPercentages) {
                el.append('tspan')
                  .attr('x', 0)
                  .attr('dy', '-0.4em')
                  .text(d.data.label)
                el.append('tspan')
                  .attr('x', 0)
                  .attr('dy', '1.2em')
                  .text(`${percentage}%`)
              } else if (showLabels) {
                el.text(d.data.label)
              } else if (showPercentages) {
                el.text(`${percentage}%`)
              }
            }
          })
      }

      // Add title if provided
      if (config.options.title) {
        svg.append('text')
          .attr('x', 0)
          .attr('y', -height / 2 + 20)
          .attr('text-anchor', 'middle')
          .attr('fill', '#E5E7EB')
          .attr('font-size', '18px')
          .attr('font-weight', '600')
          .text(config.options.title)
      }

      // Add legend
      const legendX = outerRadius + 30
      const legendY = -data.length * 10

      const legend = svg.append('g')
        .attr('transform', `translate(${legendX}, ${legendY})`)

      legend.selectAll('rect')
        .data(data)
        .join('rect')
        .attr('x', 0)
        .attr('y', (_, i) => i * 20)
        .attr('width', 14)
        .attr('height', 14)
        .attr('fill', d => color(d.label))
        .attr('rx', 2)

      legend.selectAll('text')
        .data(data)
        .join('text')
        .attr('x', 20)
        .attr('y', (_, i) => i * 20 + 11)
        .attr('fill', '#E5E7EB')
        .attr('font-size', '12px')
        .text(d => `${d.label} (${d.value})`)

      // Check if component is still mounted
      if (!mounted || !chartContainer) {
        console.log('Component unmounted during pie chart render, aborting')
        return
      }

      // Append to container
      if (document.body.contains(chartContainer)) {
        const svgNode = svg.node()
        if (svgNode) {
          chartContainer.appendChild(svgNode)
          plotElement = svgNode
          console.log('Pie chart rendered successfully')
        }
      }
    } catch (err) {
      console.error('Failed to render pie chart:', err)
      if (mounted) {
        error = err instanceof Error ? err.message : 'Failed to render pie chart'
      }
    } finally {
      if (mounted) {
        loading = false
      }
    }
  }

  /**
   * Render boxplot using D3
   * Since vgplot doesn't support boxplot marks natively
   */
  async function renderBoxPlot() {
    if (!chartContainer || !config) return

    try {
      const coord = coordinator()
      if (!coord) {
        throw new Error('Mosaic coordinator not initialized')
      }

      // Query data and calculate statistics
      const query = `
        SELECT
          "${config.data.x}" as category,
          "${config.data.y}" as value
        FROM ${quoteTableForSQL(config.data.table)}
      `
      console.log('BoxPlot query:', query)

      const result = await coord.query(query)
      const rawData: Array<{ category: string; value: number }> = []

      for (const row of result) {
        rawData.push({
          category: String(row.category),
          value: Number(row.value)
        })
      }

      if (rawData.length === 0) {
        throw new Error('No data available for boxplot')
      }

      // Group data by category and calculate statistics
      const categories = [...new Set(rawData.map(d => d.category))]
      const boxData = categories.map(cat => {
        const values = rawData
          .filter(d => d.category === cat)
          .map(d => d.value)
          .sort((a, b) => a - b)

        const q1 = d3.quantile(values, 0.25) || 0
        const median = d3.quantile(values, 0.5) || 0
        const q3 = d3.quantile(values, 0.75) || 0
        const iqr = q3 - q1
        const min = Math.max(d3.min(values) || 0, q1 - 1.5 * iqr)
        const max = Math.min(d3.max(values) || 0, q3 + 1.5 * iqr)

        // Outliers
        const outliers = values.filter(v => v < min || v > max)

        return { category: cat, q1, median, q3, min, max, outliers }
      })

      // Chart dimensions
      const width = config.options.width || 680
      const height = config.options.height || 400
      const margin = { top: 40, right: 30, bottom: 50, left: 60 }
      const innerWidth = width - margin.left - margin.right
      const innerHeight = height - margin.top - margin.bottom

      // Create SVG
      const svg = d3.create('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', [0, 0, width, height])
        .attr('style', 'max-width: 100%; height: auto;')

      const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`)

      // Scales
      const x = d3.scaleBand()
        .domain(categories)
        .range([0, innerWidth])
        .padding(0.4)

      const yValues = rawData.map(d => d.value)
      const y = d3.scaleLinear()
        .domain([d3.min(yValues) || 0, d3.max(yValues) || 0])
        .nice()
        .range([innerHeight, 0])

      // Color scale
      const color = d3.scaleOrdinal<string>()
        .domain(categories)
        .range(d3.schemeTableau10)

      // X axis
      g.append('g')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x))
        .selectAll('text')
        .attr('fill', '#E5E7EB')
      g.selectAll('.domain, .tick line').attr('stroke', '#4B5563')

      // Y axis
      g.append('g')
        .call(d3.axisLeft(y))
        .selectAll('text')
        .attr('fill', '#E5E7EB')
      g.selectAll('.domain, .tick line').attr('stroke', '#4B5563')

      // Grid lines
      g.append('g')
        .attr('class', 'grid')
        .call(d3.axisLeft(y).tickSize(-innerWidth).tickFormat(() => ''))
        .selectAll('line')
        .attr('stroke', '#374151')
        .attr('stroke-opacity', 0.5)
      g.select('.grid .domain').remove()

      // Draw boxes
      const boxWidth = x.bandwidth()

      boxData.forEach(d => {
        const xPos = x(d.category) || 0
        const center = xPos + boxWidth / 2

        // Vertical line (whiskers)
        g.append('line')
          .attr('x1', center)
          .attr('x2', center)
          .attr('y1', y(d.min))
          .attr('y2', y(d.max))
          .attr('stroke', '#9CA3AF')
          .attr('stroke-width', 1)

        // Box
        g.append('rect')
          .attr('x', xPos)
          .attr('y', y(d.q3))
          .attr('width', boxWidth)
          .attr('height', y(d.q1) - y(d.q3))
          .attr('fill', color(d.category))
          .attr('stroke', '#E5E7EB')
          .attr('stroke-width', 1)
          .attr('rx', 2)
          .style('opacity', 0.8)

        // Median line
        g.append('line')
          .attr('x1', xPos)
          .attr('x2', xPos + boxWidth)
          .attr('y1', y(d.median))
          .attr('y2', y(d.median))
          .attr('stroke', '#E5E7EB')
          .attr('stroke-width', 2)

        // Whisker caps
        const capWidth = boxWidth * 0.5
        g.append('line')
          .attr('x1', center - capWidth / 2)
          .attr('x2', center + capWidth / 2)
          .attr('y1', y(d.min))
          .attr('y2', y(d.min))
          .attr('stroke', '#9CA3AF')
          .attr('stroke-width', 1)

        g.append('line')
          .attr('x1', center - capWidth / 2)
          .attr('x2', center + capWidth / 2)
          .attr('y1', y(d.max))
          .attr('y2', y(d.max))
          .attr('stroke', '#9CA3AF')
          .attr('stroke-width', 1)

        // Outliers
        d.outliers.forEach(outlier => {
          g.append('circle')
            .attr('cx', center)
            .attr('cy', y(outlier))
            .attr('r', 3)
            .attr('fill', color(d.category))
            .attr('stroke', '#E5E7EB')
            .attr('stroke-width', 1)
        })
      })

      // Title
      if (config.options.title) {
        svg.append('text')
          .attr('x', width / 2)
          .attr('y', 20)
          .attr('text-anchor', 'middle')
          .attr('fill', '#E5E7EB')
          .attr('font-size', '18px')
          .attr('font-weight', '600')
          .text(config.options.title)
      }

      // X label
      if (config.options.xLabel) {
        svg.append('text')
          .attr('x', width / 2)
          .attr('y', height - 10)
          .attr('text-anchor', 'middle')
          .attr('fill', '#9CA3AF')
          .attr('font-size', '12px')
          .text(config.options.xLabel)
      }

      // Y label
      if (config.options.yLabel) {
        svg.append('text')
          .attr('transform', 'rotate(-90)')
          .attr('x', -height / 2)
          .attr('y', 15)
          .attr('text-anchor', 'middle')
          .attr('fill', '#9CA3AF')
          .attr('font-size', '12px')
          .text(config.options.yLabel)
      }

      // Check if component is still mounted
      if (!mounted || !chartContainer) {
        console.log('Component unmounted during boxplot render, aborting')
        return
      }

      // Append to container
      if (document.body.contains(chartContainer)) {
        const svgNode = svg.node()
        if (svgNode) {
          chartContainer.appendChild(svgNode)
          plotElement = svgNode
          console.log('BoxPlot rendered successfully')
        }
      }
    } catch (err) {
      console.error('Failed to render boxplot:', err)
      if (mounted) {
        error = err instanceof Error ? err.message : 'Failed to render boxplot'
      }
    } finally {
      if (mounted) {
        loading = false
      }
    }
  }

  /**
   * Render funnel chart using D3
   * Shows a conversion funnel with progressively smaller segments
   */
  async function renderFunnelChart() {
    if (!chartContainer || !config) return

    try {
      const coord = coordinator()
      if (!coord) {
        throw new Error('Mosaic coordinator not initialized')
      }

      // Query data - x is the stage label, y is the value
      const query = `
        SELECT
          "${config.data.x}" as stage,
          "${config.data.y}" as value
        FROM ${quoteTableForSQL(config.data.table)}
      `
      console.log('Funnel chart query:', query)

      const result = await coord.query(query)
      const data: Array<{ stage: string; value: number }> = []

      for (const row of result) {
        data.push({
          stage: String(row.stage),
          value: Number(row.value)
        })
      }

      if (data.length === 0) {
        throw new Error('No data available for funnel chart')
      }

      console.log('Funnel chart data:', data)

      // Chart dimensions
      const width = config.options.width || 680
      const height = config.options.height || 400
      const margin = { top: 50, right: 20, bottom: 30, left: 20 }
      const innerWidth = width - margin.left - margin.right
      const innerHeight = height - margin.top - margin.bottom

      // Create SVG
      const svg = d3.create('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', [0, 0, width, height])
        .attr('style', 'max-width: 100%; height: auto;')

      const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`)

      // Calculate max value for scaling
      const maxValue = d3.max(data, d => d.value) || 1

      // Color scale
      const color = d3.scaleOrdinal<string>()
        .domain(data.map(d => d.stage))
        .range(d3.schemeTableau10)

      // Height for each segment
      const segmentHeight = innerHeight / data.length
      const centerX = innerWidth / 2

      // Draw funnel segments
      data.forEach((d, i) => {
        const topWidth = (d.value / maxValue) * innerWidth
        const nextValue = data[i + 1]?.value || d.value * 0.5
        const bottomWidth = (nextValue / maxValue) * innerWidth

        const y1 = i * segmentHeight
        const y2 = (i + 1) * segmentHeight

        // Create trapezoid path
        const path = `
          M ${centerX - topWidth / 2},${y1}
          L ${centerX + topWidth / 2},${y1}
          L ${centerX + bottomWidth / 2},${y2}
          L ${centerX - bottomWidth / 2},${y2}
          Z
        `

        // Draw segment
        g.append('path')
          .attr('d', path)
          .attr('fill', color(d.stage))
          .attr('stroke', '#1F2937')
          .attr('stroke-width', 2)
          .style('opacity', 0.9)
          .append('title')
          .text(`${d.stage}: ${d.value.toLocaleString()}`)

        // Add label
        g.append('text')
          .attr('x', centerX)
          .attr('y', y1 + segmentHeight / 2)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .attr('fill', '#E5E7EB')
          .attr('font-size', '14px')
          .attr('font-weight', '500')
          .text(`${d.stage}`)

        // Add value
        g.append('text')
          .attr('x', centerX)
          .attr('y', y1 + segmentHeight / 2 + 18)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .attr('fill', '#9CA3AF')
          .attr('font-size', '12px')
          .text(d.value.toLocaleString())

        // Calculate and show conversion rate (except for last stage)
        if (i > 0) {
          const prevValue = data[i - 1].value
          const conversionRate = ((d.value / prevValue) * 100).toFixed(1)

          g.append('text')
            .attr('x', centerX + topWidth / 2 + 10)
            .attr('y', y1)
            .attr('text-anchor', 'start')
            .attr('dominant-baseline', 'middle')
            .attr('fill', '#6B7280')
            .attr('font-size', '11px')
            .text(`${conversionRate}%`)
        }
      })

      // Title
      if (config.options.title) {
        svg.append('text')
          .attr('x', width / 2)
          .attr('y', 25)
          .attr('text-anchor', 'middle')
          .attr('fill', '#E5E7EB')
          .attr('font-size', '18px')
          .attr('font-weight', '600')
          .text(config.options.title)
      }

      // Check if component is still mounted
      if (!mounted || !chartContainer) {
        console.log('Component unmounted during funnel chart render, aborting')
        return
      }

      // Append to container
      if (document.body.contains(chartContainer)) {
        const svgNode = svg.node()
        if (svgNode) {
          chartContainer.appendChild(svgNode)
          plotElement = svgNode
          console.log('Funnel chart rendered successfully')
        }
      }
    } catch (err) {
      console.error('Failed to render funnel chart:', err)
      if (mounted) {
        error = err instanceof Error ? err.message : 'Failed to render funnel chart'
      }
    } finally {
      if (mounted) {
        loading = false
      }
    }
  }

  async function renderChart() {
    if (!mounted || !chartContainer || !config) {
      console.log('Chart render skipped:', { mounted, chartContainer: !!chartContainer, config: !!config })
      return
    }

    cleanup()
    loading = true
    error = null

    try {
      // Ensure coordinator is initialized
      const coord = coordinator()
      if (!coord) {
        throw new Error('Mosaic coordinator not initialized')
      }

      // Create the appropriate chart based on type
      let mark: any

      switch (config.type) {
        case 'bar':
          mark = vg.barY(
            vg.from(config.data.table),
            {
              x: config.data.x,
              y: config.data.y,
              fill: config.data.group || undefined
            }
          )
          break

        case 'line':
          mark = vg.lineY(
            vg.from(config.data.table),
            {
              x: config.data.x,
              y: config.data.y,
              stroke: config.data.group || undefined
            }
          )
          break

        case 'area':
          mark = vg.areaY(
            vg.from(config.data.table),
            {
              x: config.data.x,
              y: config.data.y,
              fill: config.data.group || 'steelblue',
              fillOpacity: config.options.fillOpacity || 0.7,
              curve: config.options.curve || 'linear'
            }
          )
          break

        case 'scatter':
          mark = vg.dot(
            vg.from(config.data.table),
            {
              x: config.data.x,
              y: config.data.y,
              fill: config.data.group || undefined
            }
          )
          break

        case 'histogram':
          mark = vg.rectY(
            vg.from(config.data.table),
            {
              x: vg.bin(config.data.x, { thresholds: config.options.bins || 20 }),
              y: vg.count(),
              fill: config.data.group || 'steelblue'
            }
          )
          break

        case 'boxplot':
          // BoxPlot uses D3 instead of vgplot since vgplot doesn't have native boxplot support
          await renderBoxPlot()
          return  // Exit early - boxplot handles its own rendering

        case 'pie':
          // Pie charts use D3 instead of vgplot
          await renderPieChart()
          return  // Exit early - pie chart handles its own rendering

        case 'heatmap':
          // Heatmap uses cell marks with color encoding
          // color can be specified in options or defaults to group or y
          const colorColumn = config.options.color || config.data.group || config.data.y
          mark = vg.cell(
            vg.from(config.data.table),
            {
              x: config.data.x,
              y: config.data.y,
              fill: colorColumn,
              inset: 0.5
            }
          )
          break

        case 'funnel':
          // Funnel charts use D3
          await renderFunnelChart()
          return  // Exit early - funnel chart handles its own rendering

        default:
          throw new Error(`Unsupported chart type: ${config.type}`)
      }

      // Build plot configuration
      const plotConfig: any[] = [
        mark,
        vg.width(config.options.width || 680),
        vg.height(config.options.height || 400)
      ]

      // Add title if provided
      if (config.options.title) {
        plotConfig.push(vg.text([config.options.title], { fontSize: 20, frameAnchor: 'top' }))
      }

      // Add axis labels if provided
      if (config.options.xLabel) {
        plotConfig.push(vg.xLabel(config.options.xLabel))
      }
      if (config.options.yLabel) {
        plotConfig.push(vg.yLabel(config.options.yLabel))
      }

      // Add grid if enabled
      if (config.options.grid) {
        plotConfig.push(vg.grid(true))
      }

      // Set x-axis scale type if specified (to suppress warnings for date-like strings)
      if (config.options.xScaleType) {
        plotConfig.push(vg.xScale(config.options.xScaleType))
        console.log(`X-axis scale type set to: ${config.options.xScaleType}`)
      }

      // Create and render the plot
      const plot = vg.plot(...plotConfig)

      // Wait a tick for DOM to be ready
      await new Promise(resolve => setTimeout(resolve, 0))

      // Check if component is still mounted after async operations
      if (!mounted || !chartContainer) {
        console.log('Component unmounted during render, aborting')
        return
      }

      // Check if container is still in the DOM
      if (document.body.contains(chartContainer)) {
        chartContainer.appendChild(plot)
        plotElement = plot
        console.log('Chart rendered successfully:', config.type)
      } else {
        console.warn('Chart container not in DOM, skipping render')
      }
    } catch (err) {
      console.error('Failed to render chart:', err)
      if (mounted) {
        error = err instanceof Error ? err.message : 'Failed to render chart'
      }
    } finally {
      if (mounted) {
        loading = false
      }
    }
  }
</script>

<div class="vgplot-chart">
  {#if loading}
    <div class="loading">
      <div class="spinner"></div>
      <p>Rendering chart...</p>
    </div>
  {/if}

  {#if error}
    <div class="error">
      <strong>⚠ Chart Error</strong>
      <p>{error}</p>
    </div>
  {/if}

  <div
    bind:this={chartContainer}
    class="chart-container"
    class:hidden={loading || error}
  ></div>
</div>

<style>
  .vgplot-chart {
    width: 100%;
    min-height: 400px;
    position: relative;
  }

  .chart-container {
    width: 100%;
    height: 100%;
  }

  .chart-container.hidden {
    display: none;
  }

  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 400px;
    gap: 1rem;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid rgba(255, 255, 255, 0.1);
    border-top-color: #667eea;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .loading p {
    margin: 0;
    opacity: 0.7;
  }

  .error {
    padding: 2rem;
    background-color: rgba(220, 38, 38, 0.1);
    border: 1px solid rgba(220, 38, 38, 0.3);
    border-radius: 8px;
    text-align: center;
  }

  .error strong {
    display: block;
    font-size: 1.1rem;
    color: #fca5a5;
    margin-bottom: 0.5rem;
  }

  .error p {
    margin: 0;
    opacity: 0.9;
  }

  /* vgplot default styling overrides - dark theme */
  :global(.vgplot-chart svg) {
    font-family: inherit;
    background-color: transparent !important;
  }

  /* Force dark background for plot area */
  :global(.vgplot-chart svg rect[fill="white"]),
  :global(.vgplot-chart svg rect[fill="#ffffff"]) {
    fill: #1F2937 !important;
  }

  /* Dark text for axes and labels */
  :global(.vgplot-chart svg text) {
    fill: #E5E7EB !important;
  }

  /* Dark grid lines */
  :global(.vgplot-chart svg .grid line) {
    stroke: #374151 !important;
  }

  :global(.vgplot-chart .mark) {
    transition: opacity 0.2s;
  }

  :global(.vgplot-chart .mark:hover) {
    opacity: 0.8;
  }
</style>
