# Miao Vision Poster 抽象方案

## 1. 决策

Miao Vision Poster 不按行业或参考图复制模板，而按用户要表达的叙事问题建立有限模板族。系统采用五层模型：Poster Intent、Template、Composition、Block 和 Theme。模板通过注册表声明适用条件、默认组合、验证规则和降级策略。

本方案扩展 `poster-template-system-optimization-prd.md`，并以当前实现为兼容基线：

- 保留公开模板 id `data-poster-ranking`。
- 保留 `ranked-story`、`comparison-story`、`flow-story`、`geo-ranking-story`。
- 保留 `layout.preset: poster`、现有 PosterSpec 字段、错误码及 HTML/PNG/PDF 调用方式。
- 新能力放在 `poster/` 内，由通用 report template registry 委托，不让 poster 规则继续进入共享 registry 主体。

## 2. 目标

- 用户只需说明表达目标并提供本地数据或本地规范化内容，系统即可推荐和实例化 poster。
- 排名、构成占比、对比、趋势、时间线、流程和地理故事使用统一的发现、实例化、验证和渲染流程。
- 新业务领域复用已有模板族，不为盐、肉类、销售或能源分别建立模板。
- HTML、PNG 和 PDF 消费同一份已验证 spec，并保持本地优先、确定性输出和 evidence 可验证。
- 旧 `data-poster-ranking` spec 无需持久化迁移即可继续工作。

## 3. 非目标

- 不实现自由拖拽画布、任意坐标布局或图层编辑器。
- 不允许模板注入任意 HTML、CSS 或脚本。
- 不把视觉风格、行业名称或参考图本身作为叙事模板。
- 不在 poster renderer 复制已有 chart、article infographic 或 export 实现。
- 不由 renderer 发明百分比、排名、变化值或历史结论。
- CLI 不负责从 URL 抓取文章或远程图片；agent 先将内容规范化为本地输入。

## 4. 核心模型

```text
User brief + local source
           |
           v
AnalyzeContext + optional PosterContext
           |
           v
Poster Intent
排名 / 构成占比 / 对比 / 趋势 / 时间线 / 流程 / 地理
           |
           v
Poster Template Registry
适用条件 / 数据角色 / 默认构图 / 验证 / 降级
           |
           v
Composition Registry
页面区域 / slot 顺序 / 空间容量
           |
           v
Block Registry + Theme Registry
语义组件              视觉 token
           |
           v
Normalized PosterSpec
           |
           v
Validate -> Render -> HTML / PNG / PDF
```

### 4.1 层级职责

- **Poster Intent**：用户想回答什么问题，不指定图表或布局。
- **Template**：公开的用户能力单元，匹配数据/内容角色，选择 composition 和 blocks，生成完整 spec。
- **Composition**：只定义 slot、页面比例和空间容量，不读取业务字段。
- **Block**：实现图表、时间节点、图片、注释、图例等语义组件。
- **Theme**：只控制颜色、字体、纹理、边框和装饰 token。

Template 的 `dataCapacity` 约束数据适用性，例如类别数、系列数和事件数；Composition 的 `layoutCapacity` 约束空间适用性，例如标题行数、slot 高度、每个节点最大文本量和图片占位数量。

## 5. Poster Intent 与现有 Intent 的关系

Poster Intent 是 poster 域内的独立类型，不扩大共享 `VisualIntentFamily`。映射规则如下：

| Poster Intent | 现有 `VisualIntentFamily` 来源 | 说明 |
| --- | --- | --- |
| `ranking` | `ranking`；部分 `summary` | 有明确 dimension + measure 时成立 |
| `share` | `composition` | part-to-whole，不使用名称 `poster-composition` |
| `comparison` | `comparison`；部分 `change`、`target-attainment` | 双群组、双指标、双时期或目标对比 |
| `trend` | `trend`；部分 `change` | 连续时间序列 |
| `timeline` | PosterContext 显式内容角色 | 不加入共享 VisualIntentFamily |
| `flow` | `flow` | 阶段或 source-target-value |
| `geo` | `geo` | 地理字段与 measure |

`distribution`、`relationship`、`uncertainty` 默认不推荐 poster；它们继续使用普通 report。`summary` 缺少明确维度时也不推荐 poster。

## 6. 输入契约

### 6.1 数据型 Poster

排名、占比、对比、趋势、流程和地理 poster 继续接受 CSV、TSV、XLSX 或行数组 JSON：

```text
miao-viz data analyze SOURCE --intent "USER INTENT" --output CONTEXT
miao-viz data profile SOURCE > PROFILE
miao-viz spec template instantiate TEMPLATE_ID --context CONTEXT --output SPEC
miao-viz spec validate --spec SPEC --profile PROFILE --context CONTEXT --verify --strict
miao-viz render report --input SOURCE --spec SPEC --context CONTEXT --format html,png,pdf --output-dir OUTPUT_DIR
```

