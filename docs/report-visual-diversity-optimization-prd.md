# Miao Vision 报告视觉多样性优化 PRD

> 日期：2026-07-22  
> 产品范围：`packages/miao-viz-cli` 数据报告生成、验证与静态 HTML 渲染  
> 状态：P0–P1 Implemented  
> 优先级：P0–P2

## 1. 背景

Miao Vision 已具备较完整的静态可视化基础能力，包括核心图表、扩展图表、报告 Block、Report Template、主题和 evidence-grounded 校验流程。

当前视觉目录的绝对数量已经不低，但最终报告仍容易收敛为相似结构：

```text
KPI 卡片 → 折线图 → 柱状图 → 明细表
```

问题不在于缺少更多造型，而在于以下能力尚未形成统一、可验证、可自动选择的表达系统：

- 同一分析意图缺少多个可靠的图表变体。
- 目标、基准、区间、异常等分析上下文不是一等 Spec 能力。
- 缺少 small multiples、主次布局等报告级组合语法。
- 扩展图表可以渲染，但机器可执行的适用规则和 fallback 不完整。
- Report Template 数量较少，报告结构容易同质化。
- Validator 尚不能发现整份报告中的视觉重复和证据重复。
- 主题主要改变颜色、字体和卡片装饰，较少改变信息层级与版式结构。

本 PRD 将“视觉多样性”定义为：**系统能够基于数据特征和分析意图，在保持准确、可读、可验证的前提下，选择不同但恰当的视觉表达与报告结构。**

## 2. 产品定位

视觉多样性优化不是 Chart Zoo 扩建项目，而是报告表达能力升级。

```text
数据与 Evidence
      ↓
分析意图家族
      ↓
适用图表与变体
      ↓
基准 / 注释 / 分面 / 高亮
      ↓
报告模板与版式
      ↓
报告级多样性审计
```

产品承诺：

> 同一份数据可以根据分析问题得到不同的合理表达；不同的视觉选择必须有数据条件、适用规则和可验证依据。

## 3. 目标

### 3.1 产品目标

- 提升比较、变化、分布、目标达成、不确定性等分析意图的表达覆盖率。
- 减少生成报告对 `bar`、`line`、`bigvalue`、`table` 的结构性依赖。
- 让基准线、参考区间、重点标注和 small multiples 成为稳定的 VizSpec 能力。
- 让扩展图表拥有与核心图表一致的 catalog 规则、验证和降级能力。
- 扩充报告模板，使信息结构的变化不依赖主题 CSS。
- 在 `spec validate` 和后续 audit 中发现重复、冗余和低多样性问题。
- 保持 evidence id、`$evidence:`、结构化错误和 patch hint 的现有契约。

### 3.2 成功指标

离线 fixture 基准集至少覆盖 30 份具有代表性的数据集和分析意图。MVP 达到：

| 指标 | 目标 |
|---|---:|
| 合适图表选择率 | ≥ 90% |
| 不支持或不适用图表进入最终 Spec 的比例 | ≤ 2% |
| 有适用条件时，非基础图表/变体的报告采用率 | ≥ 40% |
| 三张以上图表报告中的无意义重复率 | ≤ 10% |
| 新增扩展图表机器可执行规则覆盖率 | 100% |
| 新增 validator issue 的结构化 patch/suggestion 覆盖率 | ≥ 80% |
| HTML、SVG、打印/PDF 视觉回归通过率 | 100% |

“非基础图表/变体”不包含 `bar`、`line`、`bigvalue`、`table` 的默认形式。指标只在数据满足适用条件时计算，不能为了达成采用率强行选择复杂图表。

## 4. 非目标

