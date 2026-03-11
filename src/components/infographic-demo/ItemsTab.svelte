<script lang="ts">
  import {
    Infographic, BadgeCard, ValueCard, CircularProgress,
    IconArrowNode, ImageCard, StatCard, MindMapNode, NetworkNode, NumberBadge
  } from '@plugins/data-display/infographic'

  interface Props { selectedTheme: string }
  let { selectedTheme }: Props = $props()

  // Reusable dark theme colors for standalone item demos
  function tc(primary: string) {
    return {
      colorPrimary: primary,
      colorPrimaryBg: '#1a1a2e',
      colorPrimaryText: '#fff',
      colorText: '#fff',
      colorTextSecondary: '#a0a0b0',
      colorWhite: '#fff',
      colorBg: '#1a1a2e',
      colorBgElevated: '#2a2a4a',
      isDarkMode: true
    }
  }
</script>

<h2 class="section-title">Item Components (9)</h2>

<section class="demo-section">
  <h3>1. BadgeCard</h3>
  <p class="component-desc">Card with colored badge header, icon, label, value and description</p>
  <div class="items-row">
    <Infographic theme={selectedTheme} width={180} height={140} padding={12}>
      <BadgeCard label="Revenue" value="$12.5M" desc="Q4 2024" icon="currency-usd" themeColors={tc('#6366f1')} width={156} height={116} />
    </Infographic>
    <Infographic theme={selectedTheme} width={180} height={140} padding={12}>
      <BadgeCard label="Users" value="158K" desc="Active" icon="account-group" themeColors={tc('#8b5cf6')} width={156} height={116} />
    </Infographic>
    <Infographic theme={selectedTheme} width={180} height={140} padding={12}>
      <BadgeCard label="Growth" value="+45%" desc="YoY" icon="trending-up" themeColors={tc('#22c55e')} width={156} height={116} />
    </Infographic>
  </div>
</section>

<section class="demo-section">
  <h3>2. ValueCard</h3>
  <p class="component-desc">Compact card with icon, label, and prominent value display</p>
  <div class="items-row">
    <Infographic theme={selectedTheme} width={160} height={100} padding={12}>
      <ValueCard label="Orders" value="1,234" icon="cart" themeColors={tc('#f59e0b')} width={136} height={76} />
    </Infographic>
    <Infographic theme={selectedTheme} width={160} height={100} padding={12}>
      <ValueCard label="Sessions" value="89.2K" icon="web" themeColors={tc('#3b82f6')} width={136} height={76} />
    </Infographic>
    <Infographic theme={selectedTheme} width={160} height={100} padding={12}>
      <ValueCard label="Rating" value="4.8" icon="star" themeColors={tc('#ec4899')} width={136} height={76} />
    </Infographic>
  </div>
</section>

<section class="demo-section">
  <h3>3. CircularProgress</h3>
  <p class="component-desc">Circular progress indicator with percentage and label</p>
  <div class="items-row">
    <Infographic theme={selectedTheme} width={140} height={160} padding={12}>
      <CircularProgress label="CPU" value={65} max={100} themeColors={tc('#22c55e')} width={116} height={136} />
    </Infographic>
    <Infographic theme={selectedTheme} width={140} height={160} padding={12}>
      <CircularProgress label="Memory" value={82} max={100} themeColors={tc('#f59e0b')} width={116} height={136} />
    </Infographic>
    <Infographic theme={selectedTheme} width={140} height={160} padding={12}>
      <CircularProgress label="Disk" value={45} max={100} themeColors={tc('#3b82f6')} width={116} height={136} />
    </Infographic>
    <Infographic theme={selectedTheme} width={140} height={160} padding={12}>
      <CircularProgress label="Network" value={91} max={100} themeColors={tc('#ef4444')} width={116} height={136} />
    </Infographic>
  </div>
</section>

<section class="demo-section">
  <h3>4. IconArrowNode</h3>
  <p class="component-desc">Node with icon and description, ideal for process flows</p>
  <div class="items-row">
    <Infographic theme={selectedTheme} width={140} height={100} padding={12}>
      <IconArrowNode label="Research" desc="Analysis" icon="lightbulb" themeColors={tc('#6366f1')} width={116} height={76} />
    </Infographic>
    <Infographic theme={selectedTheme} width={140} height={100} padding={12}>
      <IconArrowNode label="Design" desc="Mockups" icon="palette" themeColors={tc('#8b5cf6')} width={116} height={76} />
    </Infographic>
    <Infographic theme={selectedTheme} width={140} height={100} padding={12}>
      <IconArrowNode label="Develop" desc="Coding" icon="laptop" themeColors={tc('#22c55e')} width={116} height={76} />
    </Infographic>
    <Infographic theme={selectedTheme} width={140} height={100} padding={12}>
      <IconArrowNode label="Launch" desc="Deploy" icon="rocket" themeColors={tc('#ec4899')} width={116} height={76} />
    </Infographic>
  </div>
</section>

