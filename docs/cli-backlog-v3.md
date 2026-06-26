# CLI Backlog v3 — 实施优先级

> 日期：2026-06-26  
> 状态：Active（当前 backlog 文档）  
> 上一迭代完成：`catalog-productization-prd-v2.md`（三层 Catalog 架构，77 个测试全部通过，commit `0044cd2`）

本文档汇总当前所有待完成的 CLI/Skill 工作，按优先级排序，替代以下已过时的文档：

- `catalog-productization-prd-v2.md` → ✅ 已完整实现，归档
- `catalog-productization-prd.md` → ✅ v1，已被 v2 覆盖，归档
- `catalog-block-template-implementation-plan.md` → ✅ 已实现，归档
- `cli-llm-improvement-proposal.md` → 部分实现，开放项已提取到本文，归档
- `llm-report-quality-improvement-plan.md` → 部分实现，开放项已提取到本文，归档

---

## 已完成（上一迭代，供查阅）

| 能力 | 文件 | 状态 |
|------|------|------|
| CHART_CATALOG（9 种图表，rules/bestFor/antiPatterns） | `chart-catalog.ts` | ✅ |
| 从 CHART_CATALOG 驱动 validate，V01–V04 warnings | `spec-validator.ts` | ✅ |
| context-schema 扩展（CatalogBlockEntry / BlockedBlockEntry） | `context-schema.ts` | ✅ |
| 6 个 ReportBlock resolver（kpi-summary, snapshot-ranking, trend-overview, …） | `report-block-registry.ts` | ✅ |
| analyze 接入 block matching，输出 catalog.blocks / blockedBlocks | `analyzer.ts` | ✅ |
| `block instantiate <id> --context ctx.json` 命令 | `cli-block.ts` | ✅ |
| `catalog --for-llm` 命令 | `cli-block.ts` | ✅ |
| SKILL.md：Step 0 Intent Routing / Block Selection / Edit Mode | `SKILL.md` | ✅ |
| Golden fixtures（sales-snapshot-ranking） | `fixtures/` | ✅ |
| `validate --patch-hints`（4 个错误码） | `patch-hints.ts` | ✅ |
| `validate --verify`（禁用词 + caveat 传导） | `spec-validator.ts` | ✅ |
| `validate --context`（$evidence 路径校验） | `spec-validator.ts` | ✅ |
| `$evidence` 指令解析 | `directive-resolver.ts` | ✅ |
| `article --spec-input` | `cli.ts` | ✅ |
| cli.ts 分拆（cli-block.ts / cli-utils.ts，各 < 500 行） | — | ✅ |

---

## P1：本迭代优先（Quick wins）

### ✅ P1-A：patch-hints 补齐新 case（2026-06-26 完成，commit `TBD`）

实现了 3 个新 patch case，4 个新测试（共 81 个，全部通过）：

| 场景 | 实现方式 | 文件 |
|------|---------|------|
| `X_MUST_BE_TEMPORAL`（line/area x.type=nominal，hard error） | `replace /charts/{i}/encoding/x/type` → `'temporal'` | `patch-hints.ts` |
| `X_MUST_BE_DIMENSION`（bar x.type=temporal，hard error） | `replace /charts/{i}/encoding/x/type` → `'nominal'` | `patch-hints.ts` |
| `MISSING_SORT_TRANSFORM`（line/area 缺 sort，warning） | `collectWarningPatches(spec)` → `add /charts/{i}/data/transform/-` | `patch-hints.ts` |

CLI：`validate --patch-hints` 现在额外输出 `warningPatches` 字段（当 sort 缺失时）。  
bigvalue > 4 patch 判断为改动复杂/收益低，不做。

---

### ✅ P1-B：清理 `buildCatalogHints` 死代码（2026-06-26 完成）

移除了 `analyzer.ts` 中的 `buildCatalogHints` 调用和 `buildCatalog()` 的 `_hints` 参数。
Block registry 已覆盖推荐逻辑，hints 不再需要。

