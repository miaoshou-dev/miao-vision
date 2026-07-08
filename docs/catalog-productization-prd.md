# Catalog Productization PRD

> ✅ **已归档**：本文档为 v1，已被 `catalog-productization-prd-v2.md` 取代，后者已全部实现。
> 当前待完成项请看 `docs/cli-backlog-v3.md`。
>
> 基于 Codex/HyperFrames 竞品分析的 miao-viz 报告生成优化方案
> 日期：2026-06-26
> 关联：`docs/cli-llm-improvement-proposal.md`

---

## 背景

Codex 对 HyperFrames 竞品分析指出：miao-viz 的 `catalog` 目前是"约束表"（只列 chart 类型 + 禁用原因），而 HyperFrames 的 catalog 是"可消费资产目录"——每个 item 有业务语义、变量、质量检查，Agent 可以发现 → 选择 → 填变量 → 渲染，不需要每次从 chart primitives 重新组合。

**核心差距一句话：**
> 现在 LLM 拿到 `catalog.charts: ["bigvalue","bar","table"]` 后还要自己推理"这些 chart 应该怎么组合"。如果 catalog 直接告诉 LLM "你的数据适合 `snapshot-ranking` block（bigvalue + bar，topN=10，primaryMeasure=sales）"，LLM 只需填变量，不需要推理组合。

---

## 当前代码状态（已实现）

| 能力 | 实现位置 | 状态 |
|------|---------|------|
| `analyze` 命令 | `analyzer.ts` | ✅ 已实现 |
| `catalog.charts` / `blockedCharts` | `context-schema.ts` + `analyzer.ts` | ✅ 已实现 |
| `catalog.recommendedPlan` | `analyzer.ts:buildRecommendedPlan()` | ✅ 但很薄（只有 type + note） |
| `evidence[]` 预计算 | `analyzer.ts:runStandardQueries()` | ✅ 已实现 |
| `sampleWarnings` | `analyzer.ts:buildSampleWarnings()` | ✅ 已实现 |
| `$evidence:id.path` 指令 | `directive-resolver.ts` | ✅ 已实现 |
| `validate --patch-hints` | `patch-hints.ts` | ✅ 已实现 |
| `validate --verify` 禁用词/caveat 检查 | `spec-validator.ts` | ✅ 已实现 |
| **`catalog.blocks`（业务语义组合）** | ❌ 无 | **待实现** |
| **typed variables in blocks** | ❌ 无 | **待实现** |
| **validate 结构性视觉 warnings** | ❌ 部分（无 chart budget / 排序缺失检查）| **待补充** |
| **SKILL.md blocks 使用指引** | ❌ Phase 3 无块选择逻辑 | **待补充** |

---

## 目标

把 `catalog` 从约束表升级为**分层资产目录**：

```
当前：catalog.charts = ["bigvalue","bar","table"]  ← LLM 自己组合
目标：catalog.charts = [...]                        ← 约束
     catalog.blocks = [                             ← NEW: 组合模板
       {
         id: "snapshot-ranking",
         description: "KPI totals + ranking bar. ...",
         variables: {
           primaryMeasure: { type: "field", role: "measure", default: "sales" },
           topN: { type: "number", default: 10 }
         }
       }
     ]
```

---

## 实施范围（本次 PRD 覆盖）

### 不在本次范围内

- `report-template` 层（完整报告结构如 sales-review YAML 模板）：概念正确，但工程量大，优先级低
- `miao-viz add report-block` / `catalog search` CLI 命令：生态功能，现阶段内置即可
- Spec-level `variables:` 声明（typed slots）：需要 renderer 支持变量替换，是单独工程
- 视觉 inspect（label overlap / legend 遮挡）：需要 headless browser，单独立项

---

## 分层架构设计

### 三层 catalog（本次实现前两层）

```
Layer 1: catalog.charts      ← 已有，原子图表约束
Layer 2: catalog.blocks      ← 本次新增，业务语义组合
Layer 3: catalog.templates   ← 未来，完整报告结构（YAML 骨架）
```

### Block 的定义结构

每个 block 是一个可供 LLM 选用的"预验证组合"，有以下字段：

```typescript
interface CatalogBlock {
  id: string                           // "snapshot-ranking"
  description: string                  // 人类可读，含适用场景
  bestFor: string[]                    // ["ranking","comparison","top-N"]
  charts: string[]                     // 该 block 使用的 chart 类型
  density: 'compact' | 'medium' | 'full'
  examplePrompt: string                // "Show top 10 regions by sales"
  variables: Record<string, BlockVariable>  // 参数化槽位，含 default
  qualityChecks: string[]              // 该 block 专属的自查项
}

interface BlockVariable {
  type: 'field' | 'number' | 'string'
  role?: 'measure' | 'dimension' | 'time'  // 仅 type=field 时有效
  description: string
  default?: string | number            // analyze 根据数据自动填入
  min?: number                         // 仅 type=number
  max?: number
}
```

