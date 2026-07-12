# Report Intelligence Knowledge PRD

> 日期：2026-07-09  
> 更新：2026-07-12，根据 `docs/report-intelligence-knowledge-prd-review.md` 补充现状映射和迁移路径  
> 状态：规划稿  
> 关联：`docs/evidence-grounded-visualization-generation.md`、`docs/llm-report-quality-improvement-plan.md`、`docs/catalog-productization-prd-v2.md`、`docs/miao-viz-interactive-runtime-prd.md`  
> 目标：整合并扩展 Miao Vision 已有的报告智能实现，把成熟可视分析经验沉淀为单一知识源，约束 agent 生成行为，驱动 CLI 推荐和校验，提升本地报告的正确率、可解释性和可验证性。

---

## 0. Current State

本 PRD 不是 greenfield 设计。代码库已经具备一组报告智能能力，只是分散在 profile、analyze、catalog、block registry、validator 和 skill 文档中。本项目的第一目标是整合、收敛和补强，而不是重建第二套事实源。

| 能力 | 当前实现 | 状态 | 本 PRD 的 delta |
|------|----------|------|-----------------|
| 字段 profile | `ColumnProfile` in `packages/miao-viz-cli/src/types.ts` | partial | 增加统一角色词汇表、confidence、rationale、usage policy |
| 分析字段上下文 | `AnalyzeField` in `packages/miao-viz-cli/src/context-schema.ts` | partial | 与 `ColumnProfile.role` 收敛，避免两套角色漂移 |
| 字段角色细化 | `refineRole()` in `packages/miao-viz-cli/src/analyzer.ts` | partial | 从 name regex 扩展为可测试规则 |
| evidence context | `AnalyzeEvidence` in `context-schema.ts` | exists | 保持现有 `id/query/values/rows` 结构，增加 insight 校验约束 |
| chart catalog | `chart-catalog-core.ts` / `chart-catalog-ext.ts` | exists | 增加可执行 constraints、role compatibility 和 validator 连接 |
| blocked charts | `AnalyzeCatalog.blockedCharts` | exists | 统一 blocked reason code 和 agent-facing repair hint |
| block registry | `ReportBlockResolver` / `BlockDecision` in `report-block-registry.ts` | exists | 增加 required evidence、valid insight types、quality constraints |
| template registry | `report-template-registry.ts` / `CatalogTemplateEntry` | exists | 将 template 纳入 report intelligence，而不只讨论 block |
| sample warnings | `AnalyzeSampleWarning` | exists | 扩展为 insight language constraint 的输入 |
| metric candidates | `MetricCandidate` | exists | 与 insight rules 绑定，避免 agent 自造公式 |
| compact context | `CompactAnalyzeContext` | exists | 所有新增输出必须考虑 agent token budget |
| evidence refs | `parseEvidenceRefs()` / `$evidence:` | exists | 继续作为可追溯引用机制 |
| verify 反模式 | `FORBIDDEN_WORDS` / `VerifyIssue` in `spec-validator.ts` | partial | 扩展为机器可读 anti-pattern rules |
| numeric claim check | `INSIGHT_NUMERIC_CLAIM_WITHOUT_EVIDENCE_STRICT` | exists | 作为 insight evidence 校验基线 |

因此，Report Intelligence Knowledge Pack 的定义应调整为：

> 统一现有 report intelligence 能力的 source of truth，并补齐字段语义、图表约束、block/template 选择、insight evidence rules、anti-pattern validation 和 agent reference 的一致性。

---

## 1. 背景

Miao Vision 的产品定位正在收敛为：

> 面向本地文件和 AI agent 的可信报告编译器。

这个定位的核心不是“AI 能写报告”，而是“AI 在一套确定性知识、结构化证据和可执行校验规则中编译报告”。报告质量的主要风险通常不来自 HTML 渲染，而来自更上游的分析判断：

- 字段角色识别错误，例如把 `user_id`、`order_id` 当成指标。
- 图表选择错误，例如用折线图展示无序分类，或用饼图展示过多类别。
- block 组合错误，例如没有时间字段却生成趋势分析。
- insight 过度解读，例如在小样本上写“显著增长”“稳定趋势”“核心驱动因素”。
- 证据绑定不足，例如自然语言中的数字、排名、变化率无法从 evidence 复算。
- 数据质量风险被隐藏，例如高缺失率字段仍被用于强结论。

