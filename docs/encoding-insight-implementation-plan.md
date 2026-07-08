# Encoding 变体 + Insight 自动生成 — 执行计划

## 背景

基于对现有 26 种 chart type 的分析结论：**核心缺失不是新 chart type，而是 encoding 变体（multi-series、stacked/grouped bar、donut）和 insight 自动生成**。详见之前的调研讨论。

---

## P0 — Encoding 变体（multi-series, stacked, donut）

### 核心思路

`encoding.color` 在 schema（`spec-schema.ts:93`）和类型（`types.ts:206`）中已定义，但**所有 renderer 都忽略它**，只按 `palette[index % len]` 循环上色。改动目标是让 renderer 真正消费 `encoding.color`，实现多系列渲染。

### Step 0：前置确认（15min）

确认 `data-query.ts` 和 `data-transform.ts` 的 aggregation 函数实现一致。

- `data-query.ts:189` `computeAggregate()` — sum/avg/count/min/max
- `data-transform.ts:171` `aggregateMeasure()` — sum/avg/count/min/max

结论：**两者实现相同**。这样 evidence 和 chart 的聚合值天然一致，insight 引用的数字和 chart 显示的数字不会偏差。

### Step 1：数据层 — color 参与 grouping

**文件**：`data-transform.ts` — `applyEncodingAggregates()`

当前（~72-78 行）：
```ts
if (chart.type === 'bar' || chart.type === 'line' || chart.type === 'area') {
  // groupBy = [x.field]
```

改成：
```ts
if (chart.type === 'bar' || chart.type === 'line' || chart.type === 'area') {
  const groupFields = [x.field]
  if (enc.color?.field) groupFields.push(enc.color.field)  // ← 新增
  // groupBy = groupFields
```

输出变化：没有 color 时输出不变（单系列）；有 color 时每行多一个 color 列。

**验证**：`prepareChartData(rows, { type: 'bar', encoding: { x, y: { aggregate: 'sum' }, color } })` 的输出应有 `(x, color, y)` 三元组。

### Step 2：Bar Chart — Grouped Bar

**文件**：`svg-renderer.ts` — `renderBarChart()`

改动点（~64-96 行）：

1. 检测 `encoding.color?.field`
2. 若无 color → 保持现有逻辑（单系列，不回归）
3. 若有 color：
   - 从 rows 提取唯一 color 值列表，映射到 `theme.palette[seriesIndex]`
   - 按 x 值分组，组内按 color 排列
   - 计算 `groupWidth = chartWidth / uniqueX.length`
   - `barWidth = groupWidth / uniqueColor.length - gap`
   - 每个 bar 的位置：`x = margin.left + xIndex * groupWidth + colorIndex * (barWidth + gap)`
   - 颜色：`theme.palette[colorIndex % len]`
4. 新增 legend（右下角，color → 色块 + 标签）

**样式控制**（通过 `style`）：
- `style.barMode: 'grouped'`（默认）→ 分组柱状图
- `style.barMode: 'stacked'` → 堆叠柱状图

Stacked 模式逻辑：
- 按 x 分组后，每个 x 下按 color 累加 y 值
- 从底部开始堆叠，每段高度 = `value / total_y_of_x * chartHeight`
- 颜色：`theme.palette[colorIndex % len]`

**验证**：`renderBarChart` 在有 color 时输出分组柱状图 SVG；无 color 时不变；`barMode: 'stacked'` 输出堆叠图。

### Step 3：Line Chart — Multi-line

**文件**：`svg-renderer.ts` — `renderLineChart()`

改动点（~98-133 行）：

1. 检测 `encoding.color?.field`
2. 若无 color → 保持现有单线逻辑
3. 若有 color：
   - 按 color 值 split rows → `Map<color, row[]>`
   - 每个 series 画一条独立 `<path>` + 独立 dots
   - 每条线用不同的 palette 颜色
   - 新增 legend
   - 整体 use case：`x=time, y=measure, color=region` → 多区域趋势对比

