# Deck Knowledge Pack PRD

> 日期：2026-07-16
> 状态：可实施草案
> 关联：`docs/report-intelligence-knowledge-prd.md`、`docs/report-generation-stability-implementation-plan.md`、`docs/compact-analyze-context.md`、`skills/miao-vision/references/browser-deck.md`

## 1. 一句话说明

Deck Knowledge Pack 让 Miao Vision 使用 `AnalyzeContext` 中的事实、证据和数据质量信息，先生成可检查的 Deck Plan，再生成和验证 browser deck。

它不创建第二套分析引擎。Report 和 deck 共享事实，区别只在信息组织方式：report 适合完整阅读，deck 适合现场汇报。

## 2. 为什么要做

当前 report 已有较完整的生成链路：

```text
data analyze
  -> AnalyzeContext
  -> block/template instantiate
  -> spec validate --context --verify --strict
  -> render report
```

当前 deck 仍主要依赖 agent 根据 profile 自由规划：

```text
data profile
  -> agent 判断 story arc
  -> agent 手写 DeckSpec
  -> render deck
```

因此容易出现以下问题：

- 把描述性差异写成趋势、原因、预测或建议。
- 时间点不足却生成趋势页。
- 没有 benchmark 却使用“强、弱、好、差”等评价。
- 把 report 图表按顺序分页，没有汇报主线。
- 单页信息过载。
- 小样本、高缺失率和低置信字段没有 caveat。
- 同一份数据生成的 report 和 deck 使用不同事实。

## 3. 目标与非目标

### 3.1 目标

1. Deck 复用 `AnalyzeContext.fields`、`evidence`、`metricCandidates`、`catalog` 和 `sampleWarnings`。
2. 生成 DeckSpec 前先形成结构化 Deck Plan。
3. 首批支持 `executive-brief` 和 `business-review` 两种 intent。
4. 每页最多一个主 claim；事实 claim 必须能追溯并校验。
5. Recommendation 必须与事实 claim 分开表达，并声明依据和限制。
6. CLI 能确定性推荐、实例化和阻止不适用的 slide block。
7. Deck validator 能输出机器可读的 issue、字段路径和 repair hint。
8. 旧 DeckSpec 保持合法并可继续渲染。

### 3.2 非目标

- PowerPoint 或 Keynote 编辑器。
- 拖拽排版、复杂动画和营销型 pitch deck。
- 与 report 分离的第二套分析引擎。
- 自动生成无法从数据推出的战略决策。
- 企业模板、品牌资产和在线协作系统。

## 4. 核心原则

本文使用以下规范词：

- **MUST**：违反时结果不可信或契约不成立。
- **SHOULD**：默认遵守；偏离时需要明确理由。
- **MAY**：可选能力。

### 4.1 Shared facts

Report 和 deck MUST 使用同一份 `AnalyzeContext`。Agent 不得在 DeckSpec 中重新计算 context 未提供的聚合值、比例或变化率。

### 4.2 Artifact-specific structure

Deck MUST 围绕受众、主问题和结论组织页面，不能默认复制 report 的图表顺序。明细 SHOULD 放到 appendix 或 report。

### 4.3 Structured grounding

Evidence id 只能证明“引用存在”，不能单独证明 claim 正确。可验证 claim MUST 同时声明：

- `claimType`：要验证的语义。
- `evidence`：使用哪些 evidence id。
- `derivedFrom`：使用 evidence 中的哪些值或行。
- `check`：validator 应执行什么检查。

纯叙事文本可以没有 grounding，但不能包含新的数字、排名、变化、占比、因果、预测或评价结论。

### 4.4 Conservative language

结构化 `claimType` 是验证主入口。中英文关键词扫描只用于发现遗漏，默认产生 warning；不能仅凭命中一个词就在 strict 模式阻断。

### 4.5 Skill is transitional

Phase 1 可以先在 skill 中验证工作流。稳定规则 MUST 迁移到 CLI registry/schema/validator；skill 只保留工作流和 CLI 规则摘要。

## 5. 用户工作流

