# Report Intelligence Validation Fix Plan

> 日期：2026-07-13  
> 状态：规划稿  
> 关联评估：GLM 5.2 对 `packages/miao-viz-cli/src` report 智能验证知识实现的审查  
> 关联模块：`packages/miao-viz-cli/src/analyzer.ts`、`spec-validator.ts`、`spec-validator-intelligence.ts`、`chart-catalog-*`、`report-block-registry.ts`、`patch-hints.ts`、`agent.test.ts`

---

## 1. 背景

当前 report 工作流已经形成了较完整的机器闭环：

```text
data analyze -> spec block instantiate -> spec validate --context --verify -> render report
```

核心优势是 evidence、catalog、block registry、directive resolver、validator 之间已经有明确边界，CLI 输出也保持 `{ ok, value } / { ok: false, code, message }` 的机器可读形态。

本次评估指出的主要问题集中在验证执行层和测试层：

- catalog 中声明的 `allowedTransforms` 没有被 `validateTransforms` 强制。
- analyzer 与 chart catalog 各自维护图表适用性阈值，已经出现 `bar >30` 与 `bar >12` 的漂移。
- 部分 block 评分漏加 evidence coverage。
- verify warning 与 patch hint 通过人类可读消息字符串耦合。
- 错误码、verify issue code、catalog rule code 仍以字符串字面量散落在多处文件。
- `$evidence:` 指令验证范围偏窄，部分字段中的未解析指令会静默渲染成占位符。
- 缺少覆盖完整 report 工作流的端到端 smoke test。

本方案目标是优先修复会直接影响报告可靠性的缺口，再逐步收敛结构化契约与技术债。

---

## 2. 目标与非目标

### 2.1 目标

1. 让 chart catalog 中已有的机器规则真正进入验证执行路径。
2. 消除 analyzer 与 catalog 之间最容易漂移的图表阈值。
3. 修复 block scoring 中的明显不一致。
4. 为 report 主路径补上 workflow-level smoke test。
5. 将 warning -> patch 的契约从消息字符串迁移到结构化 issue。
6. 扩大 evidence 引用验证范围，减少静默失败。
7. 保持 CLI 输出稳定、机器可读、向后兼容。

### 2.2 非目标

- 不重写 report 生成架构。
- 不把 URL fetching 或生成逻辑移入 web app。
- 不引入新的 report schema 平行事实源。
- 不在第一阶段大规模重构 `context-schema.ts` 或 `analyzer.ts` 的文件结构，除非触发 500 行硬限制。
- 不把所有 27 个 chart catalog 条目的规则一次性补满；先补影响当前 report 主路径的关键规则。

---

## 3. 分阶段实施

## Phase 1: Reliability Quick Wins

目标：用小范围改动关闭已经确认、风险低、收益高的问题。

### 3.0 建立错误码与 issue code 单点定义

位置建议：

- `packages/miao-viz-cli/src/error-codes.ts`

要求：

- 先覆盖本计划会触碰的 code，不要求一次性迁移全仓库所有字符串。
- 至少定义：
  - validator hard error code：`UNSUPPORTED_TRANSFORM`、`INVALID_TRANSFORM`、`EVIDENCE_PATH_NOT_FOUND`、`INSIGHT_EVIDENCE_NOT_FOUND`。
  - verify issue code：沿用现有 `VerifyIssue['code']` 联合中的 9 个 strict code。
  - catalog rule code：主路径图表已使用的 `X_MUST_BE_DIMENSION`、`BAR_NO_AGGREGATE`、`TOO_MANY_CATEGORIES`、`X_MUST_BE_TEMPORAL`、`MISSING_SORT_TRANSFORM` 等。
- `ValidationIssue.code`、`VerifyIssue.code`、新增 transform error detail 尽量从该模块派生类型。
- catalog rule 的 `code` 保持可序列化字符串，但实现侧使用常量，避免拼写漂移。

验收：

- Phase 1/3 新增或改动的 code 不再裸写在多个文件中。
- TypeScript 能捕获 verify issue code 拼写错误。
- 不强制一次性迁移历史 code，但文档标出后续迁移范围。

### 3.1 实现 `validateTransforms`

位置：`packages/miao-viz-cli/src/spec-validator.ts`

要求：

- 根据 `getCatalogItem(chart.type)?.allowedTransforms` 校验 `chart.data.transform[*].type`。
- 对不在 allowlist 的 transform 返回 hard error：

