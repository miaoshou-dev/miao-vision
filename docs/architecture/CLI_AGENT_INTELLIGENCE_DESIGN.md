# miao-viz CLI Agent Intelligence Design

**文档类型**: 架构改进设计  
**状态**: 待实施  
**关联模块**: `packages/miao-viz-cli`, `packages/miao-vision-skill/SKILL.md`  
**撰写日期**: 2026-06-23

---

## 1. 背景

当前 `miao-viz` CLI 的 Agent 工作流是一个**单次推理、无反馈**的线性管道：

```
profile JSON (全量) → [LLM 一次推理] → spec YAML → render → HTML
```

这个设计在小型、干净的数据集上能正常工作，但在真实业务数据下存在结构性缺陷，导致生成报告的准确性和叙事连贯性不稳定。

本文档记录对该架构的问题诊断和系统性改进方案。

---

## 2. 问题诊断

### 2.1 统计层：小样本统计无置信度标注

当前 `miao-viz profile` 对任意行数的数据都输出相同精度的统计信息：

```json
{ "skewness": 2.13, "r": 0.99, "outlierCount": 3 }
```

LLM 无法区分"基于 4 行的 r=0.99"和"基于 10000 行的 r=0.99"，会对两者一视同仁地引用。

| 统计量 | 最低可信样本量 | 当前过滤门槛 |
|--------|--------------|------------|
| skewness | ≥ 30 行 | 无 |
| Pearson 相关系数 | ≥ 10 行 | `pairs >= 3` |
| outlierCount | ≥ 20 行 | 无 |
| histogram 形状 | ≥ 20 行 | 无 |

**影响**：LLM 在小数据集上生成看似精确但统计上无效的 insights，误导读者。

### 2.2 统计层：`topSharePct` 语义歧义

`topSharePct` 计算的是**行出现频率**（某值在原始行中占的比例），不是**度量值贡献**（该分组的汇总值占总量的比例）：

```
topSharePct = count(East rows) / total_rows = 2/4 = 0.5
```

而用户看到的图表上显示的是：
```
East 的销售额 = sum(sales where region=East) / sum(sales) = 240/450 = 53%
```

SKILL.md 当前鼓励将 `topSharePct > 0.5` 写成 insights 中的"占比"表述，但两个数字含义不同，在数值不均匀的数据集上差距会非常显著。

### 2.3 LLM 推理层：Hints 爆炸导致信号稀释

当前 hints 为全量生成，不区分优先级。对于宽表（5 string 列 × 4 numeric 列）：

```
ranking hints: 5 × 4 = 20 条
share hints:   5 × 1 = 5 条
kpi hints:     4 条
...合计可能超过 35 条
```

LLM 面对 35 条平铺的 hints 需要自行决策取哪 3-5 条——这正是 hints 本来应该替 LLM 做的事，方案只是把选择问题从 LLM 转移到了 hints 生成器，并没有解决。

### 2.4 LLM 推理层：Data-First，Intent-Last

当前工作流第一步就加载全量 profile（可能 5000-8000 tokens），然后再理解用户想看什么。这与优秀 Agent 设计的"先理解问题，再收集数据"原则相反：

- Context window 的前 8000 tokens 被统计数字占满
- LLM 在没有问题框架的情况下开始归纳信号
- 最终产出是"数据驱动的随机报告"而不是"问题驱动的分析"

### 2.5 LLM 推理层：Insights 写作时机错误

当前流程：
```
写 spec → 写 insights → 渲染图表
```

Insights 是在图表渲染之前写的，LLM 基于分布统计来预测图表会展示什么。这种"盲写"有两个问题：

1. 分布统计（如 skewness）无法准确预测聚合后图表的形态
2. LLM 没有机会看到真实的聚合数值（GROUP BY 后每个分组的实际值），只能猜测

### 2.6 LLM 推理层：无叙事连贯性约束