Tableau 等 BI 产品长期积累了字段角色、图表选择、Marks encoding、dashboard pattern、data quality warning 等可视分析经验。Miao Vision 不应复刻 Tableau 的拖拽工作台、Server、权限和连接器平台，但应吸收其成熟的分析表达规则，并将其改造成适合本项目的 knowledge layer。

本 PRD 定义的能力命名为：

> Report Intelligence Knowledge Pack

它不是一份给 agent 阅读的大文档，也不是替代现有 catalog/block/template 代码的新系统，而是一组同时服务 agent、CLI、validator 和 renderer 的知识资产。已有实现优先被收敛为 source of truth；缺失能力以 delta 形式补齐。

---

## 2. 产品目标

### 2.1 核心目标

在现有 analyzer、chart catalog、block registry、template registry 和 validator 基础上，建立一套可执行、可解释、可演进的报告智能知识层，让 Miao Vision 在自动生成报告时做到：

1. 字段语义可解释。
2. 图表选择有理由。
3. block 组合匹配数据和用户意图。
4. insight 必须有 evidence 支撑。
5. 数据质量限制会影响推荐和表达。
6. 错误或高风险报告可以被 validator 阻止或降级。
7. agent 生成 spec 的自由度被约束在可验证范围内。

### 2.2 非目标

本项目不做：

- Tableau/PowerBI 式拖拽 dashboard builder。
- 企业数据连接器平台。
- 权限、治理、发布服务器和多人协作。
- 任意 SQL 工作台或长期运行的数据探索环境。
- 只供 LLM 阅读、无法被 CLI 执行的大段分析指南。
- 没有 evidence 的“智能洞察”生成。

---

## 3. 目标用户和使用场景

### 3.1 目标用户

主要服务两类用户：

- 直接用户：经常拿到本地 CSV、Excel、JSON、Markdown，需要快速生成可信报告的人，包括分析师、运营、咨询、科研、教育、调研和小团队负责人。
- 间接用户：调用 Miao Vision 的 AI agent、CI、自动化脚本或本地工作流。

### 3.2 关键场景

1. 本地文件生成管理报告。
2. 问卷或调研数据生成解释性报告。
3. 科研或实验数据生成可引用 artifact。
4. agent 自动处理文件并输出 HTML/PDF/deck。
5. PR、邮件、归档系统中自动附带 evidence-grounded report。

---

## 4. 产品原则

### 4.1 Knowledge Is Executable

知识不能只存在于 skill prose 中。关键规则必须有机器可读形态，能够被 `data analyze`、`spec block instantiate`、`spec validate --verify` 和 renderer 消费。

### 4.2 Deterministic Before Generative

CLI 先给出字段角色、候选图表、候选 block、evidence 和风险提示；agent 在这些候选之上选择、组织和表达，不从空白状态自由创作。

### 4.3 Evidence First

所有数字、排名、变化、占比、异常、相关性和阈值判断必须引用 evidence。自然语言 insight 是 evidence 的表达层，不是事实来源。

### 4.4 Conservative Language

知识层必须约束措辞。小样本、少时间点、低置信字段、缺失率高或只有相关性时，报告必须使用描述性、克制语言。

### 4.5 Single Source Of Truth

字段语义、图表规则、block 适用条件、insight evidence requirements 和 anti-patterns 应尽量由同一组定义派生，避免 CLI、validator、skill 文档各自维护一套相互漂移的规则。

当前实现已经有多个 source 候选：`ColumnProfile`、`AnalyzeField`、chart catalog、`ReportBlockResolver`、`CatalogTemplateEntry`、validator 规则和 skill reference。本项目必须先做现状收敛，再新增规则。

---

## 5. 用户体验

### 5.1 Agent 工作流

理想 agent 流程：

```text
用户给本地数据文件 + 分析意图
  -> agent 调用 miao-viz data analyze
  -> CLI 内部 profile，并输出 fields、evidence、catalog、blocks、templates、sampleWarnings、metricCandidates
  -> agent 选择或调整候选 block
  -> agent 调用 spec block instantiate
  -> agent 补写克制 insight 和 narrative
  -> agent 调用 spec validate --context --verify
  -> validator 返回 ok 或 patch hints
  -> agent 修复 spec
  -> agent 调用 render report
  -> 生成 self-contained HTML artifact
```

