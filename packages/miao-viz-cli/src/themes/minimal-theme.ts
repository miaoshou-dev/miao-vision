import type { ReportTheme } from './types'

export const minimalTheme: ReportTheme = {
  name: 'minimal',
  layout: 'standard',
  svg: {
    palette: ['#1d4ed8', '#15803d', '#b45309', '#b91c1c', '#6d28d9', '#0e7490'],
    background: '#ffffff',
    axisColor: '#e5e7eb',
    labelColor: '#6b7280'
  },
  css: `
    :root {
      color-scheme: light;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
      --mv-paper: #ffffff;
      --mv-surface: #ffffff;
      --mv-border: #e5e7eb;
      --mv-ink: #111111;
      --mv-muted: #6b7280;
      --mv-soft: #374151;
      --mv-brand: #1d4ed8;
      --mv-serif: Georgia, "Times New Roman", serif;
      --mv-mono: "SF Mono", "JetBrains Mono", Consolas, monospace;
    }
    body { margin: 0; background: #fff; color: #111; }
    .miao-viz-report { max-width: 960px; margin: 0 auto; padding: 48px 24px 64px; }
    header { margin-bottom: 32px; }
    .eyebrow { margin: 0 0 6px; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; }
    h1 { margin: 0 0 8px; font-size: 28px; font-weight: 700; color: #111; }
    h2 { margin: 0 0 16px; font-size: 15px; font-weight: 600; color: #374151; }
    .description { max-width: 680px; color: #6b7280; line-height: 1.6; font-size: 14px; margin: 0 0 8px; }
    .meta { color: #9ca3af; font-size: 12px; margin: 0; }
    .chart-block { padding: 28px 0; border-top: 1px solid #f3f4f6; }
    .miao-chart-svg { display: block; max-width: 100%; overflow: visible; }
    svg text { font-size: 11px; fill: #6b7280; }
    .miao-table-wrap { overflow-x: auto; }
    .miao-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .miao-table caption { text-align: left; font-weight: 600; margin-bottom: 10px; font-size: 13px; color: #374151; }
    .miao-table th { border-bottom: 2px solid #e5e7eb; padding: 8px 10px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; }
    .miao-table td { border-bottom: 1px solid #f3f4f6; padding: 9px 10px; color: #374151; font-variant-numeric: tabular-nums; }
    .miao-table tbody tr:last-child td { border-bottom: none; }
    .miao-bigvalue { padding: 16px 0; }
    .miao-bigvalue-label { color: #6b7280; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
    .miao-bigvalue-number { margin-top: 6px; font-size: 42px; font-weight: 700; color: #111; font-variant-numeric: tabular-nums; line-height: 1; }
    .miao-unsupported { padding: 16px; background: #fefce8; color: #92400e; font-size: 13px; }
    @media (max-width: 720px) { .miao-viz-report { padding: 28px 16px 40px; } h1 { font-size: 22px; } .chart-block { padding: 20px 0; } }
  `
}