- 不以新增图表数量作为核心 KPI。
- 不引入任意双轴图、3D 图、立体饼图或装饰性仪表盘。
- 不允许 Agent 绕过 catalog 使用未知图表类型。
- 不在 CLI 内运行 LLM。
- 不为了视觉差异牺牲字段角色、transform、evidence 或数据质量约束。
- MVP 不建设完整 GIS 平台、地图瓦片服务或在线地理编码服务。
- MVP 不实现通用拖拽式 Dashboard Builder。
- 不将 report、deck 和 article 的 Spec 强行合并；可复用原语，但维持各自产物边界。
- P0 仅验收 Data Report 的 HTML、内嵌/独立 SVG 与浏览器打印/PDF；Deck 和 Article 适配延期。

## 5. 目标用户与核心场景

### 5.1 Agent 作者

Agent 根据 `context.catalog`、Block 和 Template 生成报告。它需要明确知道：

- 当前分析意图有哪些候选表达。
- 每个图表/变体需要什么数据条件。
- 选择失败时应降级到什么图表。
- 如何添加可验证的基准、区间和标注。

### 5.2 分析师和业务用户

用户希望报告不仅正确，还能快速回答：

- 谁更高，差距多大？
- 相比目标或基准表现如何？
- 两个时期之间谁变化最大？
- 分布是否集中，是否存在异常？
- 不同地区、品类或渠道的模式是否一致？
- 哪些值可靠，哪些值需要谨慎解释？

### 5.3 开发者

开发者需要稳定的 schema、结构化验证结果、可测试的 renderer 和向后兼容的 CLI 输出。

## 6. 设计原则

1. **分析意图优先**：先判断用户问题，再选择图表家族和变体。
2. **适用性优先于新颖性**：新图表只有在更准确或更高效时才被选择。
3. **Catalog 是单一事实源**：选择说明、验证规则、renderer 支持和 fallback 不能分散维护。
4. **渐进增强**：旧 Spec 无需修改即可继续渲染；新字段均为可选。
5. **显式降级**：数据条件不足时返回结构化原因和替代方案。
6. **证据优先**：参考线、标注、目标值和结论必须来自字段、常量配置或 evidence。
7. **报告级优化**：不仅检查单张图表，也检查整份报告的信息结构和视觉节奏。
8. **静态优先**：HTML、SVG 和打印/PDF 中必须保留核心信息，交互只做增强。

## 7. 范围与优先级

### P0：有效多样性基础

- Reference line、reference band、annotation、highlight。
- Small multiples / facet。
- 新增高价值分析图表：bullet、dumbbell、diverging bar、range。
- 扩展图表 catalog 规则与 fallback 补全。
- 报告级重复与低多样性 warning。

### P1：报告结构与分析覆盖

- Pareto、dot/lollipop 和有限组合图。
- 6 类新的 Report Template。
- 非对称布局和主次图布局。
- 语义颜色与稳定分类颜色映射。
- 数据质量和不确定性视觉编码。

### P2：专业领域扩展

- 基础地理可视化。
- Violin / beeswarm 等高阶分布图。
- 更完整的预测区间和估算值表达。
- 基于 benchmark fixture 的多样性评分与回归报告。

## 8. 功能需求

### FR-1：分析意图家族

Analyzer 和 catalog 应使用稳定的意图家族，而不是直接从自然语言映射到单一图表。

首版意图枚举：

```ts
type AnalysisIntent =
  | 'summary'
  | 'comparison'
  | 'ranking'
  | 'trend'
  | 'change'
  | 'composition'
  | 'distribution'
  | 'relationship'
  | 'flow'
  | 'target-attainment'
  | 'uncertainty'
  | 'geo'
```

每个 catalog item 新增：

```ts
interface ChartCatalogItem {
  intents: AnalysisIntent[]
  variants?: ChartVariantDefinition[]
  fallback?: Array<{
    chartType: VizType
    variant?: string
    reason: string
  }>
}
```

要求：

- 一个意图可以对应多个候选图表。
- 候选排序必须结合字段角色、基数、样本数、负值、时间跨度和数据质量。
- `context.catalog` 应返回候选、被阻断候选和阻断原因。
- 不满足条件时不得仅因用户关键词强制启用图表。

