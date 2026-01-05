# AntV Infographic 集成方案

> 将 AntV Infographic 的信息图能力集成到 Miaoshou Vision AI Report 功能中

## 一、项目对比分析

### 1.1 架构对比

| 维度 | AntV Infographic | Miaoshou Vision |
|------|------------------|-----------------|
| **渲染引擎** | 自定义 JSX Runtime → SVG | **Svelte 5 + SVG** (27 种图表) |
| **配置方式** | DSL Syntax + JSON Options | Markdown + YAML Code Block |
| **模板系统** | Registry Pattern (197+ 模板) | ComponentRegistry (43+ 组件) |
| **数据流** | options.data → Structure → Item | SQL → DuckDB → Svelte 组件 |
| **主题系统** | ThemeConfig + Palette | 简单的 Tailwind 主题 |
| **输出格式** | SVG (可导出 PNG) | SVG (Svelte 渲染) |
| **AI 集成** | AI-friendly DSL | LLM + Markdown 生成 |

### 1.2 组件体系对比

**AntV Infographic 组件层次:**
```
┌─────────────────────────────────────────────────────────┐
│                    Template (预设组合)                    │
│  例: 'list-grid-badge-card'                              │
├─────────────────────────────────────────────────────────┤
│  Structure (布局) + Item (卡片) + Title (标题)            │
│  ├── 40+ Structures: list-grid, hierarchy-tree, etc.   │
│  ├── 30+ Items: badge-card, compact-card, etc.         │
│  └── Title: default title component                     │
├─────────────────────────────────────────────────────────┤
│                 Base Components                          │
│  Group, Rect, Ellipse, Text, Path, Defs, FlexLayout    │
└─────────────────────────────────────────────────────────┘
```

**Miaoshou Vision 组件层次:**
```
┌─────────────────────────────────────────────────────────┐
│                 Plugin Components (43+)                  │
│  ├── Data Display (27): 全部 Svelte + SVG               │
│  │   ├── bigvalue, datatable, sparkline, delta         │
│  │   ├── bar/line/area/pie-chart, histogram            │
│  │   └── sankey, treemap, funnel, gauge, radar...      │
│  ├── Inputs (8): dropdown, slider, daterange...        │
│  └── UI (6): alert, tabs, accordion...                 │
├─────────────────────────────────────────────────────────┤
│               Markdown → Svelte → SVG                    │
│  ```bigvalue                                             │
│  data: metrics                                          │
│  value: revenue                                         │
│  ```                                                    │
└─────────────────────────────────────────────────────────┘
```

### 1.3 核心 Gap 分析

| Gap | 描述 | 影响 | 优先级 |
|-----|------|------|--------|
| **G1: 信息图布局引擎** | 缺少 Structure 层（网格、金字塔、时间线、树形等） | 无法生成复杂信息图布局 | P0 |
| **G2: 数据项卡片** | 缺少 Item 层（徽章卡片、进度卡片、图标卡片等） | 数据展示形式单一 | P0 |
| **G3: 主题色彩系统** | 缺少自动主题色生成、调色板系统 | 视觉效果不统一 | P1 |
| **G4: SVG 导出** | 当前 Svelte + SVG 渲染，需要增加导出功能 | 无法导出高质量图片 | P1 |
| **G5: 模板组合机制** | 缺少 Structure + Item 的声明式组合 | AI 难以生成复杂信息图 | P0 |
| **G6: AI DSL 语法** | 当前是 Markdown，缺少 Infographic-style DSL | AI 流式输出体验差 | P2 |

**现有优势:**
- ✅ 27 种图表组件已使用纯 Svelte + SVG 渲染
- ✅ 统一的 ComponentRegistry 插件架构
- ✅ 成熟的 Markdown → 组件渲染流程

---

## 二、技术实现方案

### 2.1 方案选型

#### 方案 A: 直接集成 @antv/infographic (推荐)

```
优点:
✅ 开箱即用 197+ 模板
✅ 成熟的 SVG 渲染引擎
✅ AI-friendly 的 DSL 语法
✅ 可导出 PNG/SVG

缺点:
❌ 引入新依赖 (~200KB gzipped)
❌ 与现有 Svelte 生态不完全兼容
❌ 需要数据适配层
```

