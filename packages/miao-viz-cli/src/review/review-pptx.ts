import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { deflateRawSync } from 'node:zlib'

type Browser = import('playwright-core').Browser
type Playwright = { chromium: import('playwright-core').BrowserType<Browser> }

export async function exportDeckToPptx(html: string, outputPath: string): Promise<void> {
  const require = createRequire(join(process.cwd(), 'package.json'))
  let playwright: Playwright | undefined
  for (const name of ['playwright', 'playwright-core', '@playwright/test']) {
    try { playwright = require(name) as Playwright; break } catch { /* Try the next installed package. */ }
  }
  if (!playwright) throw new Error('Playwright is required for PPTX export.')
  const dir = mkdtempSync(join(tmpdir(), 'miao-viz-pptx-'))
  let browser: Browser | undefined
  try {
    const source = join(dir, 'source.html')
    writeFileSync(source, html)
    browser = await playwright.chromium.launch()
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1.5 })
    await page.goto(pathToFileURL(source).href, { waitUntil: 'networkidle' })
    await page.waitForFunction(() => document.documentElement.dataset.miaoRenderReady === 'true')
    await page.evaluate(() => document.fonts.ready)
    await page.addStyleTag({ content: '.slide-viewport{display:block!important}.slide-canvas{transform:none!important;width:1280px!important;height:720px!important}.slide{position:relative!important;visibility:visible!important;opacity:1!important;animation:none!important;transition:none!important;width:1280px!important;height:720px!important}.slide-nav{display:none!important}' })
    const slides = page.locator('.slide')
    const count = await slides.count()
    if (!count) throw new Error('Deck has no slides to export.')
    const images: Buffer[] = []
    for (let index = 0; index < count; index++) images.push(await slides.nth(index).screenshot({ type: 'png', animations: 'disabled' }))
    writeFileSync(outputPath, buildPptx(images))
  } finally {
    await browser?.close().catch(() => {})
    rmSync(dir, { recursive: true, force: true })
  }
}

function buildPptx(images: Buffer[]): Buffer {
  const xml = (value: string) => Buffer.from(value, 'utf8')
  const files: [string, Buffer][] = [
    ['[Content_Types].xml', xml(`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>${images.map((_, i) => `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join('')}</Types>`) ],
    ['_rels/.rels', xml(`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/></Relationships>`) ],
    ['ppt/presentation.xml', xml(`<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><p:sldIdLst>${images.map((_, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 1}"/>`).join('')}</p:sldIdLst><p:sldSz cx="12192000" cy="6858000" type="screen16x9"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>`) ],
    ['ppt/_rels/presentation.xml.rels', xml(`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${images.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i + 1}.xml"/>`).join('')}</Relationships>`) ]
  ]
  images.forEach((image, index) => {
    const i = index + 1
    files.push([`ppt/media/image${i}.png`, image])
    files.push([`ppt/slides/_rels/slide${i}.xml.rels`, xml(`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image${i}.png"/></Relationships>`)])
    files.push([`ppt/slides/slide${i}.xml`, xml(`<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr><p:pic><p:nvPicPr><p:cNvPr id="2" name="Slide image ${i}"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="12192000" cy="6858000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`)] )
  })
  return zip(files)
}

function zip(files: [string, Buffer][]): Buffer {
  const local: Buffer[] = [], central: Buffer[] = []
  let offset = 0
  for (const [name, data] of files) {
    const filename = Buffer.from(name), compressed = deflateRawSync(data), crc = crc32(data)
    const head = Buffer.alloc(30)
    head.writeUInt32LE(0x04034b50, 0); head.writeUInt16LE(20, 4); head.writeUInt16LE(8, 6); head.writeUInt16LE(8, 8)
    head.writeUInt32LE(crc, 14); head.writeUInt32LE(compressed.length, 18); head.writeUInt32LE(data.length, 22); head.writeUInt16LE(filename.length, 26)
    local.push(head, filename, compressed)
    const entry = Buffer.alloc(46)
    entry.writeUInt32LE(0x02014b50, 0); entry.writeUInt16LE(20, 4); entry.writeUInt16LE(20, 6); entry.writeUInt16LE(8, 8); entry.writeUInt16LE(8, 10)
    entry.writeUInt32LE(crc, 16); entry.writeUInt32LE(compressed.length, 20); entry.writeUInt32LE(data.length, 24); entry.writeUInt16LE(filename.length, 28); entry.writeUInt32LE(offset, 42)
    central.push(entry, filename)
    offset += head.length + filename.length + compressed.length
  }
  const directory = Buffer.concat(central), end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10)
  end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16)
  return Buffer.concat([...local, directory, end])
}

function crc32(data: Buffer): number {
  let crc = -1
  for (const byte of data) { crc ^= byte; for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (-(crc & 1) & 0xedb88320) }
  return (crc ^ -1) >>> 0
}