**验证**：line + color 输出多折线 SVG。

### Step 4：Area Chart — Stacked Area

**文件**：`svg-renderer.ts` — 第 35 行 line/area 分支

当前 area 走 `renderLineChart()` 只是 fill。改成：

1. 检测 `encoding.color?.field`
2. 若无 color → 保持现有逻辑
3. 若有 color：
   - 按 x 排序全部数据
   - 按 color split 为多个 series
   - stacked area：对每个 x 值，series 从下往上叠加
   - 每个 area 是 stacked y 值的 `<path d="...Z">`（fill + 半透明）

### Step 5：Pie Chart — Donut

**文件**：`svg-renderer.ts` — `renderPieChart()`

改动点（~135-167 行）：

1. 读取 `style.innerRadius: number`（0-1，默认 0）
2. 若 `innerRadius > 0`：
   - `outerR = radius`
   - `innerR = radius * innerRadius`
   - 把 `describeArc()` 从扇形改成环形：外弧 + 内弧路径差
3. 若 `innerRadius === 0` → 保持现有完整 pie

donut 的 legend、tooltip、选取交互都和 pie 完全一致。不需要新 chart type。

**验证**：`{ type: 'pie', style: { innerRadius: 0.55 } }` 输出 donut SVG。

### Step 6：客户端同步

**文件**：
- `client-data-engine.ts` — `renderBar()`、`renderPie()`
- `interactive-runtime-assets.ts` — `renderChart()` dispatch

`renderBar()`（~222-247 行）：实现同样的 grouped/stacked 逻辑
`renderPie()`（~249-270 行）：实现同样的 donut 逻辑

dispatch 不需要改，因为 chart type 仍然是 `bar` 和 `pie`。

**验证**：交互模式下（global filters 开启），过滤后 bar 和 pie 的客户端重渲染包含 multi-series 和 donut 能力。

### Step 7：Catalog 规则更新

**文件**：`chart-catalog-core.ts`

- bar：增加 color 支持注释；当 color 存在时 TOO_MANY_CATEGORIES 阈值放宽
- line：color 存在时允许 `x.type = 'nominal'`
- pie：增加 innerRadius donut 用法说明

---

## P1 — Insight 自动生成

### 核心思路

不引入 NLG，使用**模板 + `$evidence:` 引用**机制。每个 block 的 `compile()` 根据 `ctx.evidence[]` 和 `ctx.metricCandidates[]` 生成带 `$evidence:` 引用的 insight 文本。render 时 `resolveDirectives()` 自动做插值，validator 自动做验证。

### 现有基础设施（全部复用）

| 组件 | 作用 |
|------|------|
| `ctx.evidence[]` | `total`, `by_dimension`, `by_time` 三个预计算查询结果 |
| `ctx.metricCandidates[]` | `unit_average`, `share`, `period_change` 三个派生指标 |
| `directive-resolver.ts` | `resolveDirectives()` 把 `$evidence:id.path` 替换成实际值 |
| `spec-validator.ts` | `validateEvidencePaths()` 验证引用存在；`collectVerifyWarnings()` 检查数字引用 |
| `html-export.ts` | render 时调用 `resolveDirectives()` 做最终插值 |

### Step 1：新增 `block-insight-generator.ts`

**位置**：`packages/miao-viz-cli/src/block-insight-generator.ts`

