# Miao Viz 产品重构方向

> 日期：2026-06-23
> 背景：Miao Vision 产品路线从完整本地 BI 平台，调整为围绕 `miao-viz-cli` 的 AI-first 数据可视化生成器。

## 一、核心判断

Miao Vision 之前的路线更接近本地 BI 平台：SQL Workspace、Markdown BI Report、DuckDB-WASM、OPFS、连接器、交互式 dashboard、插件系统等能力都在向一个完整分析工作台演进。

新的产品方向应收敛为：

> Miao Viz 是一个 AI-native local data visualization generator。用户给 AI 一个本地数据文件，AI 通过 CLI 理解数据、选择图表、生成规范，最终输出漂亮、可分享的 HTML/SVG/PDF/PNG 报告。

更最终的产品形态不是让用户直接操作 Web App，而是让 Agent 通过 Miao Vision skill 调用 `miao-viz-cli`：

> 用户给 Agent 一篇文章 URL 或 Markdown 文件，Agent 读取/清洗内容，调用 `miao-viz article`，生成一份高级静态 infographic artifact。

同时，数据展示本身要成为清晰的产品路线：用户给 Agent 一个本地数据文件，Agent 通过 `profile/catalog/validate/render` 生成图表、KPI、表格、注释和洞察组成的静态数据展示 artifact。

新路线的胜负点不是“功能多”，而是：

- AI 更容易理解和调用
- 用户更容易得到好看的结果
- 图表足够丰富
- 视觉风格更高级
- 输出物可分享、可归档、可离线查看

## 二、新产品主线

推荐主流程分为三条。

### A. Data Display / Data-to-Report 主流程

```text
local data file
  -> miao-viz profile
  -> miao-viz catalog
  -> AI generates VizSpec
  -> miao-viz validate
  -> miao-viz render
  -> data display artifact / polished report
```

对应用户心智：

1. 用户有一个 CSV、TSV、XLSX 或 JSON 文件。
2. AI 调用 `miao-viz profile` 理解字段、类型、缺失、异常、时间粒度和推荐分析方向。
3. AI 调用 `miao-viz catalog` 了解可用图表、字段要求和适用场景。
4. AI 生成简洁的 YAML/JSON VizSpec。
5. CLI 验证 spec，返回结构化错误和修复建议。
6. CLI 输出由 KPI、图表、表格、注释、洞察组成的自包含 HTML/SVG，后续扩展 PNG/PDF。

这条路线不是恢复 dashboard builder，而是把数据展示产品化为静态 artifact：

- 单图 chart artifact
- 多图 report artifact
- KPI + insight summary
- table + annotation artifact
- 轻量可分享 HTML 页面

### B. Article-to-Infographic 主流程

```text
article URL / markdown file
  -> Agent fetches or reads article
  -> Agent normalizes article to local markdown/text
  -> miao-viz article
  -> infographic plan / markdown / UI spec
  -> static HTML / PNG / PDF artifact
```

对应用户心智：

1. 用户给 Agent 一个 URL 或 `.md` 文件，并提出“转成信息图报告”的要求。
2. Skill 指导 Agent 抓取 URL 正文或读取 Markdown，清洗为本地文本文件。
3. Agent 调用 `miao-viz article --input article.md --style editorial --format html --output infographic.html`。
4. CLI 复用 Article-to-Infographic pipeline 生成 infographic plan、markdown 或 UI spec。
5. CLI 输出可分享 artifact，Agent 把路径或文件交还给用户。

URL 抓取不应是 CLI 第一优先级。短期由 Agent/Skill 负责 URL 读取、正文抽取和 markdown 归一化；CLI 保持本地文件输入，稳定、可测试、可离线。

### C. Data-to-Presentation 主流程

```text
local data file
  -> miao-viz profile
  -> AI generates DeckSpec
  -> miao-viz deck
  -> browser-presentable slide deck
```

对应用户心智：

1. 用户有一个数据文件，需要“演示/PPT/汇报/给老板看”。
2. AI 调用 `miao-viz profile` 理解数据。
3. AI 生成 DeckSpec，组织 opening claim、metrics、supporting chart 和 closing recommendation。
4. CLI 输出可在浏览器中播放、打印为 PDF 的演示文稿。

