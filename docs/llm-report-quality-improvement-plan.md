# LLM 报告质量改进方案：通用指标、证据洞察与小样本警告

> 日期：2026-06-25  
> 状态：规划稿  
> 关联模块：`packages/miao-viz-cli`, `packages/miao-vision-skill/SKILL.md`  
> 目标：让 `miao-viz` 面向任意结构化数据生成的报告既保持可复现，又具备更强的解释力，同时避免小样本下的过度解读。

---

## 1. 背景

当前对比两类销售样例报告后可以看到明显差异：

- 手写 HTML 报告：业务表达强，能主动补充客单价、月度变化和区域占比，但容易在 4 行样本上写出“增长引擎”“高价值客户”等证据不足的经营判断。
- `miao-viz` 生成报告：结构稳定、图表口径清楚、可复现，但分析叙事偏弱，缺少派生指标、克制洞察和小样本风险提示。

这个问题不只存在于销售数据。产品、财务、运营、日志、问卷、教育、实验数据都会遇到同类风险：LLM 能写出流畅叙事，但如果缺少确定性证据和样本边界，就容易把描述性统计升级成因果、策略或预测。

理想方向不是让 CLI 直接替代 LLM 写完整报告，而是建立明确分工：

```text
CLI：计算确定性证据、候选指标、样本风险
Skill：约束 LLM 工作流和表达边界
LLM：基于证据写成可读、克制的业务语言
Validate/Verify：检查字段、口径和 evidence 引用
```

核心原则：

> LLM 不负责算数，不负责判断统计可靠性，只负责选择证据并表达。数字、样本限制、候选指标应由确定性层提供。

---

## 2. 目标能力

### 2.1 自动生成通用派生指标

让报告自动补充常见、低风险的派生指标。指标生成不能写死为销售场景，而应先识别字段角色，再套用通用指标模板。

通用模板包括：

- 单位均值：`sum(measure) / sum(count_or_exposure)`
- 比率：`sum(numerator) / sum(denominator)`
- 构成占比：`group_sum / total_sum`
- 期间变化：`(current - previous) / previous`
- 差值：`current - previous` 或 `group_a - group_b`
- 完成率：`completed / total`
- 错误率或失败率：`error_or_failed / total`

这些指标必须作为候选项输出，而不是让 LLM 自行发明公式。

### 2.2 基于 query 结果生成 2-4 条克制洞察

报告应具备简短洞察，但每条洞察必须绑定真实 query evidence。

允许表达：

- “East 在当前样本中贡献 240/450，即 53.3% 的销售额。”
- “2 月销售额从 220 增至 230，订单数保持 9 笔不变。”
- “当前样本中 North 的 sales/orders 为 30，高于 East 和 West。”
- “当前样本中 failed 状态占 12/300，即 4.0%。”
- “A 组平均分为 82.4，B 组为 79.1，差值为 3.3 分。”

禁止表达：

- “East 是最重要的增长引擎。”
- “North 客户应重点维护。”
- “销售趋势持续向好。”
- `n < 10` 时写 “strong correlation”。
- “A 组显著优于 B 组。”除非有明确统计检验结果。

### 2.3 小样本自动 warning

当样本不足时，报告必须自动提示读者，不应把描述性统计包装成稳定结论。

示例：

```text
仅 4 行数据、2 个观察月份。排序和环比变化只能视为当前样本中的描述性观察，不宜外推为稳定趋势。
```

---

## 3. 设计原则

### 3.1 Evidence First

LLM 写洞察前，必须先生成 Evidence Pack。Evidence Pack 只包含可复算的 query 结果、派生指标和数据质量提示。

### 3.2 Deterministic Before Generative

所有数字必须来自：

- `miao-viz query`
- `miao-viz profile`
- CLI 计算的 metric candidate
- 可重放 transform

LLM 不应在自然语言阶段做隐藏计算。

### 3.3 Conservative Language

小样本、少时间点、低分组计数时，LLM 必须使用描述性语言：

- “当前样本中”
- “观察到”
- “这两期之间”
- “不宜外推”

避免：

- “证明”
- “驱动”
- “显著”
- “稳定趋势”
- “应重点投入”

