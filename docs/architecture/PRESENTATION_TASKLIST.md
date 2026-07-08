# Presentation Feature: Implementation Task List

**关联设计文档**: `PRESENTATION_KAMI_HYBRID_DESIGN.md`  
**撰写日期**: 2026-06-23

**当前状态**: 基础 `miao-viz deck` 链路已完成，后续 hardening 已补齐 DeckSpec 结构化错误、profile 字段校验、product/finance/ops 示例和浏览器演示 smoke。PPTX native export 仍作为 HTML deck 稳定后的后续工作。

---

## 现有代码复用清单

在写任何新代码之前，确认以下现有函数可以直接复用：

| 现有代码 | 文件 | 复用方式 |
|---------|------|---------|
| `renderChartSvg(chart, rows, svgTheme)` | `svg-renderer.ts` | 幻灯片内图表渲染，原样调用 |
| `prepareChartData(rows, chart)` | `data-transform.ts` | 已被 `renderChartSvg` 内部调用，无需显式调用 |
| `escapeHtml(value)` | `svg-renderer.ts` | 所有文字内容 HTML 转义 |
| `getTheme('editorial').svg` | `themes/index.ts` | 获取羊皮纸配色 SVG 主题，传给 `renderChartSvg` |
| `AgentChartSpec` | `types.ts` | DeckSpec 的 chart 字段直接用此类型 |
| `AgentDataTransform` | `types.ts` | SlideSpec 的数据变换与 report 完全相同 |
| `loadDataset()` | `data-loader.ts` | CLI `deck` 命令加载数据，与 `render` 命令相同 |
| `ThemeName` | `themes/types.ts` | DeckSpec.theme 字段复用此联合类型 |

---

## Phase 1：类型定义

> 完成后：TypeScript 编译器能验证 DeckSpec 结构，IDE 有完整自动补全。

### T1 — 新建 `src/agent/deck-types.ts`

定义以下类型，全部与现有 `types.ts` 保持一致的命名风格：

```
SlideLayout   联合类型，8 种布局名称：
              'cover' | 'title-only' | 'text-points' |
              'text-chart' | 'metrics-chart' | 'chart-full' |
              'table-full' | 'ending'

SlideMetric   单个指标数据块：
              { value: string | number; label: string; format?: string;
                data?: { transform?: AgentDataTransform[] } }

SlideSpec     单张幻灯片：
              { layout: SlideLayout; eyebrow?: string; title?: string;
                claim?: string; bullets?: string[]; callout?: string;
                annotation?: string;
                metrics?: SlideMetric[];
                charts?: AgentChartSpec[] }        ← 直接复用 AgentChartSpec

DeckSpec      演示文稿根节点：
              { title?: string; description?: string;
                theme?: ThemeName;                 ← 直接复用 ThemeName
                slides: SlideSpec[] }
```

导入来源：`AgentChartSpec`、`AgentDataTransform` 来自 `./types`，`ThemeName` 来自 `./themes/types`。

估算：~80 行

---

## Phase 2：Schema 验证

> 完成后：`miao-viz deck --spec` 可以校验 YAML 并返回结构化错误，与 `validate` 命令体验一致。

### T2 — 新建 `src/agent/deck-schema.ts`

参照 `spec-schema.ts` 的写法：

- `slideMetricSchema`：验证单个 `SlideMetric`
- `slideSpecSchema`：验证单张幻灯片，`charts` 字段直接复用 `chartSpecSchema`
- `deckSpecSchema`：验证完整 `DeckSpec`，`slides` 至少 1 张
- 错误信息风格与现有保持一致（字段名明确，无技术术语）

导入：`chartSpecSchema` 来自 `./spec-schema`（不重复定义 chart 校验规则）。

估算：~65 线

---

## Phase 3：幻灯片渲染器

> 完成后：给定 `DeckSpec` + 行数据，输出一个可在浏览器打开的独立 HTML 文件，支持键盘翻页和打印导出。

### T3 — 新建 `src/agent/deck-renderer.ts`

**职责**：主入口 + CSS 常量 + 交互 JS。

**`SLIDE_CSS` 常量**（内嵌于输出 HTML）：

