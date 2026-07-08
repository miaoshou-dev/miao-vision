# Catalog 产品化 PRD v2 — 三层 Catalog 架构

> ✅ **已归档（2026-06-26）**：本 PRD 全部实现，commit `0044cd2`，77 个测试通过。
> 待完成的遗留项已迁入 `docs/cli-backlog-v3.md`。本文档仅供设计参考，不再追踪任务状态。
>
> 综合 HyperFrames、json-render 竞品分析及 v1 实施经验的升级版本
> 日期：2026-06-26
> 关联：`docs/catalog-productization-prd.md`（v1，已被本文档取代）
> 关联：`docs/cli-llm-improvement-proposal.md`、`docs/json-render-lessons-for-miao-viz.md`

---

## 与 v1 的核心差异

v1 PRD 只做了"给 LLM 更好的元数据"——catalog.blocks 是 LLM 读的文档，matchBlocks 是过滤函数。

v2 的范式转变来自两个竞品的核心洞察：

**来自 json-render：** Catalog 不是文档，是同时服务五个角色的单一合约（prompt source、type source、validation source、runtime contract、product boundary）。现在 miao-viz 的 `REQUIRED_ENCODINGS` 硬编码在 spec-validator.ts，chart rules 散落在 SKILL.md prose，和 catalog 是三套独立维护的内容——这会 drift。

**来自 HyperFrames：** Block 最重要的不是"让 LLM 读规则"，而是"给 LLM 一个从具体实例出发的起点"。`block instantiate` 生成含真实字段名的 VizSpec 草稿，LLM 做审查和补写，而不是从规范推导输出。这把 LLM 的工作性质从"生成"变成"校对"。

---

## 五条核心设计原则

1. **编译下沉**：一切都向 VizSpec 编译，validate 和 render 只消费 VizSpec，对上层抽象无感知。
2. **Catalog 是单一 source of truth**：chart rules、prompt descriptions、validation 规则从同一份定义生成，不多处维护。
3. **从具体实例出发，不从抽象规则推导**：block instantiate 给 LLM 一个已填好字段的草稿，降低 LLM 推导错误率。
4. **Edit 与 New 区分**：修改现有 spec 输出最小变更，不重写整份文档，防止回归。
5. **Catalog 质量决定输出质量**：模糊的 catalog 产出模糊的 artifact，description/bestFor/examplePrompt 的质量直接影响 LLM 选择准确率。

---

## 当前状态快照

基于 `docs/cli-llm-improvement-proposal.md` 的阶段追踪：

| 能力 | 文件 | 状态 |
|------|------|------|
| `analyze` 命令（evidence + catalog） | `analyzer.ts` | ✅ 已实现 |
| `catalog.charts` / `blockedCharts` | `context-schema.ts` | ✅ 已实现 |
| `$evidence` 指令解析 | `directive-resolver.ts` | ✅ 已实现 |
| `validate --patch-hints` | `patch-hints.ts` | ✅ 已实现 |
| `validate --verify`（禁用词 + caveat） | `spec-validator.ts` | ✅ 已实现 |
| `validate --context`（$evidence 路径校验） | `spec-validator.ts` | ✅ 已实现 |
| `article --spec-input` | `cli.ts` | ✅ 已实现 |
| **Catalog 统一（5个角色）** | 分散在多处 | ❌ **待实现** |
| **`catalog.blocks`（Layer 2）** | 无 | ❌ **待实现** |
| **`block instantiate` 命令** | 无 | ❌ **待实现** |
| **结构性视觉 warnings（V01–V04）** | `spec-validator.ts` | ❌ **待实现** |
| **Edit Mode（SKILL.md 区分新建/修改）** | `SKILL.md` | ❌ **待实现** |
| **Intent routing（SKILL.md 入口路由）** | `SKILL.md` | ❌ **待实现** |
| `miao-viz inspect` | 无 | ❌ 延后 |
| `catalog.templates`（Layer 3） | 无 | ❌ 延后 |

关键的现有问题：`spec-validator.ts:15` 的 `REQUIRED_ENCODINGS` 是硬编码常量，和 catalog 不连接；chart rules（`line on nominal x` 等）散落在 SKILL.md prose 里，无法被 validator 执行。

---