### 5.2 用户可见结果

报告中应体现：

- 字段解释：关键字段为何被当作指标、维度、时间或 ID。
- 图表理由：图表标题、说明或 metadata 中可追溯选择理由。
- 证据展开：用户可以查看支持结论的 evidence table、metric 或 query result。
- 数据质量提示：缺失、重复、异常、小样本、少时间点等限制不被隐藏。
- 静态交互：tooltip、排序、筛选、证据折叠、图表到证据跳转。

---

## 6. Knowledge Pack 范围

Report Intelligence Knowledge Pack 包含六类知识。

### 6.1 Field Semantics Knowledge

目标：识别字段在分析中的角色，而不只是原始类型。

当前有两套角色：

- `ColumnProfile.role`：`measure | dimension | time | id | flag | unknown`
- `AnalyzeField.role`：`measure | dimension | time | id | status | score | unknown`

PRD 不应直接引入第三套无映射角色。建议把核心角色收敛为：

- `measure`
- `dimension`
- `time`
- `id`
- `status`
- `score`
- `flag`
- `text`
- `geo`
- `unknown`

领域或格式修饰信息不进入核心 role，而进入 `semanticTags`：

- `currency`
- `percentage`
- `url`
- `ordinal`
- `latitude`
- `longitude`

`chemical_structure` 不进入核心 pack。它应作为 `chemistry` domain pack 提供，例如 `semanticTags: ['chemical_structure', 'smiles']`，避免通用报告编译器被单一垂直领域牵引。

迁移映射：

| 旧角色/提案角色 | 目标表达 |
|-----------------|----------|
| `temporal` | `role: 'time'` |
| `identifier` | `role: 'id'` |
| `boolean` | `role: 'flag'` |
| `ordinal_category` | `role: 'dimension'`, `semanticTags: ['ordinal']` |
| `currency` | `role: 'measure'`, `semanticTags: ['currency']` |
| `percentage` | `role: 'measure'`, `semanticTags: ['percentage']` |
| `url` | `role: 'text'`, `semanticTags: ['url']` |
| `chemical_structure` | domain pack tag, not core role |

字段画像建议结构：

```ts
interface FieldProfile {
  name: string
  rawType: 'string' | 'number' | 'date' | 'boolean'
  role: 'measure' | 'dimension' | 'time' | 'id' | 'status' | 'score' | 'flag' | 'text' | 'geo' | 'unknown'
  semanticTags: string[]
  cardinality: number
  missingRate: number
  uniqueRate: number
  examples: unknown[]
  confidence: number
  rationale: string[]
  qualityFlags: string[]
  chartUsage: {
    asMeasure: 'recommended' | 'allowed' | 'discouraged' | 'forbidden'
    asDimension: 'recommended' | 'allowed' | 'discouraged' | 'forbidden'
    asDetailKey: 'recommended' | 'allowed' | 'discouraged' | 'forbidden'
  }
}
```

关键规则：

- 高唯一率字符串优先识别为 `id`，不应用作聚合指标。
- 低基数字符串可作为 `dimension`。
- 日期或时间戳字段识别为 `time`。
- 金额、收入、成本、利润、价格等字段识别为 `measure`，并添加 `currency` tag 候选。
- 比例、率、百分比字段识别为 `measure`，并添加 `percentage` tag，默认不应再做 sum。
- `lat/lon`、国家、省份、城市识别为 `geo`。
- `smiles`、`molfile`、`inchi` 由 chemistry domain pack 识别，不属于核心规则。

### 6.2 Chart Selection Knowledge

目标：根据字段角色、用户意图、数据质量和样本规模推荐合适图表。

图表知识结构：

```ts
interface ChartKnowledgeItem {
  chartType: string
  bestFor: string[]
  requiredRoles: string[]
  optionalRoles: string[]
  encodings: Record<string, string>
  evidenceNeeded: string[]
  constraints: string[]
  antiPatterns: string[]
  maxRecommendedCategories?: number
  minRecommendedRows?: number
}
```

首批图表规则：

