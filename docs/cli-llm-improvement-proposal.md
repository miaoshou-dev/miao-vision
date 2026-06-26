# CLI 报告生成模式改进提案

> 📋 **实施日志**：阶段 1–3 已完成，阶段 4 部分完成，阶段 5 未开始。
> 方案设计部分已被 `docs/catalog-productization-prd-v2.md` 取代。
> 本文档保留作为阶段 4–5 未完成事项的 backlog 记录。
>
> 基于 LLM 集成视角的问题分析与优化方案
> 日期：2026-06-25
> 关联文档：`docs/llm-report-quality-improvement-plan.md`、`docs/json-render-lessons-for-miao-viz.md`

---

## 背景与分工原则

CLI（`packages/miao-viz-cli`）+ Skill（`packages/miao-vision-skill/SKILL.md`）共同构成面向 LLM Agent 的可视化工作流。问题集中在两个层面：**CLI 工具能力限制**和 **LLM 行为约束缺失**。

三份文档的分析最终指向同一个架构方向——从"改 workflow"升级到"改契约层"：

```
当前：Skill prose + profile/query 输出 + LLM 自由写 spec
目标：Scoped catalog + Evidence Pack + Schema 校验 + Evidence 验证 + 确定性渲染
```

核心分工：

```
CLI        ：计算确定性证据、约束可用组件、判断样本风险
Skill      ：表达性规则（language constraints、caveat 措辞）
LLM        ：在 catalog 约束内选择证据、组织报告结构、写模板
Validate   ：结构 + 语义校验（必须强制，不可跳过）
Verify     ：Evidence 引用完整性校验
Render     ：确定性 artifact 生成
```

核心原则：**LLM 不负责算数，不负责判断统计可靠性，不负责记忆约束规则。数字由 evidence 提供，规则由 catalog 约束，可靠性由 CLI 判断。**

---

## 问题分析

### 问题 1：`article` 命令的 LLM 职责分工颠倒

**所在文件：** `packages/miao-viz-cli/src/article-infographic.ts`

`article` 命令的内容理解完全依赖确定性 regex + 关键词匹配，没有任何 LLM 调用。LLM 的实际工作只是 fetch URL、存 markdown、调 CLI，而真正困难的"理解文章"部分留给了 regex。

| 功能 | 当前实现 | 问题 |
|------|----------|------|
| Facts 提取 | 包含数字的句子（`NUMBER_PATTERN`） | 无法区分正负面事实，"裁员 50%" 和 "增长 50%" 等价 |
| Takeaways | 包含 `key/recommend/should` 的句子 | 英语关键词，中文文章直接失效 |
| Timeline | 包含日期的句子按出现顺序排列 | 不是真正的时间理解 |
| Summary | 元数据 → 第一条 takeaway → 硬编码 fallback | 无实际摘要生成 |

---

### 问题 2：数据可视化 workflow 步骤过多

**所在文件：** `packages/miao-vision-skill/SKILL.md`（Phase 1–4）

完整 workflow 最少需要 **7–9 次工具调用**，每次调用都有上下文重传和 LLM 重新理解当前状态的成本。**步骤多是 token 消耗的主要来源。**

同时，`profile` 输出的大量统计字段（stddev、p25/p75、histogram）在 spec 写作阶段几乎从不被引用，属于低信噪比 token。

---

### 问题 3：`query` filter 能力不足

**所在文件：** `packages/miao-viz-cli/src/data-query.ts`

只支持 `col=val` 等值 filter，无法做日期范围查询，是时间段 Evidence 生成的前提缺口。SKILL.md 示例只展示单列 groupby，而 `QueryOptions.groupby` 实际支持多列，LLM 不知道这个能力。

---

### 问题 4：spec 验证存在静默漏检

**所在文件：** `packages/miao-viz-cli/src/spec-validator.ts`

未被验证的语义错误：

