# Report Intelligence Knowledge PRD — Review

> 日期：2026-07-12
> 评审对象：`docs/report-intelligence-knowledge-prd.md`
> 评审视角：对照 `packages/miao-viz-cli/src` 现有实现，评估 PRD 的可落地性与一致性。
> 更新：2026-07-12，PRD 已根据本 review 修订（v2，755 行）。下方标注每条意见的处置状态。

---

## 总结

产品定位与原则扎实，对上游错误来源的诊断（字段角色、图表选择、insight 过度解读、证据缺失、数据质量隐藏）准确且切中真实 bug 面。但 PRD 以 greenfield 语气撰写，而其所描述的能力约有 60% 已在代码库中实现（只是名字不同）。最严重的风险不是 PRD §10.2 担心的 "knowledge drift"，而是 **本 PRD 自身引入了第二套事实源**，会在 day-one 触发它所警告的漂移。

> **v2 复评：** 修订版（§0 + 全文调整）已系统性回应本 review 的主要与中等意见。下方逐条标注 **[已解决]** / **[部分解决]** / **[未解决]**。当前残余项均为 minor，不阻塞落地。

---

## 优点

- §1 对上游错误来源的刻画与现有代码的真实 bug 面吻合（`refineRole()` 的薄弱、`FORBIDDEN_WORDS` 的覆盖不足）。
- §4.1–4.5 原则成立，尤其 **Deterministic Before Generative** 与 **Evidence First**。
- §6.5 反模式列表具体、可执行。
- §9 分阶段路线在形态上合理（prose → 规则 → block → scoring/交互）。

---

## 主要问题

### 1. 与现有实现脱节 — PRD 提议的能力多数已存在 [已解决]

v2 新增 §0 Current State 表格，逐项映射到现有文件/类型并标注 `exists / partial / new`；§7.1 改为"先整合现有文件，再视复用情况抽 `knowledge/`"两步走；§10.2 显式把"本 PRD 引入第二套事实源"列为风险并给出收敛缓解。本条已闭环。

原对应关系（供回溯）：

| PRD 提议 | 已存在实现 |
|---|---|
| `FieldProfile`（含 `semanticRole`、`chartUsage`，§6.1） | `ColumnProfile`（`types.ts:71`）+ `AnalyzeField`（`context-schema.ts:4`）+ `refineRole()`（`analyzer.ts:68`） |
| `ChartKnowledgeItem`（含 `antiPatterns`、`constraints`，§6.2） | `chart-catalog-core.ts` / `chart-catalog-ext.ts` — 每个图表已带 `antiPatterns`、`bestFor` |
| `ReportBlockKnowledgeItem`（§6.3） | `ReportBlockResolver`（含 `canUse()` + `BlockDecision` 评分，`report-block-registry.ts:33`） |
| Validator 反模式（Phase 1） | `FORBIDDEN_WORDS` + `VerifyIssue` 已在 `spec-validator.ts:10` |
| `evidencePlan`、`antiPatternWarnings`（§7.2） | `AnalyzeCatalog.blockedCharts`、`sampleWarnings`、`metricCandidates` 已在 `AnalyzeContext` |
| Scoring 模型（§7.3） | `scoreCatalogCoverage`、`scoreDimQuality`、`scoreEvidenceCoverage` 已在 `report-block-registry.ts:49` |

### 2. 字段角色词汇表不一致，且无迁移映射 [已解决]

v2 §6.1 给出统一核心角色集（`measure | dimension | time | id | status | score | flag | text | geo | unknown`），把 `currency/percentage/url/ordinal/latitude/longitude` 降为 `semanticTags`，并附 old→new 迁移表。`chemical_structure` 明确移出核心，归入 `chemistry` domain pack。§9 Phase 2 交付物显式包含"统一 `ColumnProfile.role` 与 `AnalyzeField.role`，建立 migration mapping"。已闭环。

残余（minor）：`geo` 进入核心角色，但 §9 Phase 2 的 `refineRole()` 扩展项未单独点名 geo 检测逻辑（lat/lon、国/省/市名匹配）。建议在 implementation plan 里补一条具体检测规则。

### 3. Phase 1 交付 prose，而原则 §4.1 明令禁止 prose-only [已解决]

v2 Phase 1 交付物改为"将高风险反模式定义为最小机器可读规则，而不是 prose-only"，并要求 agent reference 内容"从机器规则摘要派生或显式引用机器规则"。验收新增"Phase 1 不引入与现有 `AnalyzeContext` 平行的新 schema"。已闭环。

### 4. Insight 证据模型不足以支撑机器校验 [已解决]

v2 §6.4 把 `requiredEvidence` 从 `string[]` 升级为结构化数组（`kind: values|rows|metricCandidate|sampleWarning|profile` + `path` + `fields`），`requiredChecks` 同样结构化（`type: evidence_ref_exists|numeric_claim_bound|...` + `severity`）。§6.4 与 §10.4 均显式以 `INSIGHT_NUMERIC_CLAIM_WITHOUT_EVIDENCE_STRICT` 为 baseline。已闭环。

---

## 中等问题