## 三、应该保留并强化的能力

### 1. `miao-viz-cli`

`packages/miao-viz-cli` 和 `src/agent` 应成为产品主干。

当前已有的 `profile`、`catalog`、`validate`、`render` 很适合 Agent workflow，也适合用户“一条命令得到报告”的体验。

后续重点：

- 增强 `profile` 的数据语义理解
- 扩展 `catalog` 的 AI 选图提示
- 完善 `validate` 的错误解释和修复建议
- 补齐 `render` 的图表实现和输出格式
- 增加 `article` 命令，把文章 URL/Markdown 工作流接入 infographic pipeline

建议命令：

```bash
miao-viz article ./article.md \
  --style editorial \
  --format html \
  --output ./infographic.html
```

推荐输出格式优先级：

1. `markdown`：最快复用现有 generator，适合 Agent 二次编辑。
2. `json`：输出 infographic plan/debug，适合自动化检查。
3. `uispec`：输出结构化 UI tree，适合 Web preview 或后续 renderer。
4. `html`：用户最终默认 artifact。
5. `png/pdf`：后续通过浏览器或专门 renderer 生成。

### 2. 轻量 VizSpec

YAML/JSON spec 比 Markdown 组件语法更适合 AI 生成和校验。

VizSpec 应保持短、显式、可验证：

```yaml
title: Sales Report
theme: editorial
charts:
  - id: sales_by_region
    type: bar
    title: Sales by Region
    encoding:
      x: { field: region }
      y: { field: total_sales }
```

后续不应把 VizSpec 发展成复杂 BI DSL，而应通过 preset、默认值和 catalog hints 降低 AI 输出成本。

### 3. 高质量静态视觉输出

主题系统应成为产品差异化。

重点不是普通 dashboard 样式，而是高级报告感：

- editorial
- dark
- minimal
- magazine
- finance
- academic
- executive
- poster

输出的 HTML 应自包含、离线可打开、视觉上接近专业报告或数据新闻，而不是普通 SaaS 卡片堆叠。

### 4. 丰富图表资产

`src/plugins/data-display` 中已有大量图表资产，可以作为能力储备。

数据展示是新产品路线之一，因此这些资产不应只被视为旧 Web 插件遗产。处理方向是保留视觉和数据表达能力，舍弃 dashboard builder 状态模型，逐步迁移成 CLI/Agent 可理解、可静态渲染、可验证的 chart catalog。

数据展示路线的产品形态：

- `miao-viz catalog` 能清楚告诉 Agent 什么时候用哪个图表。
- `miao-viz render` 能把 VizSpec 渲染为 polished data display artifact。
- 图表组件服务静态报告、信息图和 deck，不再服务 SQL Workspace 结果面板。
- 每个图表都应有字段要求、适用场景、示例 spec、默认注释策略和主题适配。

优先图表：

- KPI / BigValue
- bar
- line
- area
- pie / donut
- scatter
- histogram
- heatmap
- table
- treemap
- funnel
- waterfall
- sankey
- radar
- calendar heatmap

## 四、建议舍弃或降级的旧能力

### 1. 舍弃完整 SQL Workspace 作为主产品

SQL Workspace、Monaco、多 Tab、查询历史、结果面板、SQL snippets 等能力属于 BI 工作台路线。

新路线下，它们会带来三个问题：

- 用户学习成本高
- 产品定位变模糊
- 维护成本挤占 CLI 和视觉输出能力

建议降级为内部调试工具，不进入主产品叙事。

### 2. 舍弃浏览器 DuckDB/OPFS 作为核心卖点

DuckDB-WASM 和 OPFS 是旧路线的技术亮点，但对 `miao-viz-cli` 用户来说不是直接价值。

新卖点应从“浏览器本地数据库”转为：

> 本地文件进，精美可视化报告出。

数据处理可以先使用轻量 JS profiling 和 transform。复杂 SQL 能力不应成为产品主线依赖。

### 3. 舍弃多数据源连接器路线

