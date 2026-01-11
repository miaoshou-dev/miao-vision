# Frontend Architecture Recommendations
## SQL Workspace Chart Plugin Integration

> 以前端架构专家视角，对复用 Report Plugins 的技术建议

---

## 📊 Executive Summary

**结论**: Report Plugins **可以复用**，但需要精心设计的架构层来避免技术债务。

**关键风险**:
- ⚠️ **性能**: Bundle size 可能增加 200KB+
- ⚠️ **UX 不一致**: Report 静态 vs SQL Workspace 动态配置
- ⚠️ **类型安全**: 14+ 个不同的数据格式
- ⚠️ **维护成本**: 双重 API (Report + Workspace)

**推荐方案**: 分层架构 + 按需加载 + 统一数据模型

---

## 🏗️ Architecture Design

### 1. 分层架构 (Layered Architecture)

```
┌─────────────────────────────────────────────────────────┐
│ SQL Workspace (User Interface)                          │
│ - ResultsPanel.svelte                                   │
│ - ChartConfigPanel (interactive controls)               │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ Abstraction Layer (THIS IS THE KEY!)                    │
│ - ChartWrapper.svelte (unified component wrapper)       │
│ - ChartRegistry (component registry + lazy loading)     │
│ - Data Adapters (QueryResult → Chart Data)             │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ Report Plugins (Reusable Components)                    │
│ - BubbleChart.svelte, Heatmap.svelte, etc.             │
│ - Existing component logic (unchanged)                  │
└─────────────────────────────────────────────────────────┘
```

**为什么需要抽象层？**

| 问题 | 不加抽象层 | 加抽象层 |
|------|----------|---------|
| 14 个不同的数据格式 | ❌ 14 个适配器函数 | ✅ 5 个数据模型适配器 |
| Bundle size | ❌ +200KB (全量导入) | ✅ 按需加载 |
| 配置不一致 | ❌ 每个组件不同的 props | ✅ 统一的 config API |
| 导出功能 | ❌ 每个组件实现一次 | ✅ 统一实现 |
| 测试 | ❌ 14+ 组件单独测试 | ✅ 测试抽象层即可 |

---

### 2. 统一数据模型 (Data Model Abstraction)

**核心思想**: 按数据结构分组，不是按图表类型

```typescript
// ❌ 问题：按图表类型 (线性复杂度 O(n))
adaptToBarChart(result)      // 实现 1
adaptToLineChart(result)     // 实现 2
adaptToAreaChart(result)     // 实现 3... 14+ 次重复

// ✅ 解决：按数据模型 (对数复杂度 O(log n))
type ChartDataModel =
  | 'series'       // Bar, Line, Area (3 charts)
  | 'correlation'  // Scatter, Bubble, Heatmap (3 charts)
  | 'distribution' // Histogram, Boxplot (2 charts)
  | 'hierarchical' // Treemap, Sankey, Funnel (3 charts)
  | 'geospatial'   // Maps (3 charts)

// 5 个适配器 handle 14+ 个图表
class SeriesDataAdapter { /* ... */ }        // Reused by Bar, Line, Area
class CorrelationDataAdapter { /* ... */ }   // Reused by Scatter, Bubble, Heatmap
class DistributionDataAdapter { /* ... */ }  // Reused by Histogram, Boxplot
```

**好处**:
- 新增同类图表：零成本
- 代码重用：3-5x reduction
- 类型推断：更强的 TypeScript 支持

**实现位置**:
- `src/components/sql-workspace/results/chart-types.ts` (已创建)
- `src/components/sql-workspace/results/adapters/series-adapter.ts` (已创建)
- `src/components/sql-workspace/results/adapters/correlation-adapter.ts` (已创建)

---

### 3. 性能优化策略

#### 3.1 按需加载 (Code Splitting)

```typescript
// ❌ 问题：全量导入
import BubbleChart from '@plugins/data-display/bubble-chart/BubbleChart.svelte'
import Heatmap from '@plugins/data-display/heatmap/Heatmap.svelte'
// ... 12 more
// Result: Initial bundle +200KB, 用户可能只用 Bar Chart

// ✅ 解决：动态导入
const chartComponents = {
  bubble: () => import('@plugins/data-display/bubble-chart/BubbleChart.svelte'),
  heatmap: () => import('@plugins/data-display/heatmap/Heatmap.svelte')
}

// ChartWrapper.svelte 中使用
$effect(() => {
  chartInfo.load().then(m => ChartComponent = m.default)
})
```