| 图表 | 适用 | 禁用或降级 |
|------|------|------------|
| KPI card | 单指标、总量、均值、比率、变化率 | 没有清晰聚合口径时禁用 |
| Bar | 分类对比、排名、Top N | 类别过多时转 Top N 或 table |
| Line | 时间趋势 | 无序分类或少于 3 个时间点时降级 |
| Scatter | 两个连续指标关系 | 样本过少时禁止写强相关结论 |
| Histogram | 单指标分布 | 离散类别字段不适用 |
| Box plot | 分布、离群值、组间差异 | 每组样本过少时降级 |
| Heatmap | 二维分类、矩阵强度 | 两个维度基数过高时降级 |
| Table | 明细、审计、证据 | 不应作为唯一 summary，除非数据很小 |
| Pie/Donut | 少量组成占比 | 超过 5-6 个类别或非 part-to-whole 时禁用 |
| Map | 地理分布 | 地理字段不可靠时禁用 |

化学结构图、molecule grid、reaction scheme 属于 domain chart pack，不放入核心 chart rules。核心 pack 只定义 domain pack 的挂载机制和 validator contract。

### 6.3 Block Selection Knowledge

目标：让报告结构从“自由拼图”升级为可验证的分析 block 组合。

Block 知识结构：

```ts
interface ReportBlockKnowledgeItem {
  blockId: string
  purpose: string
  requiredRoles: string[]
  optionalRoles: string[]
  recommendedCharts: string[]
  requiredEvidence: string[]
  validInsightTypes: string[]
  invalidInsightTypes: string[]
  dataQualityConstraints: string[]
  layoutHints: string[]
}
```

首批 block：

- `data-quality-summary`
- `kpi-summary`，对应当前 `ReportBlockResolver`
- `snapshot-ranking`，对应当前 `ReportBlockResolver`
- `trend-overview`，对应当前 `ReportBlockResolver`
- `comparison-breakdown`，对应当前 `ReportBlockResolver`
- `distribution-analysis`
- `relationship-analysis`
- `outlier-spotlight`
- `detail-evidence-table`
- `geo-breakdown`

Block 选择规则示例：

- 有 `time + measure` 且至少 3 个 time periods 时，可推荐 `trend-overview`。
- 有 `dimension + measure` 时，可推荐 `snapshot-ranking` 或 `comparison-breakdown`。
- 有两个以上 `measure` 且样本充足时，可推荐 `relationship-analysis`。
- 有高缺失率字段时，必须包含或显示 `data-quality-summary`。
- 有 `id` 和多行明细时，可推荐 `detail-evidence-table`。
- 有 domain pack 字段时，由对应 domain pack 推荐 domain-specific block。

Template 层也必须纳入本项目。当前 `report-template-registry.ts` 和 `CatalogTemplateEntry` 已存在，后续规则应覆盖：

- template requires 的 role 校验。
- template blocks 与 block registry 的一致性。
- template score 与 block score 的组合方式。
- template 被 blocked 时的 reason code 和 repair hint。

### 6.4 Insight Rules Knowledge

目标：让每类 insight 都有明确 evidence requirements 和校验方式。

Insight 类型：

- `rank`
- `delta`
- `trend`
- `outlier`
- `share`
- `gap`
- `correlation`
- `threshold`
- `distribution`
- `data_quality`

Insight 知识结构：

```ts
interface InsightRule {
  insightType: string
  allowedStatements: string[]
  forbiddenStatements: string[]
  requiredEvidence: Array<{
    kind: 'values' | 'rows' | 'metricCandidate' | 'sampleWarning' | 'profile'
    path?: string
    fields?: string[]
  }>
  requiredChecks: Array<{
    type: 'evidence_ref_exists' | 'numeric_claim_bound' | 'rank_position' | 'delta_formula' | 'sample_size' | 'caveat_present'
    severity: 'error' | 'warning'
  }>
  caveats: string[]
  patchHints: string[]
}
```

这个结构必须建立在现有 `AnalyzeEvidence` 和 `$evidence:` 引用机制上，而不是退回到松散的 `string[]`。`INSIGHT_NUMERIC_CLAIM_WITHOUT_EVIDENCE_STRICT` 是当前 baseline：任何带数字的 insight 如果没有 `$evidence:` 引用，应继续被严格拦截。

示例规则：

- `rank` 必须引用排序后的 group aggregate evidence。
- `delta` 必须引用两个可比较时期或两个分组的数值。
- `trend` 至少需要 3 个时间点；少于 3 个时间点只能写“这两期之间变化”。
- `correlation` 必须引用相关系数和样本量；样本过少时不得写 strong relationship。
- `outlier` 必须说明检测口径，例如 IQR、z-score、percentile 或业务阈值。
- `share` 必须同时有 numerator 和 denominator。
- `data_quality` 可以引用 profile warning，不需要图表 evidence。