#### 方案 B: 复刻核心架构到 Svelte

```
优点:
✅ 完全控制代码
✅ 与现有架构一致
✅ 可深度定制

缺点:
❌ 开发周期长 (预估 4-6 周)
❌ 需要实现完整的 Structure + Item 体系
❌ 需要实现 SVG 布局引擎
```

#### 方案 C: 混合方案 (推荐采用)

```
Phase 1: 直接使用 @antv/infographic 作为 AI Report 的信息图渲染器
Phase 2: 逐步将高频使用的模板迁移为 Svelte 原生组件
Phase 3: 两套系统共存，按需选择

优点:
✅ 快速上线
✅ 渐进式迁移
✅ 风险可控
```

### 2.2 推荐方案: 混合集成架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                         AI Report Flow                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  User Prompt                                                         │
│       │                                                              │
│       ▼                                                              │
│  ┌─────────────────┐                                                 │
│  │  ReportPlanner  │ ──→ ReportPlan (sections with viz type)        │
│  └─────────────────┘                                                 │
│       │                                                              │
│       ▼                                                              │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │                    Section Generator                             ││
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ││
│  │  │  Chart Section  │  │ Infographic Sec │  │  Table Section  │  ││
│  │  │  (Svelte+SVG)   │  │ (@antv/infogra) │  │  (DataTable)    │  ││
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘  ││
│  └─────────────────────────────────────────────────────────────────┘│
│       │                                                              │
│       ▼                                                              │
│  Markdown Output with Mixed Blocks:                                  │
│  ```sql name=data ... ```                                           │
│  ```infographic                                                      │
│  template: list-grid-badge-card                                      │
│  data: $data                                                         │
│  theme: professional                                                 │
│  ```                                                                 │
│       │                                                              │
│       ▼                                                              │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │                  ReportRenderer                                  ││
│  │  - SQL blocks → DuckDB                                          ││
│  │  - Chart blocks → Svelte + SVG (27 种组件)                       ││
│  │  - Infographic blocks → @antv/infographic (NEW)                 ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 三、详细实现计划

### Phase 1: 基础集成 (Week 1-2)

#### 3.1.1 安装依赖

```bash
npm install @antv/infographic
```

#### 3.1.2 创建 Infographic 插件

**文件结构:**
```
src/plugins/infographic/
├── index.ts                    # 导出
├── InfographicBlock.svelte     # 渲染容器
├── definition.ts               # 组件注册
├── parser.ts                   # YAML 解析
├── data-adapter.ts             # DuckDB → Infographic 数据适配
├── theme-adapter.ts            # 主题适配
└── types.ts                    # 类型定义
```

#### 3.1.3 核心组件实现

**InfographicBlock.svelte:**
```svelte
<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { Infographic } from '@antv/infographic'
  import type { InfographicBlockConfig } from './types'

  interface Props {
    config: InfographicBlockConfig
    data: Record<string, unknown>[]
  }

  let { config, data }: Props = $props()
  let container: HTMLDivElement
  let instance: Infographic | null = null

  onMount(() => {
    renderInfographic()
  })

  onDestroy(() => {
    instance?.destroy()
  })

  function renderInfographic() {
    if (!container) return

    const infographicData = adaptData(data, config)

    instance = new Infographic({
      container,
      template: config.template,
      data: infographicData,
      theme: config.theme,
      themeConfig: config.themeConfig,
      width: config.width || '100%',
      height: config.height || 'auto'
    })

    instance.render()
  }

  function adaptData(
    rows: Record<string, unknown>[],
    config: InfographicBlockConfig
  ) {
    return {
      title: config.title,
      desc: config.description,
      items: rows.map((row, i) => ({
        label: String(row[config.labelColumn] || ''),
        value: row[config.valueColumn],
        desc: config.descColumn ? String(row[config.descColumn] || '') : undefined,
        icon: config.iconColumn ? String(row[config.iconColumn] || '') : undefined
      }))
    }
  }
</script>

<div bind:this={container} class="infographic-container"></div>
```

