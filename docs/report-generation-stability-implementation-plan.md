# 报告生成稳定性提升技术实施方案

> 日期：2026-06-29  
> 状态：规划稿  
> 关联模块：`packages/miao-viz-cli`、`skills/miao-vision`  
> 目标：提升 AI Agent 生成 report 的稳定性，降低 token 消耗，并增强 LLM 使用体验。

---

## 1. 背景与目标

当前 `miao-viz` 已经形成了比较正确的 Agent-native 报告生成链路：

```text
analyze → context.json → block instantiate → spec → validate/verify → render
```

CLI 负责确定性计算、证据、图表边界、校验和渲染；LLM/Agent 负责理解用户意图、选择结构、补写 insight 和执行修复。这比让 LLM 自由生成 HTML 或自由写图表配置稳定得多。

但当前仍有三个主要问题：

1. `insights: string[]` 仍依赖自然语言约定，证据、caveat、severity 不可被强校验。
2. `analyze` 默认输出包含较多 block 元数据，选型阶段 token 噪音偏高。
3. chart/report/template 的 domain knowledge 虽然已有雏形，但还没有形成低 token、可实例化、可校验的三层知识结构。

本方案的目标：

- 将最容易幻觉的报告叙事纳入机器契约。
- 将 chart/report/template 知识下沉到 CLI，由机器执行规则，LLM 只消费推荐结果。
- 将 `analyze` 默认输出改为 compact context，减少 token 和注意力噪音。
- 仅在低置信度关键假设时提出澄清问题，不把用户问答变成默认阻塞流程。

---

## 2. 设计原则

### 2.1 Deterministic Before Generative

数字、样本限制、图表可用性、字段角色、模板候选由 CLI 计算。LLM 不负责隐藏计算，不负责记忆所有 chart 规则。

### 2.2 Compact By Default, Expand On Demand

默认输出只给 LLM 决策必需信息。完整 chart/template 说明只在 `--verbose`、`catalog --for-llm`、`template inspect` 或 `instantiate` 时展开。

### 2.3 From Draft To Review

LLM 不应从抽象规则手写完整 spec。优先通过 block/template instantiate 生成字段已填好的草稿，让 LLM 做审查和补写。

### 2.4 Ask Only When It Matters

当关键业务假设低置信度且会显著影响报告时，才抛出澄清问题。默认生成时应显式记录假设，而不是频繁打断用户。

---

## 3. 优化前后总览

### 3.1 当前形态

```text
analyze 输出：
  fields
  evidence
  metricCandidates
  catalog.charts
  catalog.blockedCharts
  catalog.blocks[] 完整元数据
    - description
    - bestFor
    - examplePrompt
    - variables
    - qualityChecks

LLM：
  读完整 block 元数据
  选择 block
  调用 block instantiate
  补写 string[] insights
  validate/verify
```

问题：

- 选 block 阶段读取了实例化阶段才需要的元数据。
- insight 的证据关系和 caveat 只能靠文本约定。
- 用户意图不明确时，LLM 只能根据启发式字段顺序猜主指标。

### 3.2 目标形态

```text
analyze 默认输出：
  compact fields
  compact evidence
  metricCandidates
  compact template/block candidates
  blocked chart/template reasons
  assumptions + optional clarificationQuestions

LLM：
  根据 compact candidates 选择 template/block
  instantiate 获得完整草稿
  填结构化 insights
  validate --verify --strict
  render
```

完整知识仍存在，但默认不全量喂给 LLM：

```text
chart template knowledge  → CLI 内部执行
report block knowledge    → instantiate 时展开
report template knowledge → template instantiate 时展开
```

---

## 4. Phase 1：结构化 Insight

### 4.1 目标

把 `insights` 从不可验证的纯文本数组升级为向后兼容的 union type。

当前：

```typescript
insights?: string[]
```

目标：