### 内部注册表结构（不暴露在 context.json 中）

```typescript
interface ReportBlockDef extends CatalogBlock {
  requiredRoles: {
    measure?: number    // 最少需要 N 个 measure 字段
    dimension?: number  // 最少需要 N 个 dimension 字段
    time?: number       // 最少需要 N 个 timePeriods
  }
  // charts[] 里每个类型都必须在 catalog.charts 里（未被 block）才匹配
}
```

---

## 具体实施方案

### 变更 1：新文件 `report-block-registry.ts`

**职责：** 定义 6 个预置 block，提供匹配函数。

**6 个预置 block：**

| id | description | requiredRoles | charts |
|----|-------------|--------------|--------|
| `kpi-summary` | 纯 KPI bigvalue 卡片 | measure≥1 | bigvalue |
| `snapshot-ranking` | KPI + top-N 排名 bar（无时间数据） | measure≥1, dim≥1 | bigvalue, bar |
| `trend-overview` | KPI + 时间趋势线（≥3 个时间段） | measure≥1, time≥3 | bigvalue, line |
| `comparison-breakdown` | bar + pie 双视角对比 | measure≥1, dim≥1 | bar, pie |
| `trend-ranking` | KPI + 趋势线 + 排名 bar（执行摘要） | measure≥1, dim≥1, time≥3 | bigvalue, line, bar |
| `full-detail-report` | KPI + 趋势 + 排名 + 明细表 | measure≥1, dim≥1, time≥3 | bigvalue, line, bar, table |

**匹配逻辑（`matchBlocks()` 函数）：**

```
for each block in registry:
  1. measure count >= requiredRoles.measure?
  2. dimension count >= requiredRoles.dimension?
  3. timePeriods >= requiredRoles.time?
  4. all block.charts are in catalog.charts (not blocked)?
  → 全部满足才入选

for each matched block:
  → 将 field 类型 variable 的 default 填入 primaryMeasure / primaryDimension / primaryTime
```

**输入：** `availableCharts[]`, `measureCount`, `dimensionCount`, `timePeriods`, 三个 primary 字段名。
**输出：** `CatalogBlock[]`（无 requiredRoles，只暴露用于 LLM 的字段）。

---

### 变更 2：`context-schema.ts`

**增加接口定义：**

```typescript
export interface BlockVariable { ... }   // 新增
export interface CatalogBlock { ... }    // 新增
```

**扩展 `AnalyzeCatalog`：**

```typescript
export interface AnalyzeCatalog {
  charts: string[]
  blockedCharts: Array<{ type: string; reason: string }>
  recommendedPlan: Array<{ type: string; note?: string }>
  blocks?: CatalogBlock[]   // 新增，optional 保持向后兼容
}
```

**扩展 Zod schema：**

```typescript
const blockVariableSchema = z.object({
  type: z.enum(['field', 'number', 'string']),
  role: z.enum(['measure', 'dimension', 'time']).optional(),
  description: z.string(),
  default: z.union([z.string(), z.number()]).optional(),
  min: z.number().optional(),
  max: z.number().optional()
})

const catalogBlockSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  bestFor: z.array(z.string()),
  charts: z.array(z.string()),
  density: z.enum(['compact', 'medium', 'full']),
  examplePrompt: z.string(),
  variables: z.record(z.string(), blockVariableSchema),
  qualityChecks: z.array(z.string())
})

// 在 analyzeCatalogSchema 中新增：
blocks: z.array(catalogBlockSchema).optional()
```

**向后兼容：** `blocks` 为 optional，现有测试中内联的 `catalog: { charts:[], blockedCharts:[], recommendedPlan:[] }` 对象不需要修改。

---

### 变更 3：`analyzer.ts`

**在 `buildCatalog()` 末尾加入 block 匹配：**