### 3.4 Structured Traceability

Insight 不应长期保持 `string[]`。更合理的结构是：

```yaml
insights:
  - text: "East contributed 240 of 450 sales, or 53.3%, in this sample."
    evidence: ["sales_by_region"]
    caveat: "small_sample"
```

这样未来可以做机器校验。

---

## 4. Evidence Pack

### 4.1 定义

Evidence Pack 是 LLM 写 spec 之前必须生成的中间结构。它应是领域无关的，销售数据只是其中一种实例。

通用结构：

```json
{
  "dataset": {
    "rows": 0,
    "columns": 0,
    "timePeriods": 0
  },
  "fieldRoles": [
    {
      "field": "status",
      "role": "status",
      "confidence": "high"
    },
    {
      "field": "duration_ms",
      "role": "duration",
      "confidence": "high"
    }
  ],
  "evidence": [
    {
      "id": "primary_total",
      "source": "query",
      "query": "aggregate primary measure",
      "values": {}
    },
    {
      "id": "primary_by_dimension",
      "source": "query",
      "query": "aggregate primary measure by primary dimension",
      "values": []
    }
  ],
  "metricCandidates": [],
  "warnings": []
}
```

销售数据示例：

```json
{
  "dataset": {
    "rows": 4,
    "columns": 5,
    "timePeriods": 2
  },
  "evidence": [
    {
      "id": "total_sales_orders",
      "source": "query",
      "query": "sum(sales), sum(orders)",
      "values": {
        "sales": 450,
        "orders": 18
      }
    },
    {
      "id": "sales_by_region",
      "source": "query",
      "query": "sum(sales) by region",
      "values": [
        { "region": "East", "sales": 240, "share": 0.533 },
        { "region": "West", "sales": 120, "share": 0.267 },
        { "region": "North", "sales": 90, "share": 0.2 }
      ]
    },
    {
      "id": "sales_by_month",
      "source": "query",
      "query": "sum(sales), sum(orders) by month",
      "values": [
        { "month": "2025-01", "sales": 220, "orders": 9 },
        { "month": "2025-02", "sales": 230, "orders": 9 }
      ],
      "change": {
        "salesPct": 0.045,
        "ordersPct": 0
      }
    }
  ],
  "warnings": [
    {
      "type": "small_sample",
      "severity": "high",
      "message": "Only 4 rows and 2 time periods are available. Treat rankings and month-over-month changes as descriptive, not conclusive.",
      "affectedAnalyses": ["ranking", "trend", "correlation"]
    }
  ]
}
```

### 4.2 生成方式

MVP 阶段不需要新增复杂智能路由。Skill 可以固定要求 agent 运行 1-3 类 query：

1. 总量 query：对 primary measure、count/status/score/duration 等核心字段做总量或均值汇总。
2. 主分组 query：按 primary dimension 汇总 primary measure 或 primary metric。
3. 时间 query：如果有时间字段，按月份或周期汇总 primary measure 和相关 count/status 字段。

CLI 后续可把这一步产品化为 `miao-viz evidence` 或 `miao-viz analyze`，但早期可以通过 skill workflow 组合 `profile` 和 `query` 实现。

---

## 5. 通用 Metric Candidate

### 5.1 输出结构

CLI 可在 `profile` 或未来 `evidence` 命令中输出：

```json
{
  "metricCandidates": [
    {
      "id": "avg_sales_per_order",
      "label": "Average sales per order",
      "type": "unit_average",
      "formula": "sum(sales) / sum(orders)",
      "requiredFields": ["sales", "orders"],
      "value": 25,
      "unit": "sales per order",
      "confidence": "high",
      "sampleSize": 18,
      "reason": "sales and orders look like additive numeric fields"
    }
  ]
}
```

其中 `type` 应使用领域无关类型：

| Type | 含义 | 示例 |
|------|------|------|
| `unit_average` | 单位均值 | sales/order、cost/ticket、duration/request |
| `rate` | 成功率、失败率、完成率 | completed/total、failed/total |
| `ratio` | 两个度量的比例 | profit/revenue、cost/revenue |
| `share` | 分组构成占比 | region revenue / total revenue |
| `period_change` | 两期变化率 | current vs previous |
| `difference` | 差值 | group A mean - group B mean |
| `rank` | 排名 | top category by measure |

