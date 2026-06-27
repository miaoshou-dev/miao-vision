# 5-Why Analysis — Report Errors (2026-06-27)

报告来源：用 miao-vision skill 对 `city_population.csv` 生成的 `report.html`，
共发现 4 类错误。

---

## Bug 1 — `$evidence` 占位符未解析

**表现：** insights 里出现原始模板字符串 `$evidence:extra_3.rows[46].avg_pop`，未被替换成数值。

| Why | 原因 |
|-----|------|
| Why 1 | HTML 里出现了未解析的 `$evidence` 字符串 |
| Why 2 | `renderStaticHtml()` 对 insights 只做了 `escapeHtml()`，从未调用 `resolveDirectives()` |
| Why 3 | `resolveDirectives()` 虽然存在于 `directive-resolver.ts`，但 `runRender()` 中只有在传了 `--context` 时才调用它 |
| Why 4 | SKILL.md Phase 4 的 render 命令没有写 `--context /tmp/miao-vision/context.json` |
| Why 5 | `$evidence` 指令系统和 `render --context` 支持是分开迭代加入的，SKILL.md 的 render 示例没有随之更新 |

**修复位置：** `SKILL.md` — render 命令补上 `--context`。

---

## Bug 2 — KPI BigValue 显示第一行原始值，非聚合结果

**表现：** 人口最多城市显示 `24870000`（上海 2020 年原始行），而非全量最大值。

| Why | 原因 |
|-----|------|
| Why 1 | KPI 显示了错误的数字 |
| Why 2 | `renderBigValue()` 直接取 `rows[0][valueField]`，没有聚合逻辑 |
| Why 3 | 渲染器假设数据已经过 transform 处理，只剩一行目标值 |
| Why 4 | LLM 生成的 bigvalue spec 没有加任何 `data.transform`（aggregate → sort → limit:1） |
| Why 5 | `vizspec.md` 把 bigvalue 描述为 `value` encoding 足矣，没有说明必须用 transform 把数据降到单行；LLM 从示例中推断"一个 encoding 字段就够了" |

**修复位置：** `vizspec.md` 需补充 bigvalue 必须配 transform 的说明（当前尚未修复）。

---

## Bug 3 — Table 显示原始前 20 行 + 列被截断

**表现：** 表格标题"人口 Top 10 城市（含密度与GDP）"，实际展示的是未排序的 20 条原始记录，缺少 `population_density` 和 `gdp_total_billion_usd` 列。

**两个子问题：**

### 3a — 列被截断（前 8 列）

| Why | 原因 |
|-----|------|
| Why 1 | `population_density`、`gdp_total_billion_usd` 不显示 |
| Why 2 | `renderTable()` 用 `Object.keys(rows[0]).slice(0, 8)` 硬截前 8 列 |
| Why 3 | 这两列在原始 CSV 的第 9、11 列位置，超出了截断上限 |
| Why 4 | 截断逻辑的出发点是"表格不应太宽"，但没考虑 transform 之后列数已被压缩的情况 |
| Why 5 | 渲染器与 transform 体系是独立开发的，没有建立"transform 输出列即显示列"的约定 |

### 3b — 数据未排序、未聚合

| Why | 原因 |
|-----|------|
| Why 1 | 表格显示的是原始行，而非 Top 10 城市 |
| Why 2 | LLM 生成了 `encoding: {}` 的空 spec，无任何 transform |
| Why 3 | `vizspec.md` 对 table 的描述是 `none`（不需要 encoding），用途写的是 "row-level preview" |
| Why 4 | "row-level preview" 的措辞暗示不需要 transform，LLM 按最简理解生成了空 spec |
| Why 5 | 文档没有提供"排名表"的 transform 示例，没有规定 table 必须配 aggregate + sort + limit |

**修复位置：** `svg-renderer.ts`（移除 `.slice(0, 8)`）+ `vizspec.md`（补充 table transform 必须和示例）。

