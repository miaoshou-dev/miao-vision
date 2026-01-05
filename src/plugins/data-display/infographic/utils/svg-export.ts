/**
 * SVG Export Utility
 *
 * Provides functions to export infographic SVG elements to files.
 */

/**
 * Export options
 */
export interface SVGExportOptions {
  /** Filename (without extension) */
  filename?: string
  /** Include XML declaration */
  includeXmlDeclaration?: boolean
  /** Include DOCTYPE */
  includeDoctype?: boolean
  /** Pretty print (add formatting) */
  prettyPrint?: boolean
  /** Scale factor for dimensions */
  scale?: number
  /** Background color (optional) */
  backgroundColor?: string
}

/**
 * Default export options
 */
const DEFAULT_OPTIONS: Required<SVGExportOptions> = {
  filename: 'infographic',
  includeXmlDeclaration: true,
  includeDoctype: false,
  prettyPrint: true,
  scale: 1,
  backgroundColor: ''
}

/**
 * Extract SVG element from a container
 */
export function extractSVG(container: HTMLElement): SVGSVGElement | null {
  return container.querySelector('svg')
}

/**
 * Clone and prepare SVG for export
 */
export function prepareSVGForExport(
  svg: SVGSVGElement,
  options: SVGExportOptions = {}
): SVGSVGElement {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  // Clone the SVG to avoid modifying the original
  const clone = svg.cloneNode(true) as SVGSVGElement

  // Get dimensions
  const width = parseFloat(svg.getAttribute('width') || '0') * opts.scale
  const height = parseFloat(svg.getAttribute('height') || '0') * opts.scale

  // Update dimensions if scaled
  if (opts.scale !== 1) {
    clone.setAttribute('width', String(width))
    clone.setAttribute('height', String(height))

    // Scale content
    const existingTransform = clone.getAttribute('transform') || ''
    clone.setAttribute('transform', `${existingTransform} scale(${opts.scale})`)
  }

  // Add background if specified
  if (opts.backgroundColor) {
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    bg.setAttribute('x', '0')
    bg.setAttribute('y', '0')
    bg.setAttribute('width', '100%')
    bg.setAttribute('height', '100%')
    bg.setAttribute('fill', opts.backgroundColor)
    clone.insertBefore(bg, clone.firstChild)
  }

  // Ensure xmlns is set
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink')

  return clone
}

/**
 * Serialize SVG to string
 */
export function serializeSVG(
  svg: SVGSVGElement,
  options: SVGExportOptions = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const serializer = new XMLSerializer()
  let svgString = serializer.serializeToString(svg)

  // Add XML declaration
  if (opts.includeXmlDeclaration) {
    svgString = '<?xml version="1.0" encoding="UTF-8"?>\n' + svgString
  }

  // Add DOCTYPE
  if (opts.includeDoctype) {
    svgString = svgString.replace(
      '<svg',
      '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n<svg'
    )
  }

  // Pretty print
  if (opts.prettyPrint) {
    svgString = formatSVGString(svgString)
  }

  return svgString
}

/**
 * Basic SVG string formatting
 */
function formatSVGString(svg: string): string {
  // Simple formatting - add newlines after closing tags
  return svg
    .replace(/></g, '>\n<')
    .replace(/(<\/[^>]+>)/g, '$1\n')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n')
}

/**
 * Download SVG as file
 */
export function downloadSVG(
  svg: SVGSVGElement,
  options: SVGExportOptions = {}
): void {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const prepared = prepareSVGForExport(svg, opts)
  const svgString = serializeSVG(prepared, opts)

  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = `${opts.filename}.svg`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Convert SVG to PNG and download
 */
export async function downloadAsPNG(
  svg: SVGSVGElement,
  options: SVGExportOptions & { quality?: number } = {}
): Promise<void> {
  const opts = { ...DEFAULT_OPTIONS, ...options, quality: options.quality ?? 1 }
  const prepared = prepareSVGForExport(svg, opts)
  const svgString = serializeSVG(prepared, { ...opts, prettyPrint: false })

  const width = parseFloat(prepared.getAttribute('width') || '800')
  const height = parseFloat(prepared.getAttribute('height') || '600')

  // Create canvas
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('Could not get canvas context')
  }

  // Create image from SVG
  const img = new Image()
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(svgBlob)

  return new Promise((resolve, reject) => {
    img.onload = () => {
      // Draw background if specified
      if (opts.backgroundColor) {
        ctx.fillStyle = opts.backgroundColor
        ctx.fillRect(0, 0, width, height)
      }

      ctx.drawImage(img, 0, 0)
      URL.revokeObjectURL(url)

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to create PNG blob'))
            return
          }

          const pngUrl = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = pngUrl
          link.download = `${opts.filename}.png`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          URL.revokeObjectURL(pngUrl)
          resolve()
        },
        'image/png',
        opts.quality
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load SVG image'))
    }

    img.src = url
  })
}

/**
 * Copy SVG to clipboard as text
 */
export async function copySVGToClipboard(
  svg: SVGSVGElement,
  options: SVGExportOptions = {}
): Promise<void> {
  const prepared = prepareSVGForExport(svg, options)
  const svgString = serializeSVG(prepared, options)

  await navigator.clipboard.writeText(svgString)
}

/**
 * Get SVG as data URL
 */
export function getSVGDataURL(
  svg: SVGSVGElement,
  options: SVGExportOptions = {}
): string {
  const prepared = prepareSVGForExport(svg, options)
  const svgString = serializeSVG(prepared, { ...options, prettyPrint: false })
  const encoded = encodeURIComponent(svgString)
  return `data:image/svg+xml;charset=utf-8,${encoded}`
}

/**
 * Get PNG as data URL
 */
export async function getPNGDataURL(
  svg: SVGSVGElement,
  options: SVGExportOptions = {}
): Promise<string> {
  const prepared = prepareSVGForExport(svg, options)
  const svgString = serializeSVG(prepared, { ...options, prettyPrint: false })

  const width = parseFloat(prepared.getAttribute('width') || '800')
  const height = parseFloat(prepared.getAttribute('height') || '600')

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('Could not get canvas context')
  }

  const img = new Image()
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(svgBlob)

  return new Promise((resolve, reject) => {
    img.onload = () => {
      if (options.backgroundColor) {
        ctx.fillStyle = options.backgroundColor
        ctx.fillRect(0, 0, width, height)
      }
      ctx.drawImage(img, 0, 0)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/png'))
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load SVG image'))
    }

    img.src = url
  })
}
