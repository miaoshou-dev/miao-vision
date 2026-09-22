# Poster 模板系统优化 PRD 与技术设计

## 1. 文档信息

| 项目 | 内容 |
| --- | --- |
| 状态 | Proposed |
| 范围 | Miao Vision CLI 单页数据 poster |
| 第一阶段 | 通用排名故事构图、slot、主题系统 |
| 第二阶段 | 本地 choropleth 地图与地理组合海报 |
| 默认画布 | 1080 × 1350，竖版 |
| 约束 | 本地优先、确定性渲染、证据可验证、向后兼容 |

## 2. 背景与问题

当前 poster 只有 `data-poster-ranking` 一种模板。它要求 `poster.chartId` 指向纵向柱状图，hero、callout、chart 和 footer 采用固定顺序，且渲染器固定使用 editorial 主题。现有 `themeOverride` 没有形成独立的 poster 主题注册机制。

这套结构适合简单的分类排名，但难以表达参考图中的长图叙事：顶部定义或结论卡、中部地图或主视觉、底部排名榜单，以及根据用户描述变化的纹理和装饰。业务领域不是有限枚举；森林、进出口贸易、人口、能源等只能作为跨领域示例，不应分别复制成业务专用模板。系统应根据用户自然语言描述、数据语义和传播目的动态选择构图与视觉表达。

当前分析器已识别 `geo` 意图，但明确将地图能力延后，先用地理类别排名图。因此本设计将真实地图隔离到第二阶段，不阻塞第一阶段的模板复用能力。

## 3. 目标与非目标

### 3.1 目标

- 根据用户描述和数据语义动态选择 poster 构图、视觉主题和内容表达，不把业务领域写成固定列表。
- 将 poster 拆分为 composition、content block 和 theme 三层，新增能力通过注册表扩展。
- 由 analyze/catalog 推荐模板，由 instantiate 生成可验证的 poster spec。
- 复用现有 chart 数据准备、SVG renderer、evidence/provenance 和 HTML/PNG/PDF 导出链路。
- 保持旧版 `data-poster-ranking` spec 的验证、渲染和单页导出行为。

### 3.2 非目标

- 第一阶段不实现真实地图、贸易航线或在线地理服务。
- 不在 `apps/web` 复制 CLI 生成、验证或渲染逻辑。
- 不加入运行时网络请求、第三方地图服务或新的语言运行时。
- 不支持任意 HTML、任意 CSS、自由拖拽布局或无限制绝对定位。
- 不把任何业务领域、行业素材或主题名称写死在模板枚举中。

## 4. 用户与使用场景

### 4.1 数据分析用户

用户提供一个包含分类维度和数值指标的本地 CSV、TSV、XLSX 或 JSON，希望得到一张适合分享的排名海报。用户只需选择 poster 或接受系统推荐，不需要知道 slot 和 renderer 的内部实现。

### 4.2 内容与品牌用户

用户希望在同一份数据上切换浅色 editorial、深色氛围或新闻编辑室风格，同时保持数值、排序和证据不变。

### 4.3 Agent/CLI 使用场景

Agent 先执行 `data analyze`，从 `catalog.templates` 获取可用模板，再执行 `spec template instantiate` 生成草稿，最后使用 `spec validate --context --verify` 和 `render report --format html,png,pdf` 完成交付。

## 5. EARS 需求

以下需求使用稳定 ID，供实现、测试、验收和后续 issue 追踪。

### 5.1 用户描述驱动的主题选择

- **POSTER-REQ-001**：WHEN 用户提供自然语言描述，THE SYSTEM SHALL 从用户描述中识别主题语义、情绪、受众和传播目的，并据此推荐 poster 的视觉主题与构图。
- **POSTER-REQ-002**：WHEN 用户描述未指定明确视觉风格，THE SYSTEM SHALL 根据数据类型、指标语义和内容语气选择默认视觉方向。
- **POSTER-REQ-003**：WHEN 用户明确指定视觉风格或主题，THE SYSTEM SHALL 优先使用用户指定内容，并仅在与数据可视化能力冲突时返回结构化提示。
- **POSTER-REQ-004**：WHEN 用户描述属于新的、未预置的主题领域，THE SYSTEM SHALL 使用通用语义布局和可降级的视觉 token 生成 poster，不得因主题名称不在固定列表中而拒绝。
- **POSTER-REQ-005**：WHEN 系统自动推荐主题，THE SYSTEM SHALL 返回推荐结果、选择理由、置信度和可用的用户覆盖字段。
- **POSTER-REQ-006**：WHEN 用户覆盖主题，THE SYSTEM SHALL 保持数据、排序、证据和构图约束不变，只改变允许覆盖的视觉变量。