Poster 专属解析器根据共享 fields、visual tasks、evidence 和用户 brief 产生可选 `context.poster`：

- `intent`、`rationale`、`confidence`。
- `roleBindings`，例如 category、value、series、time、stage、source、target、geo。
- `templates`，即 poster 专属推荐列表。

不改变共享 `CatalogTemplateEntry`；现有 `catalog.templates` 继续服务 report，并在兼容期继续包含 `data-poster-ranking`。新 poster 推荐位于 `context.poster.templates`，其 compact codec 独立定义。

### 6.2 时间线 Poster

时间线不直接接受未结构化 Markdown。Agent 先把文章、笔记或历史材料规范化为本地 JSON 行数组，再使用相同的 `data analyze -> spec template instantiate -> spec validate -> render report` 流程。

每行代表一个事件，字段契约为：

| 角色 | 必需 | 内容 |
| --- | --- | --- |
| `order` | 是 | 确定性排序数字；无法解析真实日期时仍必须提供 |
| `timeLabel` | 是 | 展示日期、年代或时间范围 |
| `title` | 是 | 事件标题 |
| `description` | 是 | 简短说明 |
| `era` | 否 | 阶段或时代名称 |
| `mediaPath` | 否 | 用户明确提供的本地图片路径 |
| `source` | 否 | 该事件的来源标识或说明 |

规范化文件还必须通过显式 `poster.timeline.roles` 绑定实际列名，避免根据列名猜测。例如 `event_order` 可以绑定到 `order`。`content-poster-timeline` 实例化要求这些 bindings 存在；缺少时返回结构化错误和修复提示。

时间线的文字结论由 agent 从来源材料生成，数值结论仍必须引用 evidence。`mediaPath` 仅允许本地文件；导出时冻结进单文件 HTML。文件缺失产生 warning 并降级为 SVG 标记，不阻塞无图版时间线。

## 7. 模板族与命名

公开 template id 和内部 composition id 使用不同命名，以明确二者不是同一层：

| 公开 Template | Poster Intent | 默认 Composition | 状态 |
| --- | --- | --- | --- |
| `data-poster-ranking` | `ranking` | `ranked-story` | 已有，保留 id |
| `data-poster-share` | `share` | `share-story` | 新增 |
| `data-poster-comparison` | `comparison` | `comparison-story` | 规范化现有 composition |
| `data-poster-trend` | `trend` | `trend-story` | 新增 |
| `content-poster-timeline` | `timeline` | `timeline-story` | 新增 |
| `data-poster-flow` | `flow` | `flow-story` | 暴露现有 composition |
| `data-poster-geo` | `geo` | `geo-ranking-story` 或 `geo-map-story` | 分阶段交付 |

Template 可以根据数据形状选择 composition。例如 `data-poster-geo` 当前选择 `geo-ranking-story`，地图能力完成后在匹配率足够时选择 `geo-map-story`。

### 7.1 Ranking

- 一个分类字段和一个指标。
- 保持当前 3–12 个类别约束，与 schema 和 registry 一致。
- 支持 Top/Bottom N、值标签和可选参考线。

### 7.2 Share

- 分类、系列和非负数值。
- 默认使用 100% 横向堆叠条形图、统一图例和行内百分比标签。
- 适用于“各国肉类供应结构”类需求。

### 7.3 Comparison

- 双指标、双群组或双时期差异。
- 使用双栏排名、分组条形、哑铃图或坡度图。
- 不承担 part-to-whole。

### 7.4 Trend

- 时间字段和指标，可选系列。
- 使用折线、面积或关键节点路径。
- 时间点超限时返回聚合建议，不由 renderer 静默抽样。

### 7.5 Timeline

- 使用 Timeline 输入契约。
- Block 包括 timeline path、milestone、era marker、local image callout 和 annotation。
- 适用于“主题发展史”类需求。

### 7.6 Flow

- 支持 funnel、sankey 和 infographic-flow。
- 校验阶段顺序、source/target 引用和非负流量。

### 7.7 Geo

- 当前能力仅为 `geo-ranking-story`，即地理类别排名。
- `geo-map-story` 只有在本地底图、名称匹配、图例和标签碰撞能力交付后才进入可用 catalog。
- 地图不可用或匹配率不足时降级为地理排名，并返回原因。

## 8. Poster Template Registry

新增 `poster/poster-template-registry.ts`，由 `report-template-registry.ts` 委托。运行时注册项包含：

- `id`、`version`、`label`。
- `intents`。
- `requiredRoles`、`optionalRoles`。
- `dataCapacity`。
- `compositionIds` 和默认选择规则。
- `allowedBlocks`。
- `themeCandidates` 和 fallback theme。
- `applicability`。
- `validationRules`。
- `fallbacks`。

