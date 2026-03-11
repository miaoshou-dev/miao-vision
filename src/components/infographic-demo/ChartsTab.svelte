<script lang="ts">
  import {
    Infographic, ChartBar, ChartLine, ChartFunnel, CompareTable,
    createPatternDef, patternDefToSVG
  } from '@plugins/data-display/infographic'
  import {
    createDivider, createBadge, createFrame, createCallout, createHighlight
  } from '@plugins/data-display/infographic/utils'
  import { barChartData, lineSeriesData, funnelData, tableColumns, tableRows } from './infographic-demo-data'

  interface Props {
    selectedTheme: string
    selectedPalette: string
  }
  let { selectedTheme, selectedPalette }: Props = $props()
</script>

<h2 class="section-title">Chart Components (Phase 4)</h2>

<section class="demo-section">
  <h3>22. ChartBar</h3>
  <p class="component-desc">Bar chart with horizontal or vertical orientation, grid lines, and value labels</p>
  <div class="infographic-wrapper">
    <Infographic theme={selectedTheme} width={600} height={350} padding={16}>
      <ChartBar items={barChartData} width={568} height={318} orientation="horizontal" showValues={true} showGrid={true} cornerRadius={4} palette={selectedPalette} />
    </Infographic>
  </div>
</section>

<section class="demo-section">
  <h4>ChartBar (Vertical)</h4>
  <div class="infographic-wrapper">
    <Infographic theme={selectedTheme} width={600} height={350} padding={16}>
      <ChartBar items={barChartData} width={568} height={318} orientation="vertical" showValues={true} showGrid={true} palette={selectedPalette} />
    </Infographic>
  </div>
</section>

<section class="demo-section">
  <h3>23. ChartLine</h3>
  <p class="component-desc">Line chart with multiple series, smooth curves, area fills, and legends</p>
  <div class="infographic-wrapper">
    <Infographic theme={selectedTheme} width={650} height={400} padding={16}>
      <ChartLine series={lineSeriesData} width={618} height={368} showPoints={true} showGrid={true} curveType="smooth" lineWidth={2} palette={selectedPalette} />
    </Infographic>
  </div>
</section>

<section class="demo-section">
  <h3>24. ChartFunnel</h3>
  <p class="component-desc">Funnel chart for conversion visualization with tapered or stepped shapes</p>
  <div class="infographic-wrapper">
    <Infographic theme={selectedTheme} width={550} height={400} padding={16}>
      <ChartFunnel stages={funnelData} width={518} height={368} shape="tapered" showValues={true} showPercentages={true} showConversionRates={true} palette={selectedPalette} />
    </Infographic>
  </div>
</section>

<section class="demo-section">
  <h4>ChartFunnel (Stepped)</h4>
  <div class="infographic-wrapper">
    <Infographic theme={selectedTheme} width={550} height={400} padding={16}>
      <ChartFunnel stages={funnelData} width={518} height={368} shape="stepped" showValues={true} showPercentages={true} palette={selectedPalette} />
    </Infographic>
  </div>
</section>

<section class="demo-section">
  <h3>25. CompareTable</h3>
  <p class="component-desc">Comparison table with checkmarks, values, and striped rows for pricing/feature comparisons</p>
  <div class="infographic-wrapper">
    <Infographic theme={selectedTheme} width={700} height={320} padding={16}>
      <CompareTable columns={tableColumns} rows={tableRows} width={668} striped={true} showBorders={true} headerStyle="filled" />
    </Infographic>
  </div>
</section>

<h2 class="section-title">Pattern Fill System (Phase 5)</h2>