```typescript
import type { AnalyzeContext, MetricCandidate, AnalyzeEvidence } from './context-schema'
import type { AgentInsight } from './types'

// 每个函数返回 insight 文本（含 $evidence: 引用），validator 和 renderer 自动处理

export function insightTotal(measure: string): AgentInsight {
  return {
    text: `Total ${measure}: ¥$evidence:total.values.total_${measure}`,
    evidence: ['total']
  }
}

export function insightTrend(
  timeField: string, measure: string, candidate?: MetricCandidate
): AgentInsight | null {
  const text = `${measure} trend (by ${timeField}): ` +
    `from $evidence:by_time.rows[0].total_${measure} ` +
    `to $evidence:by_time.rows[last].total_${measure}`
  const insight: AgentInsight = { text, evidence: ['by_time'] }

  if (candidate?.value !== undefined) {
    const pct = (candidate.value * 100).toFixed(1)
    const direction = candidate.value > 0 ? 'increased' : candidate.value < 0 ? 'decreased' : 'unchanged'
    insight.text += `. Period-over-period: ${direction} ${Math.abs(Number(pct))}%`
  }

  return insight
}

export function insightTopN(
  dimension: string, measure: string, topN: number
): AgentInsight {
  return {
    text: `Top ${topN} ${dimension} by ${measure}: ` +
      `$evidence:by_dimension.rows[0].${dimension} ` +
      `(¥$evidence:by_dimension.rows[0].total_${measure}, ` +
      `$evidence:by_dimension.rows[0].share% of total)`,
    evidence: ['by_dimension']
  }
}

export function insightPeriodChange(candidate: MetricCandidate): AgentInsight | null {
  if (candidate.value === undefined) return null
  const pct = (candidate.value * 100).toFixed(1)
  const direction = candidate.value > 0 ? 'increased' : 'decreased'
  return {
    text: `${candidate.label}: ${direction} ${Math.abs(Number(pct))}%`,
    evidence: ['by_time']
  }
}
```

**关键约束**：
- 所有 `$evidence:` 引用的 id 必须是 `ctx.evidence` 中实际存在的（`total`, `by_dimension`, `by_time`）
- 所有 path 必须是 evidence 中实际的字段名（`total_{measure}`, `rows[0].{dimension}`）
- 派生指标（period_change/share）的 `value === undefined` 时不生成 insight

### Step 2：修改 6 个 block 的 compile()

**文件**：`report-block-registry.ts`

每个 block 的 `compile()` 签名：
```ts
compile(variables, ctx: BlockMatchContext): { charts: AgentChartSpec[]; insights?: AgentInsight[] }
```
`BlockMatchContext` 已有 `evidence: AnalyzeContext['evidence']` 和 `catalog: AnalyzeContext['catalog']`。需要补上 `metricCandidates`。

先加一个字段到 `BlockMatchContext`：
```ts
export interface BlockMatchContext {
  fields: AnalyzeField[]
  evidence: AnalyzeContext['evidence']
  catalog: AnalyzeContext['catalog']
  sampleWarnings: AnalyzeContext['sampleWarnings']
  metricCandidates?: MetricCandidate[]  // ← added
}
```

然后修改每个 block 的 `compile()`：

| Block | 生成的 insight |
|-------|---------------|
| `kpiSummary` | `insightTotal(measure)` + 如果有 `period_change` 带上 |
| `snapshotRanking` | `insightTotal(measure)` + `insightTopN(dimension, measure, topN)` |
| `trendOverview` | `insightTrend(timeField, measure, periodChange)` |
| `comparisonBreakdown` | `insightTopN(dimension, measure, 3)` + share 占比 |
| `trendRanking` | `insightTotal(measure)` + `insightTrend(timeField, measure)` + `insightTopN(dimension, measure, topN)` |
| `fullDetailReport` | 上述全部 |

示例改动（`kpiSummary`）：
```typescript
compile(variables, ctx) {
  const measure = String(variables.primaryMeasure)
  const change = ctx.metricCandidates?.find(m => m.type === 'period_change')
  const insights: AgentInsight[] = [insightTotal(measure)]
  if (change) {
    const pc = insightPeriodChange(change)
    if (pc) insights.push(pc)
  }
  return { charts: [buildKpiChart(measure)], insights }
}
```

### Step 3：把 metricCandidates 传递到 BlockMatchContext

`BlockMatchContext` 在以下路径构建：

**文件**：`analyzer.ts` — `buildCatalog()`（~306 行）

```typescript
function buildCatalog(fields, evidence, sampleWarnings, ...): AnalyzeCatalog {
  // ...
  const blockCtx: BlockMatchContext = {
    fields, evidence, catalog,
    sampleWarnings,
    metricCandidates  // ← pass through
  }
  // ...
}
```