Fixtures 不进入运行时 registry 类型，存放在测试 fixture 目录。

模板评分统一为 0–1，由 intent 匹配、必需角色覆盖、数据容量、标签可读性和 evidence 可用性组成。相同输入和版本必须得到相同排序。

`context.poster.templates` 返回：template id、score、status、matchedIntent、matchedRoles、rationale、missingRoles、reasonCode、warnings、recommendedTheme 和 fallbackTemplateId。该 poster 专属结构不会膨胀共享 `CatalogTemplateEntry`，但必须在 `context-schema.ts` 和 `context-compact.ts` 中完成 full/compact 往返测试。

## 9. Spec、规范化与兼容

- `poster.template` 从当前 literal 扩展为上述公开 id 的 enum；`types.ts` 同步扩展。
- `data-poster-ranking` 不改名、不弃用，也不需要 alias。
- 旧 spec 在内存中补齐 template、composition 和 slots，不升级 `specVersion`。
- 规范化发生在语义验证之前；三个输出格式消费同一 normalized spec。
- 新 blocks 使用受控 discriminated union，不开放任意属性字典。
- `context.poster` 是 AnalyzeContext 中 poster intent、role bindings 和推荐结果的唯一位置。

## 10. Presentation Transform 与证据边界

100% 堆叠需要归一化，但不能把计算藏在 renderer 中。`data-poster-share` 实例化一个受控 `normalize-to-100` presentation transform，明确 group、series 和 value bindings。验证阶段执行确定性 transform，并在 evidence 中记录每个 segment 的 raw value、group total 和 normalized share；chart provenance 引用这些 evidence rows。

Renderer 只把已准备的 normalized share 映射为宽度和标签。用于正文或 callout 的百分比必须引用相同 evidence；不得从 SVG 几何或未记录的运行时计算产生结论。“其他”合并同样只能作为显式、可验证的数据准备 transform，不能由 renderer 自动执行。

## 11. Renderer 与校验分派

当前 renderer 除 `flow-story` 外都进入 ranking renderer，validator 也全局拒绝 horizontal、stacked 和 color series。新架构必须改为按 template/composition 分派：

```text
Normalized PosterSpec
  -> template-level validation
  -> composition-level validation
  -> block-level validation
  -> composition renderer
  -> block renderers
```

- `data-poster-ranking` 继续执行现有 vertical ranking 约束；横向排名不在本方案首阶段开放。
- `data-poster-share` 允许 horizontal + stacked + color，并要求 series、legend 和 normalize transform。
- `data-poster-comparison` 校验 secondary chart 或对应 comparison block。
- `data-poster-flow` 仅允许 funnel、sankey 或 infographic-flow。
- Timeline 和 Geo 使用自己的 block union，不经过 ranking chart 的全局限制。

## 12. 错误与 Warning 兼容

现有错误码是稳定机器接口，继续保留，包括 `POSTER_SLOT_REQUIRED`、`POSTER_SLOT_TYPE_INVALID`、`POSTER_CHART_INVALID` 和 `POSTER_CHART_NOT_FOUND`。不新增与它们同义的错误码。

新增且语义不重叠的错误码：

- `POSTER_TEMPLATE_UNKNOWN`
- `POSTER_TEMPLATE_NOT_APPLICABLE`
- `POSTER_DATA_ROLE_MISSING`
- `POSTER_DATA_CAPACITY_EXCEEDED`
- `POSTER_SHARE_TOTAL_INVALID`
- `POSTER_TIMELINE_ROLE_MISSING`
- `POSTER_TIMELINE_ORDER_INVALID`

新增 warning code：

- `poster_fallback_applied`
- `poster_media_unavailable`
- `poster_text_overflow`

错误和 warning 都必须包含 path、template/composition id、实际值、允许值及 repair hint。本方案不安排旧错误码弃用。

## 13. 分阶段实施

### Phase 1：统一现有 Poster 模型

独立可发布：

- 新增 poster template registry 和独立 PosterContext/catalog codec。
- 注册 `data-poster-ranking`、`data-poster-comparison`、`data-poster-flow`、`data-poster-geo`。
- `data-poster-geo` 只使用现有 `geo-ranking-story`。
- 统一 applicability、catalog、instantiate、normalization 和分层 validation dispatch。
- 保持现有视觉行为和公开错误码。

### Phase 2：构成占比海报

独立可发布：

- 新增 `data-poster-share`、`share-story` 和 poster share block。
- 把 horizontal、stacked、color 的允许条件从全局校验改为模板级校验。
- 新增 composition renderer dispatch，不再让 share 进入 ranking renderer。
- 增加受控 `normalize-to-100` transform、evidence、图例、行内标签和系列容量校验。
- 使用仓库内重新构造的 part-to-whole fixture 验收，不依赖外部参考图文件。