### 5.2 模板与内容解耦

- **POSTER-REQ-007**：WHEN 用户主题发生变化，THE SYSTEM SHALL 复用适合的数据叙事构图，而不是为每个业务主题创建独立模板。
- **POSTER-REQ-008**：WHEN 数据适合排名、对比、分布、流程或地理表达，THE SYSTEM SHALL 根据数据结构选择对应的 composition。
- **POSTER-REQ-009**：WHEN 主题没有专属装饰资源，THE SYSTEM SHALL 使用通用色彩、字体、纹理和图形 token 完成视觉表达。
- **POSTER-REQ-010**：WHEN 新增视觉主题，THE SYSTEM SHALL 通过主题注册表接入，不要求新增业务领域模板或修改中央渲染分支。

### 5.3 构图、内容块与主题

- **POSTER-REQ-011**：WHEN poster spec 指定 composition，THE SYSTEM SHALL 按注册表中的固定 slot 顺序和尺寸约束渲染。
- **POSTER-REQ-012**：WHEN slot 指定支持的 block，THE SYSTEM SHALL 使用已有 chart spec、callout 或文本内容填充该区域。
- **POSTER-REQ-013**：WHEN slot 使用模板不支持的 block 类型，THE SYSTEM SHALL 返回包含 spec 路径、允许类型和修复提示的结构化错误。
- **POSTER-REQ-014**：WHEN poster 指定主题，THE SYSTEM SHALL 仅改变颜色、字体、纹理和装饰变量，不得改变数据含义、排序和 evidence。
- **POSTER-REQ-015**：WHEN 未指定主题，THE SYSTEM SHALL 使用主题注册表中的默认 fallback。
- **POSTER-REQ-016**：WHEN 未提供可选媒体或装饰资源，THE SYSTEM SHALL 使用纯 CSS/SVG 降级并保持版式完整。

### 5.4 第一阶段模板能力

- **POSTER-REQ-017**：WHEN 数据包含一个可读分类维度和一个数值指标，且类别数为 3–15，THE SYSTEM SHALL 能推荐并实例化 `ranked-story` composition。
- **POSTER-REQ-018**：WHEN `ranked-story` 被渲染，THE SYSTEM SHALL 包含 hero、insight、ranking 和 footer 四个必需区域，并允许一个可选 primary-visual 区域。
- **POSTER-REQ-019**：WHEN 类别超过模板容量，THE SYSTEM SHALL 按配置截取 Top/Bottom N，并在 spec 或生成结果中保留明确的截取语义。
- **POSTER-REQ-020**：WHEN 排名值为负数、空值或非有限值，THE SYSTEM SHALL 使用现有数据验证规则处理或拒绝，不得绘制误导性柱形。
- **POSTER-REQ-021**：WHEN 用户选择已注册的视觉主题，THE SYSTEM SHALL 在相同数据和 composition 下生成可辨识但结构一致的视觉结果。

### 5.5 兼容与输出

- **POSTER-REQ-022**：WHEN 读取旧版仅包含 `chartId`、`hero`、`chart`、`callouts` 和 `footer` 的 poster spec，THE SYSTEM SHALL 按原有 `data-poster-ranking` 行为验证和渲染。
- **POSTER-REQ-023**：WHEN poster 输出为 HTML、PNG 或 PDF，THE SYSTEM SHALL 使用相同的已验证 spec，并保持单页竖版画布和无分页输出。
- **POSTER-REQ-024**：WHEN canvas 使用默认值，THE SYSTEM SHALL 输出 1080×1350；WHEN 用户提供其他尺寸，THE SYSTEM SHALL 要求高度大于宽度并按比例计算模板布局。
- **POSTER-REQ-025**：WHEN poster 包含数值结论、排名或比较，THE SYSTEM SHALL 要求其引用现有 evidence/provenance，不得由渲染器发明指标。