### FR-2：图表 Variant

优先使用 variant 扩展同一图表的表达方式，避免为近似视觉建立重复 renderer。

```yaml
charts:
  - id: category_delta
    type: bar
    variant: diverging
    encoding:
      x: { field: category, type: nominal }
      y: { field: delta, type: quantitative }
```

首版 variant：

| 图表 | Variant |
|---|---|
| bar | `vertical`、`horizontal`、`grouped`、`stacked`、`diverging` |
| line | `standard`、`stepped`、`indexed`、`forecast` |
| area | `standard`、`stacked`、`range` |
| dot | `standard`、`lollipop`、`dumbbell` |
| bullet | `standard` |

要求：

- Variant 必须在 catalog 中声明 required encodings 和规则差异。
- 未声明 variant 返回结构化错误 `UNSUPPORTED_CHART_VARIANT`。
- 不指定 variant 时保持现有 renderer 行为。
- Variant 不得通过任意 `style` 字符串暗中启用。

### FR-3：参考线、参考区间和目标

新增通用 analysis layer：

```yaml
charts:
  - id: revenue_by_region
    type: bar
    encoding:
      x: { field: region, type: nominal }
      y: { field: revenue, type: quantitative, aggregate: sum }
    references:
      - id: revenue_target
        type: line
        axis: y
        value: 100000
        label: Target
        evidence: target_revenue
      - id: expected_range
        type: band
        axis: y
        from: 80000
        to: 120000
        label: Expected range
```

Reference value 允许来源：

- 显式常量。
- 数据字段及聚合。
- `$evidence:` 路径。

要求：

- Reference 必须与对应轴绑定且为数值；P0 不从字段名推断货币、百分比或物理单位。
- band 必须满足 `from <= to`。
- 用户显式常量可不绑定 evidence；字段聚合等数据推导 reference 必须绑定 evidence。
- 数字型结论引用 reference 时必须通过 evidence 验证。
- 静态渲染中必须包含线型/填充差异和文字标签，不能只依赖颜色。
- 额外 overlay 最多 3 条 line、2 个 band，总数超过 4 时产生 `TOO_MANY_REFERENCES` warning；bullet target/ranges 和 range lower/upper 不计入 overlay。

### FR-4：数据标注与重点突出

新增确定性 annotation：

```yaml
annotations:
  - type: point
    selector: { field: month, value: 2026-06 }
    text: Peak month
    evidence: monthly_revenue
  - type: rule
    selector: { op: max, field: revenue }
    text: Highest revenue
```

支持：

- 首值、尾值、最大值、最小值。
- Top N。
- 阈值越界点。
- 显式字段值。
- 最大变化对象。

`max-change` 仅接受显式 grammar：`previous` 必须提供 `field + orderBy`；`between-fields` 必须提供 `startField + endField`。

要求：

- Annotation selector 必须能由 CLI 确定性解析。
- 数字文本必须可由 evidence 或 selector 结果验证。
- Renderer 应执行标签避让；无法避免重叠时按优先级省略低优先标注。
- 同一图表默认最多 5 个直接标注。

### FR-5：Small Multiples / Facet

```yaml
charts:
  - id: regional_trends
    type: line
    encoding:
      x: { field: month, type: temporal }
      y: { field: revenue, type: quantitative, aggregate: sum }
    facet:
      column: { field: region, type: nominal }
      maxPanels: 8
      scales: shared
```

要求：

- 首版支持单一 `row` 或 `column` facet，不同时启用二维 facet。
- 默认最大 8 个 panel；超出时要求 Top-N 或 fallback。
- 比较任务默认 `scales: shared`。
- 独立比例尺必须显式设置并显示提示，避免误导跨 panel 比较。
- 手机端转为单列，打印时不得截断 panel。
- facet 字段不能是高基数 ID 字段。