**Bundle 优化结果**:
```
Before: main.js (2.5MB) - 包含所有图表
After:  main.js (2.3MB) - 不包含图表
        bubble-chart.chunk.js (15KB) - 用户点击时加载
        heatmap.chunk.js (18KB)
        ...
```

#### 3.2 智能预加载 (Intelligent Preloading)

```typescript
// 用户打开图表类型下拉菜单时
function onChartTypeDropdownOpen() {
  // 预加载 top 3 常用图表（基于使用频率统计）
  chartRegistry.get('heatmap')?.load()
  chartRegistry.get('bubble')?.load()
  chartRegistry.get('area')?.load()
}

// 用户悬停某个图表选项时
function onChartTypeHover(type: string) {
  // Prefetch on hover (speculative loading)
  chartRegistry.get(type)?.load()
}
```

#### 3.3 虚拟化渲染 (For Large Datasets)

```typescript
// 对于大数据集 (10k+ rows)，在适配器层做采样
class SeriesDataAdapter {
  transform(result: QueryResult, config: SeriesChartConfig): SeriesData {
    let data = result.data

    // 数据点过多时，采样
    if (data.length > 1000 && config.type === 'scatter') {
      data = this.sampleData(data, 1000) // 智能采样保留代表性
    }

    // ... rest of transform
  }

  private sampleData(data: any[], targetSize: number): any[] {
    // 分层采样 (stratified sampling)
    // 保留极值点 + 随机采样中间值
  }
}
```

---

### 4. 类型安全设计

#### 4.1 泛型约束

```typescript
// chart-types.ts (已创建)
export interface ChartAdapter<TConfig extends BaseChartConfig, TData> {
  dataModel: ChartDataModel
  validate(result: QueryResult, config: TConfig): boolean
  transform(result: QueryResult, config: TConfig): TData | null
  suggestConfig?(result: QueryResult): Partial<TConfig>
}

// 使用时自动类型推断
const adapter: ChartAdapter<SeriesChartConfig, SeriesData> = seriesAdapter
//                          ^^^^^^^^^^^^^^^^  ^^^^^^^^^^^
//                          Config 类型       Data 类型
//                          自动检查          自动检查
```

#### 4.2 Chart Registry 类型安全

```typescript
export class SQLWorkspaceChartRegistry {
  register<TConfig, TData>(info: ChartComponentInfo<TConfig, TData>) {
    this.charts.set(info.type, info)
  }

  get<TConfig, TData>(type: string): ChartComponentInfo<TConfig, TData> | undefined {
    return this.charts.get(type) as ChartComponentInfo<TConfig, TData> | undefined
  }
}

// 使用时
const bubbleInfo = chartRegistry.get<BubbleChartConfig, BubbleChartData>('bubble')
//    ^^^^^^^^^^ 类型: ChartComponentInfo<BubbleChartConfig, BubbleChartData> | undefined
```

---

### 5. UX 一致性设计

#### 5.1 问题：两种模式的冲突

| 维度 | Report Plugin | SQL Workspace |
|------|--------------|---------------|
| 配置方式 | 静态 Markdown | 动态交互面板 |
| 用户交互 | 只读展示 | 实时调整 |
| 导出功能 | 无 | 必需 |
| 响应式 | 固定尺寸 | 自适应容器 |

**解决方案**: `ChartWrapper.svelte` (已创建)

- ✅ 统一所有图表的交互模式
- ✅ 提供标准化的配置面板 slot
- ✅ 内置导出功能
- ✅ 懒加载 + 错误处理

#### 5.2 配置面板设计模式

```svelte
<!-- Generic config panel for all charts -->
<ChartConfigPanel>
  <!-- Common controls (all charts) -->
  <section class="common-controls">
    <ChartTypeSelector />
    <ColumnMapper />  <!-- X, Y columns -->
    <AggregationSelector />
  </section>

  <!-- Chart-specific controls (dynamic) -->
  <section class="chart-controls">
    {#if chartType === 'bubble'}
      <RangeSlider label="Min Bubble Size" />
      <RangeSlider label="Max Bubble Size" />
    {:else if chartType === 'heatmap'}
      <ColorScalePicker />
      <CheckboxGroup label="Show Values" />
    {/if}
  </section>

  <!-- Advanced controls (collapsible) -->
  <details class="advanced-controls">
    <summary>Advanced Options</summary>
    <DimensionInputs />  <!-- Width, Height -->
    <LabelInputs />      <!-- Title, X/Y labels -->
  </details>
</ChartConfigPanel>
```

