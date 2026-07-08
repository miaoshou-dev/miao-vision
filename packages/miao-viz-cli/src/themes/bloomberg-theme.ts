import type { ReportTheme } from './types'

export const bloombergTheme: ReportTheme = {
  name: 'bloomberg',
  layout: 'editorial',
  svg: {
    palette: ['#00ff41', '#f5a623', '#00bcd4', '#ff4081', '#7c4dff', '#ffffff'],
    background: '#0a0a0a',
    axisColor: '#2a2a2a',
    labelColor: '#888888'
  },
  css: `
    :root {
      --mv-paper: #000000;
      --mv-surface: #0a0a0a;
      --mv-border: #1e1e1e;
      --mv-ink: #e8e8e8;
      --mv-muted: #666666;
      --mv-soft: #aaaaaa;
      --mv-brand: #00ff41;
      --mv-serif: "SF Mono", "JetBrains Mono", Consolas, monospace;
      --mv-mono: "SF Mono", "JetBrains Mono", Consolas, monospace;
      --mv-sans: "Helvetica Neue", Helvetica, Arial, sans-serif;
    }
    body { margin: 0; background: var(--mv-paper); color: var(--mv-ink); font-family: var(--mv-mono); -webkit-font-smoothing: antialiased; }
    .miao-viz-report { max-width: 1120px; margin: 0 auto; padding: 40px 24px 56px; }
    .report-hero { margin-bottom: 36px; border-bottom: 1px solid var(--mv-border); padding-bottom: 24px; }
    .report-eyebrow { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 16px; font-size: 10px; font-weight: 400; text-transform: uppercase; letter-spacing: 0.2em; color: var(--mv-muted); font-family: var(--mv-mono); }
    h1 { margin: 0 0 10px; font-size: 34px; font-weight: 500; letter-spacing: -0.02em; font-family: var(--mv-mono); color: var(--mv-ink); line-height: 1.1; text-transform: uppercase; }
    .report-description { margin: 0 0 14px; max-width: 680px; color: var(--mv-soft); line-height: 1.5; font-size: 13px; font-family: var(--mv-sans); }
    .report-tokens { display: flex; gap: 32px; flex-wrap: wrap; font-size: 11px; font-family: var(--mv-mono); color: var(--mv-muted); }
    .report-tokens b { color: var(--mv-brand); font-weight: 500; margin-right: 4px; }
    .chart-card { background: var(--mv-surface); border: 1px solid var(--mv-border); padding: 24px; margin: 20px 0; }
    .chart-label { font-size: 9px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.2em; color: var(--mv-muted); font-family: var(--mv-mono); margin-bottom: 8px; }
    h2 { margin: 0 0 18px; font-size: 16px; font-weight: 500; letter-spacing: 0.02em; color: var(--mv-ink); font-family: var(--mv-mono); }
    .chart-caption { margin: 14px 0 0; font-size: 10px; color: var(--mv-muted); font-family: var(--mv-mono); line-height: 1.5; }
    .miao-chart-svg { display: block; max-width: 100%; overflow: visible; }
    svg text { font-family: var(--mv-mono); }
    .miao-table-wrap { overflow-x: auto; }
    .miao-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .miao-table caption { display: block; text-align: left; font-size: 9px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.15em; color: var(--mv-muted); font-family: var(--mv-mono); margin-bottom: 8px; }
    .miao-table th { border-bottom: 1px solid var(--mv-border); padding: 6px 10px; text-align: left; font-size: 9px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.12em; color: var(--mv-muted); font-family: var(--mv-mono); }
    .miao-table td { border-bottom: 1px solid var(--mv-border); padding: 8px 10px; color: var(--mv-soft); font-family: var(--mv-mono); font-variant-numeric: tabular-nums; }
    .miao-table tbody tr:last-child td { border-bottom: none; }
    .miao-bigvalue { padding: 16px; }
    .miao-bigvalue-label { color: var(--mv-muted); font-size: 9px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.18em; font-family: var(--mv-mono); }
    .miao-bigvalue-number { margin-top: 8px; font-size: 32px; font-weight: 500; font-family: var(--mv-mono); color: var(--mv-brand); font-variant-numeric: tabular-nums; line-height: 1; }
    .kpi-group { padding: 0 !important; overflow: hidden; border: 1px solid var(--mv-border); }
    .kpi-group .chart-label { padding: 20px 20px 0; }
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1px; background: var(--mv-border); }
    .kpi-grid .miao-bigvalue { background: var(--mv-surface); border: none; padding: 20px; }
    .miao-unsupported { padding: 16px; background: #1a0a00; color: #f5a623; font-size: 12px; border: 1px solid #3d2f00; }
    @media (max-width: 720px) {
      .miao-viz-report { padding: 24px 12px 40px; }
      h1 { font-size: 24px; }
      .chart-card { padding: 18px; }
      .kpi-grid { grid-template-columns: 1fr 1fr; }
      .kpi-grid .miao-bigvalue:nth-child(even) { border-left: none; }
    }
  `
}