### 5.2 字段角色识别

Metric Candidate 依赖字段角色，而不是仅靠字段名。

| Role | 说明 | 常见字段名 |
|------|------|------------|
| `measure` | 可加总度量 | revenue, sales, amount, cost, profit, score |
| `count` | 计数字段 | orders, users, visits, requests, tickets |
| `numerator` | 比率分子 | success, completed, passed, failed, errors |
| `denominator` | 比率分母 | total, attempts, requests, eligible |
| `category` | 分组维度 | region, category, class, team, channel |
| `time` | 时间维度 | date, month, timestamp, created_at |
| `status` | 状态字段 | status, state, result, outcome |
| `id` | 唯一标识 | id, user_id, order_id, ticket_id |
| `score` | 评分或测量值 | score, rating, grade, satisfaction |
| `duration` | 时长 | duration, latency, time_spent |

角色识别的信号来源：

- profile 类型：number/string/date。
- 字段名模式。
- distinctCount 和 uniqueRate。
- 用户请求中的 intent。
- 单位或字段描述，若后续支持 metadata。

角色识别必须带 `confidence`。只有 `high` 置信的角色组合才能自动进入候选指标。

### 5.3 初始规则

MVP 只支持高置信规则：

| 角色组合 | 指标类型 | 公式 | 示例 | 条件 |
|----------|----------|------|------|
| `measure` + `count` | `unit_average` | `sum(measure) / sum(count)` | sales/orders, duration/requests | 分母 > 0 |
| `numerator` + `denominator` | `rate` | `sum(numerator) / sum(denominator)` | completed/total, errors/requests | 分母 > 0 |
| 两个相关 `measure` | `ratio` | `sum(a) / sum(b)` | profit/revenue, cost/revenue | 字段语义明确 |
| `category` + `measure` | `share` | `sum(measure by group) / sum(measure)` | category revenue share | 分组数适中 |
| `time` + `measure` | `period_change` | `(latest - previous) / previous` | monthly active users change | 至少 2 个周期 |
| `category` + `score` | `difference` | `avg(score A) - avg(score B)` | survey score gap | 每组样本足够 |
| `status` | `rate` | `count(status=value) / count(*)` | failure rate, pass rate | status 语义明确 |

### 5.4 不同数据类型的示例

| 数据类型 | 可生成指标 | 必要 caveat |
|----------|------------|-------------|
| 销售 | 客单价、区域占比、两期变化 | 小样本不外推为增长趋势 |
| 产品 | 转化率、活跃占比、人均使用次数 | 漏斗口径必须明确 |
| 财务 | 利润率、费用率、预算达成率 | 金额口径和期间必须明确 |
| 运营 | 完成率、延迟率、单位成本、吞吐量 | 状态字段定义必须明确 |
| 问卷 | 平均分、选项占比、分组差异 | 样本量和抽样偏差必须提示 |
| 教育 | 通过率、平均分、缺勤率、进步幅度 | 不把相关性写成教学因果 |
| 系统日志 | 错误率、请求成功率、P95 延迟、吞吐量 | 需要按请求数和时间窗口说明 |
| 实验/医疗 | 均值变化、组间差异 | 必须提示需要统计检验，不自动给结论 |

### 5.5 限制

- 不基于字段名弱匹配生成高风险 KPI，例如 “conversion” 字段含义不明时不自动计算转化率。
- 不生成因果解释，只生成计算结果和公式。
- `confidence != high` 的 candidate 默认不进入报告，除非 LLM 明确说明不确定性。
- 高风险领域如医疗、金融风控、实验结果，不应输出建议性结论，只能输出描述性统计和 caveat。

---

## 6. 小样本 Warning 规则

### 6.1 建议阈值

| 条件 | Warning | LLM 表达限制 |
|------|---------|--------------|
| `rows < 10` | 极小样本 | insight 必须写“当前样本中” |
| `rows < 20` | 小样本 | 不写 outlier、分布形态、稳定排名 |
| `rows < 30` | skewness 不可靠 | 不写偏态结论 |
| correlation `n < 10` | 相关性不可靠 | 禁止 “strong relationship” |
| time periods `< 3` | 趋势不足 | 禁止 “trend”，只能写“两期变化” |
| group sample `< 3` | 分组样本不足 | 禁止 “best segment”，只能写“observed highest” |