```typescript
export type AgentInsight =
  | string
  | {
      text: string
      evidence?: string[]
      caveat?: string
      severity?: 'info' | 'warning'
    }

export interface AgentReportSpec {
  title?: string
  description?: string
  theme?: 'default' | 'editorial' | 'dark' | 'minimal'
  interactions?: AgentReportInteractions
  insights?: AgentInsight[]
  charts: AgentChartSpec[]
}
```

### 4.2 优化前后示例

优化前：

```yaml
insights:
  - "East contributed 240 in sales, accounting for 53.3% of total sales. This is based on a 4-row sample."
  - "Total sales were 450 and total orders were 18."
```

问题：

- `240`、`53.3%`、`450`、`18` 是否来自 evidence 不明确。
- validator 只能扫描文本，不能可靠知道每条 insight 依赖哪些 evidence。
- caveat 是自然语言的一部分，不方便强制、复用或统一渲染。

优化后：

```yaml
insights:
  - text: "East contributed $evidence:by_dimension.rows[0].total_sales of $evidence:total.values.total_sales sales."
    evidence:
      - by_dimension
      - total
    caveat: "Only 4 rows; rankings and comparisons are descriptive only."
    severity: info

  - text: "The report summarizes total sales and order volume."
    evidence:
      - total
    severity: info
```

### 4.3 校验规则

在 `validate --verify` 中增加：

| 规则 | 级别 | 说明 |
|------|------|------|
| `INSIGHT_EVIDENCE_NOT_FOUND` | error | `insight.evidence[]` 中的 id 必须存在于 `context.evidence[]` |
| `INSIGHT_MISSING_CAVEAT` | warning / strict error | 存在 `sampleWarnings` 时，相关 insight 必须有 `caveat` |
| `INSIGHT_TEXT_EVIDENCE_PATH_NOT_FOUND` | error | `text` 中 `$evidence:*` 路径必须可解析 |
| `INSIGHT_FORBIDDEN_WORD` | warning / strict error | 禁用词检测兼容 string 和 object insight |
| `INSIGHT_NUMERIC_CLAIM_WITHOUT_EVIDENCE` | warning | 有明显数字但无 `evidence` 字段 |

### 4.4 渲染规则

HTML renderer 对两种 insight 兼容：

- `string`：按现有逻辑渲染。
- object：渲染 `text`，`caveat` 作为浅色脚注，`severity: warning` 可增加 warning 样式。

### 4.5 涉及文件

- `packages/miao-viz-cli/src/types.ts`
- `packages/miao-viz-cli/src/spec-schema.ts`
- `packages/miao-viz-cli/src/spec-validator.ts`
- `packages/miao-viz-cli/src/html-export.ts`
- `packages/miao-viz-cli/src/directive-resolver.ts`
- `skills/miao-vision/SKILL.md`

### 4.6 验收标准

- 现有 `string[]` fixtures 不需要修改且全部通过。
- 新增 object insight fixtures 可 validate/render。
- `validate --context --verify --strict` 能阻断不存在的 evidence id。
- 有 `sampleWarnings` 且 object insight 缺少 `caveat` 时，strict 模式返回 hard error。

---

## 5. Phase 2：Compact Analyze 默认输出

### 5.1 目标

降低 `analyze` 默认输出 token。默认只输出 Agent 决策必需信息，完整 block/template 元数据延后到 instantiate 或 verbose 模式。

### 5.2 当前问题

当前 `catalog.blocks[]` 每个 block 都包含：

```json
{
  "id": "trend-ranking",
  "score": 0.9,
  "description": "...",
  "bestFor": ["..."],
  "density": "full",
  "examplePrompt": "...",
  "charts": ["bigvalue", "line", "bar"],
  "variables": { "...": "..." },
  "qualityChecks": ["..."]
}
```

对“选择 block”阶段来说，真正必要的是：

```json
{
  "id": "trend-ranking",
  "score": 0.9,
  "bestFor": ["executive summary", "monthly review with category breakdown"],
  "density": "full",
  "charts": ["bigvalue", "line", "bar"]
}
```

### 5.3 输出模式

新增输出模式：