```text
用户提供本地数据和汇报意图
  -> miao-viz data analyze --intent ... --output context.json
  -> agent 或 CLI 生成 Deck Plan
  -> miao-viz deck instantiate <intent> --context context.json
  -> agent 编辑文案和页面选择
  -> miao-viz deck validate --spec deck.yaml --context context.json --verify --strict
  -> miao-viz render deck --input data.csv --spec deck.yaml --context context.json
  -> 输出 self-contained browser deck
```

`render deck --context` MUST 执行与 `deck validate --verify` 相同的 grounding 校验。缺少 `--context` 时，旧 DeckSpec MAY 渲染，但 CLI MUST 明确报告 evidence、claim 和 caveat 校验已跳过；`--strict` 与缺少 context 不能同时使用。

## 6. 产品契约

### 6.1 Deck intent

首版只实现两种 intent：

| Intent | 适用场景 | 默认长度 | 默认叙事顺序 |
|---|---|---:|---|
| `executive-brief` | 管理层快速同步 | 5-7 页 | 核心结论 -> KPI -> 关键变化或排名 -> 风险 -> 下一步 |
| `business-review` | 周期复盘和经营回顾 | 6-10 页 | 周期总结 -> KPI -> 趋势 -> 分组贡献 -> 构成 -> caveat/appendix |

后续 intent 必须基于真实 fixture 和评估结果增加，不在首版预先抽象。

### 6.2 Deck Plan

Deck Plan 是生成 DeckSpec 前的中间契约。Phase 1 由 agent 输出；Phase 3 起可由 CLI 候选和 instantiate 共同产生。

```yaml
deckPlan:
  intent: executive-brief
  audience: executives
  primaryQuestion: What changed and what needs attention?
  mainClaim:
    text: Revenue increased from the previous period.
    claimType: delta
    evidence: [by_time]
    derivedFrom:
      - $evidence:by_time.rows[0].revenue
      - $evidence:by_time.rows[1].revenue
    check: delta_formula
  slideOutline:
    - role: cover-claim
      purpose: State the verified conclusion.
      evidence: [by_time]
    - role: kpi-snapshot
      purpose: Show the current scale.
      evidence: [total]
    - role: ranking-slide
      purpose: Show the leading segment.
      evidence: [by_dimension]
  blockedClaims:
    - text: Channel A caused the decline.
      reasonCode: causal_evidence_unavailable
      reason: Only descriptive aggregates are available.
  assumptions:
    - key: primary_measure
      value: revenue
      reason: Highest-confidence metric candidate.
```

Deck Plan MUST 包含 `intent`、`audience`、`primaryQuestion`、`slideOutline`、`blockedClaims` 和 `assumptions`。若不存在可靠主结论，`mainClaim` MAY 省略，封面应使用问题陈述而不是虚构结论。

### 6.3 DeckSpec 增量

新增字段全部 optional，保证旧 DeckSpec 兼容：

```ts
type DeckClaimType =
  | 'descriptive'
  | 'rank'
  | 'delta'
  | 'trend'
  | 'share'
  | 'comparative'
  | 'evaluative'
  | 'causal'
  | 'predictive'

type DeckClaimCheck =
  | 'evidence_ref_exists'
  | 'value_match'
  | 'rank_position'
  | 'delta_formula'
  | 'trend_periods'
  | 'share_formula'
  | 'benchmark_present'
  | 'caveat_present'

interface DeckRecommendation {
  text: string
  kind: 'analytical-next-step' | 'operational-recommendation'
  evidence?: string[]
  derivedFrom?: string[]
  caveat: string
}

interface SlideSpec {
  layout: SlideLayout
  slideRole?: string
  title?: string
  claim?: string
  claimType?: DeckClaimType
  evidence?: string[]
  derivedFrom?: string[]
  check?: DeckClaimCheck
  caveat?: string
  warningRefs?: string[]
  recommendation?: DeckRecommendation
}

interface DeckSpec {
  intent?: 'executive-brief' | 'business-review'
  caveats?: Array<{
    text: string
    warningRefs: string[]
  }>
  slides: SlideSpec[]
}
```

规则：