### 6.2 对 `agent-sales.csv` 的适用结果

```json
{
  "warnings": [
    {
      "type": "small_sample",
      "severity": "high",
      "message": "Only 4 rows are available. Segment rankings are descriptive only."
    },
    {
      "type": "two_period_only",
      "severity": "medium",
      "message": "Only 2 monthly periods are available. Month-over-month change should not be described as a stable trend."
    },
    {
      "type": "correlation_unreliable",
      "severity": "high",
      "message": "Correlation statistics are not reliable with fewer than 10 paired observations."
    }
  ]
}
```

---

## 7. Skill Workflow 改进

### 7.1 新 Phase 3：Evidence Pack

替换当前较自由的 Narrative Planning：

```text
Phase 3 — Evidence Pack

1. Run total aggregate query.
2. Run primary grouping query.
3. If a time field exists, run period aggregate query.
4. Compute or select allowed metric candidates.
5. Emit sample-size warnings.
6. Draft 2-4 insights using only Evidence Pack ids.
```

### 7.2 Insight 输出格式

建议 skill 要求 LLM 先输出结构化草稿：

```yaml
insight_drafts:
  - text: "East contributed 240 of 450 sales, or 53.3%, in this sample."
    evidence: ["sales_by_region"]
    caveat: "small_sample"
  - text: "Sales rose from 220 in January to 230 in February while orders stayed flat at 9."
    evidence: ["sales_by_month"]
    caveat: "two_period_only"
  - text: "Average sales per order is 25 across the sample."
    evidence: ["avg_sales_per_order"]
    caveat: "small_sample"
  - text: "The failed status accounts for 12 of 300 records, or 4.0%, in this sample."
    evidence: ["status_failure_rate"]
    caveat: "descriptive_only"
```

### 7.3 语言约束

Skill 应明确禁止以下模式：

```yaml
# 禁止：因果化
- "East drove the business growth."

# 禁止：策略建议
- "North customers should be prioritized."

# 禁止：小样本趋势外推
- "Sales show sustained upward momentum."

# 禁止：低样本相关性
- "Sales and orders have a strong relationship."

# 禁止：领域无证据建议
- "This treatment should be adopted."
```

允许：

```yaml
- "In this 4-row sample, East has the highest observed sales total."
- "Across the two observed months, sales increased by 4.5% while orders were unchanged."
- "North has the highest observed sales per order, but it is based on one row."
- "The failed status accounts for 4.0% of observed records in this sample."
- "Group A has a 3.3-point higher observed average score than Group B; no significance test was run."
```

---

## 8. Spec 与校验演进

### 8.1 短期：保持 `insights: string[]`

短期为了兼容现有 renderer，可以继续输出：

```yaml
insights:
  - "In this 4-row sample, East contributed 240 of 450 sales, or 53.3%."
```

但 Skill 必须保留 Evidence Pack 草稿，便于人工和后续工具审计。

### 8.2 中期：升级为结构化 insights

推荐演进：

```yaml
insights:
  - text: "In this 4-row sample, East contributed 240 of 450 sales, or 53.3%."
    evidence: ["sales_by_region"]
    caveat: "small_sample"
    severity: "info"
```

Renderer 可以把 `caveat` 转为角标、脚注或 warning block。

### 8.3 长期：新增 verify

新增 `miao-viz verify` 或扩展 `validate`：

```bash
miao-viz verify \
  --spec report.yaml \
  --evidence evidence.json
```

校验内容：

- insight 的 evidence id 是否存在。
- insight 中的数字是否能在 evidence 中找到或由 evidence 推导。
- 小样本 warning 是否进入报告。
- 禁用词是否出现在高风险上下文中，例如 `trend`, `drive`, `significant`, `strong correlation`。

---

## 9. MVP 落地顺序

### 阶段 1：只改 Skill

成本最低，收益最快。