### 5.6 第二阶段地图能力

- **POSTER-REQ-026**：WHEN 数据包含可识别 geo 字段和数值指标，THE SYSTEM SHALL 能推荐 `geo-ranking-story`，否则返回地理字段不可用原因。
- **POSTER-REQ-027**：WHEN 地理名称可映射到底图实体，THE SYSTEM SHALL 渲染本地 choropleth、分档图例和对应值。
- **POSTER-REQ-028**：WHEN 部分地理名称无法映射，THE SYSTEM SHALL 输出未匹配实体列表，并根据覆盖率阈值选择警告或拒绝渲染。
- **POSTER-REQ-029**：WHEN 地图标签发生碰撞，THE SYSTEM SHALL 使用确定性的隐藏、偏移或引线规则，不得随机布局。
- **POSTER-REQ-030**：WHEN 地图资源不可用，THE SYSTEM SHALL 降级为地理排名图并明确记录降级原因。

### 5.7 非功能需求

- **POSTER-NFR-001**：WHEN 相同输入、spec 和版本重复渲染，THE SYSTEM SHALL 生成结构与数据一致的确定性结果。
- **POSTER-NFR-002**：WHEN 在本地 CLI 中渲染 poster，THE SYSTEM SHALL 不上传数据或要求 API key。
- **POSTER-NFR-003**：WHEN 新增 composition、block 或 theme，THE SYSTEM SHALL 通过注册表扩展，不要求修改中央条件分支。
- **POSTER-NFR-004**：WHEN 处理模板允许的最大类别数和默认画布，THE SYSTEM SHALL 在现有 PNG/PDF 超时预算内完成渲染。
- **POSTER-NFR-005**：WHEN 文本超过 slot 容量，THE SYSTEM SHALL 使用确定性的字号阶梯、换行和最大行数规则，并在仍无法容纳时返回 overflow 警告。

## 6. 产品设计

### 6.1 三层模型

```text
Composition（构图）
  定义区域、顺序、比例和必需性
        ↓
Content Block（内容块）
  定义地图、排名、流向、洞察和装饰的语义
        ↓
Theme（视觉主题）
  定义颜色、字体、纹理、边框和装饰 token
```

业务领域不再对应独立模板。系统根据用户 brief 和数据任务，为同一 composition 选择不同的内容 block；一个排名故事可以承载森林面积、出口额、人口或球队积分等任意领域。

### 6.2 第一阶段 composition：`ranked-story`

首批注册表同时预留 `comparison-story` 与 `flow-story`：前者复用双指标对比版式，后者复用 funnel、sankey 或 infographic-flow 图表表达阶段/路径。它们都是数据叙事构图，不对应任何业务领域；新增领域只需由解析器根据数据结构选择合适构图。

固定区域如下：

1. `hero`：eyebrow、标题和副标题。
2. `insight`：定义、公式、阈值或一条证据支持的结论。
3. `primary-visual`：可选的图表或装饰区；第一阶段可使用已有 chart 或 decorative。
4. `ranking`：主排名图，默认纵向柱状图，支持排序、Top/Bottom N 和值标签。
5. `footer`：来源、日期、方法说明。

布局必须保持单页、竖版和确定性。内容过长时先按确定性规则缩小字体和换行，仍无法容纳时返回 overflow 警告。

### 6.3 视觉主题

第一阶段内置三个视觉主题示例，主题注册表本身保持可扩展：

| 主题 | 视觉语言 | 匹配特征 |
| --- | --- | --- |
| `editorial-light` | 浅纸张背景、粗标题、有限强调色 | 清晰、通用、轻量 |
| `atmospheric-dark` | 深色背景、低对比纹理、半透明图表 | 沉浸、自然、纪录片感 |
| `newsroom-bold` | 高对比色块、醒目数字、新闻编辑室层级 | 严肃、权威、传播性强 |

主题只提供 token 和匹配特征，不拥有业务文案、数值、排序或 evidence。未来可以增加科技、复古、极简等主题，而不增加对应业务模板。缺失媒体时使用 CSS/SVG 纹理或几何装饰降级。

### 6.4 用户描述驱动的推荐

新增确定性的 `PosterStyleResolver`。推荐优先级固定为：

