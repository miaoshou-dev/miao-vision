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
  'color', 'background-color', 'background-image', 'font-size', 'font-weight', 'font-family',
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
  await inlineExternalImages(clone)
  await inlineSvgImages(clone)
  await inlineBackgroundImages(clone)
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

/**
 * Convert all external <img> src attributes to base64 data URLs so the canvas
 * does not become tainted when the SVG foreignObject is drawn.
 * Blob URLs and data URLs are skipped (already safe).
 * If a fetch fails (e.g. CORS), the img is blanked to prevent tainting.
 */
async function inlineExternalImages(root: HTMLElement): Promise<void> {
  const imgs = root.querySelectorAll<HTMLImageElement>('img[src]')
  await Promise.all(
    Array.from(imgs).map(async (img) => {
      const src = img.getAttribute('src') ?? ''
      if (!src || src.startsWith('data:') || src.startsWith('blob:')) return
      img.removeAttribute('srcset') // srcset could still load cross-origin resources
      try {
        const resp = await fetch(src, { mode: 'cors', credentials: 'omit' })
        const blob = await resp.blob()
        img.src = await blobToDataUrl(blob)
      } catch {
        // Remove the src so it can't taint the canvas
        img.removeAttribute('src')
      }
    })
  )
}

/**
 * Convert cross-origin SVG <image> href / xlink:href to base64 data URLs.
 * SVG <image> elements are the most common source of canvas tainting in
 * infographic exports because they are not covered by the <img> pass above.
 */
async function inlineSvgImages(root: HTMLElement): Promise<void> {
  const svgImgs = root.querySelectorAll<SVGImageElement>('image')
  await Promise.all(
    Array.from(svgImgs).map(async (img) => {
      const href = img.getAttribute('href') ?? img.getAttribute('xlink:href') ?? ''
      if (!href || href.startsWith('data:') || href.startsWith('blob:')) return
      try {
        const resp = await fetch(href, { mode: 'cors', credentials: 'omit' })
        const blob = await resp.blob()
        const dataUrl = await blobToDataUrl(blob)
        img.setAttribute('href', dataUrl)
        img.removeAttribute('xlink:href')
      } catch {
        img.removeAttribute('href')
        img.removeAttribute('xlink:href')
      }
    })
  )
}

/**
 * Convert external URL references in inline background-image styles to base64.
 * Handles `url('...')` patterns set as inline styles (e.g. from inlineComputedStyles).
 */
async function inlineBackgroundImages(root: HTMLElement): Promise<void> {
  const all: HTMLElement[] = [root, ...Array.from(root.querySelectorAll<HTMLElement>('*'))]
  await Promise.all(
    all.map(async (el) => {
      const bg = el.style.backgroundImage
      if (!bg || bg === 'none') return
      const converted = await convertCssUrlsToDataUrls(bg)
      if (converted !== bg) el.style.backgroundImage = converted
    })
  )
}

async function convertCssUrlsToDataUrls(cssValue: string): Promise<string> {
  const urlRe = /url\(['"]?([^'")\s]+)['"]?\)/g
  const matches = [...cssValue.matchAll(urlRe)]
  if (matches.length === 0) return cssValue

  let result = cssValue
  await Promise.all(
    matches.map(async ([fullMatch, url]) => {
      if (url.startsWith('data:') || url.startsWith('blob:')) return
      try {
        const resp = await fetch(url, { mode: 'cors', credentials: 'omit' })
        const blob = await resp.blob()
        const dataUrl = await blobToDataUrl(blob)
        result = result.replace(fullMatch, `url('${dataUrl}')`)
      } catch {
        result = result.replace(fullMatch, 'none')
      }
    })
  )
  return result
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

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