## 三层 Catalog 架构总览

```
Layer 3: Template（延后）
  完整报告骨架 = 有序 Block 集合 + 共享变量命名空间
  编译 → Block[]

Layer 2: ReportBlock（本次实现）
  业务语义组合 = 1-N 个 Chart + 选择逻辑 + 默认变量
  编译 → VizSpec sections[]

Layer 1: Unified Chart Catalog（本次实现）
  原子图表合约 = 类型 + 必需 encoding + 允许 transforms + 机器可读 rules
  服务 → prompt / validate / runtime / product boundary

          ↓ 全部编译到 ↓

VizSpec（终态语言，validate 和 render 唯一消费格式）
          ↓
validate → render
```

LLM 操作层级越高，出错率越低：

| LLM 操作 | 认知负担 | 主要错误来源 |
|---------|---------|------------|
| 从 block instantiate 草稿审查 + 补写 | 最低 | 几乎无结构错误 |
| 选 block + 确认变量 | 低 | 变量值判断错误 |
| 从 catalog.charts 写完整 spec | 中 | transform 顺序、encoding 类型 |
| 自由写 spec（escape hatch） | 高 | 各类结构和语义错误 |

---

## Layer 1：Unified Chart Catalog

### 设计目标

把现在散落在三处的 chart 定义合并到一个结构：

- `spec-validator.ts:REQUIRED_ENCODINGS`（硬编码）
- SKILL.md 里的 chart 选择规则（prose）
- `analyzer.ts:buildCatalog()`（逻辑）

### `ChartCatalogItem` 接口

```typescript
// 新文件：packages/miao-viz-cli/src/chart-catalog.ts

// validate 函数的返回类型：null 表示通过，非 null 表示触发该规则
export interface ValidationIssue {
  code: string
  severity: 'error' | 'warning'
  message: string
  chartId?: string
  patchHint?: object   // 可选：供 patch-hints.ts 使用的修复建议
}

interface ChartRule {
  code: string
  severity: 'error' | 'warning'
  expression: string          // 人类可读描述，用于 prompt 和 antiPatterns
  // 返回 null 表示规则通过，返回 ValidationIssue 表示触发
  validate?: (chart: AgentChartSpec, ctx?: AnalyzeContext) => ValidationIssue | null
  message: string
}

interface ChartCatalogItem {
  id: string                  // "bar", "line", "pie" ...
  displayName: string
  requiredEncodings: string[] // ["x", "y"]
  // 注意：filter 不在此列表，直到 renderer 实现 filter 执行分支
  allowedTransforms: string[] // ["aggregate", "sort", "limit", "derive-month"]
  rules: ChartRule[]
  bestFor: string[]           // ["ranking", "comparison", "top-N"]
  antiPatterns: string[]      // 放进 promptRules 的反例
  minDataPoints?: number      // 低于此值 blockedCharts
}
```

示例（bar chart）：

```typescript
{
  id: 'bar',
  displayName: 'Bar Chart',
  requiredEncodings: ['x', 'y'],
  allowedTransforms: ['aggregate', 'sort', 'limit', 'derive-month'], // filter 不包含
  rules: [
    {
      code: 'X_MUST_BE_DIMENSION',
      severity: 'error',
      expression: 'x.type must be nominal',
      validate: (chart) => {
        if (chart.encoding?.x?.type && chart.encoding.x.type !== 'nominal') {
          return {
            code: 'X_MUST_BE_DIMENSION',
            severity: 'error',
            message: `bar chart x axis has type '${chart.encoding.x.type}', expected 'nominal'`,
            chartId: chart.id,
            patchHint: { op: 'replace', path: `/encoding/x/type`, value: 'nominal' }
          }
        }
        return null
      },
      message: 'bar chart x axis must be a dimension (nominal) field'
    },
    {
      code: 'TOO_MANY_CATEGORIES',
      severity: 'warning',
      expression: 'x.distinctCount > 12',
      // 无 validate 函数：依赖 context 的 distinctCount，在 analyzer 侧处理
      message: 'More than 12 categories: consider top-N limit or use table'
    }
  ],
  bestFor: ['ranking', 'comparison', 'top-N', 'snapshot'],
  antiPatterns: ['Do not use bar for time series with ≥3 periods (use line)']
}
```

