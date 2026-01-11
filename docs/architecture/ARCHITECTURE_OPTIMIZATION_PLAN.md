# 技术架构优化方案

> 支撑产品双引擎战略：SQL Workspace + BI Report (含 AI Report & Infographic)

## 一、产品架构全景

### 1.1 双引擎产品定位

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Miaoshou Vision 产品架构                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────────────────────────┐    ┌─────────────────────────────┐        │
│   │      SQL Workspace          │    │         BI Report           │        │
│   │      (交互式分析)            │    │    (数据驱动文档)            │        │
│   ├─────────────────────────────┤    ├─────────────────────────────┤        │
│   │ • Monaco SQL Editor         │    │ • 手写 Markdown Report      │        │
│   │ • 即时查询执行               │    │ • AI 自动生成 Report        │        │
│   │ • 结果可视化                 │    │ • Infographic 信息图 ← NEW  │        │
│   │ • 查询历史 & Snippets       │    │ • 模板变量 & 响应式          │        │
│   └──────────────┬──────────────┘    └──────────────┬──────────────┘        │
│                  │                                   │                       │
│                  └───────────────┬───────────────────┘                       │
│                                  ▼                                           │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                        Shared Data Layer                             │   │
│   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │   │
│   │  │  DuckDB     │  │  Mosaic     │  │  Data       │                  │   │
│   │  │  WASM       │  │ Coordinator │  │  Sources    │                  │   │
│   │  └─────────────┘  └─────────────┘  └─────────────┘                  │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 当前架构分析

**现有优势:**
- ✅ 27 种图表组件全部使用 **纯 Svelte + SVG** 渲染
- ✅ 统一的 ComponentRegistry 插件架构
- ✅ 清晰的分层依赖 (Bootstrap → Plugins → Core → Types)

**可优化点:**

| 问题 | 影响范围 | 严重程度 | 描述 |
|------|---------|---------|------|
| **P1: 缺乏统一可视化抽象** | BI Report | 中 | 组件各自实现渲染，缺乏统一 Provider 接口 |
| **P2: 数据流不统一** | 全局 | 中 | SQL Workspace 和 Report 的数据处理逻辑重复 |
| **P3: AI 生成耦合度高** | AI Report | 中 | Prompt → Markdown 紧耦合，难以扩展新图表类型 |
| **P4: 信息图能力缺失** | BI Report | 高 | 无 Infographic 类型支持 |
| **P5: 缺乏统一主题系统** | UI | 低 | Chart/Infographic/UI 组件主题不统一 |

---

## 二、目标架构设计

### 2.1 核心设计原则

1. **统一数据层** - 一份数据，多种消费方式
2. **可视化抽象** - 统一的 Visualization Provider 接口
3. **AI 可扩展** - 声明式图表描述，与渲染解耦
4. **渐进式集成** - 新增能力不破坏现有功能