```typescript
import { REPORT_BLOCK_REGISTRY, matchBlocks } from './report-block-registry'

function buildCatalog(...): AnalyzeContext['catalog'] {
  // ...现有逻辑：charts, blockedCharts, recommendedPlan...

  const measureCount = fields.filter(f => f.role === 'measure' || f.role === 'score').length
  const dimensionCount = fields.filter(f => f.role === 'dimension' || f.role === 'status').length
  const primaryMeasure = fields.find(f => f.role === 'measure' || f.role === 'score')?.name
  const primaryDimension = fields.find(f => f.role === 'dimension' || f.role === 'status')?.name
  const primaryTime = fields.find(f => f.role === 'time')?.name

  const blocks = matchBlocks(
    REPORT_BLOCK_REGISTRY,
    charts,           // 已计算的允许 chart 列表
    measureCount,
    dimensionCount,
    timePeriods,
    primaryMeasure,
    primaryDimension,
    primaryTime
  )

  return { charts, blockedCharts, recommendedPlan, blocks }
}
```

**注意：** `buildCatalog()` 内已有 `measures/dimensions/times` 变量，但在函数顶部没有声明为局部变量——需要确认重用还是重新提取。看代码：`measures`、`dimensions`、`times` 在 `buildCatalog` 里确实是局部声明的，可以直接使用。

---

### 变更 4：`spec-validator.ts`

在 `collectValidationWarnings()` 中新增**结构性视觉警告**（不依赖 profile/context，纯 spec 分析）：

**V01 — 图表预算超限：**
```
chart count > 6 →
"Chart budget exceeded: N charts detected (budget: 6). Merge charts to reduce cognitive overload."
```

**V02 — bigvalue 数量过多：**
```
bigvalue count > 4 →
"N bigvalue charts detected. Group to at most 4 KPI cards to avoid layout crowding."
```

**V03 — line 图缺少排序：**
```
chart.type === 'line' && no sort transform in chart.data.transform →
"chart 'id': line chart has no sort transform. Add { type: 'sort', field: <x_field>, order: 'asc' } to ensure correct line order."
```

**V04 — area 图缺少排序（同 V03）：**
```
chart.type === 'area' && no sort transform → same warning
```

这 4 个检查加入 `collectValidationWarnings()` 的末尾，在现有检查之后运行。

---

### 变更 5：`SKILL.md`

**在 Phase 3 — Write Spec 开头新增 Block Selection 段落：**

```markdown
**Block selection — pick a block before writing charts:**

Read `catalog.blocks` in context.json. Each block is a pre-validated chart composition with business semantics. Selecting a block is more reliable than building from scratch.

1. Find the block whose `bestFor` matches your intent from the Intent Card.
2. Use the `variables[].default` values (pre-filled from your data) to populate chart fields.
3. Expand the block's `charts` list into individual chart specs, following `catalog.recommendedPlan` for order.
4. Append each block's `qualityChecks` to your Self-Review checklist.

| Field | How to use |
|-------|-----------|
| `catalog.blocks[].id` | Block name to reference in your thinking |
| `catalog.blocks[].bestFor` | Match against your Intent Card analysis type |
| `catalog.blocks[].charts` | The chart types you should use |
| `catalog.blocks[].variables` | Typed slots — use `.default` value directly |
| `catalog.blocks[].qualityChecks` | Block-specific self-review items |

If `catalog.blocks` is empty (dataset doesn't match any block's required fields), build from `catalog.charts` directly.
```

**在 Self-Review checklist 末尾新增一项：**
```
  [ ] If a catalog.blocks entry was selected, all its qualityChecks are resolved?
```

---

## context.json 输出示例（变更后）

```json
{
  "intent": { "raw": "regional sales Q1", "coverage": "full", "assumptions": [...] },
  "fields": [...],
  "evidence": [...],
  "catalog": {
    "charts": ["bigvalue", "bar", "table"],
    "blockedCharts": [
      { "type": "line", "reason": "timePeriods=2 < 3; need at least 3 to show a trend" },
      { "type": "pie",  "reason": "distinctCount=3 ok but share evidence missing; prefer bar" }
    ],
    "recommendedPlan": [
      { "type": "bigvalue", "note": "show sales as KPI" },
      { "type": "bar",      "note": "sales by region, top 3" }
    ],
    "blocks": [
      {
        "id": "kpi-summary",
        "description": "One to four KPI bigvalue cards showing at-a-glance metric totals.",
        "bestFor": ["overview", "KPI", "summary"],
        "charts": ["bigvalue"],
        "density": "compact",
        "examplePrompt": "Show total sales and order count",
        "variables": {
          "primaryMeasure": {
            "type": "field", "role": "measure",
            "description": "Main metric to display as KPI card",
            "default": "sales"
          }
        },
        "qualityChecks": ["Use at most 4 bigvalue cards to avoid layout crowding"]
      },
      {
        "id": "snapshot-ranking",
        "description": "KPI total + bar chart ranking top-N categories. Best for static analysis without time data.",
        "bestFor": ["ranking", "comparison", "top-N", "snapshot"],
        "charts": ["bigvalue", "bar"],
        "density": "medium",
        "examplePrompt": "Show top 10 regions by sales",
        "variables": {
          "primaryMeasure":   { "type": "field", "role": "measure",   "description": "...", "default": "sales" },
          "primaryDimension": { "type": "field", "role": "dimension", "description": "...", "default": "region" },
          "topN":             { "type": "number", "default": 10, "description": "...", "min": 3, "max": 20 }
        },
        "qualityChecks": [
          "Add sort (desc) + limit (topN) transforms to bar chart",
          "Add caveat when sampleWarnings are present"
        ]
      }
    ]
  },
  "sampleWarnings": [...],
  "promptRules": [...]
}
```