```ts
{
  code: 'UNSUPPORTED_TRANSFORM',
  message: "...",
  detail: {
    chartId,
    chartType,
    transformType,
    allowedTransforms
  }
}
```

- 保留现有 `UNSUPPORTED_TRANSFORM` patch hint 行为。
- 同步修正 `UNSUPPORTED_TRANSFORM` patch hint 边界：
  - 首选方案：泛化 patch，移除 `detail.transformType` 对应的第一个 transform，而不是只处理 `filter`。
  - 如果不泛化，必须在错误 detail 和文档中明确只有 `filter` 支持自动移除，其余 unsupported transform 只给定位信息。
- 对 unknown chart type 不重复报错，由已有 chart type validation 负责。
- 对 transform 内部形状做最小一致性校验：
  - `aggregate` 必须至少包含一个 `groupBy` 或 `measures`。
  - `aggregate.measures[*]` 必须包含 `field`、`op`、`as`。
  - `sort` 必须包含 `field`。
  - `limit` 必须包含正整数 `value`。
  - `derive-month` 必须包含 `field` 和 `as`。
- 明确 T24 边界：
  - transform 形状错误是 hard error。
  - `derive-month` 应用到非日期字段先保留为 profile-based warning，不在本阶段升级为 hard error。
  - 如果未来要升级，应另起 breaking-change 任务并修正 fixture/spec。

验收：

- `pie` 携带 `derive-month` 应失败。
- `bigvalue` 携带 `sort` 或 `limit` 应失败。
- `bar` 携带 `aggregate + sort + limit` 应通过。
- `derive-month` 缺少 `field` 或 `as` 应失败。
- `derive-month` 应用到 string 字段仍产出 T24 warning，而不是 hard error。
- 错误 detail 足够生成 patch 或定位问题。
- `UNSUPPORTED_TRANSFORM` 对非 `filter` 类型的 patch 行为有测试覆盖，或明确断言不生成 patch。

### 3.2 统一图表阈值

位置：

- `packages/miao-viz-cli/src/chart-catalog-core.ts`
- `packages/miao-viz-cli/src/analyzer.ts`

要求：

- 新增单点常量模块，例如 `chart-catalog-thresholds.ts`。
- 至少收敛以下阈值：
  - bar hard block max categories。
  - bar readability warning max categories。
  - pie max slices。
  - line min time periods。
  - histogram min rows。
  - scatter min measures。
- analyzer 的 `blockedCharts` 与 catalog rule 使用同一常量。
- 明确 hard block 与 warning 可使用不同阈值，但必须命名清楚。例如：

```ts
export const CHART_THRESHOLDS = {
  bar: {
    warningMaxCategories: 12,
    hardMaxCategories: 30
  },
  pie: {
    maxSlices: 7
  },
  line: {
    minTimePeriods: 3
  },
  histogram: {
    minRows: 20
  },
  scatter: {
    minMeasures: 2
  }
} as const
```

验收：

- 不再出现裸写的 `> 30`、`> 12`、`> 7`、`< 3`、`< 20`、`< 2` 分散在 analyzer/catalog 中。
- 测试覆盖 `TOO_MANY_CATEGORIES` warning 与 analyzer blocked reason 的阈值一致性。
- 本阶段不调整 `block.score >= 0.5` 的候选截断阈值，也不改变 `scoreCatalogCoverage()` 的全有或全无逻辑；仅修复已确认漏项。若要改 scoring 模型，应另开 scoring calibration 任务。

### 3.3 修复 block scoring 漏项

位置：`packages/miao-viz-cli/src/report-block-registry.ts`

要求：

- `trend-ranking` 和 `full-detail-report` 的 `canUse()` 加上 `scoreEvidenceCoverage(ctx)`，除非另有明确设计理由。
- 如果决定不加，必须在 resolver 注释中解释为何高密度 block 不应获得 evidence coverage 分。

验收：

- 有 evidence 时，这两个 block 分数相对无 evidence context 提高 `0.1`。
- 不改变 `score <= 1` 的上限。

### 3.4 修复 `runExtraQuery` 注释与帮助文本

位置：

- `packages/miao-viz-cli/src/analyzer.ts`
- `packages/miao-viz-cli/src/cli-help.ts`

要求：

- 注释与 help 统一为分号分隔格式：

