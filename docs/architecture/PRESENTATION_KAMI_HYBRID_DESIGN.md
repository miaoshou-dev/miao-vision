# 数据驱动演示文稿：浏览器 PPT × Kami 视觉融合设计

**文档类型**: 技术架构设计  
**状态**: 设计阶段  
**前置文档**: `DATA_DRIVEN_PRESENTATION_DESIGN.md`  
**撰写日期**: 2026-06-23

---

## 1. 设计目标

> 浏览器里像 PPT 一样演示（键盘导航、全屏、实时数据），导出的 HTML/PDF 达到 Kami 级别的视觉质量。

**Kami 是什么**：`../Kami` 是一个打印优先的文档设计系统，核心是羊皮纸色调 + 墨蓝强调色 + Charter 衬线字体 + 大量留白。它的幻灯片输出是 `297mm × 210mm` HTML → WeasyPrint → 矢量 PDF，没有交互能力。

**核心矛盾**：

| 维度 | Kami 路线 | 浏览器 PPT 路线 |
|------|---------|---------------|
| 布局坐标系 | `mm`（物理打印尺寸） | `px`（屏幕像素 + CSS transform）|
| 幻灯片切换 | 无，`break-after: page` | 键盘 ← →，JS 控制可见性 |
| 实时数据 | 不支持 | SQL 查询 + Svelte 5 响应式 |
| 视觉质量 | ★★★★★ | 可达同等水准 |

**解决方案**：视觉质量与坐标系无关。Kami 的美感完全来自设计 token，把这套 token 移植到 px 坐标系，视觉效果无损复现。

---

## 2. 核心架构：同一份 HTML，两套 CSS 模式

```
同一个幻灯片 HTML 结构（内容不变）
              │
    ┌─────────┴─────────┐
    │                   │
present-mode          print-mode
(px + transform)      (mm + @page)
    │                   │
浏览器交互演示          window.print() → 矢量 PDF
键盘导航 · 全屏         每张幻灯片一页 · Charter 字体保留矢量
实时 SQL 数据          静态快照
```

切换机制：`<body class="present-mode">` 或 `<body class="print-mode">`。同一个 `.slide` 元素，内部 padding、字号、组件样式**完全不变**，只有外层容器的尺寸和变换方式切换。

用户交互：
- 点击"演示"→ 进入 `present-mode` 全屏
- 点击"导出 PDF"→ 切换到 `print-mode`，调用 `window.print()`，浏览器生成矢量 PDF

---

## 3. Kami 设计 Token 移植

### 3.1 色彩系统（直接照搬，与坐标系无关）

```css
:root {
  /* Kami 原始色彩 token */
  --parchment:  #f5f4ed;   /* 画布背景 */
  --ivory:      #faf9f5;   /* 代码块背景 */
  --brand:      #1B365D;   /* 墨蓝强调色 */
  --brand-tint: #EEF2F7;   /* 蓝色浅底 */
  --near-black: #141413;   /* 正文主色 */
  --dark-warm:  #3d3d3a;   /* 正文次色 */
  --olive:      #504e49;   /* 辅助文字 */
  --stone:      #6b6a64;   /* 说明文字、轴标签 */
  --border:     #e8e6dc;   /* 边线 */
  --border-soft:#e5e3d8;   /* 细边线 */
}
```

### 3.2 字体栈（系统字体，无版权问题）

```css
:root {
  --serif: Charter, Georgia, Palatino, "TsangerJinKai02", serif;
  --mono:  "JetBrains Mono", "SF Mono", Consolas, monospace;
}
```

**Charter**：macOS 系统字体，与 Kami 相同，无需 `@font-face`。  
**JetBrains Mono**：Kami 已有 `assets/fonts/JetBrainsMono.woff2`，可直接复用。  
**TsangerJinKai02**：Kami 已有 `assets/fonts/TsangerJinKai02-W04.ttf`，中文场景可引入（增加 ~3MB 体积）。

### 3.3 字号换算（1280×720 画布）

Kami 使用 `pt` 单位（1pt = 1.333px），以下为等价换算：

| 用途 | Kami 原值 | px 等价 | 说明 |
|------|---------|--------|------|
| 封面大标题 | 42pt | 56px | 封面 `h1`，weight 500 |
| 内容页标题 | 38pt | 50px | `.slide-title`，letter-spacing -0.6px |
| 副标题/claim | 17pt | 22px | 引导句，`--dark-warm` 色 |
| 正文列表 | 12.5pt | 16px | 要点文字，`line-height: 1.5` |
| 眉题 eyebrow | 9pt | 12px | mono 全大写，letter-spacing 3px |
| 指标数值 | 32pt | 42px | 大数字，`--brand` 色 |
| 指标标签 | 10pt | 13px | 数值下方小标签，`--olive` 色 |
| 内边距（水平） | 22mm | 80px | 幻灯片左右 padding |
| 内边距（垂直） | 18mm | 64px | 幻灯片上下 padding |

