# Evidence-Grounded Visualization Generation

> 日期：2026-06-23  
> 目标：让 Miao Vision 生成的 insight、annotation、executive deck claim 都能追溯到真实数据证据、transform、字段口径和数据质量信号。

## 一、问题背景

Miao Vision 当前强调三类高价值输出：

- Data Display：KPI、图表、表格、注释、洞察组成的数据展示 artifact。
- Article-to-Infographic：文章或 Markdown 到信息图 artifact。
- Presentation Deck：面向汇报和 executive review 的浏览器演示文稿。

这些方向会天然强化 AI 生成的文字表达，例如：

- insight
- annotation
- chart caption
- executive summary
- deck claim
- recommendation

但从用户视角，最核心的风险不是“不够好看”，而是“不可信”。

用户会担心：

- 数字是否真实？
- 结论是否编造？
- 图表是否选错？
- 聚合口径是否正确？
- 数据缺失是否被忽略？
- AI 是否把相关性写成因果关系？

因此 Miao Vision 需要把可信证据作为产品基础能力，而不是只做视觉渲染。

## 二、产品原则

核心能力定义：

> Evidence-Grounded Visualization Generation

目标：

> 每个 insight、annotation、deck claim 都必须能追溯到数据证据、transform、字段口径和质量信号。

原则：

1. AI 可以写结论，但不能凭空写数字。
2. 数字必须来自 `miao-viz profile`、`miao-viz query` 或可重放 transform 的真实计算结果。
3. 每个 insight、annotation、claim 都应绑定 evidence。
4. 每个图表必须声明聚合口径。
5. 数据质量问题必须进入输出物，而不是被隐藏。
6. `validate` 校验结构和字段，`verify` 校验证据和结论。

## 三、目标架构

推荐生成链路：

```text
data file
  -> profile
  -> intent planning
  -> evidence query
  -> insight drafting
  -> spec validation
  -> evidence verification
  -> render / deck
```

对应 CLI 能力：

```text
miao-viz profile
miao-viz query
miao-viz validate
miao-viz verify
miao-viz render / deck
```

新增关键能力：

- `miao-viz query`
- `miao-viz verify`
- VizSpec / DeckSpec evidence fields
- render/deck evidence display

## 四、Profile 增强

`profile` 不应只是字段摘要，而应输出 AI 可用的数据质量、字段角色和口径信号。

示例：

```json
{
  "rowCount": 12450,
  "columns": [
    {
      "name": "sales",
      "type": "number",
      "role": "measure",
      "missingPct": 0.02,
      "min": 0,
      "max": 120000,
      "sum": 1234567,
      "mean": 312.4,
      "p50": 180,
      "p95": 1200,
      "outlierCount": 37,
      "reliable": true
    }
  ],
  "quality": {
    "missingRows": 204,
    "duplicateRows": 12,
    "warnings": [
      {
        "code": "HIGH_MISSING_RATE",
        "field": "discount",
        "message": "discount has 38% missing values"
      }
    ]
  },
  "hints": [
    {
      "type": "time-series",
      "xField": "order_date",
      "yField": "sales",
      "reason": "order_date is temporal and sales is a measure"
    }
  ]
}
```

AI 可以用 profile 选择分析方向，但不应直接把 profile 样本数据当作最终数字证据。只有 `reliable: true` 的统计量，或由 `query` / transform 计算出的结果，才能支撑具体数字。

## 五、新增 `miao-viz query`

`miao-viz query` 用于让 Agent 获取真实聚合值，避免 AI 自己心算或从样本推断。

示例：

```bash
miao-viz query ./sales.csv \
  --select "sum(sales) as total_sales, count(*) as orders" \
  --group-by region \
  --order-by total_sales desc \
  --limit 10 \
  --format json
```

输出：

```json
{
  "ok": true,
  "value": {
    "queryId": "q_region_sales",
    "source": "./sales.csv",
    "rowCount": 4,
    "columns": ["region", "total_sales", "orders"],
    "rows": [
      {
        "region": "East",
        "total_sales": 1200000,
        "orders": 4200
      }
    ],
    "transform": [
      {
        "type": "aggregate",
        "groupBy": ["region"],
        "measures": [
          {
            "field": "sales",
            "op": "sum",
            "as": "total_sales"
          }
        ]
      },
      {
        "type": "sort",
        "field": "total_sales",
        "order": "desc"
      },
      {
        "type": "limit",
        "value": 10
      }
    ]
  }
}
```

AI 后续如果写：

```text
East leads revenue with $1.2M.
```

必须绑定 evidence：

```yaml
insights:
  - text: "East leads revenue with $1.2M."
    evidence:
      queryId: q_region_sales
      fields: [region, total_sales]
      row: 0
```

## 六、Spec 增加 Evidence 字段

VizSpec / DeckSpec 应从“只描述展示”升级为“展示 + 证据”。

### Chart Evidence

```yaml
charts:
  - id: sales_by_region
    type: bar
    title: Sales by Region
    data:
      transform:
        - type: aggregate
          groupBy: [region]
          measures:
            - field: sales
              op: sum
              as: total_sales
        - type: sort
          field: total_sales
          order: desc
    encoding:
      x:
        field: region
      y:
        field: total_sales
    evidence:
      queryId: q_region_sales
      grain: region
      measure: "sum(sales)"
      filters: []
```

### Insight Evidence

```yaml
insights:
  - id: top_region
    text: "East is the largest region by revenue."
    evidence:
      queryId: q_region_sales
      assertion:
        type: top-rank
        field: total_sales
        rank: 1
        groupField: region
```

