# 周期报告复用与 PDF 导出 PRD

> 日期：2026-07-24
> 产品范围：`miao-viz-cli` / `skills/miao-vision`
> 状态：Proposal

## 1. 背景

Miao Vision 当前能够把 CSV、TSV、XLSX、JSON 等本地数据文件转成自包含的 Data Report 或 Browser Deck。标准流程为：

```text
data analyze
→ spec instantiate / agent authoring
→ spec validate
→ render report / render deck
```

该流程适合一次性生成，但对于周报、月报、季报等高频任务，用户仍需每期重新描述需求、重新确认指标、重新选择图表，并人工检查报告中的数字和文字是否全部更新。

同时，HTML 虽然适合浏览和分享，但管理层交付、归档和打印仍普遍需要 PDF。Article Infographic 已具备基于 Playwright 的 PDF 导出路径，Data Report 和 Deck 尚未形成正式、稳定的 PDF 产品能力。

本 PRD 同时定义：

1. 周期报告项目：将已验证的报告规则保存并稳定运行在新一期数据上；
2. Data Report PDF 导出；
3. Browser Deck PDF 导出。

## 2. 产品定位

周期报告不是复制上一份 HTML，而是重放一份经过确认的报告配方。

```text
首次：数据 → 分析 → 确认口径 → 验证 → 保存项目
以后：新数据 → 契约检查 → 重算 Evidence → 复用 Spec → 验证 → 发布
```

产品承诺：

> 第一次把报告做对，以后只需替换新一期数据，即可沿用已确认的口径和结构生成可信报告。

PDF 导出的产品承诺：

> HTML 中看到的关键内容，能够稳定、完整、清晰地进入可打印和可归档的 PDF。

## 3. 目标用户

### 3.1 核心用户

中小团队的业务分析师：

- 每周或每月从业务系统导出 Excel；
- 使用固定指标和固定报告结构；
- 需要向管理层交付报告；
- 经常被追问数字来源、变化原因和统计口径；
- 希望减少复制 Excel、更新图表和检查旧文字的重复劳动。

### 3.2 次级用户

- 使用 Codex、Claude、OpenClaw 等 Agent 自动生成报告的用户；
- 需要在本地或 CI 中周期生成报告的开发者；
- 需要稳定 PDF 归档的咨询、运营和研究团队。

## 4. 用户问题

### 4.1 周期报告

- 每期都要重新告诉 Agent 指标、筛选和图表要求；
- 复制上期文件容易遗留旧日期、旧数字或旧结论；
- 指标口径可能在不知情的情况下发生漂移；
- 新文件字段变化后，Agent 可能猜测错误字段；
- 无法快速判断本期和上期的核心变化；
- 缺少可查询的运行历史。

### 4.2 PDF 交付

- 用户需要通过浏览器手动打印，结果因环境不同而变化；
- 页面可能截断图表、出现空白页或丢失背景；
- Deck 的页面比例和分页行为缺少统一保证；
- 缺少机器可读的导出成功或失败结果；
- Agent 无法稳定地完成“生成报告并交付 PDF”。

## 5. 产品目标

### 5.1 周期报告目标

- 将已验证的 Data Report 保存为本地周期报告项目；
- 保存数据契约、Evidence 计算计划、Report Spec 和展示偏好；
- 使用新一期文件确定性重算 Evidence；
- 默认复用已有指标口径、图表结构和主题；
- 在字段或口径不兼容时停止并返回结构化修复信息；
- 保存每次运行的输入指纹、Context、Spec、产物和状态；
- 为后续跨期比较、证据抽屉和独立的报告编辑能力提供稳定项目基础。

### 5.2 PDF 目标

- Data Report 支持直接生成 PDF；
- Browser Deck 支持直接生成 PDF；
- PDF 导出复用现有 HTML 渲染结果；
- 使用固定 Chromium 和 Playwright 打印，保证可复现性；
- 提供页面尺寸、边距、方向和输出路径配置；
- 导出前等待字体、SVG、图表和布局稳定；
- 对截断、溢出、空白页和渲染超时返回结构化错误。