### 3.4 克制原则（来自 Kami 反模式文档）

```
✅ 大量留白，内容不塞满
✅ 单一强调色（只用 --brand 蓝）
✅ 无阴影（box-shadow: none）
✅ 无渐变（background: 纯色）
✅ 边线用 0.5px 细线，不用色块分隔
✅ 每张幻灯片一个核心信息，不混合多种 evidence

❌ 不在正文使用多种颜色
❌ 不使用圆角超过 4px 的卡片
❌ 不堆砌图标装饰
❌ 不使用全蓝背景页（Kami 的 section divider 反模式）
```

---

## 4. Kami UI 组件移植到幻灯片

### 4.1 Eyebrow（章节眉题）

```
视觉效果: 01 · AGENT LOOP
样式: JetBrains Mono · 12px · 石灰色 · letter-spacing 3px · 全大写
位置: 每张内容幻灯片左上角，标题行上方
```

### 4.2 Metrics（大数据指标）

```
视觉效果:
  ┌─────────┐ ┌─────────┐ ┌─────────┐
  │  $1.2M  │ │  3,847  │ │  90.6%  │
  │ Revenue │ │ Orders  │ │  Rate   │
  └─────────┘ └─────────┘ └─────────┘

样式: 42px serif 墨蓝数字 + 13px olive 标签
分隔: 上方 0.3pt dotted --border 细线
```

**取代现有 bigvalue 组件**：Kami 的 metrics 比 bigvalue 更克制，更适合幻灯片密度。

### 4.3 Callout（关键结论引用）

```
视觉效果:
  │ 实时查询让业务用户在演示时当场
  │ 回答 "华东区单独看是多少" 的问题。

样式: 透明背景 + 左侧 2px 墨蓝竖线 + 16px serif olive 文字
用途: 每张幻灯片底部锚定结论，等同 Kami 的 .co callout
```

### 4.4 Code Card（SQL 展示）

```
视觉效果:
  ┌──────────────────────────────────┐
  │ SELECT region, SUM(amount)       │
  │   FROM sales_2024                │
  │  GROUP BY region                 │
  │  ORDER BY 2 DESC                 │
  └──────────────────────────────────┘

样式: --ivory 背景 + 1px --border 边框 + 4px 圆角 + mono 10px
用途: 展示驱动图表的 SQL 查询（可选显示/隐藏）
```

---

## 5. SVG 图表融合 Kami 配色

新增 `kami` SvgTheme 配置，使图表在羊皮纸背景上天然融入：

```typescript
// 新增主题配置（非代码修改，仅设计说明）
kamiSvgTheme = {
  background:  '#f5f4ed',   // 与幻灯片画布同色，图表无突兀边界
  axisColor:   '#e8e6dc',   // 暖灰轴线，与 Kami border 一致
  labelColor:  '#6b6a64',   // stone 标签，克制不抢眼
  palette: [
    '#1B365D',   // 墨蓝 —— 主数据系列
    '#2D5A8A',   // 浅墨蓝 —— 第二系列
    '#504e49',   // olive —— 第三系列
    '#6b6a64',   // stone —— 第四系列
    '#8B7355',   // 暖棕 —— 第五系列
  ]
}
```

**效果**：图表放在羊皮纸幻灯片上，轴线用暖灰，标签用 stone，主数据用墨蓝 —— 与 Kami 手写 SVG 示意图视觉上无法区分。

---

## 6. 双模式 CSS 结构设计

### 6.1 present-mode（浏览器交互演示）

```css
body.present-mode {
  background: #1a1a1a;   /* 演示时黑色背景衬托幻灯片 */
  margin: 0;
  overflow: hidden;
}

body.present-mode .slide-viewport {
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

body.present-mode .slide-canvas {
  width: 1280px;
  height: 720px;
  transform-origin: center center;
  transform: scale(var(--slide-scale));  /* JS 动态计算 */
  position: relative;
}

body.present-mode .slide {
  width: 1280px;
  height: 720px;
  position: absolute;
  top: 0; left: 0;
  visibility: hidden;
  transition: opacity 0.25s ease;
}

body.present-mode .slide.active {
  visibility: visible;
}
```

**缩放计算**（JS，约 3 行）：
```
scale = min(window.innerWidth / 1280, window.innerHeight / 720)
```

### 6.2 print-mode（PDF 导出）