```bash
miao-viz analyze data.csv --intent "..."
miao-viz analyze data.csv --intent "..." --compact
miao-viz analyze data.csv --intent "..." --verbose
```

建议：

- 默认等价于 compact。
- `--verbose` 输出当前完整结构，便于调试和兼容老 Agent。

### 5.4 Compact Context 结构

默认输出建议：

```json
{
  "intent": {
    "raw": "sales report by region and month",
    "coverage": "full"
  },
  "assumptions": [
    ["primary_measure", "sales", 0.72, ["orders"]],
    ["primary_dimension", "region", 0.8, ["category"]]
  ],
  "fields": [
    ["order_date", "time", "date", 4],
    ["region", "dimension", "string", 3],
    ["sales", "measure", "number"],
    ["orders", "measure", "number"]
  ],
  "evidence": [
    ["total", { "total_sales": 450, "total_orders": 18, "row_count": 4 }],
    ["by_dimension", [
      { "region": "East", "total_sales": 240, "share": 0.5333 }
    ]]
  ],
  "metricCandidates": [
    ["unit_avg_sales_per_orders", "unit_average", "sum(sales)/sum(orders)", 25],
    ["share_top_region", "share", "top region share of sales", 0.5333]
  ],
  "catalog": {
    "charts": ["bigvalue", "table", "bar", "line", "area", "pie", "scatter"],
    "blockedCharts": [
      ["histogram", "rows<20"]
    ],
    "blocks": [
      ["trend-ranking", 0.9, "full", ["bigvalue", "line", "bar"]],
      ["snapshot-ranking", 0.9, "compact", ["bigvalue", "bar"]]
    ],
    "templates": [
      ["sales-overview", 0.86, "full", ["kpi-summary", "trend-ranking"]]
    ]
  },
  "warnings": [
    ["extreme_small_sample", "Only 4 rows. Rankings and comparisons are descriptive only."]
  ],
  "clarificationQuestions": []
}
```

说明：

- 使用 tuple 是为了减少重复 key。
- 完整解释仍可通过 `--verbose` 或 `template/block inspect` 获取。
- Compact schema 需要文档化字段位置，避免 LLM 和程序误读。

### 5.5 兼容策略

为避免破坏现有集成，分两步迁移：

1. 新增 `--compact`，默认仍保持旧输出。
2. Skill 更新后，将默认切到 compact，旧输出改为 `--verbose`。

### 5.6 涉及文件

- `packages/miao-viz-cli/src/analyzer.ts`
- `packages/miao-viz-cli/src/context-schema.ts`
- `packages/miao-viz-cli/src/cli.ts`
- `skills/miao-vision/SKILL.md`
- `packages/miao-viz-cli/src/agent.test.ts`

### 5.7 验收标准

- compact 输出比当前样例 `analyze` 输出减少至少 40% tokens。
- compact 输出仍足够让 Agent 选择 block/template。
- `block instantiate <id> --context context.json` 同时兼容 full 和 compact context，或提供明确转换层。
- `--verbose` 输出保持现有调试能力。

---

## 6. Phase 3：Chart / Report / Template 知识结构化

### 6.1 目标

将可视化 domain knowledge 结构化为三层：

```text
Layer 1: Chart Template
  单个图表适合什么数据、需要哪些字段、反模式是什么、默认 transform 是什么

Layer 2: Report Block
  多个 chart 的常见组合，例如 KPI + ranking、trend + ranking

Layer 3: Report Template
  面向业务场景的完整报告骨架，例如 sales-overview、ops-review
```

### 6.2 Chart Template

当前 `chart-catalog.ts` 已经有 `bestFor`、`antiPatterns`、`requiredEncodings`、`rules`。下一步是补充数据形态和默认 transform recipe。

示例：

```typescript
interface ChartTemplate {
  id: string
  compactFor: string        // "rank,compare"
  requires: string          // "dim(2-20)+measure"
  transformRecipe: string   // "agg>sort(desc)>limit(10)"
  avoid: string             // "dim>30,time>=3"
  insightPattern?: string   // "top {dimension} by {measure}"
}
```