### 对 `spec-validator.ts` 的影响

`REQUIRED_ENCODINGS` 常量**删除**，改为从 `CHART_CATALOG` 读取：

```typescript
// 现在（硬编码）
const REQUIRED_ENCODINGS: Record<string, string[]> = {
  bar: ['x', 'y'],
  line: ['x', 'y'],
  ...
}

// 变更后（catalog 驱动）
import { CHART_CATALOG } from './chart-catalog'
const requiredEncodings = CHART_CATALOG.find(c => c.id === chart.type)?.requiredEncodings ?? []
```

**severity 执行分流规则：**

| rule.severity | 执行位置 | 后果 |
|--------------|---------|------|
| `'error'` | `validateReportSpec()` 主函数 | 返回 `AgentError`，阻断 validate |
| `'warning'` | `collectValidationWarnings()` | 追加到 warnings 数组，非 fatal |
| 有 `patchHint` | `patch-hints.ts` | 同时生成可应用的修复 patch |

规则执行模式：

```typescript
// validateReportSpec() 中对 error 规则：
for (const rule of catalogItem.rules.filter(r => r.severity === 'error')) {
  const issue = rule.validate?.(chart, context)
  if (issue) return agentError(issue.code, issue.message, { chartId: issue.chartId })
}

// collectValidationWarnings() 中对 warning 规则：
for (const rule of catalogItem.rules.filter(r => r.severity === 'warning')) {
  const issue = rule.validate?.(chart, context)
  if (issue) warnings.push(issue.message)
}
```

这替代现有零散的语义检查（line on nominal x、derive-month on string 等），使所有 chart 规则有统一的入口和分流逻辑。

### `miao-viz catalog --for-llm` 命令

输出 catalog 的 LLM 可读形式，作为 SKILL.md system prompt 的动态部分：

```bash
miao-viz catalog --for-llm --output /tmp/catalog.json
```

输出结构：

```json
{
  "charts": [
    {
      "id": "bar",
      "requiredEncodings": ["x", "y"],
      "allowedTransforms": ["aggregate", "sort", "limit", "derive-month"],
      "rules": ["x axis must be nominal (dimension field)", "warn if >12 categories"],
      "bestFor": ["ranking", "comparison", "top-N", "snapshot"],
      "antiPatterns": ["not for time series with ≥3 periods (use line instead)"]
    }
  ],
  "blocks": [...],
  "version": "1.0.0"
}
```

这替代现在 SKILL.md 里手写的 chart 规则列表，catalog 升级时自动同步，消除 drift。

---

## Layer 2：ReportBlock Registry

### ReportBlockResolver 接口

采用接口模式（非函数式），每个 block 封装自己的选择逻辑和编译逻辑：

```typescript
// packages/miao-viz-cli/src/report-block-registry.ts
export interface BlockDecision {
  ok: boolean
  score: number       // 0-1，0.9+ 强匹配，0.5-0.9 可用，<0.5 不推荐
  reason?: string     // ok=false 时的原因，如 "timePeriods=2 < 3"
  warnings?: string[] // ok=true 但有限制条件
}

export interface ReportBlockResolver {
  id: string
  description: string        // 给 LLM 看的业务语义描述
  bestFor: string[]
  density: 'compact' | 'medium' | 'full'
  examplePrompt: string
  variables: Record<string, BlockVariableDef>
  qualityChecks: string[]

  canUse(ctx: AnalyzeContext): BlockDecision

  defaultVariables(ctx: AnalyzeContext): Record<string, unknown>

  // 编译 block → VizSpec sections（charts + insights 片段）
  compile(
    variables: Record<string, unknown>,
    ctx: AnalyzeContext
  ): { charts: AgentChartSpec[]; insights?: string[] }
}

export interface BlockVariableDef {
  type: 'field' | 'number' | 'string' | 'enum'
  role?: 'measure' | 'dimension' | 'time'
  description: string
  default?: string | number
  min?: number
  max?: number
  enumValues?: string[]
  required: boolean
}
```

### 6 个预置 Block