```text
groupby=col;measure=sum(amount) as total;filter=col>=val
```

验收：

- 文档、help、实现一致。

### 3.5 扩大 `$evidence:` 验证范围并聚合错误

位置：`packages/miao-viz-cli/src/spec-validator.ts`

要求：

- `validateEvidencePaths()` 不只扫描 insight text 和 chart title，还应扫描可能包含 `$evidence:` 指令的字段：
  - report `title`、`description`。
  - insight `text`、`caveat`。
  - chart `title`、`description`。
  - encoding 中的 `title`、`format`、`label` 等字符串字段，如果类型中存在。
  - style/annotation 等已纳入 spec schema 的字符串字段，如果 renderer 会调用 directive resolver。
- 避免 ad hoc 深度遍历所有对象；优先显式列出 renderer 会解析或展示的文本字段。
- 将首错返回改为聚合返回：
  - 保留 `ok: false` envelope。
  - `code` 可继续使用 `EVIDENCE_PATH_NOT_FOUND` / `INSIGHT_EVIDENCE_NOT_FOUND`，但 detail 中包含 `issues[]`。
  - message 可以摘要首个错误和错误总数。

验收：

- insight `caveat`、report `description`、chart `title` 中的坏 `$evidence:` 都会被发现。
- 单个 spec 中多个坏引用一次返回多个 issue。
- render 前验证失败，最终 HTML 不应出现未解析的 `[?... ]` evidence 占位符。

### 3.6 校验 `correctAssumption` 字段存在性

位置：`packages/miao-viz-cli/src/analyzer.ts`

要求：

- `correctAssumption` 解析后，如果 value 是字段名，应检查字段是否存在于 `fields`。
- 对不存在字段不要静默接受：
  - 首选：把该 assumption 标为低置信度并加入 clarification/warning。
  - 如果当前 CLI envelope 更适合 hard failure，可返回结构化 error，但要避免破坏现有 analyze happy path。
- 至少覆盖 `primary_measure`、`primary_dimension`、`time_field` 这类字段型 assumption。

验收：

- 拼错字段名不会产出空 evidence 或误导 catalog。
- 测试覆盖合法字段、非法字段、非字段型 assumption 三种情况。

---

## Phase 2: Workflow Smoke Test

目标：补齐 AGENTS.md 要求的 report 主路径测试。

### 4.1 新增 fixture

位置建议：

- `test_data/report_workflow_sales.csv`

要求：

- 至少 30 行。
- 包含：
  - 一个时间字段，至少 3 个 period。
  - 一个低基数维度，例如 `region`，约 5 个 distinct values。
  - 一个中等基数维度，例如 `product`，约 15 个 distinct values，用于触发 bar readability warning 边界。
  - 一个高基数字段，例如 `sku` 或 `customer_id`，至少 35 个 distinct values，用于触发 analyzer blocked chart / strict blocked chart 负向路径。
  - 至少 2 个数值 measure，例如 sales、orders。

### 4.2 新增端到端测试

位置建议：

- 若继续沿用现有 `packages/miao-viz-cli/src/agent.test.ts`，需要注意文件已经超过 3000 行。
- 更推荐新增 focused test 文件，例如 `packages/miao-viz-cli/src/report-workflow.test.ts`。

测试链路：

```text
npm run miao-viz -- data analyze test_data/report_workflow_sales.csv --intent "sales performance" --output /tmp/.../context.json
npm run miao-viz -- data profile test_data/report_workflow_sales.csv > /tmp/.../profile.json
npm run miao-viz -- spec block instantiate trend-ranking --context /tmp/.../context.json --output /tmp/.../report.yaml
npm run miao-viz -- spec validate --spec /tmp/.../report.yaml --profile /tmp/.../profile.json --context /tmp/.../context.json --verify
npm run miao-viz -- render report --input test_data/report_workflow_sales.csv --spec /tmp/.../report.yaml --context /tmp/.../context.json --output /tmp/.../report.html
```

注意：

- `spec validate` 仍需要 profile，因此测试应显式运行 `data profile` 或使用已有 helper 生成 profile。
- 每一步都断言 JSON envelope：`ok === true`。
- 最后断言 HTML 文件存在且包含 report title、至少一个 chart 容器、至少一个 evidence-resolved insight 文本。
- 最后断言 HTML 不包含未解析 evidence 占位符，例如 `[?` 或 `$evidence:`。
- 增加一个负向用例：构造使用 blocked chart type 或高基数字段的 spec，运行 `spec validate --context --verify --strict`，断言返回 `BLOCKED_CHART_STRICT` 或对应 strict error，并包含结构化 detail。