## 6. 非目标

本期不做：

- 定时任务调度；
- 远程数据库或 SaaS 数据源连接；
- R2、D1 或多人云同步；
- 多人同时编辑和审批流；
- 完整指标治理平台；
- 自动因果分析；
- 任意像素级可视化编辑器；
- 原生可编辑 PPTX；
- 把 PDF 重新解析为可编辑报告；
- 在更新时让 Agent 重新自由设计整份报告。

## 7. 核心概念

### 7.1 Report Project

Report Project 是一个可重复运行的本地目录，保存报告规则和历史运行。

```text
sales-weekly/
├── project.json
├── data-contract.json
├── evidence-plan.json
├── report.yaml
├── preferences.json
├── runs/
│   ├── 2026-W28/
│   │   ├── manifest.json
│   │   ├── context.json
│   │   ├── report.html
│   │   └── report.pdf
│   └── 2026-W29/
│       ├── manifest.json
│       ├── context.json
│       ├── report.html
│       └── report.pdf
└── latest.json
```

源数据默认不复制进项目目录，只记录规范化路径和文件指纹。用户可通过选项要求复制源文件。

### 7.2 Data Contract

Data Contract 定义更新所需的最低数据条件：

```json
{
  "schemaVersion": 1,
  "requiredFields": [
    {"name": "order_date", "type": "date"},
    {"name": "sales_amount", "type": "number"},
    {"name": "region", "type": "string"}
  ],
  "optionalFields": [
    {"name": "channel", "type": "string"}
  ],
  "sheet": "Sales",
  "minimumRows": 1
}
```

MVP 只检查：

- 必需字段是否存在；
- 字段类型是否兼容；
- 指定 Sheet 是否存在；
- 数据是否为空；
- Evidence Plan 引用的字段是否可用。

### 7.3 Evidence Plan

Evidence Plan 保存计算方法，而不是保存上期计算结果。

`data analyze` 必须直接为每条 Evidence 输出可执行 `recipe`。`report init` 从 `AnalyzeContext.evidence[].recipe` 提取并冻结计划，不新增第二套 `data plan` 命令，也不尝试从人类可读的 `query` 文本反向推导计算逻辑。

```json
{
  "schemaVersion": 1,
  "queries": [
    {
      "id": "total_sales",
      "measures": [
        {
          "operation": "sum",
          "field": "sales_amount",
          "alias": "sales"
        }
      ],
      "filters": [
        {
          "field": "order_status",
          "operator": "eq",
          "value": "completed"
        }
      ]
    },
    {
      "id": "by_region",
      "groupBy": ["region"],
      "measures": [
        {
          "operation": "sum",
          "field": "sales_amount",
          "alias": "sales"
        }
      ],
      "orderBy": [{"field": "sales", "direction": "desc"}],
      "limit": 10
    }
  ]
}
```

要求：

- Evidence ID 在项目生命周期内保持稳定；
- Query 结构必须复用现有 `data query` 的解析和执行能力；
- MVP 的 `operation` 仅支持现有查询引擎已支持的 `sum`、`count`、`avg`、`min`、`max`；
- `countDistinct` 等新增聚合必须先进入 `data query` 公共契约，再允许 Evidence Plan 使用；
- 不允许用自然语言描述替代可执行计算计划；
- 更新时不重新运行开放式图表或指标选择；
- 计划版本升级必须显式更新 `schemaVersion`。

### 7.4 Run

Run 表示项目在某一期数据上的一次执行。

```json
{
  "id": "2026-W29",
  "status": "ready",
  "input": {
    "path": "/data/week-29.xlsx",
    "sha256": "...",
    "sheet": "Sales"
  },
  "projectVersion": 1,
  "specHash": "...",
  "evidencePlanHash": "...",
  "evidenceResultHash": "...",
  "createdAt": "2026-07-24T10:00:00Z",
  "artifacts": {
    "html": "report.html",
    "pdf": "report.pdf"
  }
}
```

