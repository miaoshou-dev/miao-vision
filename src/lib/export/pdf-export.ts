/**
 * PDF Export Utility
 *
 * Export rendered reports to PDF using html2pdf.js
 */

// @ts-ignore - html2pdf.js doesn't have TypeScript types
import html2pdf from 'html2pdf.js'

export interface PDFExportOptions {
  /** PDF filename (without extension) */
  filename?: string
  /** Page margin in mm */
  margin?: number | [number, number, number, number]
  /** Image quality (0-1) */
  imageQuality?: number
  /** Page format */
  format?: 'a4' | 'letter' | 'legal'
  /** Page orientation */
  orientation?: 'portrait' | 'landscape'
  /** Scale factor for rendering */
  scale?: number
}

const defaultOptions: PDFExportOptions = {
  filename: 'report',
  margin: 10,
  imageQuality: 0.95,
  format: 'a4',
  orientation: 'portrait',
  scale: 2
}

/**
 * Export an HTML element to PDF
 */
export async function exportToPDF(
  element: HTMLElement,
  options: PDFExportOptions = {}
): Promise<void> {
  const opts = { ...defaultOptions, ...options }

  const timestamp = new Date().toISOString().split('T')[0]
  const filename = `${opts.filename}_${timestamp}.pdf`

  // Collect SVG dimensions BEFORE cloning (getBoundingClientRect needs element in DOM)
  const svgDimensions: Array<{ width: number; height: number }> = []
  element.querySelectorAll('svg').forEach(svg => {
    const rect = svg.getBoundingClientRect()
    svgDimensions.push({ width: rect.width || 400, height: rect.height || 300 })
  })

  // Clone element
  const clone = element.cloneNode(true) as HTMLElement

  // Apply SVG dimensions to cloned elements
  const clonedSvgs = clone.querySelectorAll('svg')
  clonedSvgs.forEach((svg, i) => {
    const dims = svgDimensions[i] || { width: 400, height: 300 }
    svg.setAttribute('width', String(dims.width))
    svg.setAttribute('height', String(dims.height))
  })

  // Inject print styles via CSS class (much faster than getComputedStyle)
  const styleSheet = document.createElement('style')
  styleSheet.textContent = `
    .pdf-export-container * {
      color: #1f2937 !important;
    }
    .pdf-export-container {
      background: white !important;
      padding: 20px;
    }
    .pdf-export-container .evidence-card,
    .pdf-export-container .card,
    .pdf-export-container .kpi-card {
      background-color: #ffffff !important;
      border: 1px solid #e5e7eb !important;
      box-shadow: none !important;
    }
    .pdf-export-container table {
      border-collapse: collapse !important;
      width: 100% !important;
    }
    .pdf-export-container th,
    .pdf-export-container td {
      border: 1px solid #e5e7eb !important;
      padding: 8px !important;
      color: #1f2937 !important;
    }
    .pdf-export-container th {
      background-color: #f9fafb !important;
      font-weight: 600 !important;
    }
    .pdf-export-container pre,
    .pdf-export-container code {
      background-color: #f3f4f6 !important;
      color: #1f2937 !important;
    }
    .pdf-export-container .chart-container {
      background: white !important;
    }
  `
  document.head.appendChild(styleSheet)

  // Create container
  const container = document.createElement('div')
  container.className = 'pdf-export-container'
  container.style.cssText = `
    position: fixed;
    left: -9999px;
    top: 0;
    width: 210mm;
    background: white;
  `
  container.appendChild(clone)
  document.body.appendChild(container)

  const html2pdfOptions = {
    margin: opts.margin,
    filename: filename,
    image: { type: 'jpeg' as const, quality: opts.imageQuality },
    html2canvas: {
      scale: opts.scale,
      useCORS: true,
      allowTaint: true,
      logging: false,
      scrollX: 0,
      scrollY: 0
    },
    jsPDF: {
      unit: 'mm' as const,
      format: opts.format,
      orientation: opts.orientation
    }
  }

  try {
    console.log('📄 Starting PDF export...')

    await html2pdf()
      .set(html2pdfOptions)
      .from(clone)
      .save()

    console.log('✅ PDF exported successfully:', filename)
  } catch (error) {
    console.error('❌ PDF export failed:', error)
    throw new Error(`Failed to export PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
  } finally {
    // Clean up
    document.body.removeChild(container)
    document.head.removeChild(styleSheet)
  }
}

/**
 * Get PDF export state
 */
export function createPDFExportState() {
  let exporting = $state(false)
  let error = $state<string | null>(null)

  return {
    get exporting() { return exporting },
    get error() { return error },

    async export(element: HTMLElement, options?: PDFExportOptions) {
      exporting = true
      error = null

      try {
        await exportToPDF(element, options)
      } catch (err) {
        error = err instanceof Error ? err.message : 'Export failed'
        throw err
      } finally {
        exporting = false
      }
    }
  }
}
