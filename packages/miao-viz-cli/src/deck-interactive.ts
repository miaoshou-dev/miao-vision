import { CLIENT_DATA_ENGINE_CSS, CLIENT_DATA_ENGINE_JS } from './client-data-engine'
import { DECK_INTERACTIVE_JS } from './deck-interactive-assets'
import type { DeckSpec } from './deck-types'
import type { SvgTheme } from './themes/types'

function hasDeckInteractions(spec: DeckSpec): boolean {
  return Boolean(spec.interactions?.globalFilters?.length)
}

function specHasInteractiveCharts(spec: DeckSpec): boolean {
  return spec.slides.some(slide =>
    (slide.charts ?? []).some(chart => Boolean(chart.interaction || chart.drilldownPreset))
  )
}

export function shouldEnableDeckInteractive(spec: DeckSpec): boolean {
  return hasDeckInteractions(spec) || specHasInteractiveCharts(spec)
}

const DECK_INTERACTIVE_CSS = `
.deck-filter-panel {
  position: fixed; top: 0; right: 0; width: 300px; height: 100vh;
  background: var(--mv-paper, #f5f4ed); box-shadow: -4px 0 24px rgba(0,0,0,0.18);
  z-index: 200; transform: translateX(100%); transition: transform 0.25s ease;
  display: flex; flex-direction: column; overflow-y: auto;
}
.deck-filter-panel.open { transform: translateX(0); }
.deck-filter-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px; border-bottom: 1px solid rgba(128,128,128,0.18);
  font-family: var(--mv-mono, monospace); font-size: 12px;
  text-transform: uppercase; letter-spacing: 1px; color: var(--mv-ink, #1a1a19);
}
.deck-filter-close {
  background: none; border: none; cursor: pointer; font-size: 18px;
  color: var(--mv-muted, #6b6a64); padding: 4px 8px; border-radius: 3px;
}
.deck-filter-close:hover { background: rgba(128,128,128,0.1); }
.deck-filter-body { padding: 20px; flex: 1; }
.deck-filter-footer { padding: 16px 20px; border-top: 1px solid rgba(128,128,128,0.18); }
.deck-filter-btn {
  position: fixed; bottom: 56px; right: 12px; z-index: 150;
  background: rgba(20,20,19,0.72); backdrop-filter: blur(8px);
  border: none; cursor: pointer; color: rgba(255,255,255,0.65);
  font-size: 16px; padding: 8px 12px; border-radius: 6px;
  transition: color 0.15s, background 0.15s;
}
.deck-filter-btn:hover { color: #fff; background: rgba(20,20,19,0.9); }
.deck-filter-btn.active { background: var(--mv-brand, #1b365d); color: #fff; }
.deck-overlay {
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0,0,0,0.32); z-index: 180; opacity: 0;
  pointer-events: none; transition: opacity 0.25s ease;
}
.deck-overlay.visible { opacity: 1; pointer-events: auto; }
`

export function renderDeckInteractiveAssets(rows: Record<string, unknown>[], theme: SvgTheme): string {
  return `
  <script type="application/json" id="miao-viz-data">${escapeScriptJson(rows)}</script>
  <script type="application/json" id="miao-viz-runtime-theme">${escapeScriptJson(theme)}</script>
  <script>${CLIENT_DATA_ENGINE_JS}</script>
  <style>${CLIENT_DATA_ENGINE_CSS}${DECK_INTERACTIVE_CSS}</style>
  <script>${DECK_INTERACTIVE_JS}</script>`
}

function escapeScriptJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}