---

### 6. 测试策略

#### 6.1 测试金字塔

```
        ┌──────────────┐
        │ E2E Tests    │  5% - Playwright (用户流程)
        │ (2-3 tests)  │
        ├──────────────┤
        │ Integration  │  15% - Vitest (适配器 + 组件)
        │ (10-15 tests)│
        ├──────────────┤
        │ Unit Tests   │  80% - Vitest (纯函数)
        │ (50+ tests)  │
        └──────────────┘
```

#### 6.2 关键测试用例

**Adapter Layer (Unit Tests)**:
```typescript
// series-adapter.test.ts
describe('SeriesDataAdapter', () => {
  it('should transform raw data correctly', () => {
    const result: QueryResult = {
      columns: ['month', 'revenue'],
      data: [
        { month: 'Jan', revenue: 1000 },
        { month: 'Feb', revenue: 1500 }
      ]
    }
    const config: SeriesChartConfig = {
      type: 'bar',
      xColumn: 'month',
      yColumns: ['revenue'],
      aggregation: 'none'
    }

    const data = seriesAdapter.transform(result, config)

    expect(data).toEqual({
      labels: ['Jan', 'Feb'],
      datasets: [{
        label: 'revenue',
        values: [1000, 1500]
      }]
    })
  })

  it('should handle aggregation correctly', () => { /* ... */ })
  it('should suggest config correctly', () => { /* ... */ })
  it('should validate invalid data', () => { /* ... */ })
})
```

**ChartWrapper (Integration Tests)**:
```typescript
// ChartWrapper.test.ts
describe('ChartWrapper', () => {
  it('should lazy load chart component', async () => {
    const { getByText } = render(ChartWrapper, { props: { chartInfo: bubbleChartInfo } })
    expect(getByText('Loading Bubble Chart...')).toBeInTheDocument()
    await waitFor(() => expect(getByText('Loading')).not.toBeInTheDocument())
  })

  it('should handle load errors gracefully', () => { /* ... */ })
  it('should export PNG correctly', () => { /* ... */ })
})
```

**E2E Tests**:
```typescript
// sql-workspace-charts.e2e.ts
test('user can create and export a heatmap', async ({ page }) => {
  // 1. Upload data
  await page.setInputFiles('input[type="file"]', 'test-data.csv')

  // 2. Run query
  await page.click('button:has-text("Run Query")')

  // 3. Switch to Chart view
  await page.click('button:has-text("Chart")')

  // 4. Select Heatmap
  await page.selectOption('select[id="chart-type"]', 'heatmap')

  // 5. Configure columns
  await page.selectOption('select[id="x-column"]', 'category')
  await page.selectOption('select[id="y-column"]', 'value')

  // 6. Export PNG
  await page.click('button:has-text("PNG")')
  const download = await page.waitForEvent('download')
  expect(download.suggestedFilename()).toContain('heatmap')
})
```

---

### 7. 渐进式迁移路径

#### Phase 1: 基础设施 (Week 1)
- [x] 创建 `chart-types.ts` - 类型系统
- [x] 创建 `series-adapter.ts` - Series 数据适配器
- [x] 创建 `correlation-adapter.ts` - Correlation 数据适配器
- [x] 创建 `ChartWrapper.svelte` - 组件包装器
- [ ] 创建 `ChartRegistry` - 图表注册表
- [ ] 编写适配器单元测试 (目标: 30+ tests)

#### Phase 2: 首个 Plugin 集成 (Week 1-2)
- [ ] 集成 **Heatmap** (最简单，验证架构)
  - [ ] 注册到 ChartRegistry
  - [ ] 创建配置面板
  - [ ] 测试数据转换
  - [ ] E2E 测试
- [ ] 验证性能指标:
  - [ ] Bundle size 增加 < 20KB
  - [ ] 首次加载 < 100ms
  - [ ] 交互响应 < 16ms (60fps)

#### Phase 3: 批量集成 (Week 2-3)
- [ ] 集成 Series 模型图表:
  - [ ] Area Chart
  - [ ] Stacked Bar/Area
- [ ] 集成 Correlation 模型图表:
  - [ ] Bubble Chart
  - [ ] Enhanced Scatter
- [ ] 集成 Distribution 模型图表:
  - [ ] Boxplot
  - [ ] Violin Plot

