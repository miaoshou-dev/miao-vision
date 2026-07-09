# Miao Vision 产品概述

> AI-first local data visualization generator - 让 AI 更容易理解，让用户更喜欢结果。

**当前方向**：围绕 `miao-viz-cli` 发展本地数据可视化生成能力。
**最后更新**：2026-06-23

## 一、产品定位

Miao Vision 正在从完整本地 BI 工作台，收敛为面向 AI Agent 的本地数据可视化生成器。

新的产品主线分为三条：

```text
Data Display:
本地数据文件
  -> miao-viz data profile
  -> AI 生成 VizSpec
  -> miao-viz validate
  -> miao-viz render
  -> 图表 / KPI / 表格 / 洞察 / HTML 报告

Article-to-Infographic:
文章 URL / Markdown
  -> Agent 归一化正文
  -> miao-viz render article
  -> 静态 infographic artifact

Presentation Deck:
本地数据文件
  -> miao-viz data profile
  -> AI 生成 DeckSpec
  -> miao-viz render deck
  -> browser-presentable slide deck
```

产品不再以用户手写 SQL、维护查询标签页、搭建 BI dashboard 为主线，而是帮助 AI 和用户快速得到高质量可视化报告。

## 二、核心价值

### 1. AI 容易理解

传统 BI 工具的交互状态、图表配置和查询逻辑很难由 AI 稳定生成。

Miao Viz 使用短小、显式、可验证的 YAML/JSON VizSpec：

```yaml
charts:
  - type: bar
    title: Sales by Region
    encoding:
      x: { field: region }
      y: { field: sales }
```

AI 不需要操作复杂 UI，只需要：

- 读取 profile
- 选择 catalog 中的图表
- 生成 spec
- 调用 validate 修复错误
- 调用 render 输出报告

### 2. 用户更喜欢结果

用户关心的不只是能不能画图，而是结果是否专业、好看、能分享。

Miao Viz 的视觉方向：

- editorial report
- dark report
- minimal report
- finance / executive / magazine 风格
- 图表 caption
- KPI section
- 信息图版式
- 自包含 HTML
- SVG 清晰渲染

### 3. 数据展示是一条产品主线

数据展示不是旧 Web 插件系统的附属能力，而是新产品的核心输出之一。

短期目标：

- 把 `src/plugins/data-display` 中有价值的图表资产迁移为 AI 可理解的 catalog。
- 用 VizSpec 表达 KPI、趋势、排行、占比、分布、相关性、表格、注释和洞察。
- 让 `miao-viz render` 稳定生成单文件 HTML/SVG artifact。
- 优先服务静态报告、轻量可分享页面和 Agent 自动化输出。

边界：

- 保留图表资产和展示能力。
- 不恢复完整 dashboard builder。
- 不恢复全局 CrossFilter / Drilldown 状态系统。
- 简单筛选、排序、tooltip 只作为静态报告增强。

### 4. 本地优先

数据来自本地文件，默认不需要后端、不需要上传到云端。

优先支持：

- CSV
- TSV
- XLSX
- JSON

### 5. 输出物优先

Miao Viz 的交付物是可查看、可分享、可归档的报告文件。

当前重点：

- HTML
- SVG

后续扩展：

- PNG
- PDF

## 三、与旧路线的区别

| 旧路线 | 新路线 |
| --- | --- |
| 完整 SQL Workspace | `miao-viz-cli` |
| 用户手写 SQL | AI 生成 VizSpec |
| Markdown BI Report | 静态/轻交互 HTML 报告 |
| 浏览器数据库能力为核心 | 本地文件到报告为核心 |
| 复杂插件和交互 dashboard | 数据展示 artifact、丰富图表和高级视觉主题 |
| 多数据源连接器 | 先聚焦本地文件 |

## 四、目标用户

### AI Agent 用户

希望让 Codex、Claude Code 等 Agent 读取本地数据文件，并生成可视化报告。

### 数据内容创作者

需要快速把 CSV/XLSX 变成漂亮图表、简报、分析页面。

### 业务分析用户

不想维护 BI 平台，只需要把数据文件变成可读、可分享的分析结果。

### 开发者

需要一个可脚本化、可验证、可集成到自动化流程的数据可视化工具。

## 五、推荐工作流

### 路线 A：Data Display

面向本地数据文件，输出图表、KPI、表格、注释、洞察和轻量静态报告。

### Step 1: Profile

```bash
miao-viz data profile ./sales.csv
```

输出字段类型、缺失率、样本、时间粒度、数值范围、推荐 hints。

### Step 2: Catalog

```bash
miao-viz spec catalog
```

输出支持的图表类型、required encodings、可选 encodings、适用场景。

### Step 3: Validate

```bash
miao-viz spec validate --spec ./report.yaml --profile ./profile.json
```

检查字段是否存在、图表类型是否支持、encoding 是否完整。

### Step 4: Render

```bash
miao-viz render report \
  --input ./sales.csv \
  --spec ./report.yaml \
  --theme editorial \
  --output ./sales-report.html
```

生成自包含 HTML 报告。

### 路线 B：Article-to-Infographic

文章 URL、Markdown 或长文本由 Agent 读取和清洗，CLI 只处理本地 markdown/text 输入，输出信息图 artifact。

### 路线 C：Presentation Deck

本地数据文件经 `profile` 后由 AI 生成 DeckSpec，再调用 `miao-viz render deck` 输出可浏览器播放的演示文稿。

## 六、轻量交互方向

静态报告可以支持简单交互，但不走完整 dashboard builder。

推荐支持：

- tooltip
- legend toggle
- select / checkbox filters
- time range filter
- metric switch
- click-to-filter
- table sort / search / lightweight column filters

不推荐短期支持：

- 任意 SQL 查询
- 多表 join 实时重算
- 保存用户状态
- 登录权限
- 协作 dashboard
- 通用组件式交互平台

原则：

> 交互是静态报告的渐进增强，不是回到传统 BI。

## 七、短期优先级

### P0

- 补齐 CLI 已声明图表类型的 SVG/HTML 渲染
- 将数据展示能力产品化为 VizSpec sections：KPI、chart、table、annotation、insight
- 强化 `profile` 的字段语义和数据质量输出
- 强化 `catalog` 的 AI 选图提示
- 优化 `validate` 错误和修复建议
- 默认输出更漂亮的 editorial 报告

### P1

- 多主题系统
- PNG/PDF 导出
- 简单交互 static runtime
- `interactionPreset`
- chart captions 和 insight blocks

### P2

- 轻量 Web preview
- theme gallery
- chart catalog gallery
- spec editor

## 八、非目标

短期不继续投入：

- SQL Workspace
- SQL snippets
- query tabs
- 手动 SQL 分析工作台
- 多数据库连接管理
- 完整 dashboard builder
- 全局 drilldown/modal 交互系统

## 九、成功标准

Miao Viz 成功时应该满足：

- AI 通过少量工具调用即可生成正确图表报告
- 用户打开 HTML 后觉得结果专业、清晰、好看
- spec 足够短，token 成本可控
- validation 能帮助 AI 自动修复错误
- 输出物可以离线查看和分享