### Phase 3：编辑型时间线海报

独立可发布：

- 新增 `content-poster-timeline`、`timeline-story` 和 Timeline 行数组输入契约。
- 在 PosterContext 中加入显式 timeline role bindings。
- 提取可共享的 timeline SVG primitives，但不建立 ArticleSpec 与 PosterSpec 的 schema 依赖。
- 支持本地图片冻结、缺图降级、阶段标记、路径节点和 annotation。
- 使用仓库内原创的产品发展史 fixture 验收有图、无图、中英文和节点上限，不依赖用户附件。

### Phase 4：趋势模板与推荐完善

独立可发布：

- 新增 `data-poster-trend` 和 `trend-story`。
- 完善七类模板的 intent scoring 和 fallback 排序。
- 完成 PosterContext compact token budget 测试。

### Phase 5：本地地图海报

独立可发布：

- 引入授权清晰的本地简化 GeoJSON/TopoJSON 资源和地名标准化表。
- 新增 `geo-map-story`、choropleth block、分档图例和确定性标签碰撞规则。
- 定义名称匹配覆盖率阈值、未匹配实体报告和 `geo-ranking-story` 降级。
- 地图能力通过测试后才进入 `data-poster-geo` 的可用 composition candidates。

## 14. 实现范围

主要实现面包括：

- `poster/poster-template-registry.ts`：公开 poster template、applicability 和 instantiate。
- `poster/poster-context.ts`：Poster Intent、role bindings 和 poster catalog。
- `report-template-registry.ts`：只增加对 poster registry 的委托和兼容桥接。
- `context-schema.ts`、`context-compact.ts`：PosterContext full/compact schema 与往返。
- `analyzer.ts` 或独立 poster analyzer：从现有 visual tasks 和字段生成 PosterContext。
- `spec-schema.ts`、`types.ts`：template enum、timeline role bindings 和 block union。
- `poster/poster-normalizer.ts`：旧 spec 与默认 composition/slots 规范化。
- `poster/poster-validation.ts`：按 template/composition/block 分派并保留现有错误码。
- `poster/poster-renderer.ts` 与新增 composition/block renderer：按 composition 分派。
- `data-transform.ts` 或独立受控 transform 模块：可验证的 `normalize-to-100`。
- `svg-renderer*` 与 `infographic/`：只抽取共享 primitives。
- tests 与 fixtures：语义、compact codec、兼容、导出和视觉验收。
- `skills/miao-vision/references/report.md`：精确 CLI 工作流和模板选择说明。

完整实现超过 8 个文件，必须按五个独立阶段交付。任一阶段合并后系统都保持可用，不依赖下一阶段完成公开承诺。

## 15. 验收标准

- 七类用户问题均映射到一个稳定模板族，未知行业不会生成新模板。
- `data-poster-ranking` 仍是公开 id，旧 spec 的验证、排序、尺寸、错误码和导出保持兼容。
- Ranking 容量在 schema、registry、文档和 fixtures 中统一为 3–12。
- `context.poster.templates` 的 full/compact 表示无损往返，且不改变共享 `CatalogTemplateEntry`。
- 数据型完整工作流通过：`data analyze -> spec template instantiate -> spec validate --context --verify -> render report`。
- Timeline fixture 通过同一工作流，显式 role bindings 可验证，本地图片缺失时稳定降级。
- Share fixture 的 raw value、group total 和 normalized share 均可追踪到 evidence，renderer 不产生未记录指标。
- Share、Timeline、Flow 和 Geo 不再经过 ranking-only renderer/validator 分支。
- `geo-map-story` 在 Phase 5 前不会被推荐为可用能力。
- 每个模板至少有正常、blocked、容量边界和降级 fixture。
- Theme 切换不改变数据、顺序、evidence、template 或 composition。
- 相同输入、spec 和版本重复渲染得到一致结构。
- `npm run test:run`、`npm run build:cli`、`npm run check:size` 通过；涉及 PNG/PDF 或浏览器布局时额外运行 `npm run test:e2e`。

## 16. 风险与边界决策

- 最脆弱的假设是有限的受控 composition 能覆盖主要 poster 需求。如果真实需求以任意排版为主，应建立独立自由布局产品，而不是向 PosterSpec 增加任意坐标。
- Timeline 的内容准确性和图片版权来自用户/agent 提供的本地规范化材料；CLI 不运行网络抓取。
- Timeline 行数组契约牺牲了直接输入 Markdown 的便利，换取与现有 report pipeline、evidence 和 export 的一致性。若实际使用证明规范化成本过高，再单独设计内容适配命令，不把未结构化解析塞进 renderer。
- 地图能力依赖底图授权、名称标准化和标签可读性，因此单独排到 Phase 5，并始终保留排名降级。
- 系列合并、时间聚合和指标派生只能发生在显式、可验证的数据准备阶段。