- `line` 图 X 轴为分类变量 → 图形无意义但 validate 通过
- `derive-month` 作用在非日期字段 → `toMonth` 静默返回原始字符串
- `filter` transform 在 `spec-schema.ts` 枚举里合法，但 `applyTransform` 无对应分支，**直接 fall-through 返回原始行**

注：`aggregate` 别名拼写错误会被 `FIELD_NOT_FOUND` 正常拦截，不是漏检项。

---

### 问题 5：LLM 数字幻觉与过度解读

**所在文件：** `packages/miao-vision-skill/SKILL.md`（Phase 3、Step G）

- insight 里的百分比由 LLM 自行推算，来源不可追踪（`240/450≈53.3%` 可能算错）
- 小样本下写出超出证据范围的经营结论
- Self-Review checklist 靠 LLM 自查，可靠性约 70–80%
- Narrative Plan 是 LLM 写给自己看的中间文本，本身也可以幻觉

---

### 问题 6：chart 选择规则分散、存在冲突

**所在文件：** `packages/miao-viz-cli/src/data-profiler.ts`、`packages/miao-vision-skill/SKILL.md`（Step A–B）

`generateHints` 和 Step B 基数规则有时给出矛盾信号（15 个 distinct value 的列：hints 建议 bar，规则要求 table）。LLM 需要自行判断优先级，但规则优先级没有机器编码。更深层的问题是：图表约束散落在 SKILL.md prose 里，无法被 validator 执行，只能靠 LLM 记忆。

---

## 核心优化方向

三份文档的分析最终指向一个结论：**把图表约束从 SKILL.md prose 搬进机器可读的 catalog，把数字从 LLM 输出移到确定性指令层。** 具体实现是升级后的 `miao-viz analyze` 命令。

### 有效 token vs 低效 token

减少 token 不损失质量的关键在于识别哪些 token 真正影响 spec 质量：

| 类型 | 内容 | 对 spec 质量的贡献 |
|------|------|-------------------|
| **有效** | 字段名/角色、evidence 数值、distinctCount、timePeriods、可用 chart 列表、sample warnings | 直接影响 spec 正确性 |
| **低效** | stddev、p25/p75、histogram（spec 写作规则从不引用）；LLM 多次"读完 → 决定下一步"的状态同步；Narrative Plan 自身文本 | 对 spec 质量贡献极低 |

LLM 在单次回复内可以进行同等深度的推理，chain-of-thought 不依赖独立的 tool call 才能发生。

### `miao-viz analyze` —— Evidence + Catalog 编译器

```bash
miao-viz analyze data.csv \
  --intent "regional sales Q1 trend" \
  --output /tmp/miao-vision/context.json

# 标准证据不足时追加
miao-viz analyze data.csv \
  --intent "region × month cross analysis" \
  --extra-query "sum(sales) by region,month" \
  --output /tmp/miao-vision/context.json
```

CLI 内部自动完成：字段角色识别 → 标准 3 类 query（总量 / 主分组 / 时间段）→ metric candidates → sampleWarnings → 生成 scoped catalog。

输出结构（约 500 tokens，替代当前 profile + query 的约 1500 tokens）：

