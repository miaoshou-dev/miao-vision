/**
 * Static Site Exporter
 *
 * Exports reports as deployable static sites that can be hosted
 * on GitHub Pages, Netlify, Vercel, or any static hosting.
 *
 * @module core/export/static-site-exporter
 */

import type { Report } from '@/types/report'
import { htmlExportService } from './html-exporter'
import { generateInteractiveRuntime, generateInteractiveStyles } from './interactive-runtime'

export interface StaticSiteOptions {
  /** Site title */
  title: string
  /** Site description */
  description?: string
  /** Base URL for deployment */
  baseUrl?: string
  /** Include data as separate JSON files */
  separateDataFiles?: boolean
  /** Dark theme */
  darkTheme?: boolean
  /** Include source markdown */
  includeSource?: boolean
  /** Custom favicon (base64 data URL) */
  favicon?: string
  /** Enable lightweight static report interactions */
  interactive?: boolean
}

export interface StaticSiteFile {
  path: string
  content: string
  type: 'html' | 'json' | 'css' | 'js' | 'md' | 'txt'
}

export interface StaticSiteBundle {
  files: StaticSiteFile[]
  manifest: {
    title: string
    created: string
    version: string
    files: string[]
  }
}

/**
 * Generate a basic favicon SVG
 */
function generateDefaultFavicon(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#4285f4"/>
      <stop offset="50%" style="stop-color:#9b59b6"/>
      <stop offset="100%" style="stop-color:#ec4899"/>
    </linearGradient>
  </defs>
  <rect width="32" height="32" rx="6" fill="url(#g)"/>
  <text x="16" y="23" text-anchor="middle" fill="white" font-family="Arial" font-size="18" font-weight="bold">M</text>
</svg>`
}

/**
 * Generate index.html for static site
 */
function generateIndexHTML(
  reportContent: string,
  report: Report,
  options: StaticSiteOptions
): string {
  const favicon = options.favicon || `data:image/svg+xml,${encodeURIComponent(generateDefaultFavicon())}`

  const dataScript = options.separateDataFiles
    ? `<script src="./data/report-data.js"></script>`
    : report.embeddedData
      ? `<script>window.__MIAO_VISION_DATA__ = ${JSON.stringify(report.embeddedData)};</script>`
      : ''

  const interactiveScript = options.interactive
    ? `<script src="./assets/interactive.js"></script>`
    : ''

  const interactiveStyles = options.interactive
    ? `<link rel="stylesheet" href="./assets/interactive.css">`
    : ''

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${escapeHtml(options.description || `Data report: ${options.title}`)}">
  <meta name="generator" content="Miao Vision Static Site Export">
  <meta property="og:title" content="${escapeHtml(options.title)}">
  <meta property="og:type" content="article">
  <meta property="og:description" content="${escapeHtml(options.description || 'Data report created with Miao Vision')}">
  <link rel="icon" href="${favicon}">
  <title>${escapeHtml(options.title)}</title>
  <link rel="stylesheet" href="./assets/styles.css">
  ${interactiveStyles}
</head>
<body>
  <header class="site-header">
    <div class="header-content">
      <h1 class="site-title">${escapeHtml(options.title)}</h1>
      <p class="site-meta">
        <span class="meta-date">${new Date().toLocaleDateString('zh-CN')}</span>
        <span class="meta-separator">•</span>
        <span class="meta-tool">Miao Vision</span>
      </p>
    </div>
  </header>

  <main class="site-content">
    <article class="report-content">
${reportContent}
    </article>
  </main>

  <footer class="site-footer">
    <p>Created with <a href="https://github.com/miaoshou/vision" target="_blank">Miao Vision</a></p>
    <p class="footer-meta">Exported on ${new Date().toLocaleString('zh-CN')}</p>
  </footer>

  ${dataScript}
  <script src="./assets/main.js"></script>
  ${interactiveScript}
</body>
</html>`
}

/**
 * Generate CSS styles for static site
 */