### FR-6：新增高价值图表

#### P0 图表

| 图表 | 主要用途 | 核心 Encoding | 关键限制 | Fallback |
|---|---|---|---|---|
| bullet | 实际值对目标和区间 | `value`、`target`、可选 `range` | 必须有明确目标 | progress / bigvalue |
| dumbbell | 两组或两期差距 | `x`、`start`、`end` | 仅两端值；类别 ≤ 20 | grouped bar |
| diverging bar | 正负贡献或中心偏差 | `x`、`y` | 必须存在有意义零点或中心 | bar |
| range | 区间、不确定性、min-max | `x`、`lower`、`upper` | `lower <= upper` | line / table |

#### P1 图表

| 图表 | 主要用途 | 关键限制 | Fallback |
|---|---|---|---|
| pareto | 排名与累计贡献 | 值非负；按值降序 | bar |
| dot（含 lollipop/dumbbell variant） | 高密度类别或两端比较 | 类别建议 ≤ 30；dumbbell ≤ 20 | bar / table |
| combo-bar-line | 规模与比率 | 两轴含义必须显式且单位不同 | 两张独立图 |

#### P2 图表

- Choropleth。
- Symbol map。
- Violin。
- Beeswarm。

每个新图表必须同时交付：

- `VizType` 与 schema。
- Catalog item 和机器可执行规则。
- Renderer。
- 数据条件和 blocked reason。
- 至少一个 fallback。
- 单元测试、验证测试和视觉 fixture。
- Skill/reference 中的简洁使用说明。

### FR-7：扩展图表可靠性补全

现有 `chart-catalog-ext.ts` 中所有扩展图表必须消除无规则状态。最低规则集包括：

- Required encoding 的字段角色验证。
- 最小行数或节点数。
- 最大类别、系列、节点或链接数量。
- 负值和零值限制。
- 排序和聚合要求。
- 空值与数据质量 warning。
- fallback 和可执行 patch hint。

示例：

```json
{
  "code": "SANKEY_TOO_MANY_LINKS",
  "severity": "warning",
  "message": "Sankey has 54 links; the readable limit is 30.",
  "suggestion": "Aggregate links or use a ranked bar/table view.",
  "patchHint": {
    "type": "limit",
    "value": 30
  }
}
```

### FR-8：报告级视觉多样性检查

`spec validate` 新增非阻断的报告级 warning：

| Code | 触发条件 |
|---|---|
| `LOW_VISUAL_VARIETY` | ≥ 3 张图且全部属于同一图表家族 |
| `REPEATED_CHART_TYPE` | 相邻三张图使用相同 type + variant |
| `REDUNDANT_VIEW` | 两张图使用相同字段、聚合、transform 和近似意图 |
| `EXCESSIVE_KPI_SHARE` | KPI 类图表超过全部图表的 60%，且图表数 ≥ 5 |
| `UNBALANCED_REPORT_DENSITY` | 所有图均为全宽或相同密度，无主次层级 |
| `COLOR_ENCODING_CONFLICT` | 同一分类值在不同图表中映射到不同语义颜色 |

规则不得为了形式多样性建议不适用图表。Suggestion 应优先推荐：

1. 合并冗余视图。
2. 增加基准或标注。
3. 使用同一图表家族的合适 variant。
4. 数据满足条件时再推荐其他图表类型。

### FR-9：Report Template 扩展

新增以下 Template：

| Template | 适用场景 | 推荐结构 |
|---|---|---|
| `executive-scorecard` | 目标达成与异常 | KPI/bullet → variance → ranking → exceptions |
| `distribution-diagnostics` | 分布和异常 | summary → histogram/boxplot → facet → detail |
| `conversion-journey` | 阶段转化 | KPI → funnel → drop-off → detail |
| `variance-bridge` | 结果变化归因 | delta → waterfall/diverging → detail |
| `cohort-comparison` | 分组趋势比较 | KPI → small multiples → matrix → detail |
| `relationship-analysis` | 指标关系 | summary → scatter/bubble → outliers → detail |