```json
{
  "intent": {
    "raw": "regional sales Q1 trend",
    "coverage": "partial",
    "assumptions": ["sales is the primary measure", "region is the primary dimension"]
  },
  "fields": [
    { "name": "sales",  "role": "measure",   "type": "number", "min": 90, "max": 240 },
    { "name": "region", "role": "dimension", "type": "string", "distinct": 3 },
    { "name": "month",  "role": "time",      "type": "date",   "timePeriods": 2, "span": "2025-01~2025-02" }
  ],
  "evidence": [
    { "id": "total",     "query": "sum(sales), count(*)", "values": { "sales": 450, "rows": 4 } },
    { "id": "by_region", "query": "sum(sales) by region",
      "rows": [{ "region": "East", "sales": 240, "share": 0.533 }, { "region": "West", "sales": 120 }] },
    { "id": "by_month",  "query": "sum(sales) by month",
      "rows": [{ "month": "2025-01", "sales": 220 }, { "month": "2025-02", "sales": 230 }] }
  ],
  "metricCandidates": [
    { "id": "avg_per_order", "formula": "sum(sales)/sum(orders)", "value": 25, "type": "unit_average" }
  ],
  "catalog": {
    "charts": ["bigvalue", "bar", "table"],
    "blockedCharts": [
      { "type": "line",      "reason": "timePeriods < 3, need >= 3" },
      { "type": "pie",       "reason": "distinct=3 is ok, but no share evidence; use bar" },
      { "type": "scatter",   "reason": "no correlation evidence" },
      { "type": "histogram", "reason": "rows < 20, unreliable distribution" }
    ],
    "actions": ["tooltip"]
  },
  "sampleWarnings": [
    { "code": "small_sample",    "message": "Only 4 rows. Rankings are descriptive only." },
    { "code": "two_period_only", "message": "Only 2 time periods. Do not describe as trend." }
  ],
  "promptRules": [
    "Use only charts listed in catalog.charts. Do not use blockedCharts.",
    "Every insight must cite evidence ids from the evidence array.",
    "Do not compute new percentages. Use values from evidence rows directly.",
    "Mention sampleWarnings as caveats. Use language: '当前样本中' / 'in this N-row sample'."
  ]
}
```

**`blockedCharts` 比 `chartRecommendation` 更强：** 正向推荐 LLM 可能忽略，负向约束带机器可读 reason，且后续 validate 可以检查 spec 是否使用了 blockedChart 里的类型。

**`intent.coverage` 处理证据不足：** 当 analyze 无法满足意图（要求"趋势"但 timePeriods < 3），输出 `coverage: partial`，LLM 如实告知用户而不是强行生成低质量趋势图。

**`promptRules` 为动态 SKILL.md 子集：** 每次 analyze 只注入本数据集/意图相关的规则，替代全量加载 SKILL.md 的通用规则。注意分工：CLI 生成结构性规则（哪些 chart 可用），SKILL.md 保留表达性规则（Conservative Language 措辞）——前者随 CLI 版本管理，后者可快速迭代不依赖发布。

### 新 workflow（3 步 vs 当前 7–9 步）

```
miao-viz analyze data.csv --intent "..."
  → context.json（fields + evidence + catalog + sampleWarnings + promptRules）

LLM 读 context.json，在单次回复内推理 + 写 spec
  → 只能使用 catalog.charts 里的类型
  → insight 引用 evidence id
  → 遵守 promptRules

miao-viz validate --spec report.yaml （必须，不可跳过）
  → schema + 语义 + catalog 合规性检查
  → 输出 warnings 或 patch hints

miao-viz render --input data.csv --spec report.yaml --output report.html
```

**validate 必须保持强制。** token 节省应来自缩窄上下文和 patch repair，不是跳过验证。

### token 估算

| 项目 | 当前 | analyze 方案 | 变化 |
|------|------|-------------|------|
| SKILL.md 加载 | ~3000 | ~1500（删除 Phase 2–3 旧说明，表达规则保留）| −1500 |
| CLI 工具调用次数 | 5–7 次 | 2–3 次 | −3–4 次 |
| profile/query 输出 | ~1500 | ~500（紧凑 context.json）| −1000 |
| LLM Narrative Plan 输出 | ~300 | 0（evidence 由 CLI 生成）| −300 |
| LLM spec 写作 | ~1000 | ~700（catalog 约束，一次到位）| −300 |
| Fix loop 期望成本（30% 概率）| ~900 | ~300（字段/类型已预验证）| −600 |
| **合计** | **~7700** | **~3000** | **−61%** |

---

## 质量影响分析

### 持平或提升（约 80% 报告）