#### Phase 4: 优化与完善 (Week 3-4)
- [ ] 性能优化:
  - [ ] 实现智能预加载
  - [ ] 大数据集采样
  - [ ] 虚拟滚动 (if needed)
- [ ] UX 优化:
  - [ ] 图表推荐引擎
  - [ ] 配置模板
  - [ ] 快捷键支持
- [ ] 完善测试:
  - [ ] 覆盖率 > 80%
  - [ ] 5+ E2E 场景

---

### 8. 潜在风险与缓解

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|---------|
| **Bundle size 过大** | 高 | 中 | ✅ 按需加载 + 代码分割 |
| **Plugin API 不兼容** | 高 | 低 | ✅ ChartWrapper 抽象层 |
| **性能回退** | 中 | 中 | ✅ 性能监控 + 基准测试 |
| **UX 不一致** | 中 | 高 | ✅ 统一配置面板设计 |
| **维护成本增加** | 中 | 中 | ✅ 自动化测试 + 文档 |
| **类型安全丢失** | 低 | 低 | ✅ 泛型约束 + strict mode |

---

### 9. 性能基准 (Performance Baseline)

**目标指标**:
```typescript
// 必须满足的性能要求
const PERFORMANCE_TARGETS = {
  // Bundle
  initialBundleIncrease: '<50KB',  // 主 bundle 增加上限
  chartChunkSize: '<30KB',         // 单个图表 chunk 大小

  // Loading
  chartLoadTime: '<100ms',         // 图表组件加载时间
  dataTransformTime: '<50ms',      // 数据转换时间 (1k rows)

  // Rendering
  initialRenderTime: '<200ms',     // 首次渲染时间
  rerenderTime: '<16ms',           // 重渲染时间 (60fps)

  // Interaction
  configChangeResponse: '<32ms',   // 配置变更响应时间
  exportTime: '<500ms'             // 导出 PNG/SVG 时间
}
```

**监控方式**:
```typescript
// 在 ChartWrapper.svelte 中埋点
const startTime = performance.now()

chartInfo.load().then(() => {
  const loadTime = performance.now() - startTime

  // 上报到监控系统
  analytics.track('chart_load', {
    type: chartInfo.type,
    duration: loadTime,
    exceeds_target: loadTime > 100
  })
})
```

---

## 📝 总结建议

### ✅ DO (推荐做法)

1. **使用数据模型分组**，不是图表类型分组
2. **实现 ChartWrapper 抽象层**，统一交互模式
3. **按需加载图表组件**，优化 bundle size
4. **编写充分的单元测试**，覆盖适配器层
5. **建立性能基准**，监控关键指标
6. **渐进式迁移**，先验证 Heatmap 再批量集成

### ❌ DON'T (避免做法)

1. ❌ 不要直接在 ResultsChart.svelte 中导入所有 plugin 组件
2. ❌ 不要为每个图表写单独的适配器（会有 14+ 个）
3. ❌ 不要忽略 UX 一致性（Report 和 Workspace 交互不同）
4. ❌ 不要跳过性能测试（bundle size 可能爆炸）
5. ❌ 不要修改 plugin 组件本身（保持向后兼容）
6. ❌ 不要过度设计（先满足 80% 场景，再优化）

---

## 🎯 下一步行动

如果你同意这个架构方案，建议执行顺序：

**立即执行 (P0)**:
1. ✅ 创建类型系统 (`chart-types.ts`) - **已完成**
2. ✅ 创建适配器 (`series-adapter.ts`, `correlation-adapter.ts`) - **已完成**
3. ✅ 创建包装器 (`ChartWrapper.svelte`) - **已完成**
4. ⏳ 实现 `ChartRegistry` 并注册 Heatmap
5. ⏳ 编写适配器单元测试

**本周完成 (P1)**:
6. 集成 Heatmap 到 SQL Workspace
7. 验证性能指标
8. 用户测试并收集反馈

**下周计划 (P2)**:
9. 根据反馈调整架构
10. 批量集成其余图表 (Area, Bubble, Boxplot...)

---

## 📚 相关文档

- `VISUALIZATION_STRATEGY.md` - 产品层面的可视化策略
- `WORKSPACE_IMPROVEMENTS.md` - SQL Workspace 整体改进计划
- `src/components/sql-workspace/results/chart-types.ts` - 类型系统实现
- `src/components/sql-workspace/results/ChartWrapper.svelte` - 包装器实现

---

**作者**: Frontend Architecture Review
**日期**: 2025-12-24
**版本**: 1.0