### Deck Claim Evidence

```yaml
slides:
  - layout: metrics-chart
    title: Growth is concentrated in East
    claim: East contributes 43% of total sales.
    evidence:
      queryId: q_region_share
      assertion:
        type: share-above
        groupField: region
        groupValue: East
        field: sales_share
        threshold: 0.4
```

## 七、新增 `miao-viz verify`

`validate` 和 `verify` 应拆分职责：

| Command | Responsibility |
| --- | --- |
| `validate` | schema、字段、encoding、transform、chart type |
| `verify` | evidence、claim、数据质量、结论一致性 |

示例：

```bash
miao-viz verify \
  --input ./sales.csv \
  --spec ./report.yaml \
  --profile ./profile.json \
  --strict
```

校验内容：

- insight 是否有 evidence。
- evidence query 是否可重放。
- claim 中的数字是否和 query result 一致。
- top、rank、share、trend、correlation 是否真实成立。
- 图表 transform 和 evidence transform 是否一致。
- 是否引用了高缺失字段但没有 warning。
- 是否在样本过少、缺失过高或异常值明显时写了过强结论。
- 是否把 correlation 写成 causation。

输出：

```json
{
  "ok": false,
  "errors": [
    {
      "code": "UNSUPPORTED_CLAIM",
      "path": "slides[1].claim",
      "message": "Claim says East contributes 43%, but evidence query returns 31.2%.",
      "expected": "31.2%",
      "actual": "43%"
    }
  ],
  "warnings": [
    {
      "code": "HIGH_MISSING_FIELD_USED",
      "field": "discount",
      "missingPct": 0.38,
      "path": "charts[2]"
    }
  ]
}
```

## 八、Claim Grammar

不要让 AI 随便写不可验证的 assertion。短期应限制为有限 claim grammar。

P0 支持：

```ts
type Assertion =
  | { type: 'top-rank'; groupField: string; rank: number; field: string }
  | { type: 'share-above'; groupField: string; groupValue: string; field: string; threshold: number }
  | { type: 'change-rate'; field: string; from: string; to: string; op: 'increase' | 'decrease'; value: number }
  | { type: 'trend-direction'; field: string; direction: 'up' | 'down' | 'flat' }
  | { type: 'correlation'; x: string; y: string; minAbsR: number }
  | { type: 'quality-warning'; field: string; warningCode: string }
```

好处：

- 降低 AI 乱写结论的空间。
- 降低 verify 实现复杂度。
- 让 Agent 知道什么结论是“可验证结论”。
- 让 deck claim 和 report insight 更稳。

## 九、渲染层展示证据

用户不一定要看到完整 query，但应该能看到证据来源。

报告中建议支持：

- insight footnote
- chart caption
- evidence popover
- data quality warning block
- evidence appendix

示例：

```text
East contributes 43% of sales. [1]

[1] Evidence: sum(sales) by region, 12,450 rows, no filters, generated from sales.csv.
```

Deck 中建议支持：

- speaker notes evidence
- hidden JSON manifest
- appendix slide
- quality warning slide

嵌入 artifact 的 evidence manifest：

```json
{
  "evidence": {
    "queryId": "q_region_share",
    "transform": [],
    "rowCount": 12450,
    "qualityWarnings": []
  }
}
```

## 十、Agent Skill 工作流升级

当前 skill 不应只做：

```text
profile -> write spec -> validate -> render
```

应升级为：

```text
profile
  -> choose analysis plan
  -> run 1-5 evidence queries
  -> write spec with evidence ids
  -> validate
  -> verify
  -> render / deck
```

Skill 规则：

- 不要在没有 query evidence 的情况下写具体数字。
- 不要写无法用 assertion 表达的强结论。
- 对缺失率、异常值、样本过少必须写 caveat。
- executive deck 的每个 claim 至少绑定一个 evidence item。
- 如果 `verify` 失败，修复一次再输出。
- 如果数据证据不足，应降低语气，例如从 “proves” 改成 “suggests”。

## 十一、落地优先级

### P0：防编造数字

- [ ] 增强 `profile` quality summary。
- [ ] 新增 `miao-viz query`。
- [ ] Spec 支持 `evidence`。
- [ ] Insight / annotation 支持 `evidence.queryId`。
- [ ] Skill 要求数字必须来自 query。

### P1：验证结论

- [ ] 新增 `miao-viz verify`。
- [ ] 支持 top-rank、share、change、trend、correlation assertion。
- [ ] verify 输出结构化错误。
- [ ] render 展示 evidence caption。

### P2：可信 Executive Deck

- [ ] DeckSpec slide claim evidence。
- [ ] speaker notes / appendix evidence。
- [ ] 数据质量 warning slide。
- [ ] claim strength 控制：`observed`、`likely`、`hypothesis`。

### P3：审计与复现

- [ ] Artifact 内嵌 `miao-viz-evidence` JSON。
- [ ] Query cache / evidence manifest。
- [ ] 可导出 evidence appendix。
- [ ] deterministic rerun。

## 十二、最终用户价值

这个方向解决的是用户最担心的信任问题：

- 数字从哪里来？
- 结论怎么得出？
- 图表有没有误导？
- 数据质量有没有问题？
- AI 有没有乱编？

最终定位：

> Beautiful visual artifacts, grounded in verifiable data evidence.

中文表达：

> 好看的视觉作品，但每个数字和结论都可追溯、可验证。