| 质量维度 | 当前 | analyze 方案 |
|----------|------|-------------|
| insight 数字来源 | LLM 自算，可能幻觉 | evidence id 引用，CLI 已计算 |
| 图表类型约束 | LLM 记 SKILL.md 规则，可能遗忘 | catalog.blockedCharts 机器强制 |
| 小样本判断 | LLM 自行判断阈值 | CLI 机器判断，sampleWarnings 直接给结论 |
| 证据不足时的处理 | LLM 可能强行生成 | intent.coverage=partial，LLM 可告知用户 |
| spec 字段错误率 | validate 才发现 | analyze 已验证字段和 evidence 可用性 |

### 可能下降（约 20% 报告）及缓解

**唯一真实风险：** 分析需求需要非标准 query（交叉维度、条件子群）。标准 3 类 query 不覆盖时，evidence 不完整，spec 缺少关键视角。

**缓解：** LLM 判断 `intent.coverage=partial` 或 evidence 不足时，追加 `--extra-query` 一次，代价是 1 次额外调用，仍比当前 3–5 次少。

**SKILL.md 精简边界：** 只删被 analyze 覆盖的决策步骤说明，transform 语法（derive-month、aggregate 写法）、encoding 规范（x/y/label/value）**必须保留**，否则 LLM spec 写法会出错。

---

## 优化方案

### 方案一：`miao-viz analyze`（核心，解决问题 2/5/6）

如上所述。其他方案围绕它展开。

**实现要点：**
- 复用现有 `profileDataset`、`queryDataset`、`generateHints` 逻辑，新增 orchestrator 入口
- `fields` 只输出 name、role、type、min/max、distinct、timePeriods，过滤掉 stddev 等 spec 写作不用的字段
- `catalog.blockedCharts` 在 CLI 侧合并 hints 与基数规则，输出负向约束
- `catalog.charts` 列表同步更新到 `validate`，使其可检查 spec 是否用了 blockedChart
- `promptRules` 只包含结构性规则，SKILL.md 保留表达性规则

### 方案二：`query` 增加范围 filter（analyze 的前提，解决问题 3）

扩展 `applyFilter` 支持 `>=`、`<=`、`>` 运算符，是 analyze 时间段 query 能正确执行的前提：

```bash
miao-viz query sales.csv --filter "date>=2024-01-01" --groupby region,month --measure "sum(revenue) as total"
```

**需同步更新 SKILL.md** 补充多列 groupby 和范围 filter 示例，否则 LLM 不会使用。

### 方案三：`validate` 增加语义 warning + catalog 合规检查（解决问题 4/6）

Schema 校验通过后追加两层检查：

**语义检查**（输出 warnings，不 fail）：
- `derive-month` 作用字段在 profile 里是 string 类型
- `filter` transform 有定义但无执行分支

**catalog 合规检查**（输出 warnings，不 fail）：
- spec 使用了 `catalog.blockedCharts` 里的图表类型

```json
{
  "ok": true,
  "value": {},
  "warnings": [
    "chart 'chart_1': type 'line' is blocked (timePeriods < 3)",
    "chart 'chart_2': derive-month on 'category' (string in profile)",
    "chart 'chart_3': transform 'filter' has no executor in renderer"
  ]
}
```

**需同步更新 SKILL.md Phase 4**，增加"读取 warnings 并修正"指令。

### 方案四：`article --spec-input`（解决问题 1）

CLI 增加接受 LLM 生成的 `InfographicSpec` JSON 的入口，让 LLM 做内容理解，CLI 只做校验 + 渲染。

**前置条件（不可跳过）：**
1. 新增 `infographicSpecSchema`（Zod），覆盖 section type、items 结构、metadata 默认值
2. 为 malformed spec 定义错误码（`INVALID_INFOGRAPHIC_SPEC`）
3. 更新 `runArticle` 支持无 positional file 的 `--spec-input` 路径

```bash
miao-viz article --spec-input /tmp/miao-vision/article-spec.json --output out.html
```

原有 `article <file>` 保留为无 LLM 的快速路径。

### 方案五：`$evidence` 指令 + patch repair（长期，根治幻觉）