```text
用户显式风格要求
  → 用户描述中的传播目的和语气
  → 数据语义与字段角色
  → composition 适配度
  → 默认主题 fallback
```

输入：

```ts
interface PosterStyleInput {
  userBrief?: string
  intent: AnalyzeContext['intent']
  fields: AnalyzeContext['fields']
  evidence: AnalyzeContext['evidence']
  availableCompositions: string[]
  availableThemes: string[]
}
```

输出：

```ts
interface PosterStyleDecision {
  compositionId: string
  themeId: string
  rationale: string[]
  confidence: number
  overrideable: boolean
  warnings?: string[]
}
```

用户显式要求具有最高优先级，但不能绕过数据验证、证据验证、画布约束和 block 兼容性检查。未知业务领域不得导致拒绝；系统应选择通用 composition 和可降级主题。

### 6.5 第二阶段 composition：`geo-ranking-story`

该组合用于第一张参考图类型的完整长图叙事：

```text
标题 / 定义卡片
        ↓
分档图例
        ↓
本地 choropleth 主地图
        ↓
Top/Bottom 排名与关键结论
        ↓
来源、日期、方法说明
```

它复用 `ranked-story` 的 hero、insight、ranking 和 footer 语义，只新增地图 block、地理资源、分档图例和标签规则。

## 7. 技术设计

### 7.1 Public schema

在 `AgentPosterSpec` 中保留旧字段，并增加以下可选字段：

```ts
interface AgentPosterSpec {
  template?: 'data-poster-ranking'
  composition?: string
  theme?: string
  themeOverride?: {
    mood?: string
    palette?: string
    density?: 'compact' | 'balanced' | 'airy'
  }
  selection?: {
    source: 'user' | 'auto'
    rationale?: string[]
    confidence?: number
  }
  slots?: PosterSlotSpec[]

  chartId: string
  canvas?: PosterCanvas
  hero: PosterHero
  footer: PosterFooter
  chart?: PosterRankingOptions
  callouts?: AgentPosterCallout[]
}
```

`PosterSlotSpec` 使用受控联合类型：

- `hero`：标题、eyebrow、subtitle。
- `insight`：note、formula、threshold，必须能够携带 evidence/provenance。
- `chart`：引用 `charts[]` 中已有 `chartId`。
- `primary-visual`：第一阶段支持 `chart` 或 `decorative`；第二阶段增加 `choropleth`。
- `footer`：source、date、methodology。

每个 slot 必须有唯一 `id` 和注册表允许的 `role`。第一阶段不开放任意 HTML、CSS 或绝对定位字段。

旧 spec 不做持久化迁移；渲染前在内存中规范化为 `ranked-story`，因此不升级 `specVersion`，也不要求用户修改已有 YAML。

### 7.2 Registry 与数据流

```text
AnalyzeContext
  → poster template recommendation
  → template instantiate
  → normalized PosterSpec
  → schema + semantic validation
  → composition registry
  → block renderers
  → poster theme tokens
  → HTML / PNG / PDF
```

新增三个确定性注册层：

- **Composition registry**：声明必需 slot、允许 block、顺序、尺寸约束和默认高度。
- **Block registry**：复用现有 chart spec 与 SVG renderer；poster 专属逻辑只负责裁剪、标签和视觉包装。
- **Theme registry**：提供 `background`、`surface`、`ink`、`muted`、`accent`、`grid`、`font`、`displayFont` 和 decoration tokens。

`data-poster-ranking` 继续作为公开 template id，实例化后默认使用 `ranked-story`。第一阶段不复用通用 report 的网格布局，因为 poster 需要严格单页尺寸；数据准备、SVG renderer 和导出链路继续复用。

主题注册表负责视觉 token 和匹配特征，不负责判断业务领域：

```ts
interface PosterThemeDefinition {
  id: string
  label: string
  description: string
  tokens: {
    background: string
    paper: string
    ink: string
    muted: string
    accent: string
    grid: string
    font: string
    displayFont: string
  }
  supportedMoods: string[]
  supportedDensities: Array<'compact' | 'balanced' | 'airy'>
}
```

`theme` 使用可扩展的主题 ID；内置主题只是示例，不代表主题全集。未指定主题时由 `PosterStyleResolver` 选择，无法匹配时使用默认 fallback。`themeOverride` 只能覆盖允许的视觉 token，不得注入任意 CSS、HTML 或布局坐标。