**类型定义 (types.ts):**
```typescript
export interface InfographicBlockConfig {
  // 模板选择
  template: string

  // 数据映射
  data: string              // SQL block 引用
  labelColumn: string       // 标签列
  valueColumn?: string      // 数值列
  descColumn?: string       // 描述列
  iconColumn?: string       // 图标列

  // 显示配置
  title?: string
  description?: string
  width?: number | string
  height?: number | string

  // 主题
  theme?: 'default' | 'tech' | 'nature' | 'warm'
  themeConfig?: {
    colorPrimary?: string
    colorBg?: string
    palette?: string[]
  }
}
```

#### 3.1.4 组件注册

**definition.ts:**
```typescript
import { defineComponent } from '@core/registry'
import { z } from 'zod'
import InfographicBlock from './InfographicBlock.svelte'

const InfographicSchema = z.object({
  template: z.string(),
  data: z.string(),
  labelColumn: z.string(),
  valueColumn: z.string().optional(),
  descColumn: z.string().optional(),
  iconColumn: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  width: z.union([z.number(), z.string()]).optional(),
  height: z.union([z.number(), z.string()]).optional(),
  theme: z.enum(['default', 'tech', 'nature', 'warm']).optional(),
  themeConfig: z.object({
    colorPrimary: z.string().optional(),
    colorBg: z.string().optional(),
    palette: z.array(z.string()).optional()
  }).optional()
})

export const infographicRegistration = defineComponent({
  metadata: {
    type: 'data-viz',
    language: 'infographic',
    displayName: 'Infographic',
    description: '信息图可视化组件',
    icon: '📊',
    category: 'visualization',
    tags: ['infographic', 'chart', 'data-viz'],
    props: [
      { name: 'template', type: 'string', required: true, description: '模板名称' },
      { name: 'data', type: 'query', required: true, description: 'SQL 数据源' },
      { name: 'labelColumn', type: 'string', required: true, description: '标签列' },
      { name: 'valueColumn', type: 'string', required: false, description: '数值列' }
    ]
  },
  schema: InfographicSchema,
  component: InfographicBlock
})
```

### Phase 2: AI 报告集成 (Week 2-3)

#### 3.2.1 扩展 ReportSectionType

**修改 src/core/ai/types.ts:**
```typescript
export type ReportSectionType =
  | 'kpi'
  | 'trend'
  | 'ranking'
  | 'comparison'
  | 'distribution'
  | 'table'
  | 'insight'
  // 新增信息图类型
  | 'infographic-list'      // 列表型信息图
  | 'infographic-hierarchy' // 层级型信息图
  | 'infographic-timeline'  // 时间线信息图
  | 'infographic-comparison' // 对比型信息图
  | 'infographic-flow'       // 流程型信息图

export interface InfographicSectionConfig {
  template: string
  labelColumn: string
  valueColumn?: string
  descColumn?: string
  theme?: string
}
```

#### 3.2.2 创建 Infographic Prompt

**新增 src/core/ai/prompts/infographic-generator.ts:**
```typescript
export function buildInfographicPrompt(
  section: ReportSection,
  dataSources: DataSourceInfo[]
): string {
  const dataSource = dataSources.find(d => d.name === section.dataSource)

  return `
你需要为以下数据生成一个信息图配置。

数据源: ${section.dataSource}
列: ${dataSource?.columns.map(c => `${c.name}(${c.type})`).join(', ')}
样本数据:
${JSON.stringify(dataSource?.sample?.slice(0, 3), null, 2)}

要求:
1. 选择最合适的信息图模板
2. 正确映射数据列
3. 设置合适的主题

可用模板类型:
- list-grid-badge-card: 网格卡片布局，适合展示 KPI 列表
- list-grid-circular-progress: 环形进度网格，适合展示完成率
- sequence-timeline-simple: 时间线，适合展示流程/事件
- hierarchy-tree-*: 树形结构，适合展示组织/分类
- compare-swot: SWOT 分析布局
- sequence-steps-badge-card: 步骤流程

返回 YAML 格式的信息图配置:

\`\`\`infographic
template: <选择的模板>
data: ${section.dataSource}
labelColumn: <标签列名>
valueColumn: <数值列名，可选>
descColumn: <描述列名，可选>
title: <信息图标题>
theme: default
\`\`\`
`
}
```

#### 3.2.3 更新 Section Generator

**修改 src/core/ai/prompts/section-generator.ts:**
```typescript
export function generateSectionMarkdown(
  section: ReportSection,
  index: number
): string {
  // ... 现有代码 ...

  // 新增信息图部分
  if (section.type.startsWith('infographic-')) {
    return generateInfographicSection(section, index)
  }

  // ... 现有代码 ...
}

function generateInfographicSection(
  section: ReportSection,
  index: number
): string {
  const config = section.config as InfographicSectionConfig
  const queryName = `section_${index}_data`

  return `
## ${section.title}

${section.description || ''}

\`\`\`sql name=${queryName}
SELECT * FROM \${${section.dataSource}}
${config.limit ? `LIMIT ${config.limit}` : ''}
\`\`\`

\`\`\`infographic
template: ${config.template}
data: ${queryName}
labelColumn: ${config.labelColumn}
${config.valueColumn ? `valueColumn: ${config.valueColumn}` : ''}
${config.descColumn ? `descColumn: ${config.descColumn}` : ''}
title: ${section.title}
theme: ${config.theme || 'default'}
\`\`\`

`
}
```

### Phase 3: 模板库扩展 (Week 3-4)

#### 3.3.1 创建模板分类索引

**新增 src/plugins/infographic/templates/index.ts:**
```typescript
/**
 * Infographic 模板分类索引
 * 用于 AI 选择合适的模板
 */
export const INFOGRAPHIC_TEMPLATES = {
  // KPI/指标展示
  kpi: [
    'list-grid-badge-card',
    'list-grid-circular-progress',
    'list-grid-compact-card',
    'list-row-circular-progress'
  ],

  // 排名/对比
  ranking: [
    'list-pyramid-rounded-rect-node',
    'chart-bar-plain-text',
    'chart-column-simple'
  ],

  // 流程/步骤
  flow: [
    'sequence-steps-badge-card',
    'sequence-timeline-simple',
    'sequence-snake-steps-compact-card',
    'sequence-roadmap-vertical-badge-card'
  ],

  // 层级/组织
  hierarchy: [
    'hierarchy-tree-tech-style-badge-card',
    'hierarchy-mindmap-simple',
    'compare-hierarchy-row-letter-card-compact-card'
  ],

  // 对比分析
  comparison: [
    'compare-swot',
    'compare-binary-horizontal-badge-card-vs',
    'quadrant-quarter-simple-card'
  ],

  // 占比/分布
  distribution: [
    'chart-pie-compact-card',
    'list-sector-simple',
    'sequence-pyramid-simple'
  ]
}

/**
 * 根据数据特征推荐模板
 */
export function recommendTemplate(
  dataCharacteristics: {
    rowCount: number
    hasNumericValue: boolean
    hasDescription: boolean
    hasIcon: boolean
    hasTimeColumn: boolean
    hasHierarchy: boolean
  }
): string[] {
  const recommendations: string[] = []

  // 少量数据 (1-4) 适合 KPI 卡片
  if (dataCharacteristics.rowCount <= 4) {
    recommendations.push(...INFOGRAPHIC_TEMPLATES.kpi)
  }

  // 中等数量 (5-10) 适合排名
  if (dataCharacteristics.rowCount >= 5 && dataCharacteristics.rowCount <= 10) {
    recommendations.push(...INFOGRAPHIC_TEMPLATES.ranking)
  }

  // 有时间列适合流程/时间线
  if (dataCharacteristics.hasTimeColumn) {
    recommendations.push(...INFOGRAPHIC_TEMPLATES.flow)
  }

  // 有层级关系
  if (dataCharacteristics.hasHierarchy) {
    recommendations.push(...INFOGRAPHIC_TEMPLATES.hierarchy)
  }

  return recommendations.slice(0, 5)  // 返回前 5 个推荐
}
```

### Phase 4: 高级功能 (Week 4-5)

#### 3.4.1 SVG 导出功能

**新增 src/core/export/infographic-exporter.ts:**
```typescript
import type { Infographic } from '@antv/infographic'

export async function exportInfographicToSVG(
  instance: Infographic
): Promise<string> {
  return await instance.toDataURL({ type: 'svg' })
}