- `claim` 保持 string，避免破坏现有 renderer 和 fixtures。
- `claimType/evidence/derivedFrom/check` 是 claim 的验证 metadata，不是第二份文案。
- `$evidence:` 路径语法 MUST 复用 report validator，不新增 deck 专用路径解析器。
- Renderer SHOULD 显示 `caveat`；evidence metadata MAY 内嵌到 HTML，但默认不占据主视觉。

### 6.4 Claim 验证矩阵

| Claim type | 最低要求 | 默认结果 |
|---|---|---|
| `descriptive` | evidence 中存在对应值 | 可验证 |
| `rank` | 排序后的 rows 和目标位置 | 可验证 |
| `delta` | 两个可比值和明确公式 | 可验证 |
| `trend` | time + measure，至少 3 个 period | 可验证 |
| `share` | numerator、denominator 和公式 | 可验证 |
| `comparative` | 两个同口径值 | 可验证 |
| `evaluative` | target、benchmark 或历史基准 | 无基准则阻断 |
| `causal` | 明确的因果研究或实验 evidence | 首版默认阻断 |
| `predictive` | 模型输出、时间范围和不确定性 | 首版默认阻断 |

含数字、百分比、排名或变化词的 claim 如果缺少结构化 metadata，普通模式返回 warning，strict 模式返回 error。

### 6.5 Recommendation 边界

Recommendation 不属于事实 claim，不使用 `claimType: recommendation`。

- `analytical-next-step`：例如“补充渠道级数据验证原因”，MAY 自动生成。
- `operational-recommendation`：例如“优先检查渠道 A 的转化环节”，只有存在相关 evidence 和 caveat 时 MAY 生成。
- 战略决策、预算承诺、人员调整和确定性预测 MUST NOT 自动生成。
- Recommendation MUST 使用独立字段并显示 caveat，不能伪装成已证实的标题。

### 6.6 Caveat coverage

`AnalyzeContext.sampleWarnings[].code` 是 caveat 的稳定引用 id。

- 影响整个数据集的 warning MUST 被 `DeckSpec.caveats[].warningRefs` 覆盖。
- 只影响某个 claim、field 或 evidence 的 warning MUST 被相关 slide 的 `warningRefs` 覆盖。
- `warningRefs` 中的 code 必须存在于 context。
- 一个没有 `warningRefs` 的通用免责声明不能满足 strict validation。
- `executive-brief` 可以在相关页 footnote 或风险页展示 caveat。
- `business-review` 可以在相关页或 appendix 展示，但主结论受影响时不能只藏在 appendix。

首版 `AnalyzeSampleWarning` 还没有 scope。Phase 2 先按 deck-level warning 处理；后续增加 scope 前，不宣称支持精确的 slide-level 自动映射。

### 6.7 Slide block catalog

首版实现五个 block：

- `cover-claim`
- `kpi-snapshot`
- `trend-overview-slide`
- `ranking-slide`
- `data-quality-slide`

```ts
interface DeckSlideBlockKnowledge {
  id: string
  purpose: string
  requiredRoles: string[]
  requiredEvidence: string[]
  supportedLayouts: SlideLayout[]
  supportedCharts: string[]
  allowedClaimTypes: DeckClaimType[]
  maxMetrics: number
  maxCharts: number
  caveatPolicy: 'required' | 'optional' | 'forbidden'
  blockedWhen: Array<{ code: string; condition: string }>
  repairHints: string[]
}
```

最低规则：

- `trend-overview-slide`：需要 time + measure 且 `timePeriods >= 3`。
- `ranking-slide`：需要 dimension + measure 和排序 rows evidence。
- `kpi-snapshot`：最多 4 个 metric。
- `cover-claim`：最多一个 claim；无可靠 claim 时使用问题陈述。
- `data-quality-slide`：存在 blocking 或高风险 warning 时推荐。

### 6.8 Density

首版所有主线页面统一限制：最多 1 个 claim、4 个 metrics、1 张 chart。这样与当前 renderer 和 validator 保持一致。