| id | 业务场景 | 必需条件 | charts |
|----|---------|---------|--------|
| `kpi-summary` | 纯 KPI 总览 | measure ≥ 1 | bigvalue |
| `snapshot-ranking` | 静态排名（无时间） | measure ≥ 1, dim ≥ 1 | bigvalue + bar |
| `trend-overview` | 时间趋势 | measure ≥ 1, time ≥ 3 | bigvalue + line |
| `comparison-breakdown` | 双视角对比 | measure ≥ 1, dim ≥ 1 | bar + pie |
| `trend-ranking` | 趋势 + 排名（执行摘要） | measure ≥ 1, dim ≥ 1, time ≥ 3 | bigvalue + line + bar |
| `full-detail-report` | 完整分析报告 | measure ≥ 1, dim ≥ 1, time ≥ 3 | bigvalue + line + bar + table |

### `canUse` scoring 规则

```
基础分 = 0.5（满足 requiredRoles）
+0.2   所有 block.charts 都在 catalog.charts（非 blocked）
+0.1   timePeriods 充足度（trend 类：timePeriods/3，满分 0.1）
+0.1   有 evidence 覆盖主要 dimension
+0.1   distinctCount 在合理范围（dim ≤ 20）
```

score ≥ 0.9 → 强推荐；0.7–0.9 → 可用；< 0.7 → 列入 blockedBlocks 并说明原因。

### `analyze` 输出扩展

`AnalyzeCatalog` 新增 `blocks` 和 `blockedBlocks`：

```typescript
// packages/miao-viz-cli/src/context-schema.ts 扩展
export interface CatalogBlockEntry {
  id: string
  score: number
  description: string
  bestFor: string[]
  density: 'compact' | 'medium' | 'full'
  examplePrompt: string
  charts: string[]             // 该 block 展开后使用的 chart 类型
  variables: Record<string, {
    type: string
    role?: string
    description: string
    default?: string | number  // analyze 基于数据自动填入
    min?: number
    max?: number
  }>
  qualityChecks: string[]
}

export interface BlockedBlockEntry {
  id: string
  reason: string              // 机器可读，如 "timePeriods=2 < 3"
}

export interface AnalyzeCatalog {
  charts: string[]
  blockedCharts: Array<{ type: string; reason: string }>
  recommendedPlan: Array<{ type: string; note?: string }>
  blocks?: CatalogBlockEntry[]        // 新增，optional，按 score 降序
  blockedBlocks?: BlockedBlockEntry[] // 新增，optional
}

// Zod schema（context-schema.ts 中）：
// blocks: z.array(catalogBlockEntrySchema).optional()
// blockedBlocks: z.array(blockedBlockEntrySchema).optional()
//
// analyzer.ts 始终输出数组（空时为 []，而非 undefined）：
// return { charts, blockedCharts, recommendedPlan, blocks: matched, blockedBlocks: rejected }
```

### `block instantiate` 命令（关键新增）

这是 v2 最重要的新命令，将 LLM 工作性质从"生成"变为"审查"：

```bash
miao-viz block instantiate snapshot-ranking \
  --context /tmp/miao-vision/context.json \
  --output /tmp/miao-vision/draft.yaml
```

**关键设计约束：`block instantiate` 输出合法 VizSpec。**

- chart data 使用标准 `transform` 处理原始数据集字段，不引入 `$evidence` 到 chart data 中
- `$evidence` 只出现在 `insights` 文本字符串里（由现有 `directive-resolver.ts` 解析）
- 字段名和 evidence id 从 context.json 的实际值中推导（`by_dimension`、`total_<measure>`），不使用假设名
- `spec-schema.ts` 无需修改

内部流程：
1. 找到 `snapshot-ranking` resolver
2. 调用 `canUse(ctx)` 确认可用
3. 调用 `defaultVariables(ctx)` 从 context.fields 推导：primaryMeasure=`sales`，primaryDimension=`region`，topN=10
4. 调用 `compile(variables, ctx)` 生成合法 VizSpec

**真实输出示例**（基于 `test_data/agent-sales.csv` analyze 结果，evidence id 为 `total`、`by_dimension`）：