export async function exportInfographicToPNG(
  instance: Infographic,
  options?: { scale?: number }
): Promise<string> {
  return await instance.toDataURL({
    type: 'png',
    pixelRatio: options?.scale || 2
  })
}
```

#### 3.4.2 交互式编辑器

**新增 src/components/InfographicEditor.svelte:**
```svelte
<script lang="ts">
  import { Infographic } from '@antv/infographic'

  interface Props {
    initialConfig: object
    onSave: (config: object) => void
  }

  let { initialConfig, onSave }: Props = $props()
  let instance: Infographic | null = null

  function enableEditing() {
    if (instance) {
      instance.update({ editable: true })
    }
  }

  function handleSave() {
    if (instance) {
      const options = instance.getOptions()
      onSave(options)
    }
  }
</script>

<div class="infographic-editor">
  <div class="toolbar">
    <button onclick={enableEditing}>编辑</button>
    <button onclick={handleSave}>保存</button>
  </div>
  <div class="canvas" bind:this={container}></div>
</div>
```

---

## 四、需要调整的现有代码

### 4.1 组件注册系统

**修改 src/bootstrap/init-plugins.ts:**
```typescript
// 添加 infographic 组件注册
import { infographicRegistration } from '@plugins/infographic'

export function registerPlugins(): void {
  // ... 现有注册 ...

  // 注册 Infographic 组件
  componentRegistry.register(infographicRegistration)
}
```

### 4.2 Markdown 解析器

**修改 src/core/markdown/parser.ts:**
确保 `infographic` code block 被正确识别和处理。

### 4.3 ReportRenderer

**修改 src/components/ReportRenderer.svelte:**
添加对 infographic block 的渲染支持。

### 4.4 AI Report Planner

**修改 src/core/ai/report-planner.ts:**
在规划阶段支持选择 infographic section type。

---

## 五、Roadmap 时间线

```
Week 1 ─────────────────────────────────────────────────────────
│
├─ Day 1-2: 安装 @antv/infographic，创建基础插件结构
├─ Day 3-4: 实现 InfographicBlock.svelte 和数据适配层
└─ Day 5:   注册组件，手动测试基本渲染

Week 2 ─────────────────────────────────────────────────────────
│
├─ Day 1-2: 集成到 ReportRenderer
├─ Day 3-4: 扩展 AI ReportSectionType
└─ Day 5:   创建 Infographic Prompt

Week 3 ─────────────────────────────────────────────────────────
│
├─ Day 1-2: 模板分类索引和推荐系统
├─ Day 3-4: AI 自动选择模板
└─ Day 5:   端到端测试 AI → Infographic 流程

Week 4 ─────────────────────────────────────────────────────────
│
├─ Day 1-2: SVG/PNG 导出功能
├─ Day 3-4: 主题系统适配
└─ Day 5:   文档和示例

Week 5 (Optional) ───────────────────────────────────────────────
│
├─ Day 1-3: 交互式编辑器
└─ Day 4-5: 性能优化和 Bug 修复
```

---

## 六、风险评估

| 风险 | 可能性 | 影响 | 缓解措施 |
|------|--------|------|----------|
| @antv/infographic 与 Svelte 冲突 | 中 | 高 | 使用独立容器隔离渲染 |
| 包体积过大影响加载 | 中 | 中 | 动态导入 (lazy loading) |
| AI 生成配置格式错误 | 高 | 中 | 强类型校验 + 降级处理 |
| 模板选择不当 | 中 | 低 | 提供模板预览和手动选择 |

---

## 七、成功指标

1. **功能完整性**: 支持 20+ 常用信息图模板
2. **AI 生成准确率**: >80% 首次生成可用
3. **性能**: 首次渲染 < 500ms
4. **用户体验**: 支持预览、编辑、导出

---

## 八、后续扩展

1. **自定义模板**: 允许用户创建和保存模板
2. **模板市场**: 社区贡献模板
3. **动画效果**: 添加入场动画
4. **响应式**: 支持不同屏幕尺寸
5. **协作编辑**: 多人实时编辑信息图

---

*文档版本: v1.1*
*创建日期: 2025-01-04*
*更新日期: 2026-01-04*
*更新内容: 修正为 Svelte + SVG 为主的架构描述*
*作者: Claude Code Expert*