### 2.2 目标架构图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Application Layer                                 │
│   ┌─────────────────────────────┐    ┌─────────────────────────────┐        │
│   │      SQL Workspace          │    │         BI Report           │        │
│   │  ┌─────────────────────┐    │    │  ┌─────────────────────┐    │        │
│   │  │ QueryEditor.svelte  │    │    │  │ ReportRenderer.svelte│   │        │
│   │  │ ResultsPanel.svelte │    │    │  │ BlockRenderer.ts     │   │        │
│   │  └─────────────────────┘    │    │  └─────────────────────┘    │        │
│   └──────────────┬──────────────┘    └──────────────┬──────────────┘        │
│                  │                                   │                       │
├──────────────────┴───────────────────────────────────┴───────────────────────┤
│                         Visualization Layer (NEW)                            │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                    VizProvider (统一可视化接口)                       │   │
│   │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐         │   │
│   │  │  Svelte   │  │Infographic│  │  Custom   │  │  Vgplot   │         │   │
│   │  │  Adapter  │  │  Adapter  │  │  Adapter  │  │  Adapter  │         │   │
│   │  │ (PRIMARY) │  │  (NEW)    │  │           │  │  (备用)   │         │   │
│   │  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘         │   │
│   │        │              │              │              │                │   │
│   │        ▼              ▼              ▼              ▼                │   │
│   │   ┌─────────┐   ┌───────────┐   ┌─────────┐   ┌─────────┐           │   │
│   │   │ Svelte  │   │  @antv/   │   │ Custom  │   │@uwdata/ │           │   │
│   │   │ + SVG   │   │infographic│   │  Impl   │   │ vgplot  │           │   │
│   │   └─────────┘   └───────────┘   └─────────┘   └─────────┘           │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
├──────────────────────────────────────────────────────────────────────────────┤
│                            AI Layer (Enhanced)                               │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │   │
│   │  │ ReportPlan  │  │   VizSpec   │  │  Section    │                  │   │
│   │  │   ner       │──│  Generator  │──│  Renderer   │                  │   │
│   │  │             │  │  (NEW)      │  │             │                  │   │
│   │  └─────────────┘  └─────────────┘  └─────────────┘                  │   │
│   │         │                │                │                          │   │
│   │         ▼                ▼                ▼                          │   │
│   │   ReportPlan       VizSpec JSON      Markdown                        │   │
│   │   (sections)       (chart/info)      (final)                         │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
├──────────────────────────────────────────────────────────────────────────────┤
│                            Data Layer (Unified)                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                      DataService (统一数据服务)                       │   │
│   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │   │
│   │  │   Query     │  │   Result    │  │   Schema    │                  │   │
│   │  │  Executor   │  │  Transformer│  │  Analyzer   │                  │   │
│   │  └─────────────┘  └─────────────┘  └─────────────┘                  │   │
│   │         │                │                │                          │   │
│   │         ▼                ▼                ▼                          │   │
│   │   ┌─────────────────────────────────────────────────────────┐       │   │
│   │   │              DuckDB WASM + Mosaic Coordinator            │       │   │
│   │   └─────────────────────────────────────────────────────────┘       │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 三、核心模块设计

### 3.1 VizProvider - 统一可视化接口

**设计目标:** 将所有可视化引擎抽象为统一接口，使上层业务无需关心具体实现

```typescript
// src/core/viz/types.ts

/**
 * 可视化规格 - AI 和人工都可以生成此格式
 */
export interface VizSpec {
  /** 可视化类型 */
  type: VizType
  /** 数据配置 */
  data: VizDataConfig
  /** 编码配置 (x, y, color, size 等) */
  encoding: VizEncoding
  /** 样式配置 */
  style?: VizStyle
  /** 交互配置 */
  interaction?: VizInteraction
}

export type VizType =
  // 基础图表 (Svelte + SVG - 当前项目主要实现)
  | 'line' | 'bar' | 'area' | 'scatter' | 'pie' | 'histogram'
  // 统计图表 (Svelte + SVG)
  | 'boxplot' | 'bubble' | 'radar' | 'heatmap'
  // 流程/层级图表 (Svelte + SVG)
  | 'sankey' | 'treemap' | 'funnel' | 'waterfall'
  // 指标类 (Svelte + SVG)
  | 'gauge' | 'progress' | 'sparkline' | 'delta' | 'bigvalue'
  // 信息图 (Infographic - NEW)
  | 'infographic-list' | 'infographic-flow' | 'infographic-hierarchy'
  | 'infographic-comparison' | 'infographic-kpi'
  // 表格类
  | 'table' | 'pivot'

export interface VizDataConfig {
  /** 数据源名称 (SQL block name) */
  source: string
  /** 数据转换 (过滤、聚合等) */
  transform?: VizTransform[]
}

export interface VizEncoding {
  x?: FieldEncoding
  y?: FieldEncoding
  color?: FieldEncoding
  size?: FieldEncoding
  label?: FieldEncoding
  value?: FieldEncoding
  // Infographic 特有
  icon?: FieldEncoding
  description?: FieldEncoding
}

export interface FieldEncoding {
  field: string
  type?: 'quantitative' | 'nominal' | 'temporal' | 'ordinal'
  aggregate?: 'sum' | 'avg' | 'count' | 'min' | 'max'
  format?: string
}
```