MotherDuck、MySQL、PostgreSQL、REST、HTTP 等连接器会把产品重新拉回传统 BI。

新阶段建议只聚焦：

- CSV
- TSV
- XLSX
- JSON

数据库连接可以作为远期 advanced/pro 能力，不作为近期路线重点。

### 4. 舍弃 Markdown BI Report 工作台

Markdown 编辑器、实时预览、多页报告、版本历史、MVR 导入导出等能力对新用户和 AI 都偏重。

Markdown 报告系统的核心问题是：用户要同时理解 SQL、Markdown、组件语法和数据绑定。

新路线应改为：

- AI 生成 VizSpec
- CLI 渲染报告
- 可选轻量 spec editor / preview

### 5. 舍弃通用输入组件和完整 dashboard 交互系统

`inputs`、Tabs、Modal、CrossFilter、Drilldown 等能力不能全部按旧插件体系保留。

新路线可以保留一小部分交互概念，但不应保留完整 Web dashboard builder。

### 6. 舍弃 Streaming / GNode / Weather 等实验页

这些实验功能会让用户无法判断产品到底是 BI、实时看板、信息图工具还是可视化实验平台。

建议从主导航和主路线图中移除。

### 7. 舍弃 Mosaic/vgplot 分支

Mosaic/vgplot 与“自包含、可控、AI 友好、静态输出”的方向不一致。

新图表引擎应统一到自有 SVG renderer 和 chart catalog。

### 8. 迁移 Article-to-Infographic 到 Skill + CLI 主线

文章转信息图有模板和视觉价值，但不应作为一个独立 Web 产品分散定位。

建议迁移为：

```text
Miao Vision skill
  -> Agent reads URL / Markdown
  -> miao-viz article
  -> infographic artifact
```

保留原则：

- 保留 `src/core/ai/agents/infographic/*` 的三阶段 pipeline。
- 保留 `src/core/ai/infographic/*` 中可作为 fallback 的文章分析/报告生成逻辑。
- 保留 sample articles、demo templates、style variants 作为 CLI examples/fixtures。
- 抽离 `use-article-processor.svelte.ts` 中的非 UI 逻辑到 `src/agent/article-infographic.ts`。
- Web `ArticleToInfographicDemo` 只作为 preview/debug UI，后续也调用同一个 agent adapter。
- 不把 `ArticleInput`、`ReportOutput`、`StyleSelector` 等 Svelte UI 搬进 CLI。
- 不在 CLI 首版内承担复杂 URL 抓取，URL 由 Agent/Skill 处理。

## 五、静态报告是否支持交互

结论：可以支持，但必须控制边界。

推荐定义为：

> Interactive Static Report：单文件 HTML 报告，打开即用，无后端，可筛选、可展开、可高亮、可导出。

这不是 dashboard builder，也不是完整 BI runtime。

### 可以支持的轻量交互

1. Tooltip
2. Legend toggle
3. 简单本地筛选
4. 时间范围筛选
5. Top N 切换
6. 指标切换
7. 点击图表元素过滤其他图表
8. 点击柱子、点、表格行查看 detail panel
9. 简单 drilldown

实现方式：

- HTML 内嵌原始数据或聚合后的数据 JSON
- HTML 内嵌轻量 JS runtime
- JS 在浏览器端做过滤、聚合、重绘或 DOM 切换
- 不请求后端
- 不依赖 DuckDB-WASM
- 不引入完整 Svelte app runtime

### 不建议短期支持的交互

- 任意 SQL 查询
- 多表 join 后实时重算
- 保存用户筛选状态
- 登录、权限、协作分享
- 类似 Tableau/Superset 的 dashboard 编辑器
- 复杂 CrossFilter 网络
- 通用 Modal/Tabs/Input 插件系统

这些能力会把产品重新拉回旧 BI 平台。

## 六、交互能力的 Spec 设计

交互 spec 应短、显式、可验证，避免让 AI 生成复杂关系图。

推荐简单形式：

```yaml
charts:
  - id: sales_by_region
    type: bar
    title: Sales by Region
    interaction:
      tooltip: true
      select: filter
```

对于 drilldown，优先使用 preset：