function getStaticSiteStyles(darkTheme: boolean): string {
  const bgColor = darkTheme ? '#111827' : '#ffffff'
  const bgSecondary = darkTheme ? '#1F2937' : '#F9FAFB'
  const textColor = darkTheme ? '#F3F4F6' : '#1F2937'
  const textMuted = darkTheme ? '#9CA3AF' : '#6B7280'
  const borderColor = darkTheme ? '#374151' : '#E5E7EB'
  const accentColor = '#3B82F6'

  return `/* Miao Vision Static Site Styles */
:root {
  --bg-primary: ${bgColor};
  --bg-secondary: ${bgSecondary};
  --text-primary: ${textColor};
  --text-muted: ${textMuted};
  --border-color: ${borderColor};
  --accent-color: ${accentColor};
  --gradient-start: #4285f4;
  --gradient-mid: #9b59b6;
  --gradient-end: #ec4899;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  scroll-behavior: smooth;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  line-height: 1.6;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* Header */
.site-header {
  background: linear-gradient(135deg, var(--gradient-start) 0%, var(--gradient-mid) 50%, var(--gradient-end) 100%);
  padding: 2rem 1rem;
  text-align: center;
}

.header-content {
  max-width: 800px;
  margin: 0 auto;
}

.site-title {
  color: white;
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  text-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.site-meta {
  color: rgba(255,255,255,0.9);
  font-size: 0.9rem;
}

.meta-separator {
  margin: 0 0.5rem;
}

/* Main Content */
.site-content {
  flex: 1;
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1rem;
  width: 100%;
}

.report-content {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
}

/* Typography */
h1, h2, h3, h4, h5, h6 {
  margin: 1.5rem 0 1rem;
  font-weight: 600;
  line-height: 1.3;
}

h1 { font-size: 2rem; }
h2 {
  font-size: 1.5rem;
  border-bottom: 2px solid var(--border-color);
  padding-bottom: 0.5rem;
}
h3 { font-size: 1.25rem; }

p { margin: 1rem 0; }

/* Tables */
table {
  width: 100%;
  border-collapse: collapse;
  margin: 1.5rem 0;
  font-size: 0.875rem;
  overflow-x: auto;
  display: block;
}

@media (min-width: 768px) {
  table {
    display: table;
  }
}

th, td {
  padding: 0.75rem 1rem;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
}

th {
  background: ${darkTheme ? '#374151' : '#F3F4F6'};
  font-weight: 600;
  position: sticky;
  top: 0;
}

tr:hover {
  background: ${darkTheme ? 'rgba(55, 65, 81, 0.5)' : 'rgba(243, 244, 246, 0.5)'};
}

/* Code */
code {
  background: ${darkTheme ? '#374151' : '#F3F4F6'};
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.875em;
}

pre {
  background: ${darkTheme ? '#374151' : '#F3F4F6'};
  padding: 1rem;
  border-radius: 8px;
  overflow-x: auto;
  margin: 1rem 0;
}

pre code {
  background: none;
  padding: 0;
}

/* Blockquotes */
blockquote {
  border-left: 4px solid var(--accent-color);
  padding-left: 1rem;
  margin: 1rem 0;
  color: var(--text-muted);
  font-style: italic;
}

/* Lists */
ul, ol {
  margin: 1rem 0;
  padding-left: 2rem;
}

li { margin: 0.5rem 0; }

/* Links */
a {
  color: var(--accent-color);
  text-decoration: none;
  transition: color 0.2s;
}

a:hover {
  text-decoration: underline;
}

/* Horizontal Rules */
hr {
  border: none;
  border-top: 1px solid var(--border-color);
  margin: 2rem 0;
}

/* Cards & Components */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin: 1.5rem 0;
}

.kpi-card, .evidence-card {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1.25rem;
  transition: transform 0.2s, box-shadow 0.2s;
}

.kpi-card:hover, .evidence-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

/* Charts */
.chart-container {
  margin: 1.5rem 0;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1rem;
  overflow-x: auto;
}

.chart-container svg {
  max-width: 100%;
  height: auto;
}

/* DataTable */
.datatable-container {
  margin: 1.5rem 0;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
}

/* Progress */
.progress-container {
  margin: 1rem 0;
}

.progress-bar {
  height: 8px;
  background: var(--border-color);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--gradient-start), var(--gradient-end));
  border-radius: 4px;
  transition: width 0.3s ease;
}

/* Footer */
.site-footer {
  background: var(--bg-secondary);
  padding: 1.5rem 1rem;
  text-align: center;
  border-top: 1px solid var(--border-color);
  margin-top: auto;
}

.site-footer p {
  margin: 0.25rem 0;
  font-size: 0.875rem;
  color: var(--text-muted);
}

.footer-meta {
  font-size: 0.75rem !important;
}

/* Responsive */
@media (max-width: 768px) {
  .site-header {
    padding: 1.5rem 1rem;
  }

  .site-title {
    font-size: 1.5rem;
  }

  .report-content {
    padding: 1rem;
    border-radius: 8px;
  }

  .kpi-grid {
    grid-template-columns: 1fr;
  }
}

/* Print Styles */
@media print {
  .site-header {
    background: none;
    color: black;
  }

  .site-title {
    color: black;
    text-shadow: none;
  }

  .site-footer {
    display: none;
  }

  .report-content {
    box-shadow: none;
    border: none;
  }
}
`
}