**VizProvider 实现:**

```typescript
// src/core/viz/viz-provider.ts

export interface IVizProvider {
  /** 支持的类型 */
  readonly supportedTypes: VizType[]

  /** 是否支持该类型 */
  supports(type: VizType): boolean

  /** 渲染可视化 */
  render(
    container: HTMLElement,
    spec: VizSpec,
    data: Record<string, unknown>[]
  ): Promise<VizInstance>

  /** 更新数据 */
  update(instance: VizInstance, data: Record<string, unknown>[]): Promise<void>

  /** 销毁实例 */
  destroy(instance: VizInstance): void
}

export interface VizInstance {
  id: string
  type: VizType
  provider: string
  element: HTMLElement | SVGElement
}
```

**Provider 实现示例:**

**1. SvelteProvider (主要 Provider - 现有 27 种图表):**

```typescript
// src/core/viz/providers/svelte-provider.ts

import type { IVizProvider, VizSpec, VizInstance } from '../types'
import { componentRegistry } from '@core/registry'

/**
 * SvelteProvider - 复用现有的 27 种 Svelte + SVG 图表组件
 */
export class SvelteProvider implements IVizProvider {
  readonly supportedTypes: VizType[] = [
    // 基础图表
    'line', 'bar', 'area', 'scatter', 'pie', 'histogram',
    // 统计图表
    'boxplot', 'bubble', 'radar', 'heatmap',
    // 流程/层级
    'sankey', 'treemap', 'funnel', 'waterfall',
    // 指标类
    'gauge', 'progress', 'sparkline', 'delta', 'bigvalue',
    // 表格
    'table'
  ]

  supports(type: VizType): boolean {
    return this.supportedTypes.includes(type)
  }

  async render(
    container: HTMLElement,
    spec: VizSpec,
    data: Record<string, unknown>[]
  ): Promise<VizInstance> {
    const id = `svelte-${Date.now()}`

    // 获取现有的 Svelte 组件定义
    const componentDef = componentRegistry.get(this.mapTypeToLanguage(spec.type))
    if (!componentDef) {
      throw new Error(`Component not found: ${spec.type}`)
    }

    // 转换 VizSpec 为组件 config
    const config = this.transformToComponentConfig(spec, data)

    // 使用现有的 component-mount 逻辑
    const svelteInstance = componentDef.mount(container, config, data)

    return {
      id,
      type: spec.type,
      provider: 'svelte',
      element: container.firstElementChild as HTMLElement
    }
  }

  private mapTypeToLanguage(type: VizType): string {
    const mapping: Record<string, string> = {
      'bar': 'bar-chart',
      'line': 'line-chart',
      'pie': 'pie-chart',
      'table': 'datatable',
      'bigvalue': 'bigvalue',
      // ... 其他映射
    }
    return mapping[type] || type
  }
}
```

**2. InfographicProvider (新增 - 信息图):**

