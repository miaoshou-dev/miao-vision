import type { ReportTheme } from './types'

export const defaultTheme: ReportTheme = {
  name: 'default',
  layout: 'standard',
  svg: {
    palette: ['#2563eb', '#16a34a', '#f97316', '#dc2626', '#7c3aed', '#0891b2'],
    background: '#ffffff',
    axisColor: '#94a3b8',
    labelColor: '#475569'
  },
  css: `
    :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif; }
    body { margin: 0; background: #f8fafc; color: #0f172a; }
    .miao-viz-report { max-width: 1120px; margin: 0 auto; padding: 40px 24px 56px; }
    header { margin-bottom: 28px; }
    h1 { margin: 0; font-size: 32px; font-weight: 760; letter-spacing: 0; }
    h2 { margin: 0 0 18px; font-size: 20px; font-weight: 700; letter-spacing: 0; }
    .eyebrow { margin: 0 0 8px; color: #2563eb; font-size: 13px; font-weight: 700; text-transform: uppercase; }
    .description { max-width: 760px; color: #475569; line-height: 1.6; }
    .meta { color: #64748b; font-size: 13px; }
    .chart-block { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 22px; margin: 18px 0; box-shadow: 0 1px 2px rgba(15,23,42,0.04); }
    .miao-chart-svg { display: block; max-width: 100%; overflow: visible; }
    svg text { font-size: 12px; fill: #475569; }
    .miao-table { width: 100%; border-collapse: collapse; font-size: 14px; }
    .miao-table caption { text-align: left; font-weight: 700; margin-bottom: 12px; }
    .miao-table th, .miao-table td { border-bottom: 1px solid #e2e8f0; padding: 8px 10px; text-align: left; }
    .miao-bigvalue { border: 1px solid #dbeafe; background: #eff6ff; border-radius: 8px; padding: 24px; }
    .miao-bigvalue-label { color: #1d4ed8; font-weight: 700; }
    .miao-bigvalue-number { margin-top: 8px; font-size: 42px; font-weight: 780; }
    .miao-unsupported { padding: 18px; border-radius: 8px; background: #fff7ed; color: #9a3412; }
    @media (max-width: 720px) { .miao-viz-report { padding: 24px 14px 36px; } h1 { font-size: 26px; } .chart-block { padding: 16px; } }
  `
}