- 强制 Evidence Pack。
- 强制小样本 caveat。
- 规定 insight 语气。
- 要求每条 insight 带 evidence id 草稿。

### 阶段 2：CLI 输出 warnings

在 `profile` 或新命令中输出：

- `sampleWarnings`
- `timePeriodWarnings`
- `correlationWarnings`
- `groupSampleWarnings`

LLM 直接读取，不再自行判断阈值。

### 阶段 3：CLI 输出 metric candidates

先支持 5-8 个高置信公式，尤其是：

- measure / count
- numerator / denominator
- related measure / related measure
- group share
- current vs previous period change

### 阶段 4：Spec 支持结构化 insights

将 `string[]` 演进为兼容结构：

```ts
type Insight =
  | string
  | {
      text: string
      evidence?: string[]
      caveat?: string
      severity?: 'info' | 'warning'
    }
```

### 阶段 5：Evidence verify

实现机器校验，降低 insight 幻觉。

---

## 10. 对 `agent-sales.csv` 的期望输出示例

本节只是销售样例，不代表方案只适用于销售数据。真实实现应先识别字段角色，再生成通用 metric candidates。

### 10.1 派生指标

```json
{
  "id": "avg_sales_per_order",
  "label": "Average sales per order",
  "type": "unit_average",
  "value": 25,
  "formula": "sum(sales) / sum(orders)",
  "source": {
    "sales": 450,
    "orders": 18
  },
  "caveat": "small_sample"
}
```

### 10.2 Warning

```text
仅 4 行数据、2 个观察月份。排序、占比和环比变化只能视为当前样本中的描述性观察，不宜外推为稳定趋势或经营策略。
```

### 10.3 克制洞察

```yaml
insights:
  - text: "当前 4 行样本中，East 销售额为 240，占总销售额 450 的 53.3%。"
    evidence: ["sales_by_region"]
    caveat: "small_sample"
  - text: "1 月销售额为 220，2 月为 230，两期之间增加 4.5%；两个月订单数均为 9。"
    evidence: ["sales_by_month"]
    caveat: "two_period_only"
  - text: "样本整体客单价为 25，计算口径为总销售额 450 / 总订单数 18。"
    evidence: ["avg_sales_per_order"]
    caveat: "small_sample"
```

---

## 11. 非销售数据示例

### 11.1 系统日志

输入字段：

```text
timestamp, endpoint, status, latency_ms
```

可生成：

```yaml
metricCandidates:
  - id: "error_rate"
    type: "rate"
    formula: "count(status >= 500) / count(*)"
    caveat: "requires_status_definition"
  - id: "avg_latency"
    type: "unit_average"
    formula: "avg(latency_ms)"
  - id: "request_share_by_endpoint"
    type: "share"
    formula: "count(*) by endpoint / count(*)"
```

克制洞察：

```yaml
insights:
  - text: "In the observed log sample, 5xx responses account for 4.0% of requests."
    evidence: ["error_rate"]
    caveat: "descriptive_only"
```

### 11.2 问卷数据

输入字段：

```text
submitted_at, segment, satisfaction_score, recommend
```

可生成：

```yaml
metricCandidates:
  - id: "avg_satisfaction"
    type: "unit_average"
    formula: "avg(satisfaction_score)"
  - id: "recommend_share"
    type: "rate"
    formula: "count(recommend = yes) / count(*)"
  - id: "score_gap_by_segment"
    type: "difference"
    formula: "avg(satisfaction_score) by segment"
```

克制洞察：

```yaml
insights:
  - text: "Segment A has a higher observed average satisfaction score than Segment B, but the report does not include a significance test."
    evidence: ["score_gap_by_segment"]
    caveat: "no_significance_test"
```

---

## 12. 非目标

本方案不要求：

- CLI 直接调用 LLM。
- CLI 自动写完整业务建议。
- 在 MVP 阶段实现复杂统计显著性检验。
- 用大而全的 SQL 引擎替代当前轻量 query。
- 让所有派生指标都自动进入最终报告。
- 在没有字段语义证据时自动推断高风险业务指标。

本方案重点是让 Agent 生成报告时拥有更可靠的中间证据和更明确的表达边界。