### 6.5 Anti-Patterns Knowledge

目标：用反模式直接阻止常见错误。

首批反模式：

- 不要把 ID、UUID、订单号、手机号、邮编当作业务指标求和或平均。
- 不要用折线图展示无序分类。
- 不要用饼图展示超过 6 个类别。
- 不要在没有时间字段时写趋势。
- 不要在少于 3 个时间点时写稳定趋势。
- 不要在样本量过小时写显著、证明、驱动、预测。
- 不要把相关性写成因果关系。
- 不要忽略高缺失率字段上的 caveat。
- 不要让图表标题表达 evidence 无法支持的结论。
- 不要在没有基准、目标或历史对比时写表现好/差。

### 6.6 Interaction Knowledge

目标：为 self-contained HTML report 选择合适的轻量交互。

首批交互：

- Tooltip 显示字段、口径和 evidence id。
- Legend hover highlight。
- Table sort/search。
- Filter chips。
- Evidence disclosure。
- KPI click-to-evidence。
- Chart-to-table linked highlight。
- Print/PDF mode。

不做：

- 任意拖拽布局。
- 在线 spec 编辑器。
- 后端实时查询。
- 多用户共享状态。

---

## 7. 系统设计

### 7.1 文件组织建议

机器可读知识应优先整合现有文件，而不是一开始新增平行目录。建议分两步：

第一步，在现有模块中补齐 source-of-truth 字段：

```text
packages/miao-viz-cli/src/
  types.ts                    # ColumnProfile role/tag 目标形状
  context-schema.ts           # AnalyzeField / AnalyzeCatalog / CompactAnalyzeContext
  analyzer.ts                 # field role/tag refinement
  chart-catalog-core.ts       # core chart rules
  chart-catalog-ext.ts        # extended chart rules
  report-block-registry.ts    # block applicability and score
  report-template-registry.ts # template applicability and score
  spec-validator.ts           # verify and anti-pattern execution
```

第二步，只有当规则足够多、跨模块复用明显时，再抽出 `knowledge/`：

```text
packages/miao-viz-cli/src/knowledge/
  field-semantics.ts
  chart-rules.ts
  block-patterns.ts
  insight-rules.ts
  validation-rules.ts
  anti-patterns.ts
  index.ts
```

Agent 可读 reference：

```text
skills/miao-vision/references/
  data-report.md              # 已存在，需引用和更新
  report-intelligence.md
  chart-selection.md
  evidence-grounding.md
  anti-patterns.md
```

规则约束：

- CLI 的 `.ts` 文件是执行源。
- Skill reference 是 agent 行为说明，不能成为唯一规则源。
- docs PRD 描述产品意图和路线，不承载执行规则。

### 7.2 CLI 输出增强

`data profile` 目标 delta：

```json
{
  "ok": true,
  "value": {
    "rows": 1200,
    "columns": [
      {
        "name": "order_id",
        "type": "string",
        "role": "id",
        "semanticTags": [],
        "confidence": 0.96,
        "rationale": ["name matches id pattern", "unique rate is 0.99"],
        "chartUsage": {
          "asMeasure": "forbidden",
          "asDimension": "discouraged",
          "asDetailKey": "recommended"
        }
      }
    ],
    "quality": {
      "warnings": []
    }
  }
}
```

`data analyze` 目标 delta 必须兼容当前 `AnalyzeContext`，尤其是 `CompactAnalyzeContext`：

```json
{
  "ok": true,
  "value": {
    "fields": [],
    "evidence": [],
    "catalog": {
      "charts": [],
      "blockedCharts": [],
      "blocks": [],
      "blockedBlocks": [],
      "templates": [],
      "blockedTemplates": []
    },
    "sampleWarnings": [],
    "metricCandidates": [],
    "promptRules": []
  }
}
```

不得新增与 `fields`、`catalog.blocks`、`catalog.templates` 平行的 `fieldSemantics`、`blockCandidates`、`templateCandidates` 顶层数组，避免 schema 膨胀和 agent token 成本上升。需要压缩时继续使用 `CompactAnalyzeContext`。