```typescript
// src/core/viz/providers/infographic-provider.ts

import { Infographic } from '@antv/infographic'
import type { IVizProvider, VizSpec, VizInstance } from '../types'

export class InfographicProvider implements IVizProvider {
  readonly supportedTypes: VizType[] = [
    'infographic-list',
    'infographic-flow',
    'infographic-hierarchy',
    'infographic-comparison',
    'infographic-kpi'
  ]

  private instances = new Map<string, Infographic>()

  supports(type: VizType): boolean {
    return this.supportedTypes.includes(type)
  }

  async render(
    container: HTMLElement,
    spec: VizSpec,
    data: Record<string, unknown>[]
  ): Promise<VizInstance> {
    const id = `infographic-${Date.now()}`

    // 转换为 Infographic 数据格式
    const infographicData = this.transformData(data, spec)

    // 选择模板
    const template = this.selectTemplate(spec.type, data.length)

    // 创建实例
    const instance = new Infographic({
      container,
      template,
      data: infographicData,
      theme: spec.style?.theme || 'default',
      themeConfig: this.buildThemeConfig(spec.style)
    })

    instance.render()
    this.instances.set(id, instance)

    return {
      id,
      type: spec.type,
      provider: 'infographic',
      element: container.querySelector('svg')!
    }
  }

  private transformData(
    rows: Record<string, unknown>[],
    spec: VizSpec
  ) {
    const { encoding } = spec
    return {
      title: spec.style?.title || '',
      desc: spec.style?.description || '',
      items: rows.map(row => ({
        label: encoding.label ? String(row[encoding.label.field]) : '',
        value: encoding.value ? row[encoding.value.field] : undefined,
        desc: encoding.description ? String(row[encoding.description.field]) : undefined,
        icon: encoding.icon ? String(row[encoding.icon.field]) : undefined
      }))
    }
  }

  private selectTemplate(type: VizType, dataCount: number): string {
    const templateMap: Record<string, string[]> = {
      'infographic-list': ['list-grid-badge-card', 'list-row-simple'],
      'infographic-flow': ['sequence-timeline-simple', 'sequence-steps-badge-card'],
      'infographic-hierarchy': ['hierarchy-tree-tech-style-badge-card'],
      'infographic-comparison': ['compare-swot', 'compare-binary-horizontal-badge-card-vs'],
      'infographic-kpi': ['list-grid-circular-progress', 'list-row-circular-progress']
    }

    const templates = templateMap[type] || ['list-grid-badge-card']
    // 根据数据量选择合适模板
    return dataCount <= 4 ? templates[0] : templates[templates.length - 1]
  }
}
```

### 3.2 VizRegistry - 可视化注册表

```typescript
// src/core/viz/viz-registry.ts

class VizRegistry {
  private providers = new Map<string, IVizProvider>()

  register(name: string, provider: IVizProvider): void {
    this.providers.set(name, provider)
  }

  getProviderForType(type: VizType): IVizProvider | null {
    for (const provider of this.providers.values()) {
      if (provider.supports(type)) {
        return provider
      }
    }
    return null
  }

  async render(
    container: HTMLElement,
    spec: VizSpec,
    data: Record<string, unknown>[]
  ): Promise<VizInstance> {
    const provider = this.getProviderForType(spec.type)
    if (!provider) {
      throw new Error(`No provider found for visualization type: ${spec.type}`)
    }
    return provider.render(container, spec, data)
  }
}

export const vizRegistry = new VizRegistry()
```

### 3.3 AI VizSpec Generator

**设计目标:** AI 生成与渲染解耦，AI 只需要生成 VizSpec JSON

```typescript
// src/core/ai/viz-spec-generator.ts

export class VizSpecGenerator {
  constructor(private provider: LLMProvider) {}

  /**
   * 根据数据和用户意图生成 VizSpec
   */
  async generate(
    dataSource: DataSourceInfo,
    intent: VizIntent
  ): Promise<VizSpec> {
    const prompt = this.buildPrompt(dataSource, intent)

    const response = await this.provider.complete([
      { role: 'system', content: VIZ_SPEC_SYSTEM_PROMPT },
      { role: 'user', content: prompt }
    ], {
      temperature: 0.3,  // 低温度保证格式稳定
      maxTokens: 1024
    })

    return this.parseResponse(response.content)
  }

  private buildPrompt(dataSource: DataSourceInfo, intent: VizIntent): string {
    return `
基于以下数据源和用户意图，生成可视化规格 (VizSpec JSON)。

