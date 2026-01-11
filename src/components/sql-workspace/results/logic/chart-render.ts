/**
 * Chart Rendering Logic
 *
 * Pure functions for SVG chart rendering (pie chart).
 */

import { getChartColor } from './chart-config'
import type { PreparedChartData } from './chart-data'

export interface PieChartOptions {
  width: number
  height: number
  title?: string
}

/**
 * Format number for display
 */
export function formatValue(n: number): string {
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(1) + 'B'
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  if (Number.isInteger(n)) return n.toString()
  return n.toFixed(2)
}

/**
 * Render pie chart as SVG
 */
export function renderPieChart(
  data: PreparedChartData | null,
  options: PieChartOptions
): string {
  if (!data || data.labels.length === 0) return ''

  const { width, height, title } = options
  const centerX = width / 2
  const centerY = height / 2 + 10
  const radius = Math.min(width, height) / 2 - 60

  const values = data.datasets[0]?.values || []
  const total = values.reduce((a, b) => a + b, 0) || 1

  let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="background: transparent;">`

  // Title
  if (title) {
    svg += `<text x="${width / 2}" y="20" fill="#E5E7EB" font-size="14" font-weight="600" text-anchor="middle">${escapeXml(title)}</text>`
  }

  let currentAngle = -Math.PI / 2

  data.labels.forEach((label, i) => {
    const value = values[i]
    const sliceAngle = (value / total) * Math.PI * 2
    const color = getChartColor(i)

    // Calculate arc path
    const x1 = centerX + radius * Math.cos(currentAngle)
    const y1 = centerY + radius * Math.sin(currentAngle)
    const x2 = centerX + radius * Math.cos(currentAngle + sliceAngle)
    const y2 = centerY + radius * Math.sin(currentAngle + sliceAngle)
    const largeArc = sliceAngle > Math.PI ? 1 : 0

    svg += `<path d="M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z" fill="${color}" stroke="#111827" stroke-width="2">
      <title>${escapeXml(label)}: ${formatValue(value)} (${((value / total) * 100).toFixed(1)}%)</title>
    </path>`

    // Label
    const labelAngle = currentAngle + sliceAngle / 2
    const labelRadius = radius * 0.7
    const labelX = centerX + labelRadius * Math.cos(labelAngle)
    const labelY = centerY + labelRadius * Math.sin(labelAngle)

    if (sliceAngle > 0.3) {
      const percentage = ((value / total) * 100).toFixed(1)
      svg += `<text x="${labelX}" y="${labelY}" fill="#E5E7EB" font-size="11" font-weight="500" text-anchor="middle" dominant-baseline="middle">${percentage}%</text>`
    }

    currentAngle += sliceAngle
  })

  // Legend
  const legendY = height - 40
  const legendItemWidth = Math.min(100, width / data.labels.length)
  const legendStartX = (width - data.labels.length * legendItemWidth) / 2

  data.labels.forEach((label, i) => {
    const x = legendStartX + i * legendItemWidth
    const color = getChartColor(i)
    const labelText = label.length > 10 ? label.slice(0, 10) + '...' : label
    svg += `<rect x="${x}" y="${legendY}" width="10" height="10" fill="${color}" rx="2"/>`
    svg += `<text x="${x + 14}" y="${legendY + 9}" fill="#9CA3AF" font-size="9">${escapeXml(labelText)}</text>`
  })

  svg += '</svg>'
  return svg
}

/**
 * Escape XML special characters
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Export SVG content to file
 */
export function exportSVG(
  svgContent: string,
  chartType: string
): void {
  if (!svgContent) return

  // Add XML declaration and proper SVG header
  const fullSvg = `<?xml version="1.0" encoding="UTF-8"?>
${svgContent.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')}`

  const blob = new Blob([fullSvg], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `chart-${chartType}-${Date.now()}.svg`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Export vgplot chart to PNG
 */
export async function exportPNG(
  chartContainer: HTMLElement | null,
  chartType: string
): Promise<void> {
  if (!chartContainer) return

  const svg = chartContainer.querySelector('svg')
  if (!svg) return

  const svgData = new XMLSerializer().serializeToString(svg)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const img = new Image()
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(svgBlob)

  return new Promise((resolve, reject) => {
    img.onload = () => {
      canvas.width = img.width * 2
      canvas.height = img.height * 2
      ctx.scale(2, 2)
      ctx.fillStyle = '#111827'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)
      URL.revokeObjectURL(url)

      canvas.toBlob((blob) => {
        if (blob) {
          const link = document.createElement('a')
          link.href = URL.createObjectURL(blob)
          link.download = `chart-${chartType}-${Date.now()}.png`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
        }
        resolve()
      }, 'image/png')
    }
    img.onerror = reject
    img.src = url
  })
}