MVP 状态：

```text
running
ready
needs_review
failed
```

## 8. 用户流程

### 8.1 首次创建周期报告

用户仍使用现有工作流生成并验证报告：

```bash
npm run miao-viz -- data analyze ./week-28.xlsx \
  --intent "销售经营周报：核心指标、区域趋势和渠道排名" \
  --output /tmp/miao-vision/context.json

npm run miao-viz -- spec validate \
  --spec /tmp/miao-vision/report.yaml \
  --context /tmp/miao-vision/context.json \
  --verify

npm run miao-viz -- render report \
  --input ./week-28.xlsx \
  --spec /tmp/miao-vision/report.yaml \
  --context /tmp/miao-vision/context.json \
  --output /tmp/miao-vision/report.html
```

验证通过后创建项目：

```bash
npm run miao-viz -- report init ./sales-weekly \
  --input ./week-28.xlsx \
  --spec /tmp/miao-vision/report.yaml \
  --context /tmp/miao-vision/context.json \
  --period 2026-W28 \
  --dry-run
```

`--dry-run` 只输出拟生成的 Data Contract、Evidence Plan 摘要、项目路径和风险，不创建目录。用户或 Agent 确认后，移除 `--dry-run` 正式初始化。

CLI：

1. 验证 Spec 和 Context；
2. 从实际字段及 Evidence 依赖生成 Data Contract；
3. 从 `AnalyzeContext.evidence[].recipe` 提取可执行 Evidence Plan；
4. 保存稳定 Spec；
5. 创建首个 Run；
6. 输出项目路径和已冻结规则摘要。

如果 Context 中缺少可执行 Evidence Plan，返回：

```json
{
  "ok": false,
  "code": "EVIDENCE_PLAN_REQUIRED",
  "message": "Recurring reports require replayable evidence queries.",
  "hint": "Re-run data analyze with evidence recipe output enabled."
}
```

### 8.2 使用新一期数据更新

```bash
npm run miao-viz -- report update ./sales-weekly \
  --input ./week-29.xlsx \
  --period 2026-W29 \
  --format html
```

执行顺序：

```text
加载 Project
→ 校验 Data Contract
→ 执行 Evidence Plan
→ 生成本期 Context
→ 解析 Report Spec 中的 Evidence
→ 运行 spec validate --verify
→ 生成 HTML
→ 写入 Run Manifest
→ 更新 latest.json
```

成功输出：

```json
{
  "ok": true,
  "value": {
    "project": "./sales-weekly",
    "runId": "2026-W29",
    "status": "ready",
    "artifacts": {
      "html": "./sales-weekly/runs/2026-W29/report.html"
    },
    "warnings": []
  }
}
```

### 8.3 数据不兼容

当字段缺失或类型不兼容时，更新必须停止：

```json
{
  "ok": false,
  "code": "REPORT_DATA_CONTRACT_MISMATCH",
  "message": "The new input does not satisfy the saved report contract.",
  "issues": [
    {
      "field": "sales_amount",
      "expected": "number",
      "actual": "missing",
      "candidates": ["order_amount"]
    }
  ]
}
```

CLI 不自动把 `order_amount` 映射为 `sales_amount`。Agent 可以向用户确认后通过显式命令更新映射。

### 8.4 查看历史

```bash
npm run miao-viz -- report history ./sales-weekly
```

输出：

```json
{
  "ok": true,
  "value": [
    {
      "runId": "2026-W29",
      "status": "ready",
      "createdAt": "2026-07-24T10:00:00Z"
    },
    {
      "runId": "2026-W28",
      "status": "ready",
      "createdAt": "2026-07-17T10:00:00Z"
    }
  ]
}
```

MVP 不提供数据库搜索，按 Run Manifest 扫描项目目录即可。

### 8.5 查看项目状态

```bash
npm run miao-viz -- report info ./sales-weekly
```