当前框架按固定顺序生成图表（KPI → 时间序列 → 排名 → 分布 → 相关性），不管这些图表是否服务于同一个分析故事。结果：

- 10 张图表各自独立，读者不知道"这份报告想说什么"
- 强信号（如极强相关性）被埋在末尾，主角变配角
- 用户问"Q3 为什么下滑"，报告展示的却是年度 KPI 汇总

---

## 3. 改进目标

| 目标 | 衡量标准 |
|------|---------|
| Insights 数值可核实 | 每条 insight 可追溯到 `miao-viz query` 的真实聚合值 |
| 统计量有置信度标注 | `reliable: false` 的统计量不出现在 insights 中 |
| Context 效率提升 | Profile 加载 tokens 降低 50%（按需加载） |
| 报告叙事连贯 | 所有图表服务于同一个 Narrative Plan |
| 图表数量受控 | 默认不超过 6 张，超出必须有合并理由 |

---

## 4. 改进方案：意图驱动的 4 阶段 ReAct 架构

### 4.1 整体架构

将当前单次推理替换为 4 阶段迭代流程，每个阶段有明确的输入、工具调用、输出：

```
┌──────────────────────────────────────────────────────────────┐
│  Phase 1: Intent Extraction（意图提取）                       │
│                                                              │
│  输入: 用户请求 + 文件名                                       │
│  工具: miao-viz profile --summary（仅列名+类型）               │
│  输出: Intent Card（意图卡）                                  │
└──────────────────────────┬───────────────────────────────────┘
                           │ Intent Card
                           ▼
┌──────────────────────────────────────────────────────────────┐
│  Phase 2: Targeted Profiling（定向剖析）                      │
│                                                              │
│  输入: Intent Card + 全列列表                                  │
│  工具: miao-viz profile --columns [相关列]（按需）             │
│        miao-viz profile --correlations [相关列对]（按需）      │
│  输出: 精简 Profile（仅意图相关列）                             │
└──────────────────────────┬───────────────────────────────────┘
                           │ 精简 Profile
                           ▼
┌──────────────────────────────────────────────────────────────┐
│  Phase 3: Narrative Planning（叙事规划）                      │
│                                                              │
│  输入: Intent Card + 精简 Profile                             │
│  工具: miao-viz query（获取真实聚合数值）                       │
│  输出: Narrative Plan（故事 + 证据 + 图表意图 + 排除理由）       │
└──────────────────────────┬───────────────────────────────────┘
                           │ Narrative Plan
                           ▼
┌──────────────────────────────────────────────────────────────┐
│  Phase 4: Grounded Spec Writing + Self-Review                │
│                                                              │
│  输入: Narrative Plan + 真实聚合值                            │
│  工具: miao-viz validate / miao-viz render                   │
│  Self-Review: 逐条核查 insights grounding                    │
│  输出: validated spec + HTML report                          │
└──────────────────────────────────────────────────────────────┘
```

---

### 4.2 Phase 1：Intent Extraction

#### 设计原则

> **先理解问题，再收集数据。**

在任何 profile 调用之前，LLM 必须基于用户请求和文件名，形成一张意图卡（Intent Card）。

#### Intent Card 格式

```
INTENT CARD
══════════════════════════════════════════
用户问题     : [从用户原始请求提炼的核心问题]
分析类型     : [趋势分析 / 对比分析 / 分布分析 / 相关性分析 / KPI 汇报]
主要度量(猜测): [最可能是主角的数值列名，如 sales / revenue]
主要维度(猜测): [最可能的分组维度，如 region / category / date]
时间维度关注  : [是 / 否]
报告受众     : [技术人员 / 业务决策者]
══════════════════════════════════════════
```

#### 工具调用

仅调用轻量级 profile，用于确认列名是否与猜测匹配：

```bash
miao-viz profile --summary <file>
# 输出: 仅 { file, rows, columns: [{name, type}] }，约 200 tokens
```