bar 示例：

```json
{
  "bar": {
    "for": "rank,compare",
    "req": "dim(2-20)+measure",
    "tx": "agg>sort(desc)>limit(10)",
    "avoid": "dim>30,time>=3"
  }
}
```

line 示例：

```json
{
  "line": {
    "for": "trend",
    "req": "time(>=3)+measure",
    "tx": "agg(time)>sort(asc)",
    "avoid": "time<3,nominal_x"
  }
}
```

关键点：

- Chart knowledge 由 CLI 执行，不默认全量输出给 LLM。
- `catalog --for-llm` 可输出完整说明。
- `analyze` 默认只输出执行后的结果：可用 chart、blocked chart、推荐 block/template。

### 6.3 Report Block

当前已有 `report-block-registry.ts`。需要调整的是输出策略和 block 能力：

- `analyze` 默认只输出 block summary。
- `block instantiate` 继续输出完整 YAML 草稿。
- block 内部可引用 chart template 的 transform recipe，避免多处维护。

建议 block summary：

```json
["trend-ranking", 0.9, "full", ["bigvalue", "line", "bar"]]
```

完整 block inspect：

```bash
miao-viz block inspect trend-ranking --format json
```

### 6.4 Report Template

新增 Layer 3 Template，用于完整报告骨架。

```typescript
interface ReportTemplate {
  id: string
  bestFor: string[]
  requires: Array<'measure' | 'dimension' | 'time'>
  blocks: string[]
  density: 'compact' | 'medium' | 'full'
  canUse(ctx: AnalyzeContext): TemplateDecision
  instantiate(ctx: AnalyzeContext): AgentReportSpec
}
```

基础模板：

| Template | 组成 | 适用场景 |
|----------|------|----------|
| `snapshot-overview` | `kpi-summary` + `snapshot-ranking` | 静态对比、无时间要求 |
| `trend-ranking-overview` | `kpi-summary` + `trend-ranking` | 趋势 + 分类排名 |
| `full-detail-report` | `kpi-summary` + `trend-ranking` + detail table | 完整业务分析 |
| `composition-review` | `kpi-summary` + `comparison-breakdown` | 份额、构成、占比 |

新增命令：

```bash
miao-viz template list
miao-viz template inspect <id>
miao-viz template instantiate <id> --context context.json --output report.yaml
```

### 6.5 为什么不用自定义 DSL 作为默认输出

自定义 DSL 可以更短，但不适合作为 CLI 默认输出：

- 需要维护 parser、schema 和错误提示。
- 版本兼容性弱于 JSON。
- 其他工具接入成本更高。
- JSON 的 token 问题可以通过 compact tuple、短 key、按需展开解决。

建议：

- 内部模板源文件可以使用 YAML 或简洁 DSL，方便人维护。
- CLI 对外输出仍使用 JSON，默认 compact，调试 verbose。

### 6.6 涉及文件

- `packages/miao-viz-cli/src/chart-catalog.ts`
- `packages/miao-viz-cli/src/report-block-registry.ts`
- 新增 `packages/miao-viz-cli/src/report-template-registry.ts`
- `packages/miao-viz-cli/src/cli-block.ts`
- 新增 `packages/miao-viz-cli/src/cli-template.ts`
- `packages/miao-viz-cli/src/analyzer.ts`
- `skills/miao-vision/SKILL.md`

### 6.7 验收标准

- `analyze` 能输出 compact template candidates。
- `template instantiate` 能生成可 validate/render 的 report spec。
- 模板不可用时输出 blocked reason，例如 `timePeriods<3`。
- Agent 不需要读取完整 chart knowledge 也能生成稳定报告。

---

## 7. Phase 4：低置信度澄清问题

### 7.1 目标

当数据字段存在多个合理解释时，让 CLI 输出结构化假设和可选澄清问题。

不是每次都问用户，而是给 Agent 决策：

- 用户要求快速报告：使用默认假设，并在报告中说明。
- 用户要求精准业务分析：询问最多 1 个关键问题。