---

## 文件变更清单

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `src/report-block-registry.ts` | **新建** | 6 个 block 定义 + `matchBlocks()` |
| `src/context-schema.ts` | 扩展 | 新增 `BlockVariable`、`CatalogBlock` 接口；`AnalyzeCatalog.blocks?` 可选；更新 Zod schema |
| `src/analyzer.ts` | 修改 | `buildCatalog()` 末尾调用 `matchBlocks()`，import 新文件 |
| `src/spec-validator.ts` | 修改 | `collectValidationWarnings()` 新增 V01–V04 结构性视觉警告 |
| `skills/miao-vision/SKILL.md` | 修改 | Phase 3 新增 Block Selection 段；Self-Review 新增一项 |
| `docs/cli-llm-improvement-proposal.md` | 修改 | 新增 "Catalog Productization Gap" 节 |
| `src/agent.test.ts` | **无需改动** | `blocks` optional，现有内联 context 对象不受影响 |

---

## 向后兼容性

- `blocks?` 为 optional → 旧 context.json 文件（无 blocks 字段）通过 Zod 验证 ✓
- 现有测试内联 `catalog: { charts:[], blockedCharts:[], recommendedPlan:[] }` 不需要加 `blocks` ✓
- `recommendedPlan` 保留不变，只是增加了 `blocks` 层 ✓
- CLI 输出 context.json：`blocks` 由 `analyzeDataset()` 始终填充（即使为 `[]`）✓

---

## token 影响估算

| 场景 | 增加 token（输出端） | 抵消来源 |
|------|-------------------|---------|
| 匹配 1 个 block | ~150 tokens | LLM 省去推理"如何组合 chart"的 CoT，约 −200 tokens |
| 匹配 3 个 block | ~450 tokens | LLM 省去推理，约 −300 tokens；净影响约持平 |
| 无匹配 block | 0 | 无变化 |
| 结构性 warnings（V01-V04）| +30 tokens（validate 输出）| 减少 1 次 fix loop，约 −500 tokens |

**总体：** 小数据集（有 block 匹配时）token 持平或略降；最大收益来自减少 fix loop，不来自 blocks 本身。

---

## 质量影响

| 质量维度 | 当前 | 变更后 |
|---------|------|-------|
| LLM 组合逻辑 | 每次从 chart primitives 推理 | 从 block 候选中选择，理由更清晰 |
| 质量检查覆盖 | Self-Review checklist（通用） | 通用 + block 专属 qualityChecks |
| 结构性视觉问题 | validate 不检测 | V01-V04 在 validate 阶段提前警告 |
| line 图顺序问题 | 只有 LLM 记 SKILL.md 规则 | validate 机器检测无排序的 line/area |

---

## 实施顺序

1. `report-block-registry.ts`（新建，无依赖）
2. `context-schema.ts`（扩展接口 + Zod）
3. `analyzer.ts`（调用 matchBlocks，import 新文件）
4. `spec-validator.ts`（V01–V04 warnings）
5. `SKILL.md`（Phase 3 block selection 指引）
6. `docs/cli-llm-improvement-proposal.md`（补 Catalog Productization Gap 节）
7. 运行 `npm test`，确认现有测试 pass

---

## 不做的事

| 建议项 | 原因 |
|--------|------|
| `catalog.templates`（完整报告 YAML 模板） | 需要 renderer 支持模板实例化，独立工程 |
| `miao-viz add report-block`（CLI 安装命令） | 短期内置即可，生态化是长期路线 |
| Spec-level `variables:` 声明 | 需要 renderer 变量替换，独立于本 PRD |
| 视觉 inspect（label overlap 等） | 需要 headless browser 或布局引擎，独立立项 |
| `report-block` Strict Mode（block 合规检查）| 未来 validate 扩展点，不在本次 scope |