`spec block instantiate` 增强：

- 根据 `catalog.blocks` 中的候选生成 VizSpec 草稿。
- 默认包含 required evidence refs。
- 默认生成 conservative insight placeholders。

`spec validate --verify` 增强：

- 校验 chart/field role 适配。
- 校验 block required roles。
- 校验 insight evidence refs。
- 校验 insight 文案是否触发 forbidden language。
- 校验数据质量 caveat 是否存在。
- 返回结构化 patch hints。

### 7.3 Scoring 模型

当前 `BlockDecision.score` 已使用 0-1 分数，语义为：`>=0.9` strong match，`0.5-0.9` usable，`<0.5` not recommended。PRD 沿用此 bounded score，不引入无界加法模型。

候选 chart/block/template 的推荐分数建议由确定性因子组成，并归一化到 0-1：

```text
score_0_1 = normalize(
  field_fit,
  intent_fit,
  evidence_strength,
  chart_validity,
  block_or_template_coverage,
  layout_clarity,
  data_quality_risk_penalty,
  anti_pattern_penalty
)
```

分数只用于排序和解释，不应取代 hard validation。触发 forbidden rule 时必须阻止或降级，并进入 `blockedCharts`、`blockedBlocks` 或 `blockedTemplates`。

---

## 8. 验证和正确率指标

### 8.1 产品指标

指标必须带基线、目标值和测量方法。Phase 1 允许先建立基线，再锁定目标。

| 指标 | 测量方法 | Phase 1 基线 | Phase 2 目标 |
|------|----------|--------------|--------------|
| Field role accuracy | golden fixtures 自动比对 | 新增 fixtures 后测量 | >= 90% core roles |
| Chart selection accuracy | golden fixtures 自动比对 allowed/blocked charts | 新增 fixtures 后测量 | >= 90% |
| Evidence coverage | 扫描含数字 insight 的 `$evidence:` 引用 | 当前 strict check baseline | >= 95% |
| Verification pass rate | agent 生成 spec 首次 `validate --verify` 通过率 | 新增 benchmark 后测量 | +20% relative |
| False confidence rate | 人工 panel 审核小样本/低质量报告 | 新增 benchmark 后测量 | <= 5% |
| Patch success rate | validator patch hints 后二次通过率 | 新增 benchmark 后测量 | >= 80% |

人工评估建议使用 3 人 panel，每份报告按字段角色、图表选择、结论克制性、证据追溯性四项打分。自动化指标走 golden tests。

### 8.2 自动测试夹具

应新增覆盖以下数据类型的 fixtures：

- 销售/订单数据。
- 产品事件数据。
- 问卷数据。
- 财务指标数据。
- 日志或性能数据。
- 地理数据。
- 小样本数据。
- 高缺失率数据。
- 高基数 ID 数据。

化学结构字段数据放入 `chemistry` domain pack fixtures，不作为 core pack Phase 1/2 验收前置条件。

### 8.3 Golden Tests

每类 fixture 应有 golden expectations：

- 字段角色。
- 推荐图表。
- 禁用图表。
- 推荐 block。
- 必需 evidence。
- 允许 insight 类型。
- 应触发的 warnings。

---

## 9. 分阶段路线

### Phase 1：现状映射、最小机器规则和 Validator 反模式

目标：最快降低 agent 明显错误。

交付：

- 在 PRD 或 implementation plan 中维护 current-state mapping，防止重复建设。
- 将高风险反模式定义为最小机器可读规则，而不是 prose-only。
- 将高风险反模式接入 `spec validate --verify`，扩展现有 `FORBIDDEN_WORDS` / `VerifyIssue`。
- 新增或更新 agent reference：`report-intelligence.md`、`chart-selection.md`、`anti-patterns.md`，内容从机器规则摘要派生或显式引用机器规则。
- 在 skill 工作流中要求生成 report 前读取相关 reference。
- 新增基础 fixtures 和 anti-pattern tests。

验收：

- ID 作为指标、无时间字段写趋势、饼图类别过多等错误能被拦截。
- 文档说明 agent 如何使用 knowledge pack。
- Phase 1 不引入与现有 `AnalyzeContext` 平行的新 schema。

### Phase 2：字段角色收敛和 Chart Knowledge 执行化

目标：让推荐和校验从 prose 转为统一规则。

交付：

