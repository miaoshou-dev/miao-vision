# Spec Reliability Plan

**问题背景：** LLM 在 fallback 路径（手写 spec）里写出错误的 transform 链，导致渲染结果数据错误但无报错。

> 本文档基于 Codex review（2026-06-27）修订。主要变更：Layer 1/3 强依赖关系明确、patch-hints 不自动选 op、聚合逻辑统一到 data-transform.ts、新增 ENCODING_FIELD_NOT_IN_FINAL_ROWS 检查、澄清历史 renderer gap 状态、Layer 2 范围收窄。

---

## 根因定位

当前系统有两条写 spec 的路径：

```
Path A (preferred): block instantiate → 确定性生成 → transforms 正确
Path B (fallback):  LLM 手写 spec   → 需要写 transforms → 容易出错
```

历史 bug（bigvalue 显示第一行原始值、table 未聚合、histogram/scatter/heatmap 无渲染）都发生在 Path B。

**历史 renderer gap 状态（已处理，不在本计划范围）：**
- histogram、scatter、heatmap 的渲染器缺口已通过补充 `renderHistogramChart`、`renderScatterChart`、`renderHeatmapChart` 修复
- `MVP_CHART_TYPES` ↔ `renderChartSvg` 同步已有回归测试保护

**本计划聚焦的残留问题：聚合语义缺口**

在 bigvalue 场景，LLM 需要写出：

```yaml
transform:
  - type: aggregate
    measures: [{ field: population, op: max, as: max_pop }]
  - type: sort
    field: max_pop
    order: desc
  - type: limit
    value: 1
encoding:
  value: { field: max_pop }    # 必须和 transform 的 as 名一致
```

LLM 不是不知道"要取最大值"，而是在 `as` 命名和 `encoding.field` 的对齐上容易出错。更危险的是：**如果 encoding 仍引用原始字段名（`field: population`），spec-validator 不会报错**——因为 `population` 在 source data 里存在，validator 找到它就认为合法，但 aggregate transform 执行后原始字段已不在 output rows 里，渲染时静默取 `undefined`。

---

## 三层修复方案

### 层序约束（先读）

**Layer 1 必须先于 Layer 3 的 encoding.aggregate 相关 patch 上线。**

Layer 3 的 `BIGVALUE_NO_REDUCTION` warning 如果建议 LLM 加 `encoding.value.aggregate: max`，但 renderer 还不支持这个字段，结果是 LLM 生成"看起来合规"的 spec，validate 通过，渲染仍用 `rows[0]`——假阳性比不做修复更糟。

正确顺序：
```
Layer 1（渲染器语义）→ Layer 3（验证规则）→ Layer 2（catalog 文档）
```
Layer 2 不依赖 Layer 1，可独立进行。

---

### Layer 1 — 统一数据准备层支持 encoding 聚合意图

**目标：** 在 `prepareChartData()` 之后、任何 renderer 之前，新增 `applyEncodingAggregates()` 阶段，让 LLM 表达意图（`aggregate: max`）而非 transform 管道。

**实现位置：`data-transform.ts`**

```
prepareChartData(rows, chart)
  └── applyTransforms(rows, chart.data.transform)   ← 现有
  └── applyEncodingAggregates(rows, chart)           ← 新增
```

`applyEncodingAggregates()` 在 transform pipeline 执行完成后运行。逻辑：检查所有 `chart.encoding.*` 是否带有 `aggregate` 字段；如有，按 encoding channel 的语义进行聚合，输出新的 rows 结构。

**不在各 renderer 里分别实现** 的理由：`svg-renderer.ts` 和 `interactive-runtime-assets.ts`（browser 端）都复用 `prepareChartData()`，统一改一处即可覆盖两条渲染路径，避免语义漂移。

**各 channel 的聚合语义：**

| Chart type | Channel | 聚合行为 |
|-----------|---------|---------|
| bigvalue | `encoding.value.aggregate` | 对全部 rows 的该 field 执行 op，返回单行 `{ [field]: result }` |
| bar | `encoding.y.aggregate` | 按 `encoding.x.field` 分组，对 y field 执行 op，每组一行 |
| pie | `encoding.value.aggregate` | 按 `encoding.label.field` 分组，对 value field 执行 op |
| line / area | `encoding.y.aggregate` | 按 `encoding.x.field` 分组，对 y field 执行 op（需配合已有 sort） |

**优先级：** 若 chart 同时有 `data.transform` 和 `encoding.*.aggregate`，transform 先执行，encoding aggregate 在 transform 输出上再运行。两者不冲突——transform 可做 derive-month 等复杂预处理，encoding aggregate 做最后的汇总。

**LLM 可写的简化形式（实现后）：**

```yaml
# bigvalue — 不再需要 as 字段对齐
type: bigvalue
encoding:
  value: { field: population, aggregate: max }

# bar — 不再需要手写 groupBy
type: bar
encoding:
  x: { field: region }
  y: { field: sales, aggregate: sum }
```

Transform 链保留为高级用法（多维 groupBy、derive-month、自定义 as 名）。

---

### Layer 3 — 验证层的两类新检查

**前提：Layer 1 上线后再启用 encoding.aggregate 相关的 patch 建议。**

#### 检查一：ENCODING_FIELD_NOT_IN_FINAL_ROWS

**当前 spec-validator 的盲点（Codex P2 指出）：**

`spec-validator.ts` 的 `collectSourceFields` / `collectDerivedFields` 检查 encoding 字段是否存在于 source data 或 transform 的 `as` 产出中。但没有模拟"transform 执行后的最终 row schema"：