#### 输出

完整的 Intent Card，作为后续阶段的分析框架。

---

### 4.3 Phase 2：Targeted Profiling

#### 设计原则

> **只加载与意图相关的列的详细统计，其余列忽略。**

#### 渐进式加载层次

| 层次 | 命令 | Tokens 估算 | 触发条件 |
|------|------|------------|---------|
| Layer 0 | `profile --summary` | ~200 | 每次都调用 |
| Layer 1 | `profile --columns col1,col2` | ~500/列 | 确认与意图相关 |
| Layer 2 | `profile --correlations a,b` | ~100/对 | 有关联假设时 |

#### 列选择规则

从 Intent Card 出发，最多选择 5 列进行深度分析：
- 主要度量列（必选）
- 主要维度列（必选）
- 时间列（若关注时间趋势）
- 第二度量列（如有相关性假设）
- 补充维度（如对比分析需要）

#### Reliable 标注规则

Profile 输出每个统计量时，附加可靠性标注：

```json
{
  "name": "sales",
  "type": "number",
  "mean": 42300,
  "skewness": 2.13,
  "skewnessReliable": false,
  "correlation": {
    "a": "sales", "b": "orders",
    "r": 0.87,
    "n": 8,
    "reliable": false
  }
}
```

| `reliable` 判定标准 | 值 |
|--------------------|----|
| 样本量 ≥ 50 | `true` |
| 样本量 10–49 | `true`（但需在 insights 中注明样本量） |
| 样本量 < 10 | `false`（统计量输出但不得进入 insights） |

---

### 4.4 Phase 3：Narrative Planning

#### 设计原则

> **Insights 必须来自真实聚合数值，不能来自分布统计。**

这是本方案最核心的改进。当前 insights 基于分布特征（skewness、topSharePct 等）推测图表内容。改进后，LLM 必须先运行聚合查询，拿到真实数字，再写 insights。

#### 新工具：`miao-viz query`

```bash
miao-viz query <file> \
  --groupby region \
  --measure "sum(sales) as total_sales" \
  --orderby total_sales desc \
  --limit 10
```

输出真实聚合结果（JSON），LLM 基于这些真实数字写 insights：

```json
{
  "ok": true,
  "value": {
    "rows": [
      { "region": "East", "total_sales": 420000 },
      { "region": "West", "total_sales": 280000 },
      { "region": "North", "total_sales": 130000 }
    ],
    "total": 830000
  }
}
```

#### Narrative Plan 格式

```
NARRATIVE PLAN
══════════════════════════════════════════════════════════
主故事     : [1-2 句话描述这份数据最重要的发现]

数据证据   : [来自 miao-viz query 的真实数字，非推断]
  - [字段]: [真实值] ([占比/变化率])
  - [字段]: [真实值]

图表意图列表:
  图表 1: [说明这张图服务于哪个分析目标]
  图表 2: [说明这张图服务于哪个分析目标]
  图表 3: [说明这张图服务于哪个分析目标]

排除的图表  : [列出不生成的图表类型及原因]

Insights 草稿:
  - "[基于真实数字的陈述]"
  - "[基于真实数字的陈述]"
══════════════════════════════════════════════════════════
```

#### Narrative Plan 示例

```
NARRATIVE PLAN
══════════════════════════════════════════════════════════
主故事     : 东区以 420K 销售额主导市场，是西区的 1.5 倍。
            但 2024 Q4 东区出现首次环比下滑 (-8%)。

数据证据   : (来自 miao-viz query)
  - East 销售额: 420,000 (50.6%)
  - West 销售额: 280,000 (33.7%)
  - North 销售额: 130,000 (15.7%)
  - East Q4 环比: -8.2%
  - 总销售额: 830,000

图表意图列表:
  图表 1 (bigvalue): 展示总销售额规模，给读者建立基准
  图表 2 (bar):      对比三区绝对差距，East 的主导地位一目了然
  图表 3 (line):     展示 East 季度趋势，突出 Q4 下滑拐点

排除的图表  :
  - histogram: 地区维度不适合分布分析
  - pie: bar 已展示对比，pie 信息冗余
  - scatter: 无有意义的第二量化维度

Insights 草稿:
  - "东区销售额 42 万，占总额 51%，是西区（28 万）的 1.5 倍。"
  - "2024 Q4 东区出现首次季度环比下滑 (-8.2%)，需关注。"
══════════════════════════════════════════════════════════
```