```
颜色 token（与 editorial 主题保持一致）：
  --mv-paper: #f5f4ed
  --mv-brand: #1b365d
  --mv-ink:   #141413
  --mv-muted: #6b6a64
  --mv-soft:  #504e49
  --mv-border: #e5e3d8
  --mv-surface: #faf9f5
  字体：Charter / Georgia / serif 正文，"SF Mono" / Consolas 等宽

present-mode（body.present-mode）：
  黑色页面背景；.slide-viewport 100vw/100vh 居中；
  .slide-canvas 固定 1280×720px；
  transform: scale(var(--slide-scale)) 居中缩放；
  .slide 绝对定位叠放，仅 .slide.active 可见，opacity 0.2s 渐变

print-mode（@media print）：
  .slide-canvas transform:none；
  .slide 297mm×210mm，break-after:page，全部 visibility:visible；
  @page { size: A4 landscape; margin: 0 }
  .slide-nav 隐藏

字号（1280×720 画布）：
  封面标题 56px weight:500 letter-spacing:-1px
  内容标题 50px weight:500 letter-spacing:-0.6px
  claim/副标题 22px
  正文列表   16px line-height:1.5
  眉题 eyebrow 11px mono 全大写 letter-spacing:3px
  指标数值   42px --mv-brand 色
  指标标签   13px --mv-soft 色
  Callout   15px serif --mv-soft 色 + 左侧 2px --mv-brand 竖线
  内边距     水平 80px / 垂直 64px
```

**`SLIDE_JS` 常量**（内嵌于输出 HTML，约 40 行 vanilla JS）：

```
初始化：计算 scale = min(vw/1280, vh/720)，设置 CSS var
resize：重新计算 scale
键盘：ArrowLeft → 上一张，ArrowRight/Space → 下一张
      f → requestFullscreen，Escape → exitFullscreen
翻页：移除当前 .active，添加到目标 .slide，更新页码显示
```

**`renderDeckHtml(spec, rows, themeOverride?)` 主函数**：

```
1. theme = getTheme(themeOverride ?? spec.theme ?? 'editorial')
2. 对每张 SlideSpec 调用对应 layout 函数（从 deck-layouts.ts 导入）
3. 拼接完整 HTML：
   <!doctype html> ... <style>SLIDE_CSS</style>
   <body class="present-mode">
     <div class="slide-viewport">
       <div class="slide-canvas">
         {slides HTML}
       </div>
     </div>
     <nav class="slide-nav">← 1/N → [⛶] [⎙]</nav>
   </body>
   <script>SLIDE_JS</script>
   <script type="application/json" id="miao-viz-deck">{spec JSON}</script>
```

注意：`slide-nav` 控制栏包含 上一张/下一张/页码/全屏/打印 按钮，print-mode 下隐藏。

估算：~190 行（CSS 常量占大头，逻辑约 60 行）

---

### T4 — 新建 `src/agent/deck-layouts.ts`

**职责**：8 种 layout 的 HTML 生成函数 + 共用 UI 原语。

**共用 UI 原语函数**（被多个 layout 调用）：

```typescript
renderEyebrow(text: string): string
// <div class="slide-eyebrow">01 · SALES REVIEW</div>
// mono 全大写，stone 色，letter-spacing 3px

renderSlideTitle(text: string): string
// <h2 class="slide-title">...</h2>

renderClaim(text: string): string
// <p class="slide-claim">...</p>
// 22px serif --mv-soft，引导句

renderBullets(items: string[]): string
// <ul class="slide-pts"><li>...</li></ul>
// 计数器自动编号，--mv-brand 色数字前缀

renderCallout(text: string): string
// <div class="slide-callout">...</div>
// 透明背景 + 2px 左蓝竖线，底部锚定

renderMetricsRow(metrics: SlideMetric[], rows: Record<string,unknown>[]): string
// <div class="slide-metrics">
//   <div class="slide-metric"><div class="v">$1.2M</div><div class="l">Revenue</div></div>
//   ...
// </div>
// 指标数值从 metric.data.transform 执行后取第一行，或直接用 metric.value
// 上方 dotted 细线分隔
```

**8 种 layout 函数**（每个约 20-30 行）：