---

## Bug 4 — Histogram / Scatter 显示 "not implemented"

**表现：** 两个图表显示橙色错误块"Static HTML rendering for histogram/scatter is not implemented yet."

| Why | 原因 |
|-----|------|
| Why 1 | 图表没有渲染 |
| Why 2 | `renderChartSvg()` 的 dispatch 没有 `histogram` 和 `scatter` 分支，走到 `renderUnsupported()` |
| Why 3 | 两种类型加入了 `MVP_CHART_TYPES`（可通过 validate）但对应的渲染函数没有同步实现 |
| Why 4 | spec-schema 层和 svg-renderer 层是独立维护的，没有强制保持同步的机制 |
| Why 5 | 没有一个测试用例遍历 `MVP_CHART_TYPES` 中的所有类型并断言 `renderChartSvg` 不返回 unsupported 字符串 |

**修复位置：** `svg-renderer.ts` 新增 `renderHistogramChart` 和 `renderScatterChart`。

---

## 系统性根因

四个 bug 表面各异，但都来自同一类结构性问题：**不同层之间存在隐式合约，没有机制确保它们同步。**

| 层对 | 合约内容 | 违约表现 |
|------|---------|---------|
| SKILL.md ↔ CLI flag | render 需要 `--context` 才能解析 `$evidence` | SKILL.md 漏写 `--context` |
| vizspec.md ↔ LLM | bigvalue/table 需要 transform 才能得到正确数据 | LLM 按最简理解生成了无 transform 的 spec |
| MVP_CHART_TYPES ↔ svg-renderer | 允许 validate 通过的 type 必须有对应渲染分支 | schema 和 renderer 独立维护，新增 type 后 renderer 未同步 |
| renderer ↔ transform | 渲染器假设 data 已经 transform 到只含目标行/列 | 无机制强制 LLM 写 transform，renderer 对原始数据表现异常 |

---

## 其他图形的类似风险

### 已确认：`heatmap` — 与 Bug 4 完全相同

`heatmap` 在 `MVP_CHART_TYPES` 中，可通过 validate，但 `renderChartSvg()` dispatch 没有 `heatmap` 分支，**当前仍会触发 `renderUnsupported`**。

### Transform 缺失风险（Bug 2/3 同类）

以下图表类型的渲染器都依赖 transform 提供正确结构的数据；
如果 LLM 生成的 spec 没有 transform，渲染器会安静地使用原始数据，产生误导性输出而非报错：

| 图表类型 | 无 transform 时的表现 | 所需 transform |
|---------|-------------------|--------------|
| `bigvalue` | 显示第一行原始值（**已发生**） | aggregate → sort → limit:1 |
| `bar` | 显示原始行（未聚合，未排序） | aggregate → sort → limit |
| `pie` | 显示原始行（slice 过多、数值未聚合） | aggregate → sort → limit |
| `line` / `area` | 时间点乱序、同维度多行叠加 | aggregate → sort(asc) |
| `scatter` | 原始行太多（现在会采样，但 x/y 可能是非聚合噪音） | 可视情况不加，但应理解数据粒度 |
| `histogram` | 无问题——渲染器自行从原始值计算 bucket | 不需要 transform |

### 根本修复方向

1. **bigvalue**：在 `vizspec.md` 补充"必须配 aggregate+sort+limit:1 transform"的规则和示例。
2. **bar / pie / line / area**：`vizspec.md` 已有示例，但应明确写出"不加 transform 等于直接渲染原始行"的警告。
3. **heatmap**：实现 `renderHeatmapChart`，或从 `MVP_CHART_TYPES` 移除直到实现。
4. **schema ↔ renderer 同步**：在 `agent.test.ts` 中增加一个测试，遍历 `MVP_CHART_TYPES` 所有类型，验证 `renderChartSvg` 返回值不含 `miao-unsupported`。
