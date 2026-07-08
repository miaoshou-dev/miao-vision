import type { ReportTheme } from './types'

export const tableauTheme: ReportTheme = {
  name: 'tableau',
  layout: 'editorial',
  svg: {
    palette: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b'],
    background: '#ffffff',
    axisColor: '#d2d2d2',
    labelColor: '#6b7280'
  },
  css: `
    :root {
      --mv-paper: #ffffff;
      --mv-surface: #ffffff;
      --mv-border: #d2d2d2;
      --mv-ink: #1a1a2e;
      --mv-muted: #6b7280;
      --mv-soft: #333344;
      --mv-brand: #ff7f0e;
      --mv-serif: "Helvetica Neue", Helvetica, Arial, sans-serif;
      --mv-sans: "Helvetica Neue", Helvetica, Arial, sans-serif;
      --mv-mono: "SF Mono", "JetBrains Mono", Consolas, monospace;
    }
    body { margin: 0; background: var(--mv-paper); color: var(--mv-ink); font-family: var(--mv-sans); -webkit-font-smoothing: antialiased; }
    .miao-viz-report { max-width: 1100px; margin: 0 auto; padding: 24px 24px 48px; }
    .report-hero { margin-bottom: 24px; border: none; padding: 0; }
    .report-eyebrow { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; background: #f4f4f8; border-radius: 4px; padding: 10px 16px; font-size: 11px; font-weight: 600; text-transform: none; letter-spacing: 0; color: var(--mv-muted); }
    .report-eyebrow span:first-child { color: var(--mv-brand); }
    h1 { margin: 0 0 6px; font-size: 28px; font-weight: 700; letter-spacing: -0.01em; font-family: var(--mv-sans); color: var(--mv-ink); }
    .report-description { margin: 0 0 8px; max-width: 680px; color: var(--mv-soft); line-height: 1.5; font-size: 14px; }
    .report-tokens { display: flex; gap: 20px; flex-wrap: wrap; font-size: 11px; }
    .report-tokens b { color: var(--mv-ink); font-weight: 600; margin-right: 3px; }
    .chart-card { background: var(--mv-surface); border: 1px solid var(--mv-border); padding: 20px; margin: 0 0 16px; }
    .chart-label { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--mv-muted); }
    h2 { margin: 0 0 16px; font-size: 16px; font-weight: 700; font-family: var(--mv-sans); color: var(--mv-ink); }
    .chart-caption { margin: 10px 0 0; font-size: 11px; color: var(--mv-muted); line-height: 1.5; }
    .miao-chart-svg { display: block; max-width: 100%; overflow: visible; }
    svg text { font-family: var(--mv-sans); }
    .miao-table-wrap { overflow-x: auto; }
    .miao-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .miao-table caption { display: block; text-align: left; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--mv-muted); margin-bottom: 8px; }
    .miao-table th { border-bottom: 2px solid var(--mv-border); padding: 6px 8px; text-align: left; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--mv-muted); }
    .miao-table td { border-bottom: 1px solid #eeeef2; padding: 7px 8px; color: var(--mv-soft); font-variant-numeric: tabular-nums; }
    .miao-table tbody tr:last-child td { border-bottom: none; }
    .miao-table tbody tr:hover td { background: #f8f8fc; }
    .miao-bigvalue { padding: 12px 0; border: none; background: none; }
    .miao-bigvalue-label { color: var(--mv-muted); font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; }
    .miao-bigvalue-number { margin-top: 2px; font-size: 28px; font-weight: 700; color: var(--mv-ink); font-family: var(--mv-sans); font-variant-numeric: tabular-nums; line-height: 1; letter-spacing: -0.5px; }
    .kpi-group { padding: 0 !important; overflow: visible; border: none; }
    .kpi-group .chart-label { display: none; }
    .kpi-grid { display: flex; flex-wrap: wrap; gap: 32px; padding: 8px 0; }
    .kpi-grid .miao-bigvalue { border: none; padding: 0; min-width: 120px; }
    .miao-unsupported { padding: 14px; background: #fff5eb; color: #cc5200; font-size: 12px; border: 1px solid #ffd8b8; border-radius: 3px; }
    @media (max-width: 720px) {
      .miao-viz-report { padding: 16px 12px 32px; }
      h1 { font-size: 22px; }
      .chart-card { padding: 16px; }
      .kpi-grid { gap: 20px; }
    }
  `
}
