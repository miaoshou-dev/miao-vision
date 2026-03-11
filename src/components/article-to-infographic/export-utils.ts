/**
 * Export utilities for infographic output.
 *
 * Provides three export modes:
 * - Copy Markdown  → clipboard API
 * - Download .md   → Blob download
 * - Download PNG   → foreignObject SVG → Canvas → PNG (no external deps)
 */

// CSS properties to inline for accurate off-screen rendering
const INLINE_PROPS = [
  'color', 'background-color', 'font-size', 'font-weight', 'font-family',
  'display', 'flex-direction', 'flex-wrap', 'align-items', 'justify-content',
  'gap', 'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'margin', 'margin-top', 'margin-bottom',
  'border-radius', 'border', 'border-color',
  'width', 'height', 'min-height', 'max-width', 'box-sizing',
  'overflow', 'position', 'top', 'left', 'right', 'bottom',
  'text-align', 'line-height', 'letter-spacing', 'opacity', 'transform',
  'grid-template-columns', 'grid-gap'
]

/** Copy markdown text to clipboard. Returns true on success. */
export async function copyMarkdown(markdown: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(markdown)
    return true
  } catch {
    return false
  }
}

/** Download markdown as a .md file. */
export function downloadMarkdown(markdown: string, filename = 'infographic.md'): void {
  triggerDownload(new Blob([markdown], { type: 'text/markdown' }), filename)
}

/**
 * Export the given element as a PNG.
 *
 * Strategy:
 *   1. Clone element and inline all computed styles (resolves CSS variables)
 *   2. Wrap in an SVG <foreignObject> so the browser can rasterise HTML+SVG
 *   3. Draw onto a high-DPI canvas with a dark background
 *   4. Export as PNG blob and trigger download
 */
export async function exportPng(el: HTMLElement, filename = 'infographic.png'): Promise<void> {
  const width = el.scrollWidth
  const height = el.scrollHeight
  const scale = Math.min(window.devicePixelRatio || 1, 2)

  // Clone and inline computed styles so CSS variables are resolved
  const clone = el.cloneNode(true) as HTMLElement
  inlineComputedStyles(el, clone)
  clone.style.cssText = [
    `width:${width}px`,
    `height:${height}px`,
    'overflow:visible',
    'position:relative',
    'background:#030712'
  ].join(';')

  // Build SVG foreignObject wrapper
  const svgNS = 'http://www.w3.org/2000/svg'
  const svg = document.createElementNS(svgNS, 'svg')
  svg.setAttribute('xmlns', svgNS)
  svg.setAttribute('xmlns:xhtml', 'http://www.w3.org/1999/xhtml')
  svg.setAttribute('width', String(width))
  svg.setAttribute('height', String(height))

  const fo = document.createElementNS(svgNS, 'foreignObject')
  fo.setAttribute('x', '0')
  fo.setAttribute('y', '0')
  fo.setAttribute('width', String(width))
  fo.setAttribute('height', String(height))
  fo.appendChild(clone)
  svg.appendChild(fo)

  const svgString = new XMLSerializer().serializeToString(svg)
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
  const svgUrl = URL.createObjectURL(svgBlob)

  const canvas = document.createElement('canvas')
  canvas.width = width * scale
  canvas.height = height * scale
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    URL.revokeObjectURL(svgUrl)
    throw new Error('Canvas 2D context unavailable')
  }

  ctx.scale(scale, scale)
  ctx.fillStyle = '#030712'
  ctx.fillRect(0, 0, width, height)

  await new Promise<void>((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, 0, 0)
      URL.revokeObjectURL(svgUrl)
      canvas.toBlob(
        png => {
          if (png) triggerDownload(png, filename)
          resolve()
        },
        'image/png'
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(svgUrl)
      reject(new Error('Failed to render infographic as image'))
    }
    img.src = svgUrl
  })
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function inlineComputedStyles(source: Element, dest: Element): void {
  if (source instanceof HTMLElement && dest instanceof HTMLElement) {
    const computed = window.getComputedStyle(source)
    const parts: string[] = []
    for (const prop of INLINE_PROPS) {
      const val = computed.getPropertyValue(prop)
      if (val && val !== 'initial' && val !== 'normal') {
        parts.push(`${prop}:${val}`)
      }
    }
    if (parts.length) {
      dest.setAttribute('style', parts.join(';'))
    }
  }
  for (let i = 0; i < source.children.length; i++) {
    const destChild = dest.children[i]
    if (destChild) inlineComputedStyles(source.children[i], destChild)
  }
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