**文件**：`cli-block.ts` — `blockInstantiate` 命令

检查是否传入 `metricCandidates`，如果有就传到 compile 的参数里。

### Step 4：验证

Insight 自动生成走的验证路径和手写 insight 完全一致：
- `validateEvidencePaths()` — 检查 `evidence[]` 中的 id 是否在 `context.evidence` 中存在
- `collectVerifyWarnings()` — 检查禁止词；检查数字 claim 必须有 evidence 引用
- render 时 `resolveDirectives()` — 插值，找不到 path 的显示 `[?id.path]`

**新增测试**：

1. `block-insight-generator.test.ts`：
   - 给定 mock evidence，验证生成的 insight 文本是否包含正确的 `$evidence:` 引用
   - 验证 `period_change` 为 undefined 时不生成 insight
2. `report-block-registry.test.ts` 扩展：
   - 对每个 block，mock `BlockMatchContext`，验证 compile 返回的 `insights` 非空、evidence 引用正确

---

## 依赖关系图

```
                    ┌─────────────────┐
                    │ 调研完成（已做）   │
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              │                              │
     ┌────────▼────────┐          ┌─────────▼──────────┐
     │ P0: Encoding    │          │ P1: Insight Auto-   │
     │ 变体             │          │ gen                │
     └────────┬────────┘          └─────────┬──────────┘
              │                              │
     ┌────────▼────────┐          ┌─────────▼──────────┐
     │ Step 1: color   │          │ Step 1: generator  │
     │ in grouping     │          │ module             │
     └────────┬────────┘          └─────────┬──────────┘
              │                              │
     ┌────────▼────────┐          ┌─────────▼──────────┐
     │ Step 2-5: SVG   │          │ Step 2: block      │
     │ renderers       │          │ compile() 改造      │
     └────────┬────────┘          └─────────┬──────────┘
              │                              │
     ┌────────▼────────┐          ┌─────────▼──────────┐
     │ Step 6: client  │          │ Step 3: context     │
     │ sync            │          │ 传递 metricCandidates│
     └────────┬────────┘          └─────────┬──────────┘
              │                              │
     ┌────────▼────────┐          ┌─────────▼──────────┐
     │ Step 7: catalog │          │ Step 4: tests      │
     │ rules           │          │                    │
     └────────┬────────┘          └────────────────────┘
              │
     ┌────────▼───────────────────────────────────────┐
     │ 回归验证：npm run test:run + npm run build:cli   │
     │ + 手动检查 report.html 和 deck.html              │
     └────────────────────────────────────────────────┘
```

P0 和 P1 **可以并行实现**，互不依赖。

---

## 估时

| 阶段 | 内容 | 估时 |
|:----:|------|:----:|
| P0-1 | data-transform: color in grouping | 0.5h |
| P0-2 | svg-renderer: grouped bar | 2h |
| P0-3 | svg-renderer: multi-line | 1.5h |
| P0-4 | svg-renderer: stacked area | 1.5h |
| P0-5 | svg-renderer: donut | 1h |
| P0-6 | client-data-engine: grouped bar + donut | 2h |
| P0-7 | catalog rules update | 0.5h |
| P1-1 | block-insight-generator module | 1.5h |
| P1-2 | 6 block compile() 改造 | 2h |
| P1-3 | context 传递 metricCandidates | 0.5h |
| P1-4 | 测试 | 1.5h |
| **总计** | | **~14h** |

---

## 回滚策略

P0 和 P1 的每个步骤都是**可逆的**：

- Encoding 变体：`encoding.color` 不设置时，所有 renderer 行为不变。color 设置后才触发多系列逻辑。不存在"改坏了已有功能"的可能。
- Insight 生成：`compile()` 返回 `insights` 是可选的，renderer 没有 insights 也能正常输出。即使生成逻辑有 bug，最多是 insight 文本不对，不影响 chart 渲染。