## 数据源
表名: ${dataSource.name}
列: ${dataSource.columns.map(c => `${c.name} (${c.type})`).join(', ')}
行数: ${dataSource.rowCount}
样本:
${JSON.stringify(dataSource.sample?.slice(0, 3), null, 2)}

## 用户意图
类型: ${intent.type}
描述: ${intent.description}
${intent.preferences ? `偏好: ${JSON.stringify(intent.preferences)}` : ''}

## 可用图表类型
- 基础图表: line, bar, area, scatter, pie, histogram
- 信息图: infographic-list, infographic-flow, infographic-hierarchy, infographic-comparison, infographic-kpi
- 表格: table

请返回符合 VizSpec 格式的 JSON:
\`\`\`json
{
  "type": "...",
  "data": { "source": "${dataSource.name}" },
  "encoding": { ... },
  "style": { ... }
}
\`\`\`
`
  }
}

export interface VizIntent {
  type: 'kpi' | 'trend' | 'ranking' | 'comparison' | 'distribution' | 'flow'
  description: string
  preferences?: {
    chartType?: string
    style?: string
  }
}
```

### 3.4 Report Section 增强

```typescript
// src/core/ai/types.ts (增强)

export interface ReportSection {
  type: ReportSectionType
  title: string
  description?: string
  dataSource: string

  /**
   * 新增: 可视化规格
   * AI 生成此规格，渲染器根据规格选择 Provider
   */
  vizSpec?: VizSpec

  // 保留原有配置 (向后兼容)
  config?:
    | KPISectionConfig
    | TrendSectionConfig
    | InfographicSectionConfig  // NEW
    | ...
}

export interface InfographicSectionConfig {
  template: string
  labelColumn: string
  valueColumn?: string
  descColumn?: string
  iconColumn?: string
  theme?: string
}
```

---

## 四、文件结构调整

### 4.1 新增目录结构

```
src/
├── core/
│   ├── viz/                      # 【新增】统一可视化层
│   │   ├── index.ts
│   │   ├── types.ts              # VizSpec, VizInstance 类型
│   │   ├── viz-registry.ts       # 可视化注册表
│   │   ├── viz-renderer.ts       # 统一渲染器
│   │   └── providers/            # 各引擎适配器
│   │       ├── svelte-provider.ts      # 主要 - 27种图表
│   │       ├── infographic-provider.ts # 新增 - 信息图
│   │       └── vgplot-provider.ts      # 备用 - SQL Workspace
│   │
│   ├── ai/
│   │   ├── viz-spec-generator.ts # 【新增】VizSpec 生成器
│   │   ├── prompts/
│   │   │   ├── viz-spec.ts       # 【新增】VizSpec prompt
│   │   │   └── ...
│   │   └── ...
│   │
│   └── data/                     # 【重构】统一数据服务
│       ├── data-service.ts       # 统一数据服务入口
│       ├── query-executor.ts     # 查询执行器
│       ├── result-transformer.ts # 结果转换器
│       └── schema-analyzer.ts    # Schema 分析
│
├── plugins/
│   ├── infographic/              # 【新增】Infographic 插件
│   │   ├── index.ts
│   │   ├── InfographicBlock.svelte
│   │   ├── definition.ts
│   │   ├── templates/            # 模板索引
│   │   │   ├── index.ts
│   │   │   ├── list-templates.ts
│   │   │   ├── flow-templates.ts
│   │   │   └── hierarchy-templates.ts
│   │   └── theme-adapter.ts
│   └── ...
│
└── ...
```

### 4.2 现有文件修改

| 文件 | 修改类型 | 说明 |
|------|---------|------|
| `src/core/engine/block-renderer.ts` | 重构 | 使用 VizRegistry 替代直接渲染 |
| `src/core/ai/report-generator.ts` | 增强 | 集成 VizSpecGenerator |
| `src/core/ai/types.ts` | 扩展 | 添加 Infographic 相关类型 |
| `src/bootstrap/init-plugins.ts` | 新增 | 注册 Infographic Provider |
| `src/components/ReportRenderer.svelte` | 微调 | 支持新的 block 类型 |

---

## 五、数据流优化

### 5.1 当前数据流

```
SQL Workspace:                    BI Report:
QueryEditor                       ReportRenderer
    │                                 │
    ▼                                 ▼