Appendix table 可以承载更多行，但不能放宽主线页面的 chart 数量。需要比较两张图时，应合并为一个 comparison chart 或拆页。未来只有在 renderer 提供明确双图 layout 后，才能放宽 `maxCharts`。

## 7. AnalyzeContext 扩展

Deck 候选放在现有 `catalog` 内，不增加平行的顶层事实结构：

```json
{
  "catalog": {
    "deckPatterns": [
      ["executive-brief", 0.88, "compact", ["cover-claim", "kpi-snapshot", "ranking-slide", "data-quality-slide"]]
    ],
    "slideBlocks": [
      ["ranking-slide", 0.92, ["dimension", "measure"], ["by_dimension"]]
    ],
    "blockedSlideBlocks": [
      ["trend-overview-slide", "time_periods_lt_3", "Requires at least 3 time periods."]
    ]
  }
}
```

Full context 使用具名 object；`compact-v1` 使用 tuple。两者 MUST 表达相同决策，并由同一 registry 生成。Score 只用于排序，hard rule 必须进入 blocked 列表。

## 8. CLI 与错误契约

目标命令：

```bash
miao-viz deck instantiate executive-brief \
  --context /tmp/miao-vision/context.json \
  --output /tmp/miao-vision/deck.yaml

miao-viz deck validate \
  --spec /tmp/miao-vision/deck.yaml \
  --context /tmp/miao-vision/context.json \
  --verify \
  --strict

miao-viz render deck \
  --input /path/to/data.csv \
  --spec /tmp/miao-vision/deck.yaml \
  --context /tmp/miao-vision/context.json \
  --output /tmp/miao-vision/deck.html
```

所有命令保持现有机器可读结果风格：

```ts
{ ok: true, value: ... }
{ ok: false, code: string, message: string, issues?: DeckValidationIssue[] }
```

每个 issue 至少包含 `code`、`severity`、`path`、`message` 和 `hint`。

| Code | 普通模式 | Strict | 含义 |
|---|---|---|---|
| `DECK_CONTEXT_REQUIRED` | error | error | 请求 verify 但未提供 context |
| `DECK_SLIDE_EVIDENCE_NOT_FOUND` | error | error | evidence id 不存在 |
| `DECK_CLAIM_EVIDENCE_PATH_NOT_FOUND` | error | error | `$evidence:` 路径不可解析 |
| `DECK_NUMERIC_CLAIM_UNGROUNDED` | warning | error | 数字 claim 缺少 grounding metadata |
| `DECK_TREND_REQUIRES_TIME_PERIODS` | warning | error | trend 少于 3 个 period |
| `DECK_CAUSAL_CLAIM_UNSUPPORTED` | warning | error | 因果 claim 无支持 |
| `DECK_PREDICTIVE_CLAIM_UNSUPPORTED` | warning | error | 预测 claim 无支持 |
| `DECK_EVALUATIVE_CLAIM_NEEDS_BENCHMARK` | warning | error | 评价缺少基准 |
| `DECK_MISSING_CAVEAT` | warning | error | warning 未被 caveat 覆盖 |
| `DECK_SLIDE_OVERLOADED` | warning | error | 超过统一密度限制 |
| `DECK_HEADLINE_LANGUAGE_RISK` | warning | warning | 关键词扫描发现潜在高风险措辞 |

## 9. Rollout

### Phase 1：Deck Plan workflow

交付：

- 更新 `browser-deck.md`，改为 `data analyze -> Deck Plan -> DeckSpec`。
- 文档化两个 intent 和五个 slide block。
- 要求输出 blocked claims、assumptions 和 caveats。
- 新增至少 4 个 Deck Plan golden fixtures：两个正常、一个时间不足、一个含 sample warning。

完成条件：

- 所有 fixture 都产生结构合法的 Deck Plan。
- 时间不足 fixture 不包含 trend slide。
- sample warning fixture 的 plan 包含对应 warning code。
- 人工评审确认 deck outline 不复制 report chart 顺序。

### Phase 2：Schema-light validation

交付：

- DeckSpec 增加 optional grounding、recommendation 和 caveat 字段。
- `deck validate --context --verify --strict`。
- Renderer 展示 caveat。
- 复用 report 的 evidence path parser。