```yaml
# Generated by: miao-viz block instantiate snapshot-ranking --context context.json
# Block: snapshot-ranking (score: 0.92)
# Variables: primaryMeasure=sales, primaryDimension=region, topN=10
# IMPORTANT: Review field names, adjust topN, fill insights[] before validate

charts:
  - id: kpi_total_sales
    type: bigvalue
    title: "Total Sales"
    data:
      transform:
        - type: aggregate
          measures:
            - { field: sales, op: sum, as: total_sales }
    encoding:
      value: { field: total_sales, type: quantitative }

  - id: ranking_by_region
    type: bar
    title: "Sales by Region"
    data:
      transform:
        - type: aggregate
          groupBy: [region]
          measures:
            - { field: sales, op: sum, as: total_sales }
        - type: sort
          field: total_sales
          order: desc
        - type: limit
          value: 10              # value 字段，对应 transformSchema，不是 n
    encoding:
      x: { field: region, type: nominal }
      y: { field: total_sales, type: quantitative }

insights:
  - "Total sales: {$evidence:total.values.total_sales}"  # $evidence 只在 insights 文本里
  # Add more: compare top region, mention sampleWarnings as caveat if present

# Quality checks (from block definition):
# [ ] bar chart has sort (desc) + limit — already included above
# [ ] Add caveat if context.json contains sampleWarnings
# [ ] Do not exceed 4 bigvalue cards
```

**LLM 看到这份草稿后的任务（审查而非生成）：**
- 确认 `region` / `sales` 是 context.fields 里的真实字段名
- 如需 top5 改 `value: 5`
- 补写 `insights[]`，引用 `by_dimension` evidence id
- 如有 `sampleWarnings`，在 insights 末尾加 caveat

不需要推导 transform 顺序、aggregate alias 命名、encoding 类型。

---

## Edit Mode（新增）

### 问题

现在 SKILL.md 只有一种模式：LLM 每次都写完整 spec。用户说"把 topN 改成 5"，LLM 重写整份文档。这会：
- 消耗不必要的 token
- 引入回归（改了不该改的部分）

### 设计

SKILL.md 新增 **Edit Mode** 入口，与新建模式平级：

**新建模式（当前没有 spec）：**
```
analyze → [block instantiate 生成草稿] → LLM 审查补写 → validate → render
```

**Edit 模式（已有 spec，用户要修改）：**
```
LLM 读取现有 spec + context.json
→ 识别需要修改的最小范围
→ 输出修改后的 spec（只改相关部分，其余保持不变）
→ validate → render
```

Edit 模式的 SKILL.md 指令要点：

```markdown
**Edit mode — when modifying an existing spec:**

1. Read the existing spec file completely before making changes.
2. Identify the minimum set of changes needed. Do NOT regenerate the whole spec.
3. Common edit patterns:
   - Change a parameter: modify that field only (e.g., transform type limit → value: 5)
   - Add a chart: append to charts[], do not touch existing charts
   - Fix a validate warning: apply the patch-hints output directly
4. After editing, run validate again to confirm no regressions.

Rewrite the full spec ONLY when: the user asks for a completely different report structure,
or >50% of the spec needs to change.
```

### patch-hints 扩展

Edit 模式下，`validate --patch-hints` 提供的自动修复范围扩展：

| 错误 | 现有 | 新增 |
|------|------|------|
| `UNSUPPORTED_TRANSFORM` | ✅ patch | — |
| `BLOCKED_CHART_STRICT` | ✅ patch | — |
| `MISSING_ENCODING` | ✅ patch | — |
| `line/area 缺少 sort transform` | ❌ | ✅ 自动补 sort |
| `encoding.x.type` 与字段 role 不符 | ❌ | ✅ 自动修正类型 |
| `bigvalue count > 4` | ❌ | ✅ 提示合并，给出 merge spec |

---

## Catalog 作为单一 Source of Truth

### 现状问题（drift）

```
SKILL.md prose       ← LLM 读（可能过时）
spec-validator.ts    ← validator 执行（独立维护）
analyzer.ts          ← catalog 生成（又一套逻辑）
```

三处内容独立维护，任何一处更新都需要同步其他两处，实际上会 drift。

### 目标：从 catalog 生成所有三处

```
chart-catalog.ts (CHART_CATALOG[])
    ├── → catalog --for-llm → SKILL.md 的动态 catalog 部分
    ├── → spec-validator.ts 的 rules 执行
    └── → analyzer.ts 的 blockedCharts 判断
```

具体：