输出项目名称和版本、Data Contract 摘要、Evidence 数量、Spec Hash、最近一次 Run、最近状态、产物路径和健康问题。Agent 在执行 `report update` 前应优先调用该命令确认项目状态。

### 8.6 清理历史运行

```bash
npm run miao-viz -- report clean ./sales-weekly --keep 10 --dry-run
npm run miao-viz -- report clean ./sales-weekly --keep 10 --confirm
```

规则：

- 默认或显式 `--dry-run` 只列出待删除 Run、文件和预计释放空间；
- 只有 `--confirm` 才执行删除；
- 不得删除 `latest.json` 指向的 Run；
- 不得删除项目配置、Data Contract、Evidence Plan 或 Report Spec；
- 被删除 Run 的源数据不在项目管理范围内，除非初始化时显式启用了 `--copy-input`。

## 9. 周期复用规则

### 9.1 默认冻结

以下内容在正常更新时不得改变：

- 指标字段和聚合方法；
- 筛选条件；
- Evidence ID；
- 图表类型和字段映射；
- Top N 和排序；
- 报告章节；
- 主题、布局和数字格式；
- 洞察模板及其 Evidence 绑定。

### 9.2 每期重算

- KPI 数值；
- 分组结果；
- 排名、占比和周期变化；
- Sample Warning；
- Evidence；
- `$evidence:` 指令解析结果；
- 验证状态；
- HTML 和 PDF。

### 9.3 允许的确定性变化

- 当前周期标题和日期；
- 绑定 Evidence 的数值；
- 排名主体；
- 由规则模板生成的事实型洞察；
- 数据质量提示。

### 9.4 需要重新分析的变化

- 修改指标公式；
- 增加或删除业务筛选；
- 更换分析维度；
- 改变时间粒度；
- 使用新字段；
- 修改 Evidence Plan；
- 更换报告结构。

这些变化不属于普通 `report update`，应通过现有 Agent 工作流修改并重新验证项目。

### 9.5 Evidence 更新与失效

新一期 Evidence 的数值、排序、主体和结果 Hash 发生变化属于正常更新，不得仅因结果变化而阻断。

正常变化：

- `values` 或 `rows` 与上期不同；
- 排名主体或占比变化；
- 绑定 Evidence 的动态文字变化；
- `evidenceResultHash` 变化。

阻断问题：

- Evidence ID 缺失；
- Recipe 执行失败；
- `$evidence:` 路径无法解析；
- Recipe 返回字段结构与 Spec 不兼容；
- Claim 在新数据下不再满足其声明的验证规则。

更新时所有验证均针对本期重新计算的 Context。上期 Context 只用于比较和追溯，不参与本期路径有效性判断。

## 10. Skill 行为

Skill 应在用户提及以下意图时识别周期报告：

- 周报、月报、季报、日报；
- 更新上一期报告；
- 沿用原来的口径、模板或格式；
- 用新文件重新生成；
- 与上一期比较。

首次报告验证通过后，Skill 可提示：

> 这看起来是一份周期报告。是否将当前指标口径、图表结构和格式保存为可复用项目？下次只需提供新一期数据。

更新时：

1. 解析项目路径或项目名称；
2. 调用 `report update`；
3. 不重新自由设计报告；
4. 仅在字段不兼容、口径变化或多个项目匹配时询问用户；
5. 返回本期产物、警告和需要确认的问题。

Skill 不得：

- 静默修改指标口径；
- 猜测必需字段映射；
- 为通过验证而发明 Evidence；
- 在正常更新时重写整份 Spec。

## 11. Data Report PDF 导出

### 11.1 CLI

保留现有 HTML 默认行为，新增：

```bash
npm run miao-viz -- render report \
  --input ./sales.csv \
  --spec ./report.yaml \
  --context ./context.json \
  --format pdf \
  --output ./report.pdf
```

也支持一次生成多种格式：

```bash
npm run miao-viz -- render report \
  --input ./sales.csv \
  --spec ./report.yaml \
  --context ./context.json \
  --format html,pdf \
  --output-dir ./output
```