### 7.2 数据结构

```typescript
interface AnalyzeAssumption {
  key: 'primary_measure' | 'primary_dimension' | 'time_field'
  value: string
  confidence: number
  alternatives?: string[]
  reason?: string
}

interface ClarificationQuestion {
  id: string
  question: string
  options: string[]
  blocking: boolean
  appliesTo: 'measure' | 'dimension' | 'time' | 'template'
}
```

示例：

```json
{
  "assumptions": [
    {
      "key": "primary_measure",
      "value": "sales",
      "confidence": 0.62,
      "alternatives": ["orders", "profit"],
      "reason": "multiple numeric measures detected"
    }
  ],
  "clarificationQuestions": [
    {
      "id": "primary_measure",
      "question": "这份报告优先分析 sales、orders 还是 profit？",
      "options": ["sales", "orders", "profit"],
      "blocking": false,
      "appliesTo": "measure"
    }
  ]
}
```

### 7.3 触发规则

| 场景 | 处理 |
|------|------|
| 只有一个明显 measure/dimension | 不问 |
| 多个 numeric measure 且名称都像业务指标 | 输出非阻塞问题 |
| 用户明确要求“精准/业务决策/给老板看” | Agent 可询问 1 个问题 |
| 输出格式不明确且影响 workflow | 阻塞问题 |
| 数据证据不足 | 不问业务问题，直接加 caveat |

### 7.4 Skill 行为

Skill 更新为：

```text
If clarificationQuestions exists:
  - Ask at most one blocking question.
  - For non-blocking questions, proceed with the default assumption unless the user is explicitly asking for precision.
  - Write assumptions into report description or insight caveat.
```

### 7.5 涉及文件

- `packages/miao-viz-cli/src/context-schema.ts`
- `packages/miao-viz-cli/src/analyzer.ts`
- `skills/miao-vision/SKILL.md`

### 7.6 验收标准

- 多 measure 数据集输出 assumptions 和 non-blocking clarification question。
- Skill 不会在普通“生成报告”请求中频繁中断。
- 用户回答后可通过 `--correct-assumption` 重新 analyze。

---

## 8. Phase 5：Strict Verify 与 Inspect

### 8.1 Strict Verify

当前 `validate --verify` 以 warnings 为主。建议新增：

```bash
miao-viz validate --spec report.yaml --profile profile.json --context context.json --verify --strict
```

strict 模式下以下 warning 升级为 hard error：

- 缺少 required caveat。
- 使用 forbidden words。
- 使用 blocked chart。
- insight object 中 evidence id 不存在。
- text 中 `$evidence` 路径不存在。

### 8.2 Inspect

`inspect` 用于调试 chart transform pipeline：

```bash
miao-viz inspect --input data.csv --spec report.yaml --context context.json --output inspect.json
```

输出：

```json
{
  "charts": [
    {
      "id": "ranking_by_region",
      "transforms": [
        { "step": 1, "type": "aggregate", "inputRows": 4, "outputRows": 3, "preview": [] },
        { "step": 2, "type": "sort", "inputRows": 3, "outputRows": 3, "preview": [] }
      ],
      "encoding": {
        "x": { "field": "region", "resolvedType": "string", "specType": "nominal", "match": true },
        "y": { "field": "total_sales", "resolvedType": "number", "specType": "quantitative", "match": true }
      }
    }
  ],
  "evidence": {
    "defined": ["total", "by_dimension"],
    "referenced": ["total"],
    "unreferenced": ["by_dimension"]
  }
}
```

### 8.3 验收标准

- strict 模式可用于 CI 或 Agent final gate。
- inspect 能解释每个 chart transform 后的数据形态。
- Agent 不需要通过最终 HTML 反推 chart 为什么错。

---

## 9. 实施顺序

建议按风险收益排序：

```text
Phase 1：结构化 Insight
  ↓
Phase 2：Compact Analyze 输出
  ↓
Phase 3：Report Template Registry
  ↓
Phase 4：Assumptions + Clarification Questions
  ↓
Phase 5：Strict Verify + Inspect
```

