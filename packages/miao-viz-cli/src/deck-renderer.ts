import { getTheme } from './themes/index'
import { escapeHtml } from './svg-renderer'
import type { DeckSpec, SlideSpec } from './deck-types'
import type { ThemeName } from './themes/types'
import { shouldEnableDeckInteractive, renderDeckInteractiveAssets } from './deck-interactive'
import {
  renderCoverSlide,
  renderTitleOnlySlide,
  renderTextPointsSlide,
  renderTextChartSlide,
  renderMetricsChartSlide,
  renderChartFullSlide,
  renderTableFullSlide,
  renderEndingSlide
} from './deck-layouts'

const SLIDE_CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: var(--mv-serif); -webkit-font-smoothing: antialiased; }

  /* ── Present mode ── */
  body.present-mode { background: #141413; overflow: hidden; }
  .slide-viewport { width: 100vw; height: 100vh; display: flex; align-items: center; justify-content: center; }
  .slide-canvas { width: 1280px; height: 720px; transform-origin: center center; transform: scale(var(--slide-scale)); position: relative; }
  .slide {
    width: 1280px; height: 720px; background: var(--mv-paper);
    position: absolute; top: 0; left: 0;
    padding: 64px 80px 56px;
    display: flex; flex-direction: column;
    visibility: hidden; opacity: 0; transition: opacity 0.2s ease;
  }
  .slide.active { visibility: visible; opacity: 1; }

  /* ── Nav bar ── */
  .slide-nav {
    position: fixed; bottom: 0; left: 0; right: 0; height: 48px;
    display: flex; align-items: center; justify-content: center; gap: 12px;
    background: rgba(20,20,19,0.72); backdrop-filter: blur(8px);
    opacity: 0; transition: opacity 0.2s; z-index: 100;
  }
  .slide-nav:hover { opacity: 1; }
  .slide-nav button {
    background: none; border: none; cursor: pointer; color: rgba(255,255,255,0.65);
    font-size: 13px; padding: 4px 10px; border-radius: 3px;
    font-family: var(--mv-mono); transition: color 0.15s, background 0.15s;
  }
  .slide-nav button:hover { color: #fff; background: rgba(255,255,255,0.1); }
  .slide-counter { color: rgba(255,255,255,0.4); font-family: var(--mv-mono); font-size: 12px; min-width: 56px; text-align: center; }

  /* ── Shared slide elements ── */
  .slide-eyebrow { font-family: var(--mv-mono); font-size: 11px; font-weight: 500; text-transform: uppercase; letter-spacing: 3px; color: var(--mv-muted); margin-bottom: 14px; }
  .slide-title { font-family: var(--mv-serif); font-size: 50px; font-weight: 500; line-height: 1.1; letter-spacing: -0.6px; color: var(--mv-ink); margin-bottom: 24px; max-width: 19ch; overflow-wrap: anywhere; }
  .slide-claim { font-family: var(--mv-serif); font-size: 21px; line-height: 1.45; color: var(--mv-soft); margin-bottom: 18px; max-width: 52ch; overflow-wrap: anywhere; }
  .slide-pts { list-style: none; counter-reset: pts; }
  .slide-pts li { counter-increment: pts; font-size: 16px; line-height: 1.55; color: var(--mv-soft); padding-left: 22px; position: relative; margin-bottom: 10px; }
  .slide-pts li::before { content: counter(pts) "."; position: absolute; left: 0; color: var(--mv-brand); font-weight: 500; font-family: var(--mv-mono); font-size: 13px; }
  .slide-callout { border-left: 2px solid var(--mv-brand); padding: 8px 0 8px 16px; font-family: var(--mv-serif); font-size: 15px; line-height: 1.55; color: var(--mv-soft); margin-top: auto; }
  .slide-annotation { font-family: var(--mv-serif); font-size: 14px; color: var(--mv-muted); line-height: 1.55; margin-bottom: 14px; font-style: italic; }
  .slide-body-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: start; }
  .slide-chart-full { display: flex; align-items: center; overflow: hidden; }
  .slide-chart-full svg, .slide-chart-full .miao-table-wrap { width: 100%; }

  /* ── Metrics ── */
  .slide-metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0; padding-top: 14px; border-top: 0.5px dotted var(--mv-border); margin-bottom: 20px; }
  .slide-metric { flex: 1; display: flex; flex-direction: column; gap: 5px; padding-right: 24px; }
  .slide-metric .v { font-family: var(--mv-serif); font-size: 42px; font-weight: 500; color: var(--mv-brand); line-height: 1; font-variant-numeric: tabular-nums; letter-spacing: -0.5px; }
  .slide-metric .l { font-family: var(--mv-mono); font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; color: var(--mv-muted); }

  /* ── Cover ── */
  .slide-cover { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: center; height: 100%; }
  .slide-cover-left { display: flex; flex-direction: column; }
  .slide-cover h1 { font-family: var(--mv-serif); font-size: 56px; font-weight: 500; line-height: 1.05; letter-spacing: -1px; color: var(--mv-ink); margin-bottom: 14px; max-width: 12ch; overflow-wrap: anywhere; }
  .slide-cover .sub { font-size: 18px; color: var(--mv-soft); line-height: 1.5; margin-bottom: 22px; max-width: 34ch; overflow-wrap: anywhere; }
  .slide-cover .line { width: 48px; height: 2px; background: var(--mv-brand); margin-bottom: 14px; }
  .slide-cover .meta { font-family: var(--mv-mono); font-size: 11px; color: var(--mv-muted); letter-spacing: 0.5px; }
  .slide-cover-right { display: flex; align-items: center; justify-content: center; }
  .slide-mark { font-family: var(--mv-mono); font-size: 10px; color: var(--mv-brand); letter-spacing: 3px; text-transform: uppercase; margin-bottom: 20px; }

  /* ── Title-only ── */
  .slide-title-only { justify-content: center; }

  /* ── Ending ── */
  .slide-ending { justify-content: center; align-items: center; text-align: center; }
  .slide-ending h2 { font-family: var(--mv-serif); font-size: 52px; font-weight: 500; color: var(--mv-ink); letter-spacing: -0.8px; margin-bottom: 14px; }
  .slide-ending .line { width: 48px; height: 1.5px; background: var(--mv-brand); margin: 0 auto 14px; }
  .slide-ending .sub { font-size: 17px; color: var(--mv-soft); max-width: 44ch; line-height: 1.45; }

  /* ── Footer ── */
  .slide-page-num { position: absolute; bottom: 18px; right: 28px; font-family: var(--mv-mono); font-size: 10px; color: var(--mv-muted); font-variant-numeric: tabular-nums; }
  .slide-footer-mark { position: absolute; bottom: 18px; left: 28px; font-family: var(--mv-mono); font-size: 10px; color: var(--mv-muted); letter-spacing: 1px; text-transform: uppercase; }

  /* ── Table styles inside slide ── */
  .miao-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .miao-table-wrap { max-height: 430px; overflow: hidden; }
  .miao-table caption { caption-side: top; text-align: left; padding: 0 0 10px; color: var(--mv-muted); font-family: var(--mv-mono); font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; }
  .miao-table th { border-bottom: 1px solid var(--mv-border); padding: 7px 12px; text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: var(--mv-muted); font-family: var(--mv-mono); }
  .miao-table td { border-bottom: 1px solid var(--mv-border); padding: 8px 12px; color: var(--mv-soft); font-variant-numeric: tabular-nums; }
  .miao-table tbody tr:last-child td { border-bottom: none; }

  /* ── Print mode ── */
  @media print {
    body { background: var(--mv-paper); }
    .slide-viewport { display: block; }
    .slide-canvas { transform: none !important; width: auto; height: auto; }
    .slide { width: 297mm; height: 210mm; position: relative; visibility: visible !important; opacity: 1 !important; break-after: page; page-break-after: always; }
    .slide:last-child { break-after: auto; page-break-after: auto; }
    .slide-nav { display: none !important; }
  }
  @page { size: A4 landscape; margin: 0; background: var(--mv-paper, #f5f4ed); }
`

const SLIDE_JS = `
(function() {
  var slides = document.querySelectorAll('.slide');
  var counter = document.getElementById('slide-counter');
  var total = slides.length;
  var current = 0;

  function setScale() {
    var s = Math.min(window.innerWidth / 1280, window.innerHeight / 720);
    var canvas = document.querySelector('.slide-canvas');
    if (canvas) { canvas.style.transform = 'scale(' + s + ')'; }
  }

  function goTo(n) {
    slides[current].classList.remove('active');
    current = Math.max(0, Math.min(n, total - 1));
    slides[current].classList.add('active');
    if (counter) counter.textContent = (current + 1) + ' / ' + total;
  }

  document.addEventListener('keydown', function(e) {
    var tag = (document.activeElement && document.activeElement.tagName) || '';
    var inInput = tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA';
    if (e.key === 'ArrowRight' || e.key === ' ') { if (!inInput) { e.preventDefault(); goTo(current + 1); } }
    else if (e.key === 'ArrowLeft') { if (!inInput) { e.preventDefault(); goTo(current - 1); } }
    else if (e.key === 'f' || e.key === 'F') {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(function() {});
      else document.exitFullscreen().catch(function() {});
    }
  });

  var btnPrev = document.getElementById('btn-prev');
  var btnNext = document.getElementById('btn-next');
  var btnFs   = document.getElementById('btn-fs');
  var btnPrint = document.getElementById('btn-print');
  if (btnPrev)  btnPrev.addEventListener('click', function() { goTo(current - 1); });
  if (btnNext)  btnNext.addEventListener('click', function() { goTo(current + 1); });
  if (btnFs)    btnFs.addEventListener('click', function() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(function() {});
    else document.exitFullscreen().catch(function() {});
  });
  if (btnPrint) btnPrint.addEventListener('click', function() {
    document.body.classList.remove('present-mode');
    window.print();
    document.body.classList.add('present-mode');
  });

  window.addEventListener('resize', setScale);
  setScale();
  goTo(0);
})();
`

function extractRootVars(css: string): string {
  const match = css.match(/:root\s*\{([\s\S]*?)\}/)
  return match ? `:root {${match[1]}}` : ''
}

function renderSlide(
  slide: SlideSpec,
  rows: Record<string, unknown>[],
  svgTheme: ReturnType<typeof getTheme>['svg'],
  index: number,
  total: number,
  deckDescription?: string
): string {
  switch (slide.layout) {
    case 'cover':          return renderCoverSlide(slide, rows, svgTheme, index, total, deckDescription)
    case 'title-only':     return renderTitleOnlySlide(slide, rows, svgTheme, index, total)
    case 'text-points':    return renderTextPointsSlide(slide, rows, svgTheme, index, total)
    case 'text-chart':     return renderTextChartSlide(slide, rows, svgTheme, index, total)
    case 'metrics-chart':  return renderMetricsChartSlide(slide, rows, svgTheme, index, total)
    case 'chart-full':     return renderChartFullSlide(slide, rows, svgTheme, index, total)
    case 'table-full':     return renderTableFullSlide(slide, rows, svgTheme, index, total)
    case 'ending':         return renderEndingSlide(slide, rows, svgTheme, index, total)
  }
}

export function renderDeckHtml(
  spec: DeckSpec,
  rows: Record<string, unknown>[],
  themeOverride?: ThemeName
): string {
  const theme = getTheme(themeOverride ?? spec.theme ?? 'magazine')
  const themeRootVars = extractRootVars(theme.css)
  const title = spec.title ?? 'Presentation'
  const total = spec.slides.length
  const interactive = shouldEnableDeckInteractive(spec)

  const hasFilters = Boolean(spec.interactions?.globalFilters?.length)
  const filterBtn = hasFilters ? '<button id="btn-filter" title="Filters">&#x2630;</button>' : ''

  const slidesHtml = spec.slides
    .map((slide, i) => renderSlide(slide, rows, theme.svg, i, total, spec.description))
    .join('\n')

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  ${spec.description ? `<meta name="description" content="${escapeHtml(spec.description)}" />` : ''}
  <title>${escapeHtml(title)}</title>
  <style>${SLIDE_CSS}</style>
  ${themeRootVars ? `<style id="miao-deck-theme">${themeRootVars}</style>` : ''}
</head>
<body class="present-mode">
  <div class="slide-viewport">
    <div class="slide-canvas">
      ${slidesHtml}
    </div>
  </div>
  <nav class="slide-nav">
    <button id="btn-prev">&#8592;</button>
    <span id="slide-counter" class="slide-counter">1 / ${total}</span>
    <button id="btn-next">&#8594;</button>
    <button id="btn-fs" title="Fullscreen (F)">&#x26F6;</button>
    <button id="btn-print" title="Export PDF">&#x2399;</button>
    ${filterBtn}
  </nav>
  <script type="application/json" id="miao-viz-deck">${jsonScript(spec)}</script>
  <script>${SLIDE_JS}</script>
  ${interactive ? renderDeckInteractiveAssets(rows) : ''}
</body>
</html>`
}

function jsonScript(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}