MVP 参数：

```text
--format <html|pdf|html,pdf>
--page-size <A4|Letter>
--orientation <portrait|landscape>
--margin <css-length>
--pdf-timeout <milliseconds>
--keep-temp
```

### 11.2 渲染路径

```text
Spec + Data + Context
→ renderStaticHtml
→ 临时 HTML
→ Playwright Chromium
→ 等待 fonts.ready 和渲染完成标记
→ page.pdf
→ PDF
```

不得新增第二套报告 PDF 布局引擎。PDF 必须以现有 HTML 作为视觉源。

### 11.3 打印样式要求

Data Report 增加专用 `@media print`：

- 默认 A4 纵向；
- 打印背景色；
- 隐藏交互控件和悬浮提示；
- 图表、KPI 卡片和表格标题不得跨页截断；
- 大表格允许跨页，但表头应重复；
- 避免单独标题出现在页尾；
- 页面边距保持一致；
- 链接不额外打印 URL；
- 证据抽屉若存在，默认不进入主 PDF。

## 12. Browser Deck PDF 导出

### 12.1 CLI

```bash
npm run miao-viz -- render deck \
  --input ./sales.csv \
  --spec ./deck.yaml \
  --context ./context.json \
  --format pdf \
  --output ./deck.pdf
```

### 12.2 页面规则

- 一张 Slide 对应一页 PDF；
- 默认页面尺寸为 16:9；
- 不使用浏览器默认 A4 纸张裁切 Slide；
- 隐藏导航按钮、进度控件和交互覆盖层；
- 展开所有进入动画的最终状态；
- 禁用键盘焦点样式；
- 保留背景、SVG、图表和页码；
- 每页不得产生额外空白页。

Deck PDF 推荐使用 CSS `@page`：

```css
@page {
  size: 13.333in 7.5in;
  margin: 0;
}

.slide {
  break-after: page;
  width: 13.333in;
  height: 7.5in;
}
```

### 12.3 讲者备注

MVP 不把讲者备注放入页面正文。后续可增加：

```text
--include-notes
```

以附录或单独 Notes PDF 输出，不改变主 Deck 的视觉页。

## 13. PDF 导出服务

新增共享模块建议：

```text
packages/miao-viz-cli/src/pdf-export.ts
packages/miao-viz-cli/src/pdf-export-types.ts
packages/miao-viz-cli/src/print-readiness.ts
```

职责：

- 解析 PDF 参数；
- 定位可用 Chromium；
- 加载临时或现有 HTML；
- 等待字体和页面 Ready Signal；
- 按 Report 或 Deck 模式设置打印参数；
- 生成 PDF；
- 检查文件存在且非空；
- 返回结构化错误。

Renderer 在 HTML 中设置：

```js
document.documentElement.dataset.miaoRenderReady = 'true'
```

PDF Exporter 等待：

```text
document.fonts.ready
AND data-miao-render-ready = true
```

## 14. 错误模型

新增建议错误码：

```text
REPORT_PROJECT_INVALID
REPORT_RUN_ALREADY_EXISTS
REPORT_DATA_CONTRACT_MISMATCH
EVIDENCE_PLAN_REQUIRED
EVIDENCE_PLAN_EXECUTION_FAILED
REPORT_UPDATE_VALIDATION_FAILED
PDF_PLAYWRIGHT_MISSING
PDF_BROWSER_MISSING
PDF_RENDER_TIMEOUT
PDF_LAYOUT_OVERFLOW
PDF_HORIZONTAL_OVERFLOW
PDF_CONTENT_DENSE
PDF_OUTPUT_FAILED
```

PDF 布局诊断定义：

- `PDF_LAYOUT_OVERFLOW`：非预期元素超出打印页边界并会被裁切；Deck 任一 Slide 产生第二页也属于该错误；
- `PDF_HORIZONTAL_OVERFLOW`：页面出现非预期水平滚动范围或内容超出可打印宽度；
- `PDF_CONTENT_DENSE`：内容未被裁切，但密度超过建议阈值，仅作为 warning；
- Report 表格按规则正常跨页不属于 Overflow。