第二阶段使用仓库内冻结的简化 GeoJSON/TopoJSON 资源，不调用在线地图服务。地理名称先经过标准化表，再与底图实体匹配；地图覆盖率、未匹配实体和降级原因都进入结构化验证结果。

### 7.3 校验与错误模型

新增或预留以下错误码：

- `POSTER_COMPOSITION_UNKNOWN`
- `POSTER_SLOT_REQUIRED`
- `POSTER_SLOT_DUPLICATE`
- `POSTER_SLOT_TYPE_INVALID`
- `POSTER_THEME_UNKNOWN`
- `POSTER_TEXT_OVERFLOW`
- `POSTER_GEO_FIELD_MISSING`
- `POSTER_GEO_ENTITY_UNMATCHED`
- `POSTER_GEO_COVERAGE_LOW`

错误必须包含 `path`、`compositionId`、允许值、实际值和可执行 repair hint。现有 `POSTER_CONFIG_MISSING`、`POSTER_CHART_NOT_FOUND`、`POSTER_CHART_INVALID`、`POSTER_CATEGORY_FIELD_MISSING` 和 `POSTER_VALUE_FIELD_MISSING` 保持兼容。

### 7.4 文本、标签与尺寸规则

- 默认画布保持 1080×1350；自定义画布必须满足 `height > width`。
- 标题使用确定性的字号阶梯和最大行数；分类标签允许换行但不得溢出画布。
- 排名图默认支持 3–15 个类别；实际展示数量由 `maxItems` 控制并记录截取语义。
- 数值标签必须来自已准备的数据行，并沿用现有 `valueFormat` 规则。
- 第二阶段地图标签使用固定优先级：Top N、异常值、用户指定 focus，其余标签按碰撞规则隐藏或偏移。
- 所有布局计算不得使用随机数、当前时间或外部字体加载结果作为决策依据。

## 8. 分阶段交付

### 第一阶段：通用排名故事

可独立发布，包含：

- composition、slot 和 poster theme registry。
- `ranked-story` composition。
- 三个内置视觉主题示例，并支持通过主题注册表继续扩展。
- 旧 `data-poster-ranking` normalization 和兼容校验。
- analyze/template catalog、template instantiate、validator、renderer 和 skill 文档更新。
- 多个跨领域 fixture（例如森林面积、出口额、城市人口和球队积分），用于验证同一构图的动态主题推荐。

### 第二阶段：地图叙事

可独立合并，包含：

- 本地世界地图资源和地名标准化表。
- choropleth block 与 `geo-ranking-story` composition。
- 分档图例、未匹配实体报告、标签碰撞规则和地理排名降级。
- 不改变第一阶段 schema 的既有语义和输出格式。

预计完整实现会涉及超过 8 个文件，应按两个独立 PR/阶段交付。新增非测试 TypeScript 文件仍需遵守低于 500 行的项目限制。

## 9. 可行性审查

### 9.1 需求覆盖

每条 EARS 需求均可映射到 schema、registry、validator、renderer、catalog 或 export 测试；数值正确性继续由 profile、evidence 和 provenance 验证，不依赖人工视觉检查。

### 9.2 技术选择

继续使用 TypeScript、Zod、现有静态 HTML/SVG 和 Playwright 导出链路。第一阶段不新增运行时依赖，符合 CLI 本地优先边界。第二阶段的底图是本地静态资源，不依赖在线地图 API。

### 9.3 可维护性

Composition、block 和 theme 分离；新增模板通过注册表接入，避免在单一 renderer 中不断增加主题条件分支。旧 spec 通过 normalization 兼容，不制造一次性迁移脚本和版本分叉。

### 9.4 性能与降级

第一阶段只增加静态布局计算和 token 查找。第二阶段限制底图复杂度、标签数量和实体规模；底图缺失时降级为地理排名图并保留原因。HTML、PNG 和 PDF 共享同一已验证 spec。

### 9.5 安全与隐私

整个链路不上传数据、不要求 API key、不在渲染运行时访问外部服务。外部图片不属于第一阶段内置能力；如未来支持，只允许用户明确提供的本地资源。

### 9.6 关键假设与风险