---

## P2：下一迭代（质量强化）

### ✅ P2-A：`analyze` 输出 metricCandidates（2026-06-26 完成）

**文件：** `analyzer.ts`、`context-schema.ts`  
**工作量：** 2 天 → 实际 1 小时

在 `analyzeDataset()` 输出的 context.json 里增加 `metricCandidates` 字段，让 LLM 直接读取可计算的派生指标，而不是自行发明公式。

实现了 3 类高置信指标，4 个新测试（共 85 个，全部通过）：

| 类型 | 触发条件 | 计算来源 |
|------|---------|---------|
| `unit_average` | 同时有 sum 型和 count 型 measure | `total` evidence |
| `share` | `by_dimension` evidence 存在 | top row 的 `share` 字段 |
| `period_change` | `by_time` evidence ≥ 2 行（即 timePeriods ≥ 3） | 最后两行之差 / 前值 |

SKILL.md Phase 2 表格新增 `metricCandidates[]` 行。

字段角色组合 → 候选指标类型（只支持高置信规则）：

| 角色组合 | 指标类型 | 公式示例 |
|---------|---------|---------|
| measure + count | `unit_average` | `sum(sales) / sum(orders)` |
| numerator + denominator | `rate` | `count(status='failed') / count(*)` |
| category + measure | `share` | `sum(sales by region) / sum(sales)` |
| time + measure（≥ 2 期） | `period_change` | `(latest - previous) / previous` |
| category + score | `difference` | `avg(score by group A) - avg(score by group B)` |

`context-schema.ts` 新增：
```typescript
export interface MetricCandidate {
  id: string
  type: 'unit_average' | 'rate' | 'ratio' | 'share' | 'period_change' | 'difference'
  label: string
  formula: string
  value?: number
  confidence: 'high' | 'medium'
  caveat?: string
}
// AnalyzeContext 增加可选字段：
metricCandidates?: MetricCandidate[]
```

SKILL.md 同步：在 Phase 2 里提示 LLM 读 `context.metricCandidates`，优先引用已算好的指标，不自行构造公式。

---

### P2-B：Insight 结构化 union type

**文件：** `types.ts`（AgentReportSpec.insights）、`spec-validator.ts`、HTML renderer  
**工作量：** 1.5 天

将 `insights: string[]` 演进为向后兼容的 union：

```typescript
type Insight =
  | string
  | { text: string; evidence?: string[]; caveat?: string; severity?: 'info' | 'warning' }
```

注意：
- Zod schema 用 `z.union([z.string(), z.object({...})])` 支持混合数组
- `validate --verify` 增加：有 caveat 字段时检查 evidence id 是否存在于 context.json
- HTML renderer：`caveat` 渲染为 insight 下方的浅色脚注（不改变现有 string 渲染）
- 现有 fixtures 里的 `string[]` insight 不需要改

---

### P2-C：`$format` / `$ratio` / `$delta` 指令实现

**文件：** `directive-resolver.ts`（已有 `$evidence` 解析基础）  
**工作量：** 1.5 天

`$evidence` 已实现（T38），补充 3 个格式化指令：

| 指令 | 语法示例 | 输出 |
|------|---------|------|
| `$format` | `$format:total.values.sales:,.0f` | `"450"` → `"450"` / `"4500000"` → `"4,500,000"` |
| `$ratio` | `$ratio:by_region.rows[0].sales:total.values.sales` | `"53.3%"` |
| `$delta` | `$delta:trend.rows[1].sales:trend.rows[0].sales` | `"+4.5%"` |

这些指令让 insight 字符串自描述、可复算，减少 LLM 手写计算数字的风险。

---

## P3：中期（新子系统）

### P3-A：`miao-viz inspect` 命令

