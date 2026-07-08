import type { ReportTheme } from './types'

export const nytTheme: ReportTheme = {
  name: 'nyt',
  layout: 'editorial',
  svg: {
    palette: ['#326891', '#d0021b', '#121212', '#737373', '#567d9e', '#9b9b9b'],
    background: '#ffffff',
    axisColor: '#dcdcdc',
    labelColor: '#333333'
  },
  css: `
    :root {
      --mv-paper: #fafafa;
      --mv-surface: #ffffff;
      --mv-border: #e0e0e0;
      --mv-ink: #111111;
      --mv-muted: #737373;
      --mv-soft: #333333;
      --mv-brand: #326891;
      --mv-serif: Georgia, "Times New Roman", Times, serif;
      --mv-sans: "Helvetica Neue", Helvetica, Arial, sans-serif;
      --mv-mono: "SF Mono", "JetBrains Mono", Consolas, monospace;
    }
    body { margin: 0; background: var(--mv-paper); color: var(--mv-ink); font-family: var(--mv-sans); -webkit-font-smoothing: antialiased; }
    .miao-viz-report { max-width: 1000px; margin: 0 auto; padding: 48px 24px 64px; }
    .report-hero { margin-bottom: 40px; border-bottom: 1px solid var(--mv-border); padding-bottom: 28px; }
    .report-eyebrow { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 14px; font-size: 11px; font-weight: 400; text-transform: uppercase; letter-spacing: 0.12em; color: var(--mv-muted); font-family: var(--mv-sans); }
    h1 { margin: 0 0 10px; font-size: 40px; font-weight: 700; letter-spacing: -0.01em; font-family: var(--mv-serif); color: var(--mv-ink); line-height: 1.12; }
    .report-description { margin: 0 0 16px; max-width: 620px; color: var(--mv-soft); line-height: 1.6; font-size: 15px; }
    .report-tokens { display: flex; gap: 28px; flex-wrap: wrap; font-size: 11px; color: var(--mv-muted); }
    .report-tokens b { color: var(--mv-ink); font-weight: 600; margin-right: 4px; }
    .chart-card { background: var(--mv-surface); border-top: 1px solid var(--mv-border); padding: 28px 0 24px; margin: 0; }
    .chart-card:first-of-type { border-top: none; }
    .chart-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em; color: var(--mv-brand); margin-bottom: 8px; }
    h2 { margin: 0 0 18px; font-size: 20px; font-weight: 600; letter-spacing: -0.01em; color: var(--mv-ink); font-family: var(--mv-serif); }
    .chart-caption { margin: 14px 0 0; font-size: 12px; color: var(--mv-muted); line-height: 1.55; }
    .miao-chart-svg { display: block; max-width: 100%; overflow: visible; }
    svg text { font-family: var(--mv-sans); }
    .miao-table-wrap { overflow-x: auto; }
    .miao-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .miao-table caption { display: block; text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--mv-muted); margin-bottom: 8px; }
    .miao-table th { border-bottom: 1px solid var(--mv-border); padding: 7px 10px; text-align: left; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--mv-muted); }
    .miao-table td { border-bottom: 1px solid var(--mv-border); padding: 9px 10px; color: var(--mv-soft); font-variant-numeric: tabular-nums; }
    .miao-table tbody tr:last-child td { border-bottom: none; }
    .miao-bigvalue { padding: 16px 0; }
    .miao-bigvalue-label { color: var(--mv-muted); font-weight: 700; font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; }
    .miao-bigvalue-number { margin-top: 6px; font-size: 42px; font-weight: 700; font-family: var(--mv-serif); color: var(--mv-ink); font-variant-numeric: tabular-nums; line-height: 1; }
    .kpi-group { padding: 0 !important; overflow: hidden; }
    .kpi-group .chart-label { padding: 20px 0 0; }
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }
    .kpi-grid .miao-bigvalue { border: none; border-right: 1px solid var(--mv-border); padding: 16px 20px 24px 0; }
    .kpi-grid .miao-bigvalue:last-child { border-right: none; }
    .miao-unsupported { padding: 16px; background: #fefce8; color: #92400e; font-size: 13px; }
    @media (max-width: 720px) {
      .miao-viz-report { padding: 28px 14px 40px; }
      h1 { font-size: 30px; }
      .chart-card { padding: 20px 0 16px; }
      .kpi-grid .miao-bigvalue { padding: 12px 0 16px; border-right: none; }
    }
  `
}