P2 增加 `geo-performance`。

每个 Template 必须声明：

- 分析意图。
- Required roles 和最低数据条件。
- Required evidence。
- 允许的 Block 和 fallback。
- 推荐密度和布局。
- 质量约束。

### FR-10：报告布局系统

Report Spec 增加可选布局提示：

```yaml
layout:
  preset: narrative
  maxColumns: 12

charts:
  - id: primary_trend
    placement: { span: 8, emphasis: primary }
  - id: target_summary
    placement: { span: 4, emphasis: supporting }
```

首版 preset：

- `narrative`：纵向叙事，允许全宽主图。
- `executive`：主指标与支持视图组合。
- `analytical`：高密度对比布局。
- `mosaic`：受约束的 12 栅格布局。

要求：

- `span` 仅允许 `4`、`6`、`8`、`12`。
- 小屏幕统一为单列。
- Print CSS 保证完整顺序，不允许依赖视觉位置改变阅读语义。
- 缺少 placement 时保持现有纵向卡片布局。
- Template 提供布局建议，Theme 只负责视觉语言。

### FR-11：语义颜色系统

新增颜色 scale 语义：

```yaml
colorScale:
  type: diverging
  domain: [-1, 0, 1]
  semantic: unfavorable-neutral-favorable
```

支持：

- `qualitative`：离散类别。
- `sequential`：连续强度。
- `diverging`：围绕中心点的正负偏差。
- `status`：成功、警告、失败、未知。
- `focus-context`：焦点系列与上下文系列。

要求：

- 同一报告中相同分类值默认保持颜色稳定。
- 上升/下降不得自动等同于好/坏，除非 Spec 提供业务语义。
- 关键状态不得只通过颜色区分，必须同时使用文字、形状或线型。
- 所有内置主题提供色盲安全的 qualitative、sequential 和 diverging palette。

### FR-12：不确定性和数据质量表达

系统应能够将可靠性上下文带入视觉，而不仅放在报告末尾。

支持：

- 置信区间或上下界 band。
- 估算值使用虚线或不同 mark。
- 不完整时间段使用明确样式和标签。
- 低样本点淡化，并显示样本量。
- 高缺失率图表显示 data-quality badge。

要求：

- 样式必须由 profile/context 中的结构化质量信息触发。
- 不得由 renderer 自行推断业务可靠性。
- 报告打印后仍能区分实际值、估算值和低可靠性值。

## 9. Spec 草案

为保持兼容，扩展 `AgentChartSpec`，旧字段不变：

```ts
interface AgentChartSpec {
  id?: string
  type: VizType
  variant?: string
  title?: string
  data?: AgentChartData
  encoding?: AgentChartEncoding
  references?: AgentReferenceLayer[]
  annotations?: AgentChartAnnotation[]
  facet?: AgentFacetSpec
  colorScale?: AgentColorScale
  placement?: AgentChartPlacement
  style?: Record<string, unknown>
}
```

建议避免继续把稳定产品能力塞入 `style: Record<string, unknown>`。`style` 仅保留低风险表现层参数；影响语义、验证或数据读取的设置必须拥有明确 schema。

## 10. Catalog 和 CLI 输出

`miao-viz spec catalog --for-llm` 应增加：

```json
{
  "id": "bar",
  "intents": ["comparison", "ranking", "change"],
  "variants": [
    {
      "id": "diverging",
      "requires": "dimension + signed measure",
      "bestFor": ["positive/negative contribution"],
      "avoid": ["no meaningful zero baseline"]
    }
  ],
  "fallback": [
    {
      "chartType": "bar",
      "variant": "horizontal",
      "reason": "Use when a meaningful center is unavailable."
    }
  ]
}
```

`data analyze` 的 context 应提供与数据集相关的候选：