- `CHART_CATALOG` 里每个 `rule.validate` 函数，在 `collectValidationWarnings()` 里遍历执行
- `CHART_CATALOG` 里每个 `minDataPoints`，在 `buildCatalog()` 里判断是否 block
- `CHART_CATALOG` 里每个 `bestFor` + `antiPatterns`，作为 `catalog --for-llm` 的输出内容

这样 SKILL.md 里不再手写 chart 规则列表，而是引用 `catalog --for-llm` 的输出。

---

## SKILL.md 结构优化

### Intent Routing（新增第 0 步）

在 analyze 之前加入意图分类，路由到专项工作流：

```
用户请求
  ↓
Intent Routing（第 0 步）
  ├── 时间趋势   → time ≥ 3？→ trend-overview / trend-ranking
  ├── 静态排名   → dim + measure？→ snapshot-ranking
  ├── 分布分析   → measure 分布？→ histogram / distribution
  ├── 多维对比   → ≥ 2 维？→ comparison-breakdown
  ├── 完整摘要   → 执行层报告？→ full-detail-report
  └── 自定义     → 用户有特定要求 → 从 catalog.charts 直接写 spec
```

路由的输出不是选一个 block，是**缩窄 catalog.blocks 的推荐范围**，让 LLM 在 analyze 后只需从 1-2 个候选 block 中选择，而不是看完整列表。

### Prompt Caching 分层

参考 json-render 的缓存策略，将 SKILL.md 拆成两部分：

**System prompt（大、变化慢 → 标记 cache_control）：**
- 工作流说明（phases 1-4）
- 表达性规则（禁用词、Conservative Language）
- Transform / encoding 语法参考
- Self-Review checklist

**User prompt（小、每次变化 → 不缓存）：**
- context.json 内容（fields、evidence、catalog.blocks、sampleWarnings）
- 用户的具体意图
- 当前 spec（edit 模式时）

这使 SKILL.md 的 ~2000 token 在多轮对话中只需发送一次，每次只传 ~500 token 的 context.json。

### Block Selection 指引（Phase 3 新增段落）

```markdown
**Block selection — before writing charts:**

1. Read `catalog.blocks` (sorted by score). Pick the block whose `bestFor` matches your intent.
2. Run `miao-viz block instantiate <id> --context context.json` to get a draft spec.
3. Review the draft: confirm field names, adjust variables (e.g. topN), fill insights.
4. Append the block's `qualityChecks` to your Self-Review checklist.

If `catalog.blocks` is empty, or user request doesn't match any block: build from `catalog.charts` directly.
If `catalog.blockedBlocks` contains a seemingly relevant block: read its reason, explain the limitation to the user.
```

---

## 结构性视觉 Warnings（V01–V04）

在 `collectValidationWarnings()` 末尾新增，纯 spec 分析（不依赖 context）：

| 编号 | 检查 | severity |
|------|------|---------|
| V01 | chart 总数 > 6 | warning |
| V02 | bigvalue 数量 > 4 | warning |
| V03 | line 图无 sort transform | warning |
| V04 | area 图无 sort transform | warning |

V03/V04 在 `patch-hints` 里提供自动修复（补 sort）。

---

## 文件变更清单

所有路径均相对于仓库根目录，CLI 源码在 `packages/miao-viz-cli/src/`：

| 文件 | 类型 | 变更内容 |
|------|------|---------|
| `packages/miao-viz-cli/src/chart-catalog.ts` | **新建** | `ValidationIssue`、`ChartRule`、`ChartCatalogItem` 接口；`CHART_CATALOG` 常量（9 种 chart） |
| `packages/miao-viz-cli/src/report-block-registry.ts` | **新建** | `BlockDecision`、`ReportBlockResolver`、`BlockVariableDef` 接口；6 个 block resolver 实现 |
| `packages/miao-viz-cli/src/context-schema.ts` | 扩展 | `CatalogBlockEntry`、`BlockedBlockEntry` 接口；`AnalyzeCatalog.blocks?`、`blockedBlocks?` optional 字段；Zod schema 更新 |
| `packages/miao-viz-cli/src/analyzer.ts` | 修改 | `buildCatalog()` 调用 block resolver matching；import `CHART_CATALOG` 驱动 blockedCharts 判断 |
| `packages/miao-viz-cli/src/spec-validator.ts` | 修改 | 删除 `REQUIRED_ENCODINGS` 常量（改从 `CHART_CATALOG` 读）；error 规则进主验证、warning 规则进 warnings；新增 V01–V04；patch-hints 扩展 |
| `packages/miao-viz-cli/src/cli.ts` | 修改 | 新增 `block instantiate <id>` 子命令；新增 `catalog --for-llm` 命令 |
| `skills/miao-vision/SKILL.md` | 修改 | 新增 Intent Routing（第 0 步）；Phase 3 新增 Block Selection 段；新增 Edit Mode 说明；System/User prompt 分层注释 |
| `packages/miao-viz-cli/fixtures/` | **新建目录** | golden fixture 文件（见下节） |