/**
 * Generate main.js for static site
 */
function generateMainJS(): string {
  return `// Miao Vision Static Site JavaScript
(function() {
  'use strict';

  // Initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', function() {
    console.log('📊 Miao Vision Report Loaded');

    // Add smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
      anchor.addEventListener('click', function(e) {
        e.preventDefault();
        var target = document.querySelector(this.getAttribute('href'));
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });

    // Add table sorting (basic)
    document.querySelectorAll('table th').forEach(function(th, index) {
      th.style.cursor = 'pointer';
      th.title = 'Click to sort';
      th.addEventListener('click', function() {
        sortTable(this.closest('table'), index);
      });
    });

    // Log embedded data if available
    if (window.__MIAO_VISION_DATA__) {
      console.log('📦 Embedded data tables:', Object.keys(window.__MIAO_VISION_DATA__));
    }
  });

  // Basic table sorting
  function sortTable(table, columnIndex) {
    var tbody = table.querySelector('tbody') || table;
    var rows = Array.from(tbody.querySelectorAll('tr')).filter(function(row) {
      return row.querySelector('td');
    });

    var isAsc = table.dataset.sortCol === String(columnIndex) && table.dataset.sortDir !== 'asc';

    rows.sort(function(a, b) {
      var aVal = a.cells[columnIndex]?.textContent?.trim() || '';
      var bVal = b.cells[columnIndex]?.textContent?.trim() || '';

      // Try numeric comparison
      var aNum = parseFloat(aVal.replace(/[^0-9.-]/g, ''));
      var bNum = parseFloat(bVal.replace(/[^0-9.-]/g, ''));

      if (!isNaN(aNum) && !isNaN(bNum)) {
        return isAsc ? aNum - bNum : bNum - aNum;
      }

      // String comparison
      return isAsc
        ? aVal.localeCompare(bVal, 'zh-CN')
        : bVal.localeCompare(aVal, 'zh-CN');
    });

    rows.forEach(function(row) {
      tbody.appendChild(row);
    });

    table.dataset.sortCol = String(columnIndex);
    table.dataset.sortDir = isAsc ? 'asc' : 'desc';
  }
})();
`
}

/**
 * Generate README for the static site
 */