<section class="demo-section">
  <h3>SVG Pattern Fills</h3>
  <p class="component-desc">Various pattern textures for decorative fills</p>
  <div class="infographic-wrapper">
    <svg width="700" height="200" viewBox="0 0 700 200">
      <defs>
        {@html patternDefToSVG(createPatternDef('diagonalLines', '#6366f1', { spacing: 8 }))}
        {@html patternDefToSVG(createPatternDef('dots', '#22c55e', { spacing: 10 }, 'dots-pattern'))}
        {@html patternDefToSVG(createPatternDef('crosshatch', '#f59e0b', { spacing: 10 }, 'cross-pattern'))}
        {@html patternDefToSVG(createPatternDef('waves', '#ec4899', { spacing: 12 }, 'waves-pattern'))}
        {@html patternDefToSVG(createPatternDef('grid', '#3b82f6', { spacing: 12, strokeWidth: 0.5 }, 'grid-pattern'))}
        {@html patternDefToSVG(createPatternDef('hexagons', '#8b5cf6', { spacing: 16 }, 'hex-pattern'))}
      </defs>
      <g>
        <rect x="20" y="20" width="100" height="80" rx="8" fill="url(#diagonalLines-pattern)" />
        <text x="70" y="120" text-anchor="middle" fill="#a0a0b0" font-size="11">Diagonal</text>
        <rect x="130" y="20" width="100" height="80" rx="8" fill="url(#dots-pattern)" />
        <text x="180" y="120" text-anchor="middle" fill="#a0a0b0" font-size="11">Dots</text>
        <rect x="240" y="20" width="100" height="80" rx="8" fill="url(#cross-pattern)" />
        <text x="290" y="120" text-anchor="middle" fill="#a0a0b0" font-size="11">Crosshatch</text>
        <rect x="350" y="20" width="100" height="80" rx="8" fill="url(#waves-pattern)" />
        <text x="400" y="120" text-anchor="middle" fill="#a0a0b0" font-size="11">Waves</text>
        <rect x="460" y="20" width="100" height="80" rx="8" fill="url(#grid-pattern)" />
        <text x="510" y="120" text-anchor="middle" fill="#a0a0b0" font-size="11">Grid</text>
        <rect x="570" y="20" width="100" height="80" rx="8" fill="url(#hex-pattern)" />
        <text x="620" y="120" text-anchor="middle" fill="#a0a0b0" font-size="11">Hexagons</text>
      </g>
    </svg>
  </div>
</section>

<h2 class="section-title">Decorative Elements (Phase 5)</h2>

<section class="demo-section">
  <h3>Dividers, Badges, &amp; Annotations</h3>
  <p class="component-desc">Various decorative elements for enhancing infographics</p>
  <div class="infographic-wrapper">
    <svg width="700" height="280" viewBox="0 0 700 280">
      <text x="20" y="25" fill="#a0a0b0" font-size="12" font-weight="600">Dividers</text>
      {@html createDivider(20, 45, { style: 'solid', color: '#6366f1', length: 120 })}
      <text x="150" y="50" fill="#666" font-size="10">solid</text>
      {@html createDivider(180, 45, { style: 'dashed', color: '#22c55e', length: 120 })}
      <text x="310" y="50" fill="#666" font-size="10">dashed</text>
      {@html createDivider(340, 45, { style: 'gradient', color: '#f59e0b', length: 120 })}
      <text x="470" y="50" fill="#666" font-size="10">gradient</text>
      {@html createDivider(500, 45, { style: 'ornament', color: '#ec4899', length: 120, strokeWidth: 2 })}
      <text x="630" y="50" fill="#666" font-size="10">ornament</text>

      <text x="20" y="95" fill="#a0a0b0" font-size="12" font-weight="600">Badges</text>
      {@html createBadge(70, 130, '1', { shape: 'circle', color: '#6366f1', size: 32 })}
      {@html createBadge(130, 130, 'A', { shape: 'hexagon', color: '#22c55e', size: 32 })}
      {@html createBadge(190, 130, '!', { shape: 'diamond', color: '#f59e0b', size: 32 })}
      {@html createBadge(260, 130, 'Pro', { shape: 'pill', color: '#ec4899', size: 28 })}
      {@html createBadge(350, 130, 'NEW', { shape: 'ribbon', color: '#3b82f6', size: 28 })}
      {@html createBadge(450, 130, '*', { shape: 'star', color: '#8b5cf6', size: 34 })}

      <text x="20" y="185" fill="#a0a0b0" font-size="12" font-weight="600">Frames &amp; Callouts</text>
      {@html createFrame(20, 200, 150, 60, { color: '#6366f1', strokeWidth: 2, cornerRadius: 8, style: 'solid' })}
      {@html createFrame(190, 200, 150, 60, { color: '#22c55e', strokeWidth: 1, style: 'dashed' })}
      {@html createCallout(360, 200, 130, 50, 'bottom', { color: '#1a1a2e', borderColor: '#f59e0b', borderWidth: 2, cornerRadius: 8 })}
      <text x="425" y="230" text-anchor="middle" fill="#f59e0b" font-size="11">Callout</text>
      {@html createHighlight(510, 205, 80, 20, { color: '#fef08a', opacity: 0.4, style: 'fill' })}
      <text x="550" y="220" text-anchor="middle" fill="#888" font-size="11">highlight</text>
      {@html createHighlight(600, 205, 80, 20, { color: '#6366f1', opacity: 0.6, style: 'underline' })}
      <text x="640" y="220" text-anchor="middle" fill="#888" font-size="11">underline</text>
    </svg>
  </div>
</section>