**不需要修改：**
- `packages/miao-viz-cli/src/agent.test.ts`：`blocks?` 为 optional，现有内联 catalog 对象不受影响
- `packages/miao-viz-cli/src/spec-schema.ts`：VizSpec 格式不变（`$evidence` 只在 insights 文本，chart data 用标准 transforms）
- `packages/miao-viz-cli/src/html-export.ts` / `deck-renderer.ts`：render 层无感知

---

## Golden Fixture（验收基准）

### 设计目的

golden fixture 同时服务三个目的：
1. **PRD 示例的来源**：示例从真实输出反向写入文档，而非凭空假设
2. **block instantiate 的验收标准**：锁定 schema 格式、evidence id 命名、transform 字段名
3. **回归防护**：任何 analyzer / block resolver / validator 变更后跑 fixture 确认

### 文件结构

```
packages/miao-viz-cli/fixtures/
├── sales.csv                              # 测试数据（可复用 examples/sales.csv）
├── sales-context.json                     # miao-viz analyze 的锁定输出
├── sales-snapshot-ranking-draft.yaml      # miao-viz block instantiate 的锁定输出
└── sales-snapshot-ranking-validated.yaml  # 人工补写 insights 后可通过 validate 的最终 spec
```

### 验收命令序列

```bash
# Step 1: analyze（输出应与 sales-context.json 一致）
miao-viz analyze fixtures/sales.csv \
  --intent "regional sales ranking" \
  --output /tmp/test-context.json

# Step 2: block instantiate（输出应与 sales-snapshot-ranking-draft.yaml 一致）
miao-viz block instantiate snapshot-ranking \
  --context /tmp/test-context.json \
  --output /tmp/test-draft.yaml

# Step 3: validate draft（应通过，无 error；允许有 insights 缺失 warning）
miao-viz validate \
  --spec /tmp/test-draft.yaml \
  --context /tmp/test-context.json

# Step 4: validate final（必须完全通过，包括 --verify）
miao-viz validate \
  --spec fixtures/sales-snapshot-ranking-validated.yaml \
  --context fixtures/sales-context.json \
  --verify
```

### `sales-context.json` 关键字段锁定

根据 `analyzer.ts` 实际输出命名规则（`total_<measure>`、`by_dimension`、`by_time`）：

```json
{
  "evidence": [
    { "id": "total", "values": { "total_sales": 450, "row_count": 4 } },
    { "id": "by_dimension", "rows": [
      { "region": "East", "total_sales": 240, "share": 0.533 },
      { "region": "West", "total_sales": 120, "share": 0.267 }
    ]}
  ],
  "catalog": {
    "blocks": [
      { "id": "snapshot-ranking", "score": 0.92,
        "variables": {
          "primaryMeasure": { "default": "sales" },
          "primaryDimension": { "default": "region" },
          "topN": { "default": 10 }
        }
      }
    ]
  }
}
```

### `sales-snapshot-ranking-draft.yaml` 关键字段锁定

必须是合法 VizSpec，能直接通过 `miao-viz validate`：

```yaml
charts:
  - id: kpi_total_sales
    type: bigvalue
    data:
      transform:
        - type: aggregate
          measures: [{ field: sales, op: sum, as: total_sales }]
    encoding:
      value: { field: total_sales, type: quantitative }

  - id: ranking_by_region
    type: bar
    data:
      transform:
        - type: aggregate
          groupBy: [region]
          measures: [{ field: sales, op: sum, as: total_sales }]
        - type: sort
          field: total_sales
          order: desc
        - type: limit
          value: 10          # transform schema 使用 value，不是 n
    encoding:
      x: { field: region, type: nominal }
      y: { field: total_sales, type: quantitative }

insights: []
```