验收：

- 单个正向测试覆盖 analyze、profile、instantiate、validate `--verify`、render report 五步。
- 测试失败时能定位到具体 CLI 步骤。
- 不依赖网络、API key 或 web app dev server。
- 至少一个负向测试覆盖 `--strict` / blocked chart 路径。

---

## Phase 3: Structured Verify Issues

目标：把 verify warning 与 patch hint 的契约从消息字符串迁移到结构化对象。

### 5.1 扩展现有 `VerifyIssue` 并改造数据流

位置：`packages/miao-viz-cli/src/spec-validator-intelligence.ts`

现状：

- `VerifyIssue` 已存在，并且 `code` 已是 9 个 strict code 的联合类型。
- 真正问题不是类型缺失，而是 `collectVerifyWarnings()` 先返回 `string[]`，`strictVerifyError()` 再通过 `warningToVerifyIssue()` 的 `message.includes(...)` 把字符串反解析回 issue。

要求：

- 新增 `collectVerifyIssues(spec, context?)`，原生返回 `VerifyIssue[]`。
- 扩展现有 `VerifyIssue`，不要另建平行类型。建议字段：

```ts
export interface VerifyIssue {
  code:
    | 'INSIGHT_FORBIDDEN_WORD_STRICT'
    | 'INSIGHT_MISSING_CAVEAT_STRICT'
    | 'INSIGHT_NUMERIC_CLAIM_WITHOUT_EVIDENCE_STRICT'
    | 'INSIGHT_TREND_WITHOUT_TIME_STRICT'
    | 'INSIGHT_STRONG_CLAIM_WITHOUT_EVIDENCE_STRICT'
    | 'INSIGHT_REQUIRED_EVIDENCE_MISSING_STRICT'
    | 'INSIGHT_TYPE_NOT_ALLOWED_STRICT'
    | 'BLOCK_REQUIRED_EVIDENCE_MISSING_STRICT'
    | 'TEMPLATE_REQUIRED_EVIDENCE_MISSING_STRICT'
  message: string
  severity?: 'warning' | 'error'
  chartId?: string
  chartType?: string
  insightType?: string
  field?: string
  evidenceId?: string
  requiredEvidence?: string[]
  payload?: Record<string, unknown>
}
```

- `collectVerifyWarnings(spec, context?)` 保留为兼容 wrapper：返回 `issues.map(issue => issue.message)`。
- `strictVerifyError()` 优先接受 `VerifyIssue[]`，同时兼容旧 `string[]`。
- `warningToVerifyIssue()` 仅作为 legacy fallback，Phase 3 内部路径不得依赖它。

验收：

- 修改 warning 文案不改变 `strictVerifyError(...).issues[*].code`。
- `INSIGHT_REQUIRED_EVIDENCE_MISSING`、`INSIGHT_TYPE_NOT_ALLOWED`、sample caveat 三类 issue 都有结构化 payload。
- 旧调用方继续可用 `collectVerifyWarnings()` 得到 `string[]`。

### 5.2 改造 patch hint

位置：`packages/miao-viz-cli/src/patch-hints.ts`

要求：

- `STRICT_VERIFY_FAILED` patch 不再通过正则解析 message。
- 使用 issue code 与结构化字段，例如：
  - `INSIGHT_REQUIRED_EVIDENCE_MISSING`
  - `ID_AS_MEASURE`
  - `MISSING_SAMPLE_CAVEAT`
- 对无法生成确定修复的场景，不返回 RFC 6902 patch。
- 将带 `?` 占位符的 patch 降级为 suggestion，或改为新的 `PatchSuggestion` 类型，避免伪装成可直接应用的 patch。
- 一并修复已知不一致 patch：
  - `preferredChartReplacement()` 替换 chart type 时必须考虑原 encoding 形状；例如 line 的 `x.type='temporal'` 不能直接替换为 bar 后立即触发 `X_MUST_BE_DIMENSION`。
  - `DUPLICATE_CHART_ID` patch 不能固定 `_2`；三重重复时应生成当前 spec 中不存在的 suffix。

验收：