**`$evidence` / `$template` 指令** 是数字幻觉的根治方案——LLM 写模板结构，CLI 填数字，数字从不经过 LLM：

```yaml
insights:
  - text:
      $template: "{region} 贡献了 {sales}，占总销售额的 {share}。"
      values:
        region: { $evidence: "by_region.rows.0.region" }
        sales:  { $format: [{ $evidence: "by_region.rows.0.sales" }, "number"] }
        share:  { $format: [{ $evidence: "by_region.rows.0.share" }, "percent"] }
    evidence: ["by_region"]
    caveat: "small_sample"
```

**实现注意：** `$evidence` 路径必须在 validate 阶段同步检查是否存在于 context.json，否则只是把错误模式从"数字算错"变成"路径写错"。初始支持指令集：`$evidence`、`$format`、`$template`、`$ratio`、`$delta`，不支持 `$computed` 或嵌套控制流。

**`validate --patch-hints`** 对有唯一正确解的结构错误输出 JSON Patch：

```jsonl
{"op":"replace","path":"/charts/1/type","value":"bar"}
{"op":"remove","path":"/charts/2/data/transform/0"}
```

LLM 只返回几行 diff，不重传整个 spec，是 fix loop 的 token 最优解。**仅用于有唯一正确解的结构错误**，语义歧义（换 chart type vs 换字段）仍走 warnings 路径。

### 方案六：`miao-viz inspect`（长期，替代 preview）

比 `preview` 更完整的调试命令，输出结构化调试信息：

```bash
miao-viz inspect --input data.csv --spec report.yaml --output inspect.json
```

输出：每个 chart 的 transform 逐步执行结果、encoding 字段来源和类型、evidence id 使用情况、未被 insight 引用的 evidence、有 sampleWarning 但无 caveat 的 insight。给 LLM 提供结构化调试面，而不是让它从最终 HTML 倒推问题。

### 方案七：`miao-viz verify` + 结构化 insight（长期）

insight 从 `string[]` 升级为兼容 union type：

```typescript
type Insight =
  | string  // 短期兼容
  | { text: string; evidence?: string[]; caveat?: string; severity?: 'info' | 'warning' }
```

`miao-viz verify` 校验：evidence id 是否存在、有 sampleWarning 时 insight 是否带 caveat、禁用词（trend/drive/significant）是否出现在无统计支撑的上下文中。

---

## 统一实施路径

### 阶段 1：只改 SKILL.md（零 CLI 成本，立即可做）✅

- [x] Phase 3 改为固定 Evidence Pack 步骤（3 类 query + 组装 JSON）
- [x] 增加 Conservative Language 约束（禁用词表 + 允许表达模式）
- [x] 要求每条 insight 注明 evidence 来源 id

---

### 阶段 2：`analyze` + range filter + SKILL.md 同步（本迭代）✅

- [x] 实现 `miao-viz analyze` 命令（复用现有逻辑，新增 orchestrator）— `analyzer.ts`
- [x] analyze 输出：`fields`（紧凑）、`evidence`、`catalog`（含 `blockedCharts` + `recommendedPlan`）、`sampleWarnings`、`promptRules`、`intent`（含 `coverage` + `assumptions`）— `context-schema.ts`
- [x] `query` 扩展范围 filter（`>=`、`<=`、`>`）— `data-query.ts:102`
- [x] SKILL.md Phase 2–3 替换为 `analyze` 用法，删除旧 profile/query 步骤说明
- [x] SKILL.md 精简：删除被 analyze 覆盖的 Step A–F 决策描述，保留 transform/encoding 语法

> ⚠️ `buildCatalogHints()` 被 analyzer 调用但结果赋给 `_hints`（未被 `buildCatalog` 实际使用），属死代码，待清理。

**CLI 与 SKILL.md 必须同步发布，** 单独发任何一侧都不生效。

---

### 阶段 3：`validate` 升级 + `article` 重构（下个迭代）✅