```typescript
renderCoverSlide(slide, rows, svgTheme)
// CSS grid 1:1，左：mark + h1(56px) + sub + 分隔线 + meta
// 右：装饰性 SVG（固定几何图形，品牌色同心圆/网格，无需数据）
// 页码 + footer mark

renderTitleOnlySlide(slide, rows, svgTheme)
// 居中对齐，eyebrow + 大标题，章节过渡用

renderTextPointsSlide(slide, rows, svgTheme)
// eyebrow + 标题 + claim + bullets + callout（底部）

renderTextChartSlide(slide, rows, svgTheme)
// CSS grid 1:1
// 左：eyebrow + 标题 + annotation + bullets
// 右：renderChartSvg(charts[0], rows, svgTheme)

renderMetricsChartSlide(slide, rows, svgTheme)
// 上 1/3：renderMetricsRow()
// 下 2/3：renderChartSvg(charts[0], rows, svgTheme)
// eyebrow + 标题在顶部

renderChartFullSlide(slide, rows, svgTheme)
// eyebrow + 标题 + 全宽 renderChartSvg(charts[0], rows, svgTheme)

renderTableFullSlide(slide, rows, svgTheme)
// eyebrow + 标题 + renderChartSvg({type:'table',...}, rows, svgTheme)

renderEndingSlide(slide, rows, svgTheme)
// 居中：大标题(52px) + 60px 横线(--mv-brand) + 副标题
```

所有函数签名：`(slide: SlideSpec, rows: Record<string, unknown>[], svgTheme: SvgTheme): string`

每个函数末尾包裹 `.slide` 外层 div 和页码/footer。

估算：~230 行

---

## Phase 4：CLI 命令

> 完成后：`miao-viz deck` 端到端可用，与现有 `render` 命令体验一致。

### T5 — 修改 `src/agent/cli.ts`，新增 `deck` 命令分支

在现有 `if (args.command === 'render')` 块后面添加：

```typescript
if (args.command === 'deck') {
  printJson(runDeck(args))
  return
}
```

`runDeck(args)` 函数逻辑（约 35 行，参照 `runRender`）：
```
1. 读取 --input（必填）
2. 读取 --spec（必填）
3. 读取 --output（必填）
4. 读取 --theme（可选，默认 'editorial'）
5. loadDataset(input)
6. YAML.parse(spec 文件内容)
7. deckSpecSchema.parse(rawSpec)
8. renderDeckHtml(deckSpec, dataset.rows, theme)
9. mkdirSync(dirname(output), { recursive: true })
10. writeFileSync(output, html)
11. return { ok: true, value: { output, slides: deckSpec.slides.length } }
```

错误处理与 `runRender` 完全相同：`isAgentError` 检查 + `fail()` 返回。

`cli.ts` 修改后总行数预计 ~265 行，不超过 500 行限制。

---

## Phase 5：示例与测试

### T6 — 新建 `packages/miao-viz-cli/examples/sales-deck.yaml`

使用现有 `examples/sales.csv` 数据，包含 6 张幻灯片：

```yaml
title: Sales Review Q4
theme: editorial
slides:
  - layout: cover
    title: "Q4 Sales Review"
    claim: "Regional performance and trend analysis"
    
  - layout: metrics-chart
    eyebrow: "01 · KEY METRICS"
    title: "Quarter at a Glance"
    metrics:
      - label: Total Revenue
        data: { transform: [{ type: aggregate, measures: [{field: sales, op: sum, as: v}] }] }
        format: "$,.0f"
      - label: Total Orders
        data: { transform: [{ type: aggregate, measures: [{field: orders, op: sum, as: v}] }] }
    charts:
      - type: line
        title: Monthly Trend
        data:
          transform:
            - type: derive-month
              field: date
              as: month
            - type: aggregate
              groupBy: [month]
              measures: [{field: sales, op: sum, as: total}]
            - type: sort
              field: month
              order: asc
        encoding:
          x: { field: month }
          y: { field: total }

  - layout: text-chart
    eyebrow: "02 · REGIONAL"
    title: "Sales by Region"
    annotation: "East region leads with consistent growth through Q4."
    bullets:
      - "East: strongest absolute growth"
      - "West: highest order volume"
    charts:
      - type: bar
        data:
          transform:
            - type: aggregate
              groupBy: [region]
              measures: [{field: sales, op: sum, as: total}]
            - type: sort
              field: total
              order: desc
        encoding:
          x: { field: region }
          y: { field: total }

  - layout: chart-full
    eyebrow: "03 · DISTRIBUTION"
    title: "Order Value Distribution"
    charts:
      - type: histogram
        encoding:
          x: { field: sales }

  - layout: table-full
    eyebrow: "04 · DETAIL"
    title: "Top Transactions"
    charts:
      - type: table
        data:
          transform:
            - type: sort
              field: sales
              order: desc
            - type: limit
              value: 15

  - layout: ending
    title: "Thank you"
    claim: "Data as of Q4 2024 · miao-vision"
```