完成条件：

- 所有旧 deck fixtures 继续通过。
- 不存在的 evidence id/path 被阻断。
- 未覆盖 warning、无基准评价和未 grounding 数字 claim 在 strict 模式被阻断。

### Phase 3：Candidates and instantiate

交付：

- `data analyze` 输出 deck pattern、slide block 和 blocked slide block。
- Full 和 compact context 同步表达候选。
- `deck instantiate` 生成可编辑 DeckSpec。
- Candidate、instantiate 和 validator 复用同一 registry。

完成条件：

- Full/compact context 对相同数据给出相同候选和 blocked reason code。
- Instantiate 结果可通过 schema validation 并可渲染。
- 不适用的 trend block 不会被实例化。

### Phase 4：Workflow hardening

交付：

- `executive-brief`、`business-review` 端到端 smoke tests。
- Claim check、density、recommendation 和 headline warning 测试。
- Skill 中的规则摘要由 CLI registry 或测试 fixture 校验，避免漂移。

完成条件：

- 两条流程均覆盖 `analyze -> instantiate -> validate --strict -> render`。
- 所有已知高风险 fixture 在 strict 模式被阻断或修复。
- HTML 中的可见数字与其 `derivedFrom` 值一致。

## 10. 评估方法

建立固定 deck evaluation fixture 集，至少覆盖：单 measure、多个 measure、无时间字段、2 个时间点、3 个以上时间点、小样本、高缺失率、无 benchmark 和分组排名。

| 指标 | 计算方式 | 首版目标 |
|---|---|---:|
| Factual claim grounding | 有效 grounding 的事实 claim / 全部事实 claim | >= 95% |
| Unsupported trend escape rate | 未被阻断的无效 trend / 全部无效 trend fixtures | 0% |
| Unsupported causal/predictive escape rate | 未被 strict 阻断的无效 claim / 对应 fixtures | 0% |
| Caveat coverage | 被 warningRefs 覆盖的 context warning / 应展示 warning | 100% |
| Density detection recall | 被检测的过载 slide / 人工标注过载 slide | 100% |
| Fact consistency | report/deck 共用 evidence 路径但值不一致的数量 | 0 |
| Compact token cost | compact deck catalog token / full deck catalog token | <= 40% |

自动指标之外，每个 intent 至少使用 5 个真实或代表性数据集进行人工评审，检查主线、可读性和建议边界。

## 11. 风险与控制

| 风险 | 控制 |
|---|---|
| 过早增加大量 intent/block | 首版固定为 2 个 intent、5 个 block |
| Deck 变得模板化 | 只约束事实、风险和密度；文案与可选页面仍可编辑 |
| Skill 与 CLI 漂移 | Phase 3 后以 registry/schema/validator 为 source of truth |
| Strict 误报 | 结构化 metadata 决定 hard error；关键词扫描只 warning |
| Caveat 只写通用免责声明 | strict 模式要求具体 `warningRefs` |
| Recommendation 越界 | 只自动生成 analytical next step 或有依据的 operational recommendation |
| Schema 破坏旧 deck | 所有新增字段 optional，并保留 legacy render 路径 |

## 12. 已确定的设计决策

1. Deck 使用 `evidence + derivedFrom + check`，不只使用松散 evidence id。
2. `slideRole` 进入 DeckSpec，但不替代视觉 `layout`。
3. Validator 默认返回 warning；`--strict` 用于 agent final gate 和 CI。
4. Recommendation 使用独立字段，不作为事实 claim type。
5. Deck pattern 使用独立 registry，但复用 report 的 AnalyzeContext、evidence parser、issue 格式和 scoring 约定。
6. 首版所有 slide 最多一张 chart；双图页面不在本 PRD 范围内。
7. `render deck` 支持 legacy 无 context 渲染，但可信生成链路必须提供 context。

## 13. 推荐实施顺序

先完成 Phase 1 和 Phase 2，建立 Deck Plan 与 strict grounding 防线；再实现候选和 instantiate。不要在验证两个首批 intent 之前扩展更多 intent、复杂布局或领域模板。