本设计假设受控 composition 足以覆盖主要海报需求。如果实际需求主要是自由编排，slot registry 会变得僵硬；此时应另立自由布局能力，而不是继续向 poster spec 增加任意定位字段。

地图是最脆弱的技术假设：地名标准化、底图授权、标签避让和地图可读性都会影响交付。如果本地底图覆盖率或质量不足，系统必须保留地理排名降级路径，不阻塞第一阶段。

## 10. 测试与验收

### 10.1 单元与 schema 测试

- 新旧 poster spec 均可解析。
- 未知 composition/theme、重复 slot、缺失必需 slot 返回稳定结构化错误。
- 默认画布为 1080×1350，自定义横向画布被拒绝。
- 超过模板容量时按配置截取并保留截取语义。

### 10.2 模板与分析流程测试

- 3–15 个类别且具备 measure/dimension 时推荐并实例化 `ranked-story`。
- 缺少字段、类别过少、类别过多时返回 blocked template 及原因。
- 多个跨领域 fixture 使用同一 composition，区域结构一致；主题由 brief、数据语义和数据密度动态推荐。

### 10.3 渲染与兼容测试

- 保持现有 `poster.test.ts` 的验证和渲染断言。
- 旧 spec 继续输出 `.mv-poster`、1080×1350 和原有排序行为。
- 主题覆盖只改变视觉 token，不改变条目数量、排序、值、source 或 evidence。
- 用户显式风格优先于自动推荐；无风格描述时根据 brief、数据语义和数据密度选择主题。
- 新的业务领域名称不会导致模板不可用，也不会触发新增业务模板。
- 中英文长标题、长分类名、缺失可选媒体和最大类别数不越出画布。
- 相同输入、spec 和版本重复渲染得到一致的结构和数据。

### 10.4 证据与导出测试

- 无 evidence 的数值 insight 被拒绝。
- 合法 evidence/provenance 可验证并正常渲染。
- HTML、PNG、PDF 使用同一已验证 spec，均为单页竖版。
- PNG 继续裁剪 `.mv-poster`，PDF 不产生额外分页。

### 10.5 第二阶段地图测试

- 地名全部匹配、部分匹配和低覆盖率分别产生成功、警告或拒绝结果。
- 标签碰撞使用固定的隐藏、偏移或引线结果。
- 底图资源缺失时降级为地理排名图，并记录降级原因。

### 10.6 工作流验收命令

```bash
npm run test:run
npm run build:cli
npm run check:size
```

报告生成变更需覆盖：

```text
data analyze
  → spec template instantiate
  → spec validate --context --verify
  → render report --format html,png,pdf
```

地图或浏览器导出变更额外运行：

```bash
npm run test:e2e
```

## 11. 追踪矩阵

| 需求范围 | 主要实现面 | 验收面 |
| --- | --- | --- |
| REQ-001–010 | `PosterStyleResolver`、theme registry、composition recommendation | 自动推荐、显式覆盖和跨领域 fixture 测试 |
| REQ-011–016 | composition、slot、theme、fallback renderer | schema、主题和降级测试 |
| REQ-017–021 | `ranked-story`、ranking block、theme registry | 多领域 fixture 渲染测试 |
| REQ-022–025 | poster normalization、现有 validator/export | 既有 `poster.test.ts` 与导出测试 |
| REQ-026–030 | geo registry、地图资源、匹配与降级 | 地图覆盖率、碰撞和降级测试 |
| NFR-001–005 | 确定性布局、离线资源、文本测量和文件拆分 | 重复渲染、离线、overflow、size 检查 |

## 12. 默认决策

- 文档使用中文，EARS 关键字保留英文 `WHEN` 和 `THE SYSTEM SHALL`。
- 第一阶段默认 composition 为 `ranked-story`；默认主题由 `PosterStyleResolver` 选择，无法匹配时 fallback 到 `editorial-light`。
- 第一阶段不生成照片背景；装饰由 CSS/SVG 完成，用户素材仅作为未来可选输入。
- 第二阶段才交付真实地图，并使用本地静态地理资源。
- 不改变 CLI 的 `render report` 命令和现有 HTML/PNG/PDF 调用方式。
- 不升级 `specVersion`；旧 spec 通过内存 normalization 兼容。