### T7 — 新建 `src/agent/deck.test.ts`（或扩展 `agent.test.ts`）

最小测试集（参照现有 `agent.test.ts` 的测试风格）：

```
- deckSpecSchema 接受合法 DeckSpec
- deckSpecSchema 拒绝缺少 slides 的 spec（返回 ZodError）
- renderDeckHtml 输出包含正确数量的 .slide 元素
- renderDeckHtml 输出包含 .slide-nav
- renderDeckHtml 输出包含 @media print
- renderDeckHtml 输出包含 present-mode CSS
- cover layout 输出包含 .slide-cover
- ending layout 输出居中 class
- 使用 sales.csv 数据跑 metrics-chart layout 不抛出异常
```

---

## Phase 6：Skill 文档更新

> 完成后：Agent 知道 deck 命令的存在和用法。

### T8 — 修改 `skills/miao-vision/SKILL.md`

在现有 `render` 工作流后面新增 `deck` 章节：

```markdown
## Deck Workflow (Presentation)

Use `deck` to turn data into a browser-presentable slide deck:

1. Run `miao-viz profile <file>` (same as report workflow)
2. Create a `deck.yaml` with `slides` array — see `references/deckspec.md`
3. Render:

miao-viz deck \
  --input /path/to/data.csv \
  --spec /tmp/miao-vision/deck.yaml \
  --output /tmp/miao-vision/deck.html

4. Open the HTML in a browser. Use ← → to navigate, F for fullscreen, ⎙ to print/export PDF.

Default theme is `editorial`. Supported themes: editorial, dark, minimal, default.
```

### T9 — 新建 `skills/miao-vision/references/deckspec.md`

内容结构：
- DeckSpec 根字段说明
- 8 种 `layout` 的用途、适用场景、可用字段
- `metrics` 字段用法（含 transform 示例）
- 与 VizSpec 的关系（charts/encoding 字段完全相同）
- 完整示例（与 `sales-deck.yaml` 对应）

---

## 文件变更汇总

| 操作 | 文件 | 估算行数 |
|------|------|---------|
| 新建 | `src/agent/deck-types.ts` | ~80 |
| 新建 | `src/agent/deck-schema.ts` | ~65 |
| 新建 | `src/agent/deck-renderer.ts` | ~190 |
| 新建 | `src/agent/deck-layouts.ts` | ~230 |
| 修改 | `src/agent/cli.ts` | +40（265 总） |
| 新建 | `packages/miao-viz-cli/examples/sales-deck.yaml` | ~60 |
| 新建 | `src/agent/deck.test.ts` | ~70 |
| 修改 | `skills/miao-vision/SKILL.md` | +30 |
| 新建 | `skills/miao-vision/references/deckspec.md` | 文档 |

**新增代码约 715 行**，全部 TypeScript，无 Svelte，无新依赖。

---

## 任务依赖顺序

```
T1（deck-types）
  └─ T2（deck-schema，依赖 T1 + chartSpecSchema）
  └─ T4（deck-layouts，依赖 T1 + renderChartSvg）
       └─ T3（deck-renderer，依赖 T4 + getTheme）
            └─ T5（cli.ts，依赖 T2 + T3）
                 └─ T6（示例 YAML，依赖 T5 可用）
                 └─ T7（测试，依赖 T3 + T4）
T8、T9（文档，最后写）
```

---

## 验收标准

```bash
# 构建不报错
npm run build:cli

# 类型检查通过
npm run check

# 测试通过
npm run test

# smoke test：输出包含 6 张幻灯片的 HTML 文件
node packages/miao-viz-cli/dist/cli.cjs deck \
  --input packages/miao-viz-cli/examples/sales.csv \
  --spec packages/miao-viz-cli/examples/sales-deck.yaml \
  --output /tmp/miao-deck.html

# 浏览器验收（手动）
open /tmp/miao-deck.html
# ← → 键翻页正常
# F 键全屏正常
# 浏览器打印 → 每张幻灯片独占一页，A4 横向
# 视觉效果：羊皮纸背景，墨蓝色标题，Charter 衬线字体
```

---

*最后更新: 2026-06-23*