coordinator.query()               parseMarkdown()
    │                                 │
    ▼                                 ▼
Arrow Table                       SQL Block 执行
    │                                 │
    ▼                                 ▼
ResultsTable                      coordinator.query()
    │                                 │
    ▼                                 ▼
Svelte + SVG Chart                Arrow Table
                                      │
                                      ▼
                                  BlockRenderer
                                      │
                                      ▼
                                  Svelte + SVG 组件
                                  (27 种图表类型)
```

**现有优势:**
- ✅ 所有 BI Report 图表使用统一的 Svelte + SVG 组件
- ✅ ComponentRegistry 统一管理组件注册

### 5.2 优化后数据流 (统一)

```
┌─────────────────────────────────────────────────────────────────┐
│                         DataService                              │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    QueryExecutor                           │  │
│  │  • 统一的查询执行入口                                        │  │
│  │  • 缓存管理                                                 │  │
│  │  • 错误处理                                                 │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                   │
│                              ▼                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                  ResultTransformer                         │  │
│  │  • Arrow → JSON                                            │  │
│  │  • 聚合/过滤                                                │  │
│  │  • 格式化                                                   │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                   │
│              ┌───────────────┼───────────────┐                  │
│              ▼               ▼               ▼                  │
│        SQL Workspace    BI Report      AI Report                │
│              │               │               │                  │
│              ▼               ▼               ▼                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                     VizRegistry                            │  │
│  │  • 根据 VizSpec 选择 Provider                               │  │
│  │  • 统一渲染接口                                              │  │
│  └───────────────────────────────────────────────────────────┘  │
│              │               │               │                  │
│              ▼               ▼               ▼                  │
│        Svelte+SVG       Infographic      (Future)              │
│        (27 types)         (NEW)          Extensions            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 六、AI Report 增强流程

### 6.1 当前流程

```
User Prompt
    │
    ▼
ReportPlanner.plan()
    │
    ▼
ReportPlan { sections: [...] }
    │
    ▼
ReportGenerator.generateStream()
    │
    ▼
generateSectionMarkdown(section)  ← 硬编码各类型模板
    │
    ▼
Markdown String
```

### 6.2 优化后流程

```
User Prompt
    │
    ▼
ReportPlanner.plan()
    │
    ▼
ReportPlan { sections: [...] }
    │
    ├─────────────────────────────────────┐
    ▼                                     ▼
For each section:              VizSpecGenerator.generate()
    │                                     │
    │                                     ▼
    │                               VizSpec JSON
    │                                     │
    ├─────────────────────────────────────┤
    ▼
SectionRenderer.render()
    │
    ├─→ 普通 Section → Markdown 模板
    │
    └─→ Viz Section → VizSpec → Markdown Code Block
                                    │
                                    ▼
                              ```vizspec
                              type: infographic-list
                              data: ...
                              encoding: ...
                              ```
    │
    ▼
Complete Markdown
    │
    ▼
ReportRenderer
    │
    ▼
VizRegistry.render(vizSpec)
    │
    ▼
SvelteProvider / InfographicProvider
```

---

## 七、实施路线图

### Phase 0: 基础设施

```
目标: 建立 VizProvider 抽象层

任务:
□ 创建 src/core/viz/ 目录结构
□ 定义 VizSpec, VizInstance, IVizProvider 类型
□ 实现 VizRegistry
□ 创建 SvelteProvider，包装现有 27 种 Svelte + SVG 组件
□ 单元测试
```

### Phase 1: Infographic 集成 (Week 2)