- 统一 `ColumnProfile.role` 与 `AnalyzeField.role`，建立 old-to-new migration mapping。
- `refineRole()` 从 name regex 扩展为可测试字段语义规则。
- `data profile` 输出 role/tag confidence、rationale 和 chart usage policy。
- `data analyze` 继续输出 `catalog.charts` / `blockedCharts`，补充 standardized reason code。
- Validator 从 chart catalog 读取 required roles、constraints、anti-patterns。
- `CompactAnalyzeContext` 同步更新，控制 token 体积。

验收：

- 常见字段角色识别准确。
- chart recommendation 有可解释 reason。
- chart invalid use cases 能返回结构化错误或 warning。

### Phase 3：Block/Template Patterns 和 Evidence Requirements

目标：把报告生成从图表级提升到 block/template 级。

交付：

- 扩展现有 `ReportBlockResolver`，声明 required evidence、valid insight types、quality constraints。
- 扩展现有 `report-template-registry.ts`，声明 template-level required roles、blocks、evidence coverage。
- `spec block instantiate` 根据 context 选择 block，并保留现有 0-1 `BlockDecision.score`。
- 每个 block/template 声明 required evidence 和 valid insight types。
- `validate --verify` 校验 block/evidence/insight 一致性。

验收：

- 报告能自动生成 KPI、趋势、分组、分布、明细等合理结构。
- 缺失 evidence 的 insight 被阻止。
- validator 可以给出 repair hints。

### Phase 4：Report Compiler Scoring 和 Static Interaction

目标：提升 artifact 体验，但保持本地静态输出。

交付：

- 候选 chart/block/template scoring，统一 0-1 score 语义。
- render report 支持 evidence disclosure、tooltip、table sort/search、filter chips。
- 输出 HTML 内嵌 spec、context、evidence metadata。

验收：

- 用户能在 HTML 报告中追溯关键结论。
- 交互不依赖后端、不上传数据。
- print/PDF mode 不破坏报告结构。

---

## 10. 风险和权衡

### 10.1 规则过多导致系统僵硬

风险：agent 被规则限制后无法生成领域化报告。

缓解：

- 区分 hard rule、warning、recommendation。
- 允许 escape hatch，但必须显式写明 reason 和 caveat。
- 领域扩展通过追加 knowledge pack，而不是修改核心逻辑。

### 10.2 Knowledge 和实现漂移

风险：skill 文档、CLI 规则、validator 校验不一致；或者本 PRD 引入第二套事实源。

缓解：

- 先整合已有 `AnalyzeContext`、chart catalog、block registry、template registry 和 validator 规则。
- 机器可读 `.ts` 规则作为 source of truth。
- 从规则生成 agent reference 片段或 summary。
- 测试覆盖 chart/block/insight rule 的一致性。

### 10.3 过度借鉴 BI 产品

风险：产品被带向 dashboard builder 和企业 BI 平台。

缓解：

- 明确 artifact-first、local-first、agent-native。
- 不做拖拽工作台。
- 不做权限、发布服务器、连接器生态。
- 每个新增能力都必须服务 report correctness。

### 10.4 校验自然语言难度高

风险：insight 文案中的数字和判断难以完全机器校验。

缓解：

- 逐步从 `string[]` 升级到结构化 insight。
- 要求 insight 声明 `type`、`evidenceRefs`、`derivedFrom` 和 `check`。
- 继续以 `INSIGHT_NUMERIC_CLAIM_WITHOUT_EVIDENCE_STRICT` 作为 numeric claim baseline。
- 对无法校验的 claim 降级为 narrative，不允许带强数字或强判断。

---

## 11. 决策建议

Report Intelligence Knowledge Pack 值得作为 Miao Vision 的核心资产推进，优先级应高于新增大量图表样式或自由编辑能力。

原因：

- 它直接服务“可信报告编译器”的定位。
- 它能显著降低 agent 生成错误。
- 它把 Tableau 等 BI 产品的成熟分析经验转化为 Miao Vision 自己的规则资产。
- 它同时增强 CLI、skill、validator、renderer，而不是只改善某一层体验。
- 它适合 local-first 和 agent-native 架构，不需要引入后端平台。

推荐先做 Phase 1 和 Phase 2，用最少工程量建立正确率防线；随后再把 block patterns、evidence requirements 和 static interactions 串成完整 report compiler。