**这个 fixture 是 PRD 中所有示例的权威来源。如果 fixture 与代码不一致，以代码（`spec-schema.ts`、`analyzer.ts`）为准更新 fixture 和 PRD 示例，而不是反过来。**

---

## 向后兼容性

- `blocks` / `blockedBlocks` 在 TypeScript interface 和 Zod schema 均为 optional → 旧 context.json 文件通过 Zod 验证 ✓；`analyze` 新输出始终填 `[]`（空数组），不输出 `undefined` ✓
- `REQUIRED_ENCODINGS` 删除后，`chart-catalog.ts` 里的 `requiredEncodings` 数组数据完全相同 ✓
- `block instantiate` 是新命令，不影响现有命令 ✓
- V01–V04 是 warning（非 error），不影响现有 spec 的 validate 通过率 ✓

---

## 实施顺序

依赖关系决定顺序：

```
1. chart-catalog.ts（新建，无依赖）
2. spec-validator.ts（从 chart-catalog 读 rules，删 REQUIRED_ENCODINGS，加 V01–V04）
3. report-block-registry.ts（新建，依赖 context-schema 现有类型）
4. context-schema.ts（扩展 CatalogBlockEntry、BlockedBlockEntry、Zod schema）
5. analyzer.ts（调用 block matching，import chart-catalog + report-block-registry）
6. cli.ts（新增 block instantiate + catalog --for-llm 命令）
7. SKILL.md（Intent Routing + Block Selection + Edit Mode）
8. npm test（确认现有测试 pass）
```

步骤 1–2 优先：统一 chart catalog 是地基，Block 的"预验证"是相对 chart rules 的，chart rules 不结构化，Block 的质量保证就是文档而非保证。

---

## 不做的事（有意识的延后）

| 项目 | 原因 |
|------|------|
| **Layer 3 Template** | 需要 Block 稳定后才有意义；Template = Block 的声明式组合，Block 先行 |
| **`miao-viz inspect`（运行时校验）** | 需要 headless browser 或执行引擎，独立工程量 |
| **Interactive binding（dropdown/filter 绑定）** | 对应 json-render 的 `$bindState`，需要 VizSpec 扩展交互模型，单独立项 |
| **外部 catalog 生态（`catalog search`、`add block`）** | 内置 6 个 block 先验证模型，生态化是长期路线 |
| **RFC 6902 JSONL patch streaming** | CLI 批处理场景不需要流式；patch-hints 已满足修复需求 |

---

## 影响分析

### Token 影响

| 场景 | 变化 | 原因 |
|------|------|------|
| SKILL.md system prompt 缓存 | −1500/会话（多轮） | 慢变内容缓存，每轮只发 context.json |
| Block instantiation（新建） | −200~400 | LLM 跳过 encoding/transform 推导，直接审查草稿 |
| Edit mode（修改场景） | −600~1000 | 输出 patch 而不是完整 spec；减少 fix loop |
| V01–V04 warnings | +30（validate 输出） | 减少 1 次 fix loop，净收益约 −500 |
| catalog.blocks in context.json | +150~450（取决于匹配数） | 换取 LLM 减少 ~200 token CoT 推理 |

### 质量影响

| 质量维度 | 当前 | v2 变更后 |
|---------|------|---------|
| Chart rules 执行 | SKILL.md prose，LLM 记忆 | `chart-catalog.ts` rules，validator 机器执行 |
| LLM 组合逻辑 | 从 primitives 推导 | block instantiate 草稿，审查为主 |
| Edit 回归风险 | 每次重写完整 spec | Edit mode 最小变更，保留已有结构 |
| Block 排除透明度 | 无 blockedBlocks | LLM 知道哪些 block 被排除及原因 |
| Catalog 与代码同步 | 手动维护，会 drift | 从 chart-catalog.ts 生成，单一 source |
| line/area 排序错误 | LLM 记 SKILL.md 规则 | V03/V04 validate 机器检测 + patch-hints 自动修复 |