```json
{
  "catalog": {
    "intents": ["comparison", "change"],
    "charts": ["bar", "dot", "dumbbell"],
    "variants": ["bar.horizontal", "bar.diverging", "dot.dumbbell"],
    "blockedCharts": [
      {
        "id": "range",
        "reason": "No lower/upper measure pair was detected."
      }
    ]
  }
}
```

现有 `{ ok: true, value: ... }` 和 `{ ok: false, code, message, ... }` 契约保持不变。

## 11. 自动选择策略

推荐采用确定性评分，不使用单一关键词：

```text
candidate score =
  intent fit
  + field role fit
  + cardinality fit
  + evidence availability
  + template compatibility
  - readability risk
  - data quality risk
  - report redundancy penalty
```

规则：

- 单图最优不等于整份报告最优；选择时加入报告级重复惩罚。
- 重复惩罚只能在多个候选均适用时改变排序。
- 不得因为多样性目标越过 blocked chart。
- 选择扩展图表时记录机器可读 decision reason，便于测试和审计。

## 12. 验收标准

### 12.1 P0 验收

- 旧 Report Spec 无需修改即可通过原有测试并保持输出兼容。
- Reference line 和 band 可在 bar、line、area、scatter 上渲染。
- Annotation 支持首尾、最大、最小、阈值和显式字段值。
- Facet 可对 bar 和 line 生成最多 8 个 panel，并正确响应移动端和打印。
- bullet、dumbbell、diverging bar、range 均有 catalog、validator、renderer 和 fallback。
- 所有现有扩展图表至少有一条机器可执行规则，不再全部为 `rules: []`。
- Validator 能产生 FR-8 定义的结构化 warning。
- 每个 warning 包含 code、chart/report path、message 和 suggestion；可确定修复时包含 patchHint。

### 12.2 P1 验收

- 6 个新增 Template 可由真实 analyze context 实例化并通过 `--verify`。
- 4 个布局 preset 在桌面、移动端和打印环境下通过视觉回归。
- 同一分类值在跨图表渲染中颜色稳定。
- 至少 3 类数据质量信号可以在图表中呈现。
- 完整 smoke test 覆盖：

```text
data analyze
  → spec block/template instantiate
  → spec validate --context --verify
  → render report
```

### 12.3 质量门槛

- 不新增超过 500 行的非测试 TypeScript 文件。
- 图表 renderer 按图表家族拆分，避免继续扩大单一 dispatcher 文件。
- 所有新增 schema 均有正向、反向和向后兼容测试。
- 所有新增图表均有空数据、单值、极端值、长标签和高基数测试。
- 色彩通过色盲模拟和最低对比度检查。
- SVG 包含可读的 `role`、标题或文本替代信息。

## 13. 实施阶段

### Phase 0：基线与测试框架

- 建立视觉多样性 benchmark fixture。
- 记录当前图表选择分布、重复率和模板使用率。
- 为 HTML/SVG/print 建立截图回归。
- 定义 intent、variant、reference、facet schema。

### Phase 1：语义增强层

- 实现 reference line/band。
- 实现 annotation/highlight。
- 实现 small multiples。
- 增加对应 validator 和 patch hint。

### Phase 2：高价值图表与 Catalog 可靠性

- 实现 bullet、dumbbell、diverging bar、range。
- 补齐现有扩展图表规则和 fallback。
- 更新 analyze context 和 `spec catalog --for-llm`。

### Phase 3：报告级优化

- 实现视觉重复检查。
- 新增 6 个 Report Template。
- 实现布局 preset 和 placement。
- 加入语义颜色系统。

### Phase 4：专业表达扩展

- Pareto、有限 combo chart。
- 不确定性和数据质量编码。
- 评估地图、violin、beeswarm。

## 14. 测试计划

### 单元测试