```
目标: Infographic 作为新的 VizProvider 可用

任务:
□ npm install @antv/infographic
□ 实现 InfographicProvider
□ 创建模板索引和推荐系统
□ 实现主题适配器
□ 创建 InfographicBlock.svelte
□ 注册到 ComponentRegistry
□ 手动测试 Markdown 渲染
```

### Phase 2: AI 集成 (Week 3)

```
目标: AI 能够生成 Infographic 类型的报告 Section

任务:
□ 实现 VizSpecGenerator
□ 扩展 ReportSectionType 支持 infographic-*
□ 更新 ReportPlanner 支持信息图规划
□ 更新 SectionGenerator 支持 VizSpec 输出
□ 端到端测试 AI → Infographic
```

### Phase 3: 用户体验 (Week 4)

```
目标: 完善用户交互体验

任务:
□ 模板预览和选择 UI
□ Infographic 编辑器集成
□ SVG/PNG 导出功能
□ 主题系统统一
□ 文档和示例
```

### Phase 4: 优化和扩展 (Week 5+)

```
目标: 性能优化和功能扩展

任务:
□ 懒加载 Infographic 库
□ 更多 D3 图表迁移到 Provider
□ 用户自定义模板
□ 性能监控和优化
```

---

## 八、风险与缓解

| 风险 | 可能性 | 影响 | 缓解措施 |
|------|--------|------|----------|
| VizProvider 抽象过度 | 中 | 中 | 从简单开始，渐进式抽象 |
| @antv/infographic 包体积大 | 高 | 中 | 动态导入，按需加载 |
| AI 生成 VizSpec 格式错误 | 高 | 中 | Zod 校验 + 降级处理 |
| 现有功能回归 | 中 | 高 | 充分测试，分阶段发布 |
| 团队学习成本 | 中 | 低 | 完善文档和示例 |

---

## 九、成功指标

| 指标 | 目标值 | 测量方式 |
|------|--------|----------|
| **功能覆盖** | 支持 20+ Infographic 模板 | 模板计数 |
| **AI 生成准确率** | VizSpec 有效率 > 90% | 错误日志分析 |
| **渲染性能** | 首次渲染 < 500ms | Performance API |
| **包体积增量** | < 100KB (gzipped, lazy) | Bundle 分析 |
| **代码质量** | 新增代码测试覆盖 > 80% | Coverage 报告 |

---

## 十、总结

本方案通过引入 **VizProvider 统一可视化层**，实现:

1. **可扩展性** - 新增可视化类型只需实现 Provider 接口
2. **解耦** - AI 生成与渲染分离，通过 VizSpec 协议通信
3. **复用** - SQL Workspace 和 BI Report 共享可视化能力
4. **渐进式** - 现有功能不受影响，新功能逐步加入

### 当前架构优势

项目已有的 **27 种 Svelte + SVG 图表组件** 是重要资产:
- ✅ 纯前端渲染，无第三方图表库依赖
- ✅ 统一的 ComponentRegistry 插件架构
- ✅ 类型安全的 Zod 配置验证
- ✅ 完整的 Markdown 语法支持

### 集成策略

```
当前:
  Svelte+SVG ─→ ComponentRegistry ─→ BlockRenderer ─→ App
  (27 种图表)

目标:
  Svelte+SVG ─┐
  (27 种图表) │
              ├─→ VizRegistry ─→ 统一 VizSpec API ─→ App
  Infographic ─┤                      │
  (197+ 模板)  │                      │
              │                      ▼
  Future... ──┘               AI VizSpec Generator
```

### 关键价值

1. **保护现有投资** - SvelteProvider 包装现有 27 种 Svelte + SVG 组件
2. **扩展 Infographic** - InfographicProvider 引入 197+ 信息图模板
3. **AI 友好** - VizSpec JSON 格式便于 AI 生成
4. **类型安全** - Zod 校验确保配置正确

---

*文档版本: v1.1*
*更新日期: 2026-01-04*
*更新内容: 调整为以 Svelte + SVG 为主的架构描述*
*作者: Claude Code Expert*