错误结果应包含元素 ID、页码、超出方向和建议修复方式。默认清理临时文件；传入 `--keep-temp` 时保留临时 HTML、页面截图和布局诊断 JSON。

所有命令继续遵循：

```json
{"ok": true, "value": {}}
{"ok": false, "code": "...", "message": "..."}
```

## 15. 安全与隐私

- 周期项目默认保持本地；
- 不自动上传源数据或产物；
- Run Manifest 不记录原始行数据；
- 项目内路径优先使用相对路径；
- 输出中不得包含 API Key、访问令牌或环境变量；
- PDF 临时文件在成功或失败后均应清理；仅在显式 `--keep-temp` 时保留调试产物；
- `--copy-input` 必须由用户显式启用；
- 报告若嵌入明细，应沿用现有数据暴露策略。

## 16. 兼容性

- 现有 `render report` 和 `render deck` 未传 `--format` 时继续输出 HTML；
- 现有 Report Spec、Deck Spec 保持兼容；
- Evidence Plan 作为新增结构，不要求旧 Context 自动可复用；
- 普通一次性报告不需要创建 Report Project；
- PDF 是附加输出，不改变 HTML 内容和交互行为；
- Article Infographic 的现有 PDF 行为保持不变，但后续可复用共享 PDF Exporter。

## 17. 测试要求

### 17.1 周期报告单元测试

- Data Contract 正常匹配；
- 必需字段缺失；
- 字段类型不兼容；
- Sheet 缺失；
- Evidence ID 稳定；
- Evidence Plan 可重放；
- `report init --dry-run` 不创建项目；
- `report info` 返回项目健康摘要；
- `report clean` 默认不删除，且不会删除 latest Run；
- 同一数据重复运行结果一致；
- Run Manifest 同时记录输入、Evidence Plan、Evidence Result 和 Spec Hash；
- 新一期 Evidence 值变化不会被误判为失效；
- 更新不会改变 Spec；
- 失败运行不会更新 `latest.json`；
- 重复 Run ID 返回结构化错误。

### 17.2 周期报告工作流测试

必须覆盖：

```text
week-28.xlsx
→ analyze
→ instantiate/spec
→ validate --verify
→ report init
→ week-29.xlsx
→ report update
→ validate --verify
→ render HTML
```

断言：

- 项目配置存在；
- 两期 Run 均可查询；
- Spec Hash 不变；
- Context 和 Evidence 随数据变化；
- HTML 中不存在上期静态数字；
- Evidence Result Hash 随结果变化；
- 正常更新不会修改 Evidence Plan 或 Spec。

### 17.3 PDF E2E

Data Report：

- PDF 大于合理最小体积；
- 页面数量稳定；
- 无意外空白页；
- 关键标题和图表存在；
- A4 横纵方向正确；
- 长表格不会遮挡页脚。

Deck：

- Slide 数等于 PDF 页数；
- 每页为 16:9；
- 无导航控件；
- 无额外空白页；
- 最后一页完整；
- 动画内容处于最终可见状态。

### 17.4 视觉回归

对固定 Fixture：

- 生成 HTML 截图；
- 生成 PDF 页面截图；
- 比较关键区域；
- 字体、颜色、图表位置和裁切不得出现明显回归。

## 18. 验收标准

### 18.1 周期报告 MVP

- 可以从一份已验证报告创建本地项目；
- 可以使用兼容的新一期 Excel 更新项目；
- 更新时不调用开放式报告设计；
- 指标、筛选、Evidence ID 和 Spec 保持稳定；
- 字段不兼容时明确阻断；
- 每次运行保存独立 Manifest、Context 和产物；
- Run Manifest 记录 `inputHash`、`evidencePlanHash`、`evidenceResultHash` 和 `specHash`；
- `report info` 可以检查当前项目健康状态；
- `report clean` 可以安全预览和清理旧 Run；
- 可以列出历史运行；
- 相同输入与相同项目版本产生相同核心结果。