---

### 4.5 Phase 4：Grounded Spec Writing + Self-Review

#### Insights Grounding 规则

每条 insight 必须能追溯到以下来源之一，且要在脑内标注来源（不写入 spec，仅用于 self-review）：

| 来源类型 | 示例 | 允许进入 insights |
|---------|------|-----------------|
| `query` 真实聚合值 | `query:sum(sales,region=East)=420000` | ✅ 是 |
| `profile` 可靠统计量 (`reliable=true`) | `profile:sales.mean=42300,n=1200` | ✅ 是 |
| `profile` 不可靠统计量 (`reliable=false`) | `profile:skewness=2.1,n=8` | ❌ 否 |
| `profile.topSharePct` | `profile:region.topSharePct=0.5` | ❌ 否（行频率≠值贡献）|
| 用户原始陈述 | `"用户说 Q3 业绩不好"` | ✅ 是 |

#### 被禁止的 Insight 写法

```yaml
# ❌ 禁止：topSharePct 被误用为值贡献占比
- "东区是主要市场，占销售额 50%"
  # 实际上 topSharePct=0.5 是行出现频率，不是销售额占比

# ❌ 禁止：基于小样本的统计断言
- "数据呈明显右偏分布（skewness=2.1）"
  # n=8 时 skewness 无统计意义

# ❌ 禁止：gapCount 被解读为"缺失数据"
- "时间序列有 29 天数据缺失"
  # gapCount=29 可能只是正常的非工作日
```

#### 图表预算约束

```
图表预算规则（写入 SKILL.md）:
  □ 默认最多 6 张图（bigvalue 4 个算 1 张）
  □ 每张图必须对应 Narrative Plan 中的一个"图表意图"
  □ 两张相同类型图（如两张 bar）必须有明确不同的分析维度
  □ 超预算时优先合并：
      多趋势 → 多线 line chart
      多度量 bar → 分组 bar chart
```

#### Self-Review 检查清单

提交 spec 前，LLM 执行逐条核查：

```
Self-Review Checklist:
  □ 每条 insight 有对应的 miao-viz query 数值或 reliable=true 的统计量？
  □ 是否引用了 reliable=false 的统计量作为 insight 依据？
  □ 是否将 topSharePct 误用为销售/值贡献占比？
  □ 图表数量是否在预算内（≤ 6）？
  □ 每张图是否对应 Narrative Plan 中的一个意图？
  □ gapCount > 0 时，是否在 caption 注明（而非在 insight 断言"缺失数据"）？
  □ 时间序列的 granularity 是否与 derive-month 的使用一致？
```

---

## 5. 新 CLI 工具接口规范

现有 4 个命令（`profile / validate / catalog / render`）需补充以下接口支持新架构：

### 5.1 `profile --summary`

**用途**: 仅返回结构信息，用于 Phase 1 快速定向。

```bash
miao-viz profile --summary <file>
```

**输出**:
```json
{
  "ok": true,
  "value": {
    "file": "sales.csv",
    "rows": 12400,
    "columns": [
      { "name": "order_date", "type": "date" },
      { "name": "region", "type": "string" },
      { "name": "sales", "type": "number" }
    ]
  }
}
```

**Token 估算**: ~200（不含统计量）

---

### 5.2 `profile --columns`