- 修改 warning 文案不影响 patch 生成。
- `ID_AS_MEASURE`、`INSIGHT_REQUIRED_EVIDENCE_MISSING` 至少各有一个契约测试。
- blocked chart replacement 生成的 patch 应用后不立即触发另一条可预见 encoding 类型错误。
- 三个重复 chart id 的 patch 应用后不再产生重复 id。
- 旧 CLI 输出仍包含可读 warnings。

---

## Phase 4: Catalog Rule Coverage

目标：逐步把 chart catalog 中的文档字段变成可执行规则。

优先级：

1. 当前 analyzer 会推荐的 chart：`bigvalue`、`table`、`bar`、`line`、`area`、`pie`、`histogram`、`scatter`。
2. 当前 block builders 会生成的 chart：`bigvalue`、`bar`、`line`、`pie`、`table`。
3. ext catalog 中暂未进入主路径的图表。

规则方向：

- `minDataPoints` 应被验证或明确标注为文档字段。
- `requires` 不应继续只作为 prose，可拆成机器字段或 validate function。
- `ChartRule.expression` 如果不解析，不应立即破坏性改名；先标记为 deprecated 或新增 `expressionHint` 并双写一段时间，避免影响外部消费者。
- `table.requiredEncodings` 当前为空，table 规则不应伪造 required encoding。应校验 table 是否有明确字段选择机制，例如 `columns`、`encoding`、或 transform 后字段选择；如果允许默认全列展示，也必须限制过宽表格并给 warning。

验收：

- `scatter` 少于两个 measure 时 validate 或 verify 能提示。
- `histogram` 小样本时 validate 或 verify 能提示。
- `table` 在没有字段选择且列数过多时给出 warning；如果存在 `columns`，校验字段名在 profile/final schema 中存在。

---

## Phase 5: Compact Context Correctness

目标：降低 compact/full 行为漂移。

问题：

- `fromCompactAnalyzeContext()` 当前会丢失 `recommendedPlan`、`promptRules`、metric candidate 的 `label/confidence/caveat`、evidence 的 `query` 等信息。
- compact context 用于 validate 或 instantiate 时，可能与 full context 行为不同。

决策：

- compact context 允许进入 `spec block instantiate` 和 `spec validate --context --verify`，因此必须对影响行为的字段保持 lossless。
- 纯展示/解释字段可以有损，但必须不会改变 block scoring、verify warning、patch hint 或 evidence 解析结果。

要求：

1. 将影响 validator/block scoring 的字段列为 lossless requirement：
   - `catalog.charts` -> `scoreCatalogCoverage()`。
   - `catalog.blockedCharts` -> strict blocked chart validation。
   - `catalog.blocks` / `templates` 的 `score`、`charts`、`blocks`、`requiredEvidence`、`validInsightTypes` -> block/template evidence warnings。
   - `evidence` 的 `id`、`kind`、`values`、`rows`、`stats`、`query` -> evidence path validation 与 render-time directive resolution。
   - `sampleWarnings` -> caveat requirement。
   - `metricCandidates` 的 `type`、`field`、`label`、`confidence`、`caveat` -> block insight generation。
   - `promptRules`，尤其 "Every insight must cite at least one evidence id"，是行为契约，不应在 compact 往返中消失。
2. 为 `toCompactAnalyzeContext -> parseAnalyzeContext` 增加往返测试。
3. CLI help 和 docs 明确 compact 的 lossless 行为边界：影响机器校验的字段必须保留，长描述和示例可省略。

验收：

- compact 往返后，block candidate 排序与 score 不因字段丢失而变化。
- validate `--context compact.json --verify` 与 full context 在 evidence、sample warning、blocked chart、block/template required evidence 上输出一致。
- promptRules 中的 evidence citation 规则在 compact 往返后仍存在。

---

## 6. 测试策略

### 6.1 必跑测试

第一批修复完成后：

```bash
npm run test:run
npm run build:cli
npm run check:size
```

涉及 web app 时再运行：

```bash
npm run check
npm run build
```

### 6.2 新增测试清单

- error/issue codes：
  - 新增 code 从单点常量导出。
  - verify issue code 拼写由 TypeScript 联合类型约束。
- `validateTransforms`：
  - unsupported transform hard error。
  - malformed aggregate/sort/limit/derive-month hard error。
  - supported transform pass。
  - derive-month-on-string 保持 warning。
- chart threshold：
  - analyzer blocked reason 使用共享常量。
  - catalog warning 使用共享常量。