function generateReadme(options: StaticSiteOptions): string {
  return `# ${options.title}

${options.description || 'Data report created with Miao Vision'}

## About

This is a static site export of a Miao Vision report. It can be hosted on any static hosting service.

## Deployment

### GitHub Pages

1. Push this folder to a GitHub repository
2. Go to Settings > Pages
3. Select the branch and folder containing these files
4. Your site will be available at \`https://username.github.io/repo-name/\`

### Netlify

1. Drag and drop this folder to [Netlify Drop](https://app.netlify.com/drop)
2. Or connect your GitHub repository for automatic deployments

### Vercel

1. Install Vercel CLI: \`npm i -g vercel\`
2. Run \`vercel\` in this folder
3. Follow the prompts to deploy

### Any Static Host

Simply upload the contents of this folder to your web server.

## Files

- \`index.html\` - Main report page
- \`assets/styles.css\` - Stylesheet
- \`assets/main.js\` - JavaScript functionality
- \`assets/interactive.js\` - Interactive runtime (if enabled)
- \`assets/interactive.css\` - Interactive styles (if enabled)
- \`data/report-data.js\` - Embedded data (if included)

## Interactive Features

If exported with \`interactive: true\`, the following features are available:

- **Table Sorting**: Click column headers to sort
- **Input Controls**: Dropdowns and button groups work
- **Cross-Filtering**: Inputs can filter related tables

## Created

Generated on ${new Date().toLocaleString('zh-CN')} with Miao Vision.
`
}

/**
 * Escape HTML entities
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }
  return text.replace(/[&<>"']/g, m => map[m])
}

/**
 * Generate the static site bundle
 */
export async function generateStaticSite(
  reportElement: HTMLElement,
  report: Report,
  options: StaticSiteOptions
): Promise<StaticSiteBundle> {
  console.log('📦 Generating static site bundle...')

  const files: StaticSiteFile[] = []

  // Get report content
  const baseHtml = await htmlExportService.getHTML(reportElement, {
    title: options.title,
    darkTheme: options.darkTheme ?? true
  })

  // Extract just the content from the HTML
  const contentMatch = baseHtml.match(/<article[^>]*>([\s\S]*?)<\/article>/)
  const reportContent = contentMatch ? contentMatch[1] : reportElement.innerHTML

  // Generate index.html
  const indexHtml = generateIndexHTML(reportContent, report, options)
  files.push({
    path: 'index.html',
    content: indexHtml,
    type: 'html'
  })

  // Generate styles.css
  files.push({
    path: 'assets/styles.css',
    content: getStaticSiteStyles(options.darkTheme ?? true),
    type: 'css'
  })

  // Generate main.js
  files.push({
    path: 'assets/main.js',
    content: generateMainJS(),
    type: 'js'
  })

  // Generate interactive runtime if requested
  if (options.interactive) {
    files.push({
      path: 'assets/interactive.js',
      content: generateInteractiveRuntime(),
      type: 'js'
    })

    files.push({
      path: 'assets/interactive.css',
      content: generateInteractiveStyles(),
      type: 'css'
    })
  }

  // Generate data file if requested
  if (options.separateDataFiles && report.embeddedData) {
    const dataContent = `window.__MIAO_VISION_DATA__ = ${JSON.stringify(report.embeddedData, null, 2)};`
    files.push({
      path: 'data/report-data.js',
      content: dataContent,
      type: 'js'
    })
  }

  // Include source markdown if requested
  if (options.includeSource) {
    files.push({
      path: 'source/report.md',
      content: report.content,
      type: 'md'
    })
  }

  // Generate README
  files.push({
    path: 'README.md',
    content: generateReadme(options),
    type: 'md'
  })

  // Generate manifest
  const manifest = {
    title: options.title,
    created: new Date().toISOString(),
    version: '1.0',
    files: files.map(f => f.path)
  }

  files.push({
    path: 'manifest.json',
    content: JSON.stringify(manifest, null, 2),
    type: 'json'
  })

  console.log(`✅ Generated ${files.length} files for static site`)

  return { files, manifest }
}

/**
 * Download static site as ZIP
 */
/**
 * Generate a single self-contained HTML file with all assets inlined
 */