**文件：** 新建 `packages/miao-viz-cli/src/inspector.ts` + `cli-inspect.ts`  
**工作量：** 3 天  
**前置条件：** P2-A（metricCandidates，可以先行）

用途：对给定 data + spec，在 Node 侧逐步执行每个 chart 的 transform pipeline，输出结构化调试信息，替代 LLM 从最终 HTML 反推问题。

```bash
miao-viz inspect --input data.csv --spec report.yaml --output inspect.json
```

输出结构：
```json
{
  "charts": [
    {
      "id": "ranking_by_region",
      "transforms": [
        { "step": 1, "type": "aggregate", "inputRows": 4, "outputRows": 3, "preview": [...] },
        { "step": 2, "type": "sort", "inputRows": 3, "outputRows": 3, "preview": [...] }
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
  },
  "sampleWarnings": [...],
  "issues": [...]
}
```

实现要点：
- 在 Node 侧复现 `data-transform.ts` 的 aggregate/sort/limit/derive-month transform 执行逻辑（现有 browser-side 代码需要提取为纯函数）
- `filter` transform 已在 validate 阶段报 `UNSUPPORTED_TRANSFORM`，inspect 跳过即可
- 每步输出前 3 行 preview（不输出全量数据）

---

### P3-B：Layer 3 Template

**文件：** `catalog-template-registry.ts`（新建）、`cli-block.ts` 扩展  
**工作量：** 3-4 天  
**前置条件：** Block 层（P1 全部完成 + P2-A）

Template = Block 的声明式组合，输入 intent 输出多个 Block 的组合草稿。

设计骨架：
```typescript
interface ReportTemplate {
  id: string
  description: string
  intent: string[]          // 匹配 intent 关键词
  blocks: string[]          // block id 有序列表
  layout?: 'stack' | 'grid'
}

// 命令：
// miao-viz template list
// miao-viz template instantiate <id> --context ctx.json --output draft.yaml
```

预置 3 个基础 Template：
- `sales-overview`：kpi-summary + snapshot-ranking + trend-overview
- `operational-review`：kpi-summary + trend-ranking + full-detail-report
- `category-deep-dive`：snapshot-ranking + comparison-breakdown

---

## P4：长期（稳定后评估）

| 项目 | 前置条件 | 说明 |
|------|---------|------|
| `miao-viz verify` 独立命令 | P2-B | 当前 `validate --verify` 已覆盖主要功能，仅在需要独立 CI 步骤时再提取 |
| 结构化 insight 的 evidence 数字校验 | P2-A + P2-B | 校验 insight 中的数字能否从 context.json evidence 中推导 |
| Interactive Static Report | backlog-disposition P4 | 单文件 HTML 内的本地筛选、展开；不恢复 dashboard builder |
| PDF/PNG/SVG export | backlog-disposition P2 | HTML 已稳定后再推进 |
| PPTX native export | backlog-disposition P4 | 先稳定 deck HTML |

---

## 实施顺序总结

```
P1-B（清理死代码，1小时）
  ↓
P1-A（patch-hints 补齐，半天）
  ↓
P2-A（metricCandidates，2天）
  ↓ （可并行：）
P2-B（结构化 insight，1.5天）    P2-C（$format/$ratio/$delta，1.5天）
  ↓
P3-A（miao-viz inspect，3天）
  ↓
P3-B（Layer 3 Template，3-4天）
  ↓
P4（长期评估）
```

总预估：P1 = 0.5天，P2 = 5天，P3 = 6-7天。

---

## 技术债

| 项目 | 文件 | 说明 |
|------|------|------|
| `buildCatalogHints` 死代码 | `analyzer.ts:33`, `data-profiler.ts:304` | 在 P1-B 清理 |
| `data-transform.ts` browser/Node 双跑 | 无单独 Node 版本 | P3-A 需要提取为纯函数 |
| `directive-resolver.ts` 只支持 `$evidence` | 其余指令未实现 | P2-C 补齐 |