**用途**: 按需加载指定列的深度统计，支持 Phase 2 定向剖析。

```bash
miao-viz profile --columns sales,region,order_date <file>
```

**输出**: 仅包含指定列的完整 ColumnProfile，附加 `reliable` 字段。

**新增 `reliable` 字段规则**:
- `skewnessReliable`: `rows >= 30`
- `correlationReliable`: `n >= 10`
- `histogramReliable`: `rows >= 20`（桶少于数据点一半时才有意义）

---

### 5.3 `query`（新命令）

**用途**: 运行聚合查询，返回真实计算值，支持 Phase 3 Insights Grounding。

```bash
miao-viz query <file> \
  [--groupby col1,col2] \
  [--measure "sum(sales) as total_sales, count(*) as cnt"] \
  [--filter "year=2024"] \
  [--orderby total_sales desc] \
  [--limit 20]
```

**输出**:
```json
{
  "ok": true,
  "value": {
    "rows": [...],
    "sql": "SELECT region, SUM(sales) as total_sales ...",
    "rowCount": 3
  }
}
```

**实现说明**: 基于现有 `data-transform.ts` 的 aggregate/sort/limit 逻辑，封装为独立 CLI 命令，无需引入 SQL 引擎。

---

### 5.4 `profile --reliable-only`

**用途**: 过滤掉所有 `reliable=false` 的统计量，返回 LLM 可安全引用的子集。

```bash
miao-viz profile --reliable-only <file>
```

用于 Phase 4 Self-Review 阶段快速确认哪些数字可以进 insights。

---

## 6. SKILL.md 更新规范

新 SKILL.md 的 Workflow 应替换为以下结构：

### Phase 1 模板（新增）

```
## Phase 1: Intent Extraction

在运行任何 profile 命令之前，先完成 Intent Card：

1. 运行 `miao-viz profile --summary <file>` 获取列名列表
2. 根据用户请求和列名，填写 Intent Card：
   - 用户问题: [提炼的核心分析问题]
   - 分析类型: [趋势/对比/分布/相关性/KPI]
   - 主要度量(猜测): [最可能的数值列]
   - 主要维度(猜测): [最可能的分组列]
   - 时间关注: [是/否]

只有完成 Intent Card，才能进入 Phase 2。
```

### Phase 2 模板（新增）

```
## Phase 2: Targeted Profiling

根据 Intent Card，选择最多 5 个相关列：
  miao-viz profile --columns [相关列] <file>

选列规则：
  - 主度量列: 必选
  - 主维度列: 必选
  - 时间列: 若 Intent Card 时间关注=是 则必选
  - 次度量/维度: 按需，总数不超过 5

【禁止】在未完成 Intent Card 前加载完整 profile。
【禁止】加载超过 5 列的详细 profile（context 预算约束）。
```

### Phase 3 模板（新增）

```
## Phase 3: Narrative Planning

在写任何 spec 之前，必须：

1. 针对 Intent Card 中的核心问题，运行 1-3 次 miao-viz query
   获取真实聚合数值。

2. 输出 Narrative Plan（包含以下部分）：
   - 主故事: 1-2 句，基于真实数字
   - 数据证据: 来自 query 的实际值（必须列出原始数字）
   - 图表意图: 每张图的分析目的
   - 排除理由: 不生成哪些图表及为什么

只有基于 Narrative Plan 中的真实数字，才能进入 Phase 4。
```

### Phase 4 模板（新增）

```
## Phase 4: Grounded Spec Writing

写 insights 时的强制规则：
  ✅ 允许引用: miao-viz query 返回的真实数字
  ✅ 允许引用: profile 中 reliable=true 的统计量
  ❌ 禁止引用: profile.topSharePct（行频率，非值贡献）
  ❌ 禁止引用: reliable=false 的统计量（n < 30）
  ❌ 禁止: 将 gapCount 断言为"数据缺失"

提交前 Self-Review:
  □ 每条 insight 可追溯到 query 结果或 reliable=true 统计量？
  □ 图表数量 ≤ 6？
  □ 每张图有对应的 Narrative Plan 意图？
```