- block scoring：
  - `trend-ranking` 与 `full-detail-report` evidence coverage。
- evidence validation：
  - insight caveat、report description、chart title 中的坏 `$evidence:` 会失败。
  - 多个坏引用一次返回多个 issues。
- correctAssumption：
  - 合法字段通过。
  - 非法字段产生 warning/error，不静默接受。
- workflow smoke：
  - analyze -> profile -> instantiate -> validate --verify -> render report。
  - HTML 不含 `$evidence:` 或 `[?` 未解析占位符。
  - `--strict` blocked chart 负向用例。
- structured verify issues：
  - message 改动不破坏 patch。
  - preferred chart replacement patch 应用后不产生可预见二次错误。
  - duplicate id patch 支持三重重复。

---

## 7. 风险与控制

| 风险 | 影响 | 控制 |
|---|---|---|
| `validateTransforms` 变严导致现有 fixture/spec 失败 | 中 | 先修 CLI 自生成 spec；为旧 spec 输出明确错误和 patch hint |
| `validateTransforms` 把 derive-month-on-string 从 warning 升级为 error | 中 | 本计划明确形状错误为 hard error，字段类型不匹配先保留 warning |
| analyzer/catalog 阈值统一后推荐结果变化 | 中 | 区分 `warningMax` 与 `hardMax`，避免把 readability warning 误做 hard block |
| 中央错误码迁移范围扩大导致无关 churn | 中 | 只迁移本计划触碰的 code，历史 code 后续分批处理 |
| 结构化 VerifyIssue 改造破坏外部调用 | 中 | 保留 `collectVerifyWarnings()` wrapper |
| `ChartRule.expression` 改名破坏外部消费者 | 中 | Phase 4 先 deprecated 或双写，不直接删除字段 |
| compact 往返测试暴露更深字段丢失 | 中 | 明确机器校验字段 lossless，长描述/示例可继续有损 |
| preferredChartReplacement 不一致 patch 在 Phase 3 后仍存在 | 中 | Phase 3 将 replacement patch 应用后重验作为验收 |
| 新 E2E 测试运行慢 | 低 | 使用小 fixture 和 `execFileSync`，只跑 CLI 本地 wrapper |
| `agent.test.ts` 继续膨胀 | 中 | 新增 focused test 文件，不继续扩展 3000 行大文件 |

---

## 8. 建议执行顺序

1. Phase 1.0：先建立本轮会使用的错误码与 issue code 单点定义。
2. Phase 1.3 + Phase 1.4：做 scoring 与注释修复，风险最低。
3. Phase 1.1：实现 transform 验证，明确 patch hint 与 T24 边界，并补单元测试。
4. Phase 1.2：抽共享阈值，补 analyzer/catalog 阈值测试。
5. Phase 1.5 + Phase 1.6：扩大 evidence 验证范围，校验 correctAssumption 字段存在性。
6. Phase 2：补 workflow smoke test，作为后续重构安全网。
7. Phase 3：扩展现有 VerifyIssue 数据流，兼容旧 warnings，修 patch hint 不一致。
8. Phase 4/5：逐步扩大 catalog rule coverage 与 compact correctness。

---

## 9. Definition Of Done

第一阶段完成标准：

- 本轮新增或改动的 error/issue/rule code 有单点定义。
- `validateTransforms` 不再是空桩。
- unsupported transform patch hint 行为对非 `filter` 类型有明确实现或明确不支持。
- `derive-month` 形状错误与字段类型 warning 的边界有测试保护。
- analyzer 与 catalog 中关键阈值来自同一常量源。
- `trend-ranking`、`full-detail-report` scoring 行为一致。
- `runExtraQuery` 文档与实现一致。
- `$evidence:` 验证覆盖 description/caveat/title 等 renderer 可展示字段，并能一次返回多个 issues。
- `correctAssumption` 不再静默接受不存在的字段名。
- 存在一个完整 report workflow smoke test。
- `npm run test:run`、`npm run build:cli`、`npm run check:size` 通过。

整体完成标准：

- verify warning 的机器契约不依赖 message 文案。
- patch hints 只表达可直接应用的 patch；非确定修复使用 suggestion。
- 主路径 chart 的 catalog 规则至少覆盖 transform、required encoding、数据量/基数约束。
- compact context 对影响 instantiate/validate/render 的字段保持 lossless，使用边界有文档和测试保护。