<section class="demo-section">
  <h3>5. ImageCard</h3>
  <p class="component-desc">Card with image, supporting different label positions and overlays</p>
  <div class="items-row">
    <Infographic theme={selectedTheme} width={180} height={160} padding={12}>
      <ImageCard src="https://via.placeholder.com/150x100/6366f1/ffffff?text=Product" label="Product A" desc="Featured" themeColors={tc('#6366f1')} width={156} height={136} labelPosition="bottom" />
    </Infographic>
    <Infographic theme={selectedTheme} width={180} height={160} padding={12}>
      <ImageCard src="https://via.placeholder.com/150x100/22c55e/ffffff?text=Gallery" label="Photo" themeColors={tc('#22c55e')} width={156} height={136} labelPosition="overlay-bottom" />
    </Infographic>
    <Infographic theme={selectedTheme} width={180} height={160} padding={12}>
      <ImageCard src="https://via.placeholder.com/150x100/ec4899/ffffff?text=Banner" label="Banner" desc="Promo" themeColors={tc('#ec4899')} width={156} height={136} labelPosition="top" />
    </Infographic>
  </div>
</section>

<section class="demo-section">
  <h3>6. StatCard</h3>
  <p class="component-desc">KPI card with value, trend indicator, and comparison metrics</p>
  <div class="items-row">
    <Infographic theme={selectedTheme} width={200} height={110} padding={12}>
      <StatCard label="Revenue" value="$1.2M" trend={12.5} trendLabel="vs last month" themeColors={tc('#22c55e')} width={176} height={86} />
    </Infographic>
    <Infographic theme={selectedTheme} width={200} height={110} padding={12}>
      <StatCard label="Users" value="45.2K" trend={-3.2} trendLabel="this week" themeColors={tc('#ef4444')} width={176} height={86} />
    </Infographic>
    <Infographic theme={selectedTheme} width={200} height={110} padding={12}>
      <StatCard label="Conversion" value="3.8%" trend={0.5} trendLabel="vs average" icon="chart-line" themeColors={tc('#3b82f6')} width={176} height={86} />
    </Infographic>
  </div>
</section>

<section class="demo-section">
  <h3>7. MindMapNode</h3>
  <p class="component-desc">Node for mind map structures with icon, label, and description</p>
  <div class="items-row">
    <Infographic theme={selectedTheme} width={120} height={90} padding={12}>
      <MindMapNode label="Root" isRoot={true} themeColors={tc('#6366f1')} width={96} height={66} />
    </Infographic>
    <Infographic theme={selectedTheme} width={100} height={80} padding={12}>
      <MindMapNode label="Branch A" icon="lightbulb" themeColors={tc('#22c55e')} width={76} height={56} />
    </Infographic>
    <Infographic theme={selectedTheme} width={100} height={80} padding={12}>
      <MindMapNode label="Branch B" icon="cog" themeColors={tc('#f59e0b')} width={76} height={56} />
    </Infographic>
  </div>
</section>

<section class="demo-section">
  <h3>8. NetworkNode</h3>
  <p class="component-desc">Circular node for network graphs with icon and label</p>
  <div class="items-row">
    <Infographic theme={selectedTheme} width={100} height={100} padding={12}>
      <NetworkNode label="API" icon="cloud" themeColors={tc('#3b82f6')} width={76} height={76} />
    </Infographic>
    <Infographic theme={selectedTheme} width={100} height={100} padding={12}>
      <NetworkNode label="DB" icon="database" themeColors={tc('#22c55e')} width={76} height={76} />
    </Infographic>
    <Infographic theme={selectedTheme} width={100} height={100} padding={12}>
      <NetworkNode label="Cache" icon="memory" themeColors={tc('#ec4899')} width={76} height={76} />
    </Infographic>
  </div>
</section>

<section class="demo-section">
  <h3>9. NumberBadge</h3>
  <p class="component-desc">Circular or rounded badge displaying a number (step, rank, count)</p>
  <div class="items-row">
    <Infographic theme={selectedTheme} width={60} height={70} padding={12}>
      <NumberBadge number={1} size={36} variant="filled" shape="circle" themeColors={tc('#6366f1')} />
    </Infographic>
    <Infographic theme={selectedTheme} width={60} height={70} padding={12}>
      <NumberBadge number={2} size={36} variant="outline" shape="circle" themeColors={tc('#22c55e')} />
    </Infographic>
    <Infographic theme={selectedTheme} width={60} height={70} padding={12}>
      <NumberBadge number={3} size={36} variant="subtle" shape="rounded"
        themeColors={{ colorPrimary: '#f59e0b', colorPrimaryBg: 'rgba(245,158,11,0.2)', colorPrimaryText: '#fff',
          colorText: '#fff', colorTextSecondary: '#a0a0b0', colorWhite: '#fff',
          colorBg: '#1a1a2e', colorBgElevated: '#2a2a4a', isDarkMode: true }} />
    </Infographic>
    <Infographic theme={selectedTheme} width={60} height={70} padding={12}>
      <NumberBadge number={99} size={36} variant="filled" shape="square" themeColors={tc('#ec4899')} />
    </Infographic>
  </div>
</section>