- [x] `validate` 增加语义 warnings — T24 `derive-month` 作用于 string 字段（`spec-validator.ts:116`）、T25 `line` 图 `x.type=nominal`（`spec-validator.ts:128`）
- [x] `validate` 检查 spec 是否使用了 `catalog.blockedCharts` 里的类型（T26，warning 模式）+ `--strict` 升级为 hard error — `spec-validator.ts:136`、`cli.ts:160`
- [x] `filter` transform 由 silent fall-through 改为 hard error `UNSUPPORTED_TRANSFORM` — `spec-validator.ts:288`（比提案更严格）
- [x] SKILL.md Phase 4 增加"读取 warnings 并修正"指令
- [x] `InfographicSpec` 补 Zod schema + 错误码 `INVALID_INFOGRAPHIC_SPEC` — `article-infographic.ts:58`
- [x] `article --spec-input` 实现 — `cli.ts:344`
- [x] SKILL.md article workflow 更新（Path B：LLM 输出 spec → CLI 渲染）

---

### 阶段 4：指令层 + patch repair（质量根治）🔄 部分完成

- [ ] spec 的 insight 升级为兼容 union type（`string | {text, evidence[], caveat, severity}`）— 仍是纯 `string[]`
- [x] `$evidence` 指令实现（解析 + 路径解析）— `directive-resolver.ts`
- [ ] `$format` / `$template` / `$ratio` / `$delta` 指令实现（Renderer 侧）— 未实现
- [x] `validate --context` 同步检查 `$evidence` 路径是否存在于 context.json（T38）— `spec-validator.ts:152`
- [x] `validate --patch-hints` 对有唯一解的结构错误输出 JSON Patch — `patch-hints.ts`（覆盖 `UNSUPPORTED_TRANSFORM`、`BLOCKED_CHART_STRICT`、`DUPLICATE_CHART_ID`、`MISSING_ENCODING`）
- [x] `validate --verify` forbidden word 检测（T49）+ caveat 传导检查（T48）— `spec-validator.ts:177`
- [ ] Renderer 支持渲染 `caveat` 为脚注 / warning block — 未实现

---

### 阶段 5：调试 + 验证闭环（长期）❌ 未开始

- [ ] `miao-viz inspect`（transform 逐步执行、evidence 使用情况、未引用 evidence）
- [ ] `miao-viz verify` 独立命令（evidence id 校验、caveat 传导、禁用词检测）— 当前禁用词/caveat 检测已合入 `validate --verify`，独立命令未做
- [ ] SKILL.md Phase 4 增加 inspect / verify 步骤建议

---

## 优先级总表

| 事项 | 阶段 | 成本 | token 影响 | 质量影响 |
|------|------|------|-----------|---------|
| SKILL.md Evidence Pack + 禁用词 | 1 | 极低 | −200 | 立即减少过度解读 |
| `miao-viz analyze`（含 catalog + blockedCharts）| 2 | 中（3–4天）| **−61% 整体** | 消除 chart 规则冲突、数字幻觉基础 |
| `query` 范围 filter | 2 | 低（半天）| 0（为 analyze 解锁）| 时间段 Evidence 准确 |
| SKILL.md 同步精简 | 2 | 低（半天）| −1500/会话 | 规则更清晰，无 drift |
| `validate` 语义 warning + catalog 检查 | 3 | 低（1天）| +100（值得）| 减少 render 调试循环 |
| `article --spec-input` | 3 | 中（3–5天）| 0 | article 质量质变 |
| 结构化 insight | 4 | 低（1天）| +50/spec | 为指令和 verify 打基础 |
| `$evidence` / `$template` 指令 | 4 | 中（3天）| −200（省去 verify 部分工作）| 数字幻觉根治 |
| `validate --patch-hints` | 4 | 中（2天）| −500/fix loop | Fix loop token 最优解 |
| `miao-viz inspect` | 5 | 中（3天）| +150（调试时）| 结构化调试替代猜测 |
| `miao-viz verify` | 5 | 中（3天）| +150（verify 时）| insight 幻觉机器检测 |