拆分为可交付任务：

| 优先级 | 任务 | 预估 |
|--------|------|------|
| P0 | `AgentInsight` union type + schema + renderer 兼容 | 1 天 |
| P0 | insight evidence/caveat verify 规则 | 0.5 天 |
| P1 | `analyze --compact` 输出 | 1 天 |
| P1 | Skill 切换到 compact workflow | 0.5 天 |
| P1 | block summary / verbose 分离 | 0.5 天 |
| P2 | template registry + `template instantiate` | 2-3 天 |
| P2 | chart template recipe 字段补齐 | 1 天 |
| P3 | assumptions/confidence/clarificationQuestions | 1-2 天 |
| P3 | strict verify | 0.5 天 |
| P4 | inspect 命令 | 2-3 天 |

---

## 10. 测试计划

### 10.1 Unit Tests

新增测试覆盖：

- `insights` 同时支持 string 和 object。
- object insight 的 `evidence[]` id 不存在时报错。
- 有 `sampleWarnings` 但缺 caveat 时 strict 报错。
- compact analyze 输出结构稳定。
- block/template instantiate 生成 spec 可 validate。
- clarificationQuestions 只在低置信度场景出现。

### 10.2 Golden Fixtures

新增 fixtures：

```text
packages/miao-viz-cli/fixtures/
  sales-structured-insights.yaml
  sales-compact-context.json
  sales-template-overview.yaml
  multi-measure-clarification-context.json
```

### 10.3 Agent Workflow Smoke

最少覆盖三类数据：

| 数据 | 期望 |
|------|------|
| 小样本 sales | 生成 caveat，禁止过度解读 |
| 多 measure sales/profit/orders | 输出 assumption 或 clarification |
| 有时间字段且 `timePeriods>=3` | 推荐 trend template |

---

## 11. 成功指标

| 指标 | 当前 | 目标 |
|------|------|------|
| 简单报告一次 validate 通过率 | 中上 | ≥ 90% |
| insight evidence 可追踪率 | 依赖文本约定 | 100% object insight 可追踪 |
| analyze 默认 token | 样例约 3k+ tokens | 降低 40%+ |
| blocked chart 被误用 | warning 为主 | strict 可 hard fail |
| LLM 手写完整 spec 比例 | 中等 | 优先 instantiate，显著降低 |
| 用户被打断次数 | 无机制 | 仅低置信度关键问题 |

---

## 12. 风险与缓解

| 风险 | 影响 | 缓解 |
|------|------|------|
| compact tuple 可读性下降 | Agent 或开发者误读字段位置 | 提供 compact schema 文档和 `--verbose` |
| 结构化 insight 增加 spec 复杂度 | LLM 初期可能写错 | 保持 string 向后兼容，Skill 给模板 |
| template 抽象过早 | 复杂需求被模板限制 | 保留 manual chart selection escape hatch |
| 澄清问题打断体验 | 用户感觉繁琐 | 默认 non-blocking，最多问 1 个关键问题 |
| strict 模式误杀 | 正常报告被阻断 | strict 仅用于 final gate，可用普通 verify 调试 |

---

## 13. 最终目标形态

理想的 Agent 工作流：

```text
1. miao-viz analyze data.csv --intent "..." --compact
2. Agent 读取 compact context
3. 如有 blocking clarification，问用户；否则使用默认 assumption
4. miao-viz template instantiate <template-id> --context context.json --output report.yaml
5. Agent 填结构化 insights
6. miao-viz validate --context context.json --verify --strict
7. miao-viz render --theme editorial --format html
```

最终分工：

```text
CLI:
  计算证据、判断样本风险、选择 chart/template 候选、校验、渲染

LLM:
  选择候选、表达洞察、处理用户偏好、修复结构化错误

User:
  只在关键业务假设不明确时提供选择
```

这能把报告生成从“LLM 自觉遵守规则”推进到“工具执行规则，LLM 在规则内表达”，是提升稳定性和降低 token 成本的关键。
