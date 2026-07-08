import type { ReportTheme } from './types'

export const magazineTheme: ReportTheme = {
  name: 'magazine',
  layout: 'editorial',
  svg: {
    palette: ['#1b365d', '#8a5a44', '#4f6f52', '#a37f2c', '#6b5b95', '#2f6f73'],
    background: '#faf9f5',
    axisColor: '#c8c5b8',
    labelColor: '#6b6a64'
  },
  css: `
    :root {
      --mv-paper: #f5f4ed;
      --mv-surface: #faf9f5;
      --mv-border: #e5e3d8;
      --mv-ink: #141413;
      --mv-muted: #6b6a64;
      --mv-soft-text: #504e49;
      --mv-soft: #504e49;
      --mv-brand: #1b365d;
      --mv-mono: "SF Mono", "JetBrains Mono", Consolas, monospace;
      --mv-serif: Charter, Georgia, "Times New Roman", serif;
      --mv-sans: Inter, ui-sans-serif, system-ui, sans-serif;
    }
    body { margin: 0; background: var(--mv-paper); color: var(--mv-ink); font-family: var(--mv-sans); }
    .miao-viz-report { max-width: 1120px; margin: 0 auto; padding: 56px 32px 72px; }
    .report-hero { margin-bottom: 48px; border-bottom: 1px solid var(--mv-border); padding-bottom: 32px; }
    .report-eyebrow { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 16px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.09em; color: var(--mv-muted); font-family: var(--mv-mono); }
    h1 { margin: 0 0 12px; font-size: 36px; font-weight: 700; letter-spacing: -0.02em; font-family: var(--mv-serif); color: var(--mv-brand); line-height: 1.15; }
    .report-description { margin: 0 0 20px; max-width: 680px; color: var(--mv-soft-text); line-height: 1.65; font-size: 15px; }
    .report-tokens { display: flex; gap: 24px; flex-wrap: wrap; font-size: 12px; font-family: var(--mv-mono); color: var(--mv-muted); }
    .report-tokens b { color: var(--mv-ink); font-weight: 600; margin-right: 3px; }
    .chart-card { background: var(--mv-surface); border: 1px solid var(--mv-border); border-radius: 3px; padding: 28px 28px 20px; margin: 24px 0; }
    .chart-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: var(--mv-muted); font-family: var(--mv-mono); margin-bottom: 6px; }
    h2 { margin: 0 0 20px; font-size: 18px; font-weight: 650; letter-spacing: -0.01em; color: var(--mv-ink); font-family: var(--mv-serif); }
    .chart-caption { margin: 14px 0 0; font-size: 11px; color: var(--mv-muted); font-family: var(--mv-mono); line-height: 1.5; }
    .miao-chart-svg { display: block; max-width: 100%; overflow: visible; }
    svg text { font-family: var(--mv-mono); }
    .miao-table-wrap { overflow-x: auto; }
    .miao-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .miao-table caption { display: block; text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.09em; color: var(--mv-muted); font-family: var(--mv-mono); margin-bottom: 10px; }
    .miao-table th { border-bottom: 1px solid var(--mv-border); padding: 7px 12px; text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: var(--mv-muted); font-family: var(--mv-mono); }
    .miao-table td { border-bottom: 1px solid var(--mv-border); padding: 10px 12px; color: var(--mv-soft-text); font-variant-numeric: tabular-nums; }
    .miao-table tbody tr:last-child td { border-bottom: none; }
    .miao-bigvalue { border: 1px solid var(--mv-border); background: var(--mv-surface); border-radius: 3px; padding: 28px; }
    .miao-bigvalue-label { color: var(--mv-muted); font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.09em; font-family: var(--mv-mono); }
    .miao-bigvalue-number { margin-top: 10px; font-size: 52px; font-weight: 700; font-family: var(--mv-serif); color: var(--mv-brand); font-variant-numeric: tabular-nums; line-height: 1; }
    .kpi-group { padding: 0 !important; overflow: hidden; }
    .kpi-group .chart-label { padding: 20px 24px 0; }
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }
    .kpi-grid .miao-bigvalue { border: none; border-radius: 0; border-right: 1px solid var(--mv-border); padding: 16px 24px 24px; }
    .kpi-grid .miao-bigvalue:last-child { border-right: none; }
    .miao-unsupported { padding: 18px; border-radius: 3px; background: #fff7ed; color: #9a3412; font-size: 13px; border: 1px solid #fed7aa; }
    @media (max-width: 720px) {
      .miao-viz-report { padding: 32px 16px 48px; }
      h1 { font-size: 26px; }
      .chart-card { padding: 20px 16px 16px; }
      .report-eyebrow { flex-wrap: wrap; gap: 4px; }
      .report-tokens { gap: 12px; }
      .kpi-grid { grid-template-columns: 1fr 1fr; }
      .kpi-grid .miao-bigvalue:nth-child(even) { border-right: none; }
    }
  `
}