- **§7.2 JSON 示例与当前输出形状不符。** [已解决] v2 标注为"目标 delta"，并改为复用现有 `AnalyzeContext` 形状（`fields`/`catalog`/`sampleWarnings`/`metricCandidates`），显式禁止新增平行顶层数组。
- **§7.3 scoring 模型** [已解决] v2 §7.3 明确沿用现有 0–1 `BlockDecision.score`，把加法项改为"归一化到 0-1"的 `normalize(...)`，并要求 forbidden 进入 `blockedCharts/blockedBlocks/blockedTemplates`。
- **§8 指标无目标值与基线。** [已解决] v2 §8.1 改为表格，列出测量方法、Phase 1 基线、Phase 2 目标，并定义 3 人 panel rubric。基线值多为"新增 fixtures 后测量"，对规划稿可接受。
- **§9 无工作量估算 / 负责人 / 依赖。** [部分解决] 依赖关系已隐含在 phase 措辞中（Phase 2 依赖角色收敛），但工作量与负责人仍缺。若 PRD 层不承载、留给 implementation plan，可接受。
- **Token 预算未提及。** [已解决] v2 §7.2 显式要求兼容 `CompactAnalyzeContext`，禁止 schema 膨胀；§9 Phase 2 交付物含"`CompactAnalyzeContext` 同步更新，控制 token 体积"。
- **Templates 层被遗漏。** [已解决] v2 §6.3、§7.1、§7.2 均纳入 template；§6.3 列出 template 规则覆盖项（role 校验、block 一致性、score 组合、blocked reason code）。

---

## 次要问题

- §7.1 的 skill reference 路径 `skills/miao-vision/references/` 正确且已存在；`data-report.md` 已在其中 — 应引用而非暗示新建目录。 [已解决] v2 §7.1 已标注 `data-report.md # 已存在，需引用和更新`。
- §6.1 `chartUsage` 枚举 `recommended|allowed|discouraged|forbidden` — `forbidden` 与 hard validation 重叠；应明确 `forbidden` 是在 validate 时阻断还是仅作 warning。 [部分解决] v2 §7.3 说明 forbidden 应"阻止或降级，并进入 blockedCharts/blockedBlocks/blockedTemplates"，但字段级 `chartUsage.asMeasure='forbidden'` 如何驱动 catalog 级 `blockedCharts` 的传递关系仍未写明。建议补一句："字段 `chartUsage.forbidden` 在 catalog 构建时上推为对应 chart 的 blocked reason。"
- §5.1 工作流把 `data profile` 与 `data analyze` 列为两次独立 agent 调用 — `analyze` 内部已 profile（`analyzer.ts:26`），happy path 上是冗余调用。 [已解决] v2 §5.1 已合并为单次 `data analyze`。

## v2 新增残余项

以下在修订版中仍未覆盖，建议后续补齐（均不阻塞 Phase 1）：

- **Escape hatch 的机器契约。** §10.1 允许 "显式写明 reason 和 caveat" 的 escape hatch，但 validator 如何识别、校验并放行一个 escape hatch 未定义。若不补，规则一旦变严就会回到"要么全过、要么全卡"的二元状态，正是 §10.1 想避免的僵硬。建议在 Phase 1 的机器规则格式里预留 `escape: { reason: string; caveat: string; acknowledged: true }` 结构，由 validator 校验非空。
- **Knowledge pack 版本化。** 知识变为可执行后，已生成 spec 在新 validator 下可能 break。PRD 未提版本号 / 兼容策略。建议至少为规则集引入 semver 并在 `validate --verify` 输出中回显版本。
- **Forbidden language 的 i18n。** 现有 `FORBIDDEN_WORDS` 已双语（CN/EN）正则。§4.4 Conservative Language 与 §6.5 反模式未提多语言维度。若报告输出语种扩展，需要把 forbidden/allowed statements 与 locale 绑定。
- **`geo` 角色检测规则。** `geo` 进入核心角色集，但 Phase 2 的 `refineRole()` 扩展项未单列其检测口径（lat/lon 列对、ISO 国家/省份名、城市名库）。

---

## 建议

1. **新增 "§0 Current State" 章节**，把每条提议能力映射到现有文件/类型，标注 `exists / partial / new`。 [已完成] v2 §0 已落地。
2. **重排 Phase 1**，使最小可机读规则格式与 prose 同步或更早交付，而非滞后。 [已完成] v2 Phase 1 已调整。
3. **统一字段角色词汇表**：选定一套规范角色集，单点定义，令 `AnalyzeField` + `ColumnProfile` 从其派生；附 old→new 迁移表。 [已完成] v2 §6.1 + §9 Phase 2。
4. **把 `chemical_structure` / molecule grid 移出核心**，作为命名的 domain pack；它把核心表面偏向单一垂直领域。 [已完成] v2 §6.1/§6.2/§8.2 均归入 `chemistry` domain pack。
5. **收紧 §8**：给出基线 + 目标值与测量方法（自动化指标走 golden test；人工评估指标给出 panel 规模与 rubric）。 [已完成] v2 §8.1 表格 + 3 人 panel rubric。
6. **解决 scoring 冲突**：在 §7.3 加法模型与现有 0–1 `BlockDecision.score` 之间二选一，并显式说明取舍。 [已完成] v2 §7.3 沿用 0–1 + normalize。

---

## 结论

方向正确，值得推进。阻塞缺陷是：它被写成一份从零开始的 PRD，而代码库已经不是零。在补上"现状映射 + 迁移路径"之前，按本 PRD 落地会复制而非整合现有规则，直接违背其自身确立的 §4.5 原则。

> **v2 复评结论：** 阻塞缺陷已消除。§0 现状映射、角色收敛与迁移表、Phase 1 机器规则前置、insight 证据结构化、scoring 统一、指标基线/目标、template 纳入、token 预算约束均已落地。残余项（escape hatch 契约、pack 版本化、forbidden language i18n、geo 检测规则、`chartUsage.forbidden` 上推关系）均为 minor，可在 implementation plan 阶段补齐，不阻塞 Phase 1 启动。建议进入实施规划。
