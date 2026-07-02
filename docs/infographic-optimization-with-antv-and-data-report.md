# Infographic 渲染优化方案

> 参考：[AntV Infographic](https://github.com/antvis/Infographic)（组件化思路）+ 数据报告（SVG primitives + theme tokens）
> 原则：不直接复用 data report 的 AgentChartSpec 模型，共享视觉层能力

## 现状诊断

### 文件状态

| 文件 | 行数 | 问题 |
|------|------|------|
| `infographic-visuals.ts` | 464 | 12 个 visual 在一个 switch 里，函数间重复坐标计算 |
| `article-infographic.ts` | 491 | 接近 500 行限制，解析 + 生成 + schema 混在一起 |
| `article-html.ts` | 308 | 3 套硬编码 palette，无主题系统 |
| `infographic-visual-primitives.ts` | 123 | 与 `svg-renderer.ts` 重复的 `escapeHtml`、`svgFrame` |

### 核心差距

当前 infographic 产出与数据报告的视觉质量差距：

```
指标              infographic 现状       数据报告
──────────────────────────────────────────────────
KPI 字号          26px (CSS)            52px (serif SVG)
字体系列          Inter 统一              serif 标题 + mono 标签 + sans 正文
主题              3 套硬编码 palette     4 个完整 theme（css + svg palette）
SVG 辅助线        无                     gridLines + tickLabels
扩展方式          改 switch-case         register + theme 映射
```

**AntV Infographic 最值得参考的点**不是其架构复杂度，而是组件化思路（structure/item 分离、模板注册、声明式 layout 描述）。但其三注册表 + 两阶段渲染对 miao-vision 过于重，不应照搬。

---

## P0：基础设施 — primitives + 文件拆分 + 主题统一

### P0-1：提取共享 SVG primitives

从 `svg-renderer.ts` 和 `infographic-visual-primitives.ts` 中提取重复或潜在可复用的工具函数到 `shared-svg.ts`：

```ts
// packages/miao-viz-cli/src/shared-svg.ts

export function escapeHtml(value: string): string   // 统一两处重复
export function svgFrame(width, height, bg, body): string  // 统一两处重复
export function formatTick(value: number): string    // 1.2K / 3.5M 格式化
export function numericTicks(min, max, count): Tick[]   // 等距 tick 计算
export function gridLines(ticks, x0, chartWidth, theme): string  // 网格线
export function axisLine(x1, y1, x2, y2, theme): string  // 单根轴线
export function rectEl(x, y, w, h, attrs): string
export function bar(x, y, w, h, fill, label): string
export function arrowDef(uid, color): string
```

**不暴露 `buildAxis()`**。infographic 的 metric-bars、ranked-list 等需要的只是 **numeric X 轴刻度 + 网格线**，不是 data report chart 的通用 xField/yField 轴标签模型。从 `buildAxis()` 内部提取 `numericTicks()` 和 `gridLines()` 两个小函数即可。

### P0-2：拆分超大文件

#### infographic-visuals.ts (464行 → 按 visual 文件拆分)

现状：`renderSectionVisual()` 是 switch-case 派发。

```ts
// 现状（infographic-visuals.ts:11）
switch (visual.type) {
  case 'kpi-strip': return renderKpiStrip(...)
  case 'metric-bars': return renderMetricBars(...)
  // 每加一种改这里
}
```

第一阶段目标：用静态 Record 替代 switch，同时按文件拆分。

```ts
// infographic-visuals.ts — 只保留派发表 + 导出
import { renderKpiStrip } from './visuals/kpi-strip'
import { renderMetricBars } from './visuals/metric-bars'
// ...

const renderers: Record<InfographicVisualType, Renderer> = {
  'kpi-strip': renderKpiStrip,
  'metric-bars': renderMetricBars,
  // ...
}

export function renderSectionVisual(visual: InfographicVisual, style: InfographicStyle): string {
  const theme = articleStyleToTheme(style)
  const render = renderers[visual.type]
  return render ? render(visual.data, theme) : ''
}
```

文件结构：

```text
infographic-visuals/
  index.ts               # Record 派发表 + renderSectionVisual
  kpi-strip.ts           # renderKpiStrip
  metric-bars.ts         # renderMetricBars + computeMetricBarsLayout
  process-flow.ts
  concept-contrast.ts
  timeline-path.ts
  part-to-whole.ts
  before-after.ts
  tradeoff-matrix.ts
  ranked-list-chart.ts
  system-diagram.ts
  callout-diagram.ts
  icon-cluster.ts
```

**暂不引入 Structure 注册表、Item 注册表**。第一阶段用 `Record` 已解决问题，且没有动态注册需求。后续如果出现需要从 CLI/spec 中动态查找 visual 的场景，再升级也不晚。

#### article-infographic.ts (491行 → 拆分 planner)

把 `buildInfographicSpec()` 中的内容推理逻辑（`buildFactsVisual`、`collectFacts`、`collectTimeline`、`detectProcess` 等）拆到 `infographic-planner.ts`。`article-infographic.ts` 只保留 schema、parseArticle、loadInfographicSpec。

### P0-3：主题统一

现状：`article-html.ts:205-210` 自己定义 3 套 palette，与数据报告的主题系统隔离。

```ts
function buildCss(style: InfographicStyle) {
  const palette = style === 'minimal'
    ? { bg: '#ffffff', ink: '#161616', ... }
    : style === 'executive'
      ? { bg: '#f4f0e8', ink: '#18212f', ... }
      : { bg: '#f7efe2', ink: '#241b16', ... }
  return `:root { --bg:${palette.bg}; --ink:${palette.ink}; ... }`
}
```

目标：改为用 `getTheme()` 加载，复用数据报告现有的 4 个主题文件。

```ts
function getInfographicTheme(style: InfographicStyle): ReportTheme {
  const map: Record<InfographicStyle, ThemeName> = {
    editorial: 'editorial',
    executive: 'minimal',
    minimal: 'default'
  }
  return getTheme(map[style])
}
```

`buildCss()` 改为从 `theme.css` 获取 CSS，不再硬编码颜色值。如果后续需要 article 专属的 CSS 变量（如 `.mv-visual-*` 相关），追加到对应 theme 的 css 中，而非分散在 `article-html.ts`。

---

## P1：强化 visual data schema 和 validation

### P1-1：visual data 改为 discriminated union

现状：`InfographicVisual.data` 是 `Record<string, unknown>`，运行时无类型保障。

```ts
// 现状
export interface InfographicVisual {
  type: InfographicVisualType
  data: Record<string, unknown>    // 运行时无法校验
}
```

目标：为每种 visual 定义独立 schema。

```ts
// infographic-visual-schemas.ts
import { z } from 'zod'

export const metricBarsItemSchema = z.object({
  label: z.string(),
  value: z.union([z.number(), z.string().transform(v => Number.parseFloat(v) || 0)]),
  unit: z.string().optional()
})

export const metricBarsDataSchema = z.object({
  items: z.array(metricBarsItemSchema).min(1).max(8)
})

export const timelinePathItemSchema = z.object({
  label: z.string().optional(),
  text: z.string().min(1)
})

// 每种 visual 都有自己的 schema
// 渲染前调用 schema.safeParse()，失败返回 structured error
```

### P1-2：结构化错误处理

现状：visual data 错误在渲染时抛出异常（如 `requireVisualCriteria()`），导致整页渲染失败。

```ts
// 现状（infographic-visuals.ts:133）
function requireVisualCriteria(visual) {
  // throw new Error(...)
}
```

目标：渲染时校验，失败则 `agentError()` 返回结构化错误码，不影响其他 section。

```ts
// visual 渲染前调用：
const parseResult = metricBarsDataSchema.safeParse(visual.data)
if (!parseResult.success) {
  return agentError('INVALID_VISUAL_DATA', `metric-bars: ${parseResult.error.message}`)
}
const validatedData = parseResult.data
```

错误码体系：

```text
INVALID_VISUAL_DATA      visual 数据不符合 schema
MISSING_VISUAL_FIELDS    缺少必填字段
UNSUPPORTED_VISUAL_TYPE  不存在该 visual 类型
VISUAL_DATA_TOO_LARGE    items 超过限制（如 > 8）
```

### P1-3：数值标准化

`InfographicSectionItem.value` 当前是 `string | undefined`，不能直接用于 chart 渲染。

```ts
// 现状
interface InfographicSectionItem {
  label?: string
  value?: string    // 字符串形式
  text: string
}
```

改造：在 visual schema 中统一做数值转换（用 zod 的 transform），渲染函数接收到的都是 `number`。

```ts
const numericValue = z.union([
  z.number(),
  z.string().transform(v => {
    const n = Number.parseFloat(v.replace(/[^0-9.\-]/g, ''))
    return Number.isFinite(n) ? n : 0
  })
])
```

---

## P2：提升现有 visual 的视觉质量

### P2-1：KPI 呈现升级（kpi-strip）

现状：`kpi-strip` 用 HTML `<div>` + 26px font-size。

```css
.mv-visual-kpi strong { font-size: 26px; }
```

目标：将 KPI 字号提升到 42-52px，引入 serif 字体和 tabular-nums。具体做法是**新增 article 专用的 kpi SVG/HTML primitive**，而不是通过 `chart-bigvalue` 间接复用（因为 `renderBigValue()` 返回的是 HTML `<div>`，不是 SVG，且 article CSS 没有 `.miao-bigvalue` 样式）。

```css
/* article CSS 中新增 */
.mv-visual-kpi strong {
  font-size: 48px;
  font-family: Charter, Georgia, "Times New Roman", serif;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}
```

KPI 分组也对应调整：从 `flex-wrap` 改为 CSS grid `kpi-grid` 模式，参考 `editorial-theme.ts:48-53` 的 `.kpi-grid`。

### P2-2：metric-bars 加入刻度线

现状：`metric-bars` 是纯水平条，无 X 轴刻度、无网格线。

目标：使用 P0 提取的 `numericTicks()` + `gridLines()` 为条状图添加数值 X 轴参考线和刻度。

```ts
import { numericTicks, gridLines } from './shared-svg'

function renderMetricBars(data, theme) {
  const max = computeMax(data.items)
  const ticks = numericTicks(0, max, 4)
  const lines = gridLines(ticks, labelW, barStartY, chartHeight, theme)
  // SVG 中加入 lines
}
```

### P2-3：ranked-list-chart 加入刻度

现状：`ranked-list-chart` 是 CSS grid 渲染，track 宽度用 CSS 百分比，无参考刻度。

目标：可选地（2+ items 时）在 track 上方或下方加少量刻度标记。

### P2-4：concept-contrast 视觉增强

现状：纯 SVG text grid。

目标：`buildAxis()` 不适合，但可以加入维度的视觉分隔线、交替行背景，提升可扫描性。

---

## P3：受控引入 chart-like visual（仅当 article 语义明确时）

### 原则

- **不把 data report 的 chart 类型搬进来**。article infographic 是叙述驱动的，不是 field-encoding 驱动的。
- 只有当 article spec 的 visual data 提供结构化数值序列（已验证的 numeric array），才新增 chart 类 visual。
- 新增 chart 类 visual 必须有独立 schema、独立错误码、warning/fallback 行为。

### 候选类型

| 类型 | 触发条件 | 实现方式 | 优先级 |
|------|----------|----------|--------|
| `proportion-chart` | items 含百分比或值可求和 | 水平堆叠条或多段条（复用 shared primitive） | P3-a |
| `metric-chart` | items 含同单位数值列 | 垂直柱状图有刻度（不是搬 bar chart，而是受控 numeric bars） | P3-b |
| `funnel` | process items + 数值递减 | 梯形条排列 | P3-c |
| `quadrant-matrix` | 4 个 items + xLabel/yLabel | 升级现行 tradeoff-matrix | P3-c |

### 实现方式

新增类型不调用 `renderChartSvg()`，而是用 P0 提取的 primitives 构建：

```ts
// 沿用 P0 的 Record 派发模式，不引入动态注册表
const renderers: Record<InfographicVisualType, Renderer> = {
  ...existing,
  'proportion-chart': renderProportionChart,
  'metric-chart': renderMetricChart,
}

function renderProportionChart(data, theme) {
  // 用 numericTicks, gridLines, bar, svgTextBlock 等 primitive 构建
  // 不引入 AgentChartSpec
}
```

---

## Acceptance Criteria

### P0 验收

- [ ] `npm run test:run` + `npm run check:size` 通过
- [ ] `infographic-visuals.ts` 从 464 行降到 100 行以内（仅保留派发表）
- [ ] 每个 visual 在 `infographic-visuals/` 中有独立文件
- [ ] `article-infographic.ts` 从 491 行降到 300 行以内
- [ ] `shared-svg.ts` 包含 `numericTicks` + `gridLines` + `formatTick`，有单测
- [ ] `buildCss()` 从硬编码改为 `getTheme()` 加载
- [ ] article `--format html` 输出与现有多项 fixture 快照一致

### P1 验收

- [ ] `metric-bars` 有独立 zod schema，拒绝 `{ items: [] }`
- [ ] `timeline-path` 要求 item 有 `text`，拒绝空 items
- [ ] 非法 visual data 返回结构化 `agentError`，不抛异常、不影响其他 section
- [ ] 新增 fixture：含非法 visual 的 spec → 验证 error code
- [ ] 新增 fixture：含合法 visual 的 spec → 验证渲染正常

### P2 验收

- [ ] `kpi-strip` 字号从 26px 提升到 48px，使用 serif 字体
- [ ] `metric-bars` SVG 包含数值 X 轴刻度（至少首、中、尾三个 tick）
- [ ] `metric-bars` SVG 包含水平网格线（至少 3 条）
- [ ] `ranked-list-chart` 包含刻度标记
- [ ] 对比快照：同一 fixture 的 P2 输出视觉质量高于当前 baseline

### P3 验收

- [ ] `proportion-chart` 接受 validated numeric data，渲染堆叠条
- [ ] `metric-chart` 接受同单位数值列，渲染带刻度的柱状图
- [ ] 新增 visual 不引用 `AgentChartSpec` 类型
- [ ] 新增 visual 有独立 zod schema、独立错误码

### 快照/回归测试

```bash
# 每次 Phase 结束后运行
npm run test:run
npm run build:cli

# 手动快照检查
npm run miao-viz -- article test_data/article-sample.md --format html --output /tmp/p0.html
npm run miao-viz -- article test_data/article-sample.md --style executive --format html --output /tmp/p0-exec.html
npm run miao-viz -- article test_data/article-sample.md --style minimal --format html --output /tmp/p0-minimal.html
```

---

## 与已有规划的关系

本方案是对 `docs/article-infographic-visual-enhancement-plan.md` 的增量补充，不是替代。后者已正确划定了"共享视觉层能力而非 chart 模型"的边界（第 91 行），本方案在其框架下补充执行细节：

- 复用其 visual 类型定义、theme 映射策略、quality gate 思路
- 补充了具体的代码级重构方案（拆分文件、共享 primitives、schema 强化）
- 增加了每个 Phase 的验收标准、快照命令和 fixture 要求
- 引用了 AntV Infographic 的组件化思路作为架构参考，但采用更轻量的 Record 派发

---

## 参考来源

| 来源 | 参考内容 | 实际采用 |
|------|----------|----------|
| AntV Infographic `designs/structures/` | 组件化、structure/item 分离思路 | 受控采用 — 只用 Record 替代 switch，不做注册表 |
| AntV Infographic templates `built-in.ts` | 模板注册的扩展性模式 | 暂不采用 — miao-vision 不需要 200+ 模板 |
| 数据报告 `svg-renderer.ts` | `formatTick`、`numericTicks`、`gridLines` | 提取到 `shared-svg.ts` |
| 数据报告 `themes/` | ReportTheme + SvgTheme 体系 | infographic 统一接入 |
| 数据报告 `html-export.ts` | KPI group 布局、card shell | 受控采用 style tokens |