```css
@media print {
  body { background: var(--parchment); }

  .slide-viewport, .slide-canvas {
    transform: none;
    width: auto;
    height: auto;
  }

  .slide {
    width: 297mm;
    height: 210mm;           /* A4 横向，与 Kami 一致 */
    break-after: page;
    position: relative;
    visibility: visible !important;
  }

  .presenter-controls,
  .slide-navigation { display: none; }
}

@page {
  size: A4 landscape;
  margin: 0;
  background: #f5f4ed;
}
```

**关键点**：`.slide` 内部所有字号、padding、组件样式在两种模式下完全相同，只有外层容器的尺寸和 transform 切换。因为 px 值在打印时会被浏览器按 `96dpi` 换算为物理尺寸，1280px ÷ 96 × 25.4 ≈ 338mm，比 A4 宽，所以 print-mode 改为 mm 值覆盖。这是唯一需要两套值的地方。

---

## 7. 幻灯片布局模板（对照 Kami）

| 布局名称 | Kami 对应结构 | 内容组成 |
|---------|-------------|---------|
| `cover` | `.slide.cover` (grid 1:1) | 左：标题 + 副标题 + 元信息；右：装饰 SVG |
| `title-only` | 单列居中 | 大标题 + eyebrow，章节过渡页 |
| `text-points` | `.body-single` | eyebrow + 标题 + claim + 要点列表 + callout |
| `text-chart` | `.body-grid` (1:1) | 左：文字要点；右：SVG 图表 |
| `metrics-chart` | 自定义 | 上：metrics 指标行；下：折线/柱状图 |
| `chart-full` | 全宽图表 | eyebrow + 标题 + 全宽 SVG 图表 |
| `table-full` | 全宽表格 | eyebrow + 标题 + datatable |
| `ending` | `.slide.ending` | 居中大字 + 分隔线 + 副标题 |

每种布局在 `present-mode` 和 `print-mode` 下渲染完全一致，只有外层画布尺寸不同。

---

## 8. 需要新建的模块

| 模块 | 位置 | 内容 | 估算行数 |
|------|------|------|---------|
| Kami 主题 CSS | `src/plugins/presentation/themes/kami.css` | 完整设计 token + 双模式切换规则 | ~250 行 |
| Kami 幻灯片组件 CSS | `src/plugins/presentation/themes/kami-components.css` | eyebrow、metrics、callout、code-card | ~180 行 |
| Kami SVG 主题 | `src/agent/themes/kami-theme.ts` | 新增 SvgTheme 配色配置 | ~30 行 |
| SlideViewer.svelte | `src/plugins/presentation/SlideViewer.svelte` | CSS transform 缩放 + 键盘导航 + 模式切换 | ~180 行 |
| 幻灯片布局组件 | `src/plugins/presentation/layouts/` | 8 种布局 Svelte 组件 | ~400 行 |
| 模式切换逻辑 | SlideViewer 内部 | present ↔ print class 切换 + window.print() | ~30 行 |

**合计约 1070 行**，其中 CSS 占 ~430 行，Svelte 组件占 ~640 行。

---

## 9. 与 Kami 原版对比

| 维度 | Kami 原版 | miao-vision 实现 |
|------|---------|---------------|
| 颜色 | `#f5f4ed` parchment | ✅ 完全一致 |
| 字体 | Charter + JetBrains Mono | ✅ 完全一致 |
| 眉题样式 | mono 全大写 letter-spacing 3px | ✅ 完全一致 |
| 指标展示 | 大 serif 数字 + olive 标签 | ✅ 移植，替代 bigvalue |
| Callout | 透明 + 2px 左蓝线 | ✅ 完全一致 |
| 数据内容 | 静态写死 | ✅ 实时 SQL 查询（差异化优势）|
| 交互演示 | 无，仅 PDF | ✅ 键盘导航 + 全屏 + 参数切换 |
| PDF 导出 | WeasyPrint（精准）| △ `window.print()`（可用，中文略逊）|
| 中文字体 | TsangerJinKai02 内嵌 | △ 可选内嵌（+3MB）|

---

## 10. 唯一的实际取舍

**中文 PDF 字体质量**：Kami 用 WeasyPrint 做字体子集化，TsangerJinKai02 的笔画权重控制精准。浏览器 `window.print()` 无法做字体子集化，中文字体体积大（ttf 约 3MB），且不同操作系统的中文字体渲染有差异。

**应对策略**：
- 英文报告：无问题，Charter 是系统字体，`window.print()` 渲染质量与 WeasyPrint 相当
- 中文报告：将 TsangerJinKai02 woff2 子集（只保留常用 3500 字）打包进 HTML，约 600KB，可接受
- 高质量中文 PDF（如正式对外汇报）：提示用户用 Chrome "另存为 PDF"而非系统打印对话框，Chrome 的 PDF 引擎对中文字体处理好于系统打印

---

*最后更新: 2026-06-23*