- Schema parse 和默认值。
- 每个 catalog rule 的触发与不触发路径。
- Intent scoring 和 fallback 排序。
- Reference/evidence 解析。
- Annotation selector 解析。
- Facet panel 数和 scale 规则。
- 报告级重复检测。

### Renderer 测试

- SVG 结构快照。
- 空数据和异常数据。
- 长文本、中文、负值和大数。
- Theme 组合。
- 响应式与 print CSS。

### Workflow 测试

至少覆盖以下 fixture：

- 目标达成：bullet + reference。
- 两期对比：dumbbell。
- 正负贡献：diverging bar。
- 预测区间：range/band。
- 多区域趋势：small multiples。
- 转化阶段：conversion template。
- 分布诊断：distribution template。
- 不满足条件时自动 fallback。

推荐命令：

```bash
npm run test:run
npm run build:cli
npm run check:size
```

涉及浏览器布局和打印行为时增加：

```bash
npm run test:e2e
```

## 15. 风险与缓解

### 风险 1：多样性驱动错误图表

缓解：blocked chart 和数据适用性规则优先级始终高于重复惩罚；多样性只在同等适用候选之间生效。

### 风险 2：Spec 快速膨胀

缓解：稳定语义使用明确字段；复杂能力分阶段交付；每项新增字段必须同时具备 schema、validator 和 renderer 消费方。

### 风险 3：扩展图表维护成本过高

缓解：优先 chart family + variant，共享 axis、scale、reference、annotation 和 facet primitives。

### 风险 4：静态输出中信息丢失

缓解：交互不是核心信息唯一载体；所有 reference、annotation、状态和不确定性均必须可打印。

### 风险 5：视觉回归难以判断

缓解：使用固定 fixture、固定画布、结构断言和截图回归；允许主题差异，但保持数据 mark 和标签语义稳定。

### 风险 6：报告模板与 Block 重复实现

缓解：Template 只组合 Block，Block 编译到 VizSpec；validator 和 renderer 只消费 VizSpec。

## 16. 依赖与影响文件

预计涉及：

- `packages/miao-viz-cli/src/types.ts`
- `packages/miao-viz-cli/src/spec-schema.ts`
- `packages/miao-viz-cli/src/spec-validator.ts`
- `packages/miao-viz-cli/src/chart-catalog-*.ts`
- `packages/miao-viz-cli/src/svg-renderer*.ts`
- `packages/miao-viz-cli/src/report-block-registry.ts`
- `packages/miao-viz-cli/src/report-template-registry.ts`
- `packages/miao-viz-cli/src/html-export.ts`
- `packages/miao-viz-cli/src/themes/`
- `packages/miao-viz-cli/src/analyzer.ts`
- `packages/miao-viz-cli/src/context-schema.ts`
- `skills/miao-vision/references/chart-selection.md`
- `skills/miao-vision/references/anti-patterns.md`
- 对应单元测试、workflow fixture 和 E2E 测试

不得编辑 `packages/miao-viz-cli/dist/` 或 `apps/web/dist/` 作为源文件。

## 17. 开放问题

- Layout placement 是否放入 chart，还是升级为一等 `sections`？P0/P1 可先放 chart，长期应评估 VizSpec sections。
- 多样性审计应继续并入 `spec validate`，还是同时进入 `spec audit`？建议 validate 输出低风险 warning，audit 输出报告级完整摘要。
- 地图所需的行政区边界数据如何在保持 local-first 和包体可控的前提下分发？

## 18. 决策建议

建议批准 P0，并将实施重点按以下顺序推进：

1. Reference、annotation 和 facet 通用原语。
2. bullet、dumbbell、diverging bar、range 四类高价值表达。
3. 扩展 catalog 规则与 fallback 补齐。
4. 报告级重复检测。
5. Report Template 和布局系统扩展。

该顺序优先建设可复用语义层，再增加图表和模板，能够同时提升视觉多样性、分析准确性和 Agent 生成稳定性。