### 18.2 Data Report PDF

- CLI 可直接生成 PDF；
- 默认 A4 纵向；
- 背景、字体和 SVG 正常；
- 无图表被切成两半；
- 失败返回结构化错误；
- 生成结果可由 macOS Preview、Chrome 和常见 PDF 阅读器打开。

### 18.3 Deck PDF

- CLI 可直接生成 PDF；
- 一张 Slide 对应一页；
- 页面为 16:9；
- 导航和交互控件不进入 PDF；
- 所有内容在导出时可见；
- PDF 页数与 Slide 数完全一致。

## 19. 里程碑

### Phase 0：Evidence Recipe 技术验证

- `data analyze` 为 Evidence 输出可执行 Recipe；
- Recipe 与现有 `data query` 公共契约对齐；
- 验证同一 Recipe 可在两期 Fixture 上重放；
- 验证 Evidence ID 和返回字段结构稳定。

Phase 0 未通过前，不进入周期项目开发。

### Phase 1：周期项目 HTML MVP

- `report init`；
- `report init --dry-run`；
- Data Contract；
- 可执行 Evidence Plan；
- `report update`；
- Run Manifest；
- 四类 Hash；
- `report info`；
- `report history`；
- `report clean`；
- HTML 输出闭环。

### Phase 2：PDF 基础能力

- 抽取共享 Playwright PDF Exporter；
- Data Report `--format pdf`；
- Deck `--format pdf`；
- Print CSS 和布局诊断；
- `--keep-temp`；
- PDF E2E 和视觉回归；
- 周期项目 HTML/PDF 联合输出。

Phase 1 和 Phase 2 可以并行实施，但周期项目的首个可用版本不得被 PDF 阻塞。

### Phase 3：增强

- 上期与本期 Evidence Compare；
- 字段映射确认与项目升级；
- Evidence 抽屉；
- 独立 Agent Patch PRD 的可选集成；
- 项目打包与可选远端同步；
- Notes PDF；
- 原生 PPTX 可行性验证。

## 20. 成功指标

### 用户指标

- 周期报告第二次生成耗时下降 70%；
- 更新过程中重新确认指标口径的次数接近零；
- 因旧数字或旧文字导致的返工显著下降；
- 50% 以上的周期项目产生至少三个 Run；
- PDF 导出后无需手工调整的比例超过 90%。

### 质量指标

- 同项目、同输入的 Evidence 结果一致率 100%；
- 正常更新中 Spec 非预期变化率 0%；
- PDF 导出成功率超过 99%；
- Deck Slide 数与 PDF 页数一致率 100%；
- 测试 Fixture 中关键内容裁切率 0%。

## 21. 待确认问题

1. `report init` 是否复制首个 Run 的源文件，还是只保存路径和指纹？
2. Report PDF 是否需要支持自定义页眉、页脚和品牌 Logo？
3. Deck PDF 是否需要支持 4:3，还是 MVP 只支持 16:9？
4. 周期项目是否同时支持 Deck Spec，还是先只支持 Data Report？
5. 当 Evidence Plan 版本变化时，是更新原项目还是创建项目新版本？
6. `--format html,pdf` 的输出路径规则是否统一使用 `--output-dir`？

## 22. 推荐决策

- 周期复用 MVP 先支持 Data Report，Deck 只增加 PDF 导出；
- Evidence Recipe 成为 `data analyze` 的正式输出组成部分，避免建立第二套分析计划命令；
- Evidence Plan 的 MVP 聚合严格限制为 `sum`、`count`、`avg`、`min`、`max`；
- 项目默认不复制源数据；
- Report PDF 默认 A4 纵向，Deck PDF 默认 16:9；
- 多格式输出统一使用 `--output-dir`；
- 周期项目 HTML 闭环不依赖 PDF 完成；
- 项目更新不自动修改 Spec；
- 任何业务口径变化都需要显式升级项目版本。