```yaml
# 这个 spec 能通过当前 validator，但渲染时 encoding.field 读不到值
transform:
  - type: aggregate
    measures: [{ field: population, op: max, as: max_pop }]
encoding:
  value: { field: population }   # ← population 在 source 里存在，validator 不报错
                                 #   但 aggregate 后 output 只有 max_pop，population 消失
```

**新增静态 schema-flow 检查：**

模拟 transform 链的输出 schema（不执行、只推导字段集）：
- `derive-month` → 增加 `as` 字段
- `aggregate` → output 只含 `groupBy` 字段 + `measures[*].as` 字段，原始字段消失
- `sort` / `limit` → 字段集不变

若 `encoding.*.field` 不在最终字段集中 → `ENCODING_FIELD_NOT_IN_FINAL_ROWS`（hard error）

这比"no aggregate transform"更精确：不误报刻意不聚合的 scatter/heatmap，只报真正的字段丢失。

#### 检查二：聚合意图缺失 warning（Layer 1 上线后启用）

| 规则 code | 图表 | 触发条件 | 级别 |
|----------|------|---------|------|
| `BIGVALUE_NO_REDUCTION` | bigvalue | 无 transform 且 `encoding.value.aggregate` 未设置 | warning |
| `BAR_NO_AGGREGATE` | bar | `encoding.y.aggregate` 未设置且无 aggregate transform | warning |
| `PIE_NO_AGGREGATE` | pie | `encoding.value.aggregate` 未设置且无 aggregate transform | warning |

设计为 **warning 而非 hard error**：scatter、heatmap、table 展示明细时不需要聚合，硬错误误报率高。

**关于 table 的特殊处理：** table 如果是"明细视图"，不聚合是正常的。不新增 table 专用 warning——已有的 `TOO_MANY_CATEGORIES` 之类的 bar 规则已经引导 LLM 加 limit；table 同理可加 `TABLE_NO_LIMIT` warning（无 limit transform 时提示），但不要求聚合。

#### patch-hints 的业务语义边界

**不自动选择 op 的原因：** `aggregate: max` / `sum` / `avg` 是业务语义，不是结构错误。BIGVALUE_NO_REDUCTION 的自动 patch 不能默认填 `max`——把结构错误自动修成业务数字错误比报 warning 更危险。

**正确的 patch 输出形式：** 提供修复模板 + 候选 op 列表，不输出可机器直接应用的单一值：

```json
{
  "code": "BIGVALUE_NO_REDUCTION",
  "message": "bigvalue will render rows[0]. Add encoding.value.aggregate with the appropriate op.",
  "fixTemplate": {
    "path": "/charts/0/encoding/value/aggregate",
    "candidates": ["max", "sum", "avg", "min", "count"],
    "hint": "Choose based on what this KPI means: max for peak value, sum for total, avg for mean."
  }
}
```

**例外：** 若 context.json 的 `evidence[]` 或 block 变量已明确标注 semantic role（如 `role: measure, defaultOp: sum`），可从中推导 op——这是机器可确定的，允许进入 auto-applicable patch。

---

### Layer 2 — 补齐 transformGuidance 到 CHART_CATALOG

**现有状态（Codex P3 指出）：**
- `spec-validator.ts` 已从 `CHART_CATALOG` 读取 required encodings 和 rules
- `miao-viz catalog --for-llm` 已从 `CHART_CATALOG` 输出 `bestFor`、`antiPatterns`、`rules`

**真正新增的内容：** `transformGuidance` 字段，补充到 `ChartCatalogItem`：

```typescript
interface ChartCatalogItem {
  // ...现有字段不变
  transformGuidance: {
    encodingAggregateSupported: boolean    // Layer 1 实现后更新为 true
    withoutTransformOrAggBehavior: string  // "renders rows[0] — almost always wrong"
    recommendedPattern: string             // "encoding.value.aggregate: max" 或 "transform: aggregate+limit:1"
  }
}
```

**强制约束：** `ChartCatalogItem` 改为 TypeScript 必填——往 `CHART_CATALOG` 加新类型时必须填 `transformGuidance`，否则编译失败。把"记得更新文档"变成"不填就报错"。

`miao-viz catalog --for-llm` 自动包含此字段，vizspec.md 的 transform requirement 表可由此生成，消除手写文档与 catalog 的漂移。

---

## 修订后的优先级

| 顺序 | 层 | 工作内容 | 理由 |
|-----|---|---------|------|
| 1 | **Layer 1** | `applyEncodingAggregates()` in data-transform.ts | 渲染语义落地，是 Layer 3 encoding patch 的前提 |
| 2 | **Layer 3a** | `ENCODING_FIELD_NOT_IN_FINAL_ROWS` 静态 schema-flow | 不依赖 Layer 1，捕获 `as` 字段对齐错误，立即可做 |
| 3 | **Layer 3b** | `BIGVALUE_NO_REDUCTION` 等 warning + 修复模板 patch | Layer 1 上线后启用，不早于此 |
| 4 | **Layer 2** | `transformGuidance` 加入 `ChartCatalogItem` | 长期维护价值，不阻塞运行时修复 |

---

## 与现有系统的关系

| 已有机制 | 覆盖的问题 | 本方案补充 |
|---------|----------|----------|
| `block instantiate` | Path A 的 transform 正确性 | Path B (fallback) 的保护 |
| `catalog --for-llm` | 图表类型选择规则 | `transformGuidance` 字段（Layer 2） |
| `validate --patch-hints` | 字段名错误、encoding 类型 | schema-flow 检查 + 聚合意图 warning（Layer 3） |
| `prepareChartData()` | transform 执行 | encoding aggregate 阶段（Layer 1） |
| renderer 实现 | histogram/scatter/heatmap 已有分支 | 无变化（已修复，不在本计划） |

---

*文档创建：2026-06-27 / Codex review 修订：2026-06-27*