---

## 7. 各问题的解决映射

| 原问题 | 解决方案 | 对应章节 |
|--------|---------|---------|
| 小样本统计无置信度 | `reliable` 字段分级，`false` 时禁止进 insights | §5.2, §4.3 |
| `topSharePct` 语义歧义 | 禁止在 insights 中使用 `topSharePct` | §4.5 |
| Hints 爆炸信号稀释 | Phase 2 定向加载（≤5 列），Narrative Plan 约束图表意图 | §4.3, §4.4 |
| Data-First / Intent-Last | Phase 1 强制先填写 Intent Card | §4.2 |
| Insights 在图表前盲写 | Phase 3 先 query 获取真实值，再写 insights | §4.4 |
| 报告缺乏叙事连贯 | Narrative Plan 作为必须产物，图表预算约束 | §4.4 |
| Context 效率低 | 分层 profile 调用，--summary 先行 | §4.3, §5.1 |
| gapCount 被误读 | 明确禁止断言，只能在 caption 中注明 | §4.5 |

---

## 8. 实施路线图

### P0：解决最严重缺陷（无需改 CLI 代码，只改 SKILL.md）

- [ ] SKILL.md 新增 Phase 1 Intent Card 规则
- [ ] SKILL.md 禁止 `topSharePct` 进 insights
- [ ] SKILL.md 增加 Grounding 规则（insights 必须有 source）
- [ ] SKILL.md 增加 Self-Review Checklist

**预期效果**: 阻止最常见的 insights 幻觉和语义歧义，无需任何代码变更。

### P1：新增 `miao-viz query` 命令

- [ ] 实现 `query` 子命令（基于现有 `data-transform.ts`）
- [ ] SKILL.md 新增 Phase 3 Narrative Planning 模板
- [ ] vizspec.md 更新 insights 字段的填写规范

**预期效果**: Insights 从猜测变为可验证，是报告质量的最大单项提升。

### P2：Profile 分层加载

- [ ] 实现 `profile --summary` 模式
- [ ] 实现 `profile --columns` 按需深度模式
- [ ] 实现统计量 `reliable` 字段
- [ ] SKILL.md 新增 Phase 2 定向剖析规则

**预期效果**: Context 消耗降低 50-70%，特别是宽表（>10 列）场景。

### P3：Narrative Plan 形式化

- [ ] 可选：新增 `narrative-check` 命令验证 spec insights grounding
- [ ] SKILL.md 完整 4 阶段流程替换现有 Workflow
- [ ] vizspec.md 新增 Narrative Plan 示例

---

## 9. 设计决策记录

**Q: 为什么不直接接入 SQL 引擎（如 DuckDB）来支持 `miao-viz query`？**  
A: `miao-viz` CLI 的定位是轻量本地工具，引入 DuckDB WASM 会显著增加包体积。`query` 命令基于现有 `data-transform.ts` 的内存处理实现，支持 groupBy + aggregate + sort + filter，足以满足 Narrative Planning 阶段的聚合需求。

**Q: 为什么 Narrative Plan 是 LLM 内部推理，而不是 CLI 输出？**  
A: Narrative Plan 本质是 LLM 的"推理链"（Chain of Thought）产物，写到 SKILL.md 里作为工作流规范，强制 LLM 在写 spec 前先完成规划。将其变为 CLI 命令会增加工具复杂度，收益不成比例。

**Q: 图表预算（≤6 张）的数字依据？**  
A: 研究表明人类单次注意力可以有效处理 5-7 个信息单元（Miller's Law）。业务报告的读者通常是决策者，不是分析师，6 张图已经足够传达 2-3 个核心发现。超过这个数量会稀释重点。

---

*最后更新: 2026-06-23*