export function generateSelfContainedHTML(
  reportContent: string,
  report: Report,
  options: StaticSiteOptions
): string {
  const styles = getStaticSiteStyles(options.darkTheme ?? true)
  const mainJS = generateMainJS()
  const interactiveJS = options.interactive ? generateInteractiveRuntime() : ''
  const interactiveCSS = options.interactive ? generateInteractiveStyles() : ''
  const favicon = options.favicon || `data:image/svg+xml,${encodeURIComponent(generateDefaultFavicon())}`

  const dataScript = report.embeddedData
    ? `<script>window.__MIAO_VISION_DATA__ = ${JSON.stringify(report.embeddedData)};</script>`
    : ''

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${escapeHtml(options.description || `Data report: ${options.title}`)}">
  <meta name="generator" content="Miao Vision Static Site Export">
  <link rel="icon" href="${favicon}">
  <title>${escapeHtml(options.title)}</title>
  <style>
${styles}
${interactiveCSS}
  </style>
</head>
<body>
  <header class="site-header">
    <div class="header-content">
      <h1 class="site-title">${escapeHtml(options.title)}</h1>
      <p class="site-meta">
        <span class="meta-date">${new Date().toLocaleDateString('zh-CN')}</span>
        <span class="meta-separator">•</span>
        <span class="meta-tool">Miao Vision</span>
      </p>
    </div>
  </header>

  <main class="site-content">
    <article class="report-content">
${reportContent}
    </article>
  </main>

  <footer class="site-footer">
    <p>Created with <a href="https://github.com/miaoshou/vision" target="_blank">Miao Vision</a></p>
    <p class="footer-meta">Exported on ${new Date().toLocaleString('zh-CN')}</p>
  </footer>

  ${dataScript}
  <script>
${mainJS}
${interactiveJS}
  </script>
</body>
</html>`
}

export async function downloadStaticSiteZip(
  reportElement: HTMLElement,
  report: Report,
  options: StaticSiteOptions
): Promise<void> {
  const bundle = await generateStaticSite(reportElement, report, options)

  // Use JSZip if available
  if (typeof (window as any).JSZip !== 'undefined') {
    const JSZip = (window as any).JSZip
    const zip = new JSZip()

    bundle.files.forEach(file => {
      zip.file(file.path, file.content)
    })

    const blob = await zip.generateAsync({ type: 'blob' })
    downloadBlob(blob, `${sanitizeFilename(options.title)}-static-site.zip`)
  } else {
    // Fallback: Generate self-contained HTML with all assets inlined
    console.log('📄 Generating self-contained HTML (JSZip not available)')

    // Get report content
    const baseHtml = await htmlExportService.getHTML(reportElement, {
      title: options.title,
      darkTheme: options.darkTheme ?? true
    })
    const contentMatch = baseHtml.match(/<article[^>]*>([\s\S]*?)<\/article>/)
    const reportContent = contentMatch ? contentMatch[1] : reportElement.innerHTML

    const selfContainedHtml = generateSelfContainedHTML(reportContent, report, options)
    const blob = new Blob([selfContainedHtml], { type: 'text/html' })
    downloadBlob(blob, `${sanitizeFilename(options.title)}.html`)
  }
}

/**
 * Download blob as file
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Sanitize filename
 */
function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50) || 'report'
}

/**
 * Static Site Export Service
 */
class StaticSiteExporter {
  /**
   * Generate static site bundle
   */
  async generate(
    reportElement: HTMLElement,
    report: Report,
    options: StaticSiteOptions
  ): Promise<StaticSiteBundle> {
    return generateStaticSite(reportElement, report, options)
  }

  /**
   * Download as ZIP
   */
  async downloadZip(
    reportElement: HTMLElement,
    report: Report,
    options: StaticSiteOptions
  ): Promise<void> {
    return downloadStaticSiteZip(reportElement, report, options)
  }

  /**
   * Get individual files
   */
  async getFiles(
    reportElement: HTMLElement,
    report: Report,
    options: StaticSiteOptions
  ): Promise<StaticSiteFile[]> {
    const bundle = await generateStaticSite(reportElement, report, options)
    return bundle.files
  }
}

export const staticSiteExporter = new StaticSiteExporter()