```yaml
charts:
  - id: sales_by_region
    type: bar
    drilldownPreset: category-detail
```

而不是让 AI 每次生成完整复杂配置。

必要时可扩展为：

```yaml
interactions:
  filters:
    - id: region_filter
      type: select
      field: region
      affects: [sales_by_month, top_products]

charts:
  - id: sales_by_region
    type: bar
    drilldown:
      on: region
      target: top_products
      filterField: region
```

但这种详细写法应作为高级能力，不作为默认推荐。

## 七、Token 成本控制

交互会增加 token，但可控。

主要 token 增量来自 AI 需要生成更复杂的 spec，而不是运行时 JS。

大致估算：

| 报告类型 | Spec token 成本 |
| --- | --- |
| 纯静态 3-5 张图 | 约 300-800 tokens |
| 加简单筛选 | 增加约 100-300 tokens |
| 加基础 drilldown | 增加约 200-600 tokens |
| 复杂 crossfilter | 增加 1000+ tokens，且更容易出错 |

因此建议：

- 默认不生成复杂交互
- 用 `tooltip: true`、`legendToggle: true`、`interaction: filter` 这类短字段
- 用 `interactionPreset` 或 `drilldownPreset` 表达常见模式
- 由 CLI 根据 preset 自动补全交互关系
- `validate` 返回结构化错误和修复建议，减少 AI 反复试错

推荐短期只支持三个低 token 交互：

```yaml
interaction:
  tooltip: true
  legendToggle: true
  select: filter
```

复杂 drilldown 使用：

```yaml
drilldownPreset: category-detail
```

## 八、阶段路线

### Phase 1：CLI 主干打磨

目标：让 `miao-viz` 对 AI 稳定、好用、可验证。

重点：

- 补齐已声明图表类型的静态渲染
- 将数据展示产品化为 `miao-viz render` 的核心路线
- 为 KPI、chart、table、annotation、insight 建立稳定 VizSpec 表达
- 增强 profile 输出
- 增强 catalog 的 AI hints
- 优化 validate 错误
- 默认使用 editorial theme
- 输出 HTML/SVG 稳定可分享

### Phase 2：视觉系统升级

目标：让用户一眼觉得结果高级。

重点：

- 多主题系统
- 图表 caption
- 数据洞察块
- 信息图 section
- 品牌化报告 header
- 移动端适配
- PNG/PDF 导出

### Phase 3：轻量交互静态报告

目标：在不回到 BI dashboard 的前提下，让报告有生命力。

重点：

- tooltip
- legend toggle
- select/checkbox/time-range filters
- 点击图表元素过滤
- detail panel
- 基础 drilldown preset

### Phase 4：可选 Web Preview

目标：服务 CLI 和 AI workflow，而不是恢复完整 BI 平台。

重点：

- spec preview
- theme gallery
- chart catalog gallery
- 本地文件拖拽生成报告
- 轻量 spec editor

不建议恢复：

- SQL Workspace 主导航
- 多数据源连接管理
- Markdown BI 工作台
- dashboard builder

## 九、产品原则

1. AI-first：所有能力都要让 AI 容易发现、理解、生成和修复。
2. Static-first：默认输出自包含、离线、可分享。
3. Visual-first：用户先感知结果好看，再感知功能强。
4. Spec-light：spec 要短，复杂能力用 preset。
5. Validate-hard：CLI 应严格验证，并给出可操作错误。
6. No BI creep：避免重新变成传统 BI 平台。
7. Local-first but not browser-first：本地隐私是价值，但浏览器数据库不是核心叙事。

## 十、最终建议

Miao Vision 应大胆从“完整本地 BI 平台”转为“AI-first 数据可视化生成器”。

可以保留旧系统里的图表资产、主题资产、信息图模板和一部分交互概念，但产品主线要收敛到 `miao-viz-cli`：

```text
profile data -> generate spec -> validate -> render beautiful report
```

短期不要再扩展 SQL Workspace、连接器、Markdown BI、多页报告、复杂交互 dashboard。

优先把 `miao-viz` 做成 AI 最容易调用、用户最容易喜欢的本地可视化工具。
