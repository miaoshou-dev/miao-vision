# Plugin Architecture

> Miao Vision 采用 Evidence.dev 风格的插件架构，实现核心引擎与可插拔组件的分离。

## 架构概览

```
src/
├── core/           # 核心引擎（不可插拔）
│   ├── database/   # DuckDB-WASM, Mosaic, 数据加载
│   ├── engine/     # Block 渲染, 响应式执行
│   ├── markdown/   # 解析器, SQL 执行器
│   ├── registry/   # 组件注册系统
│   └── shared/     # DI 容器, 纯函数, 共享服务
│
├── plugins/        # 可插拔组件
│   ├── inputs/     # 输入组件 (Dropdown, ButtonGroup)
│   ├── data-display/ # 数据展示 (BigValue, DataTable, Value)
│   ├── viz/        # 图表工具 (Chart utilities)
│   └── ui/         # UI 组件 (Alert)
│
├── app/            # 应用层
│   └── stores/     # Svelte stores (report, database, chart, inputs)
│
└── components/     # UI 组件
```

## 路径别名

在 `tsconfig.json` 和 `vite.config.ts` 中配置：

| 别名 | 路径 | 用途 |
|------|------|------|
| `@/` | `src/` | 通用导入 |
| `@core/` | `src/core/` | 核心引擎 |
| `@plugins/` | `src/plugins/` | 插件系统 |
| `@app/` | `src/app/` | 应用层 |

### 使用示例

```typescript
// 从核心导入
import { componentRegistry, parseMarkdown } from '@core'
import { duckDBManager } from '@core/database'

// 从插件导入
import { Dropdown, useInput } from '@plugins/inputs'
import { BigValue, DataTable } from '@plugins/data-display'
import { chartService } from '@plugins/viz'

// 从应用层导入
import { reportStore, databaseStore } from '@app/stores'
```

## 核心模块 (core/)

核心模块是框架的基础，不应被外部替换。

### database/
DuckDB-WASM 封装和 Mosaic 集成。

```typescript
// 导出
export { duckDBManager, DuckDBManager } from './duckdb'
export { loadDataIntoTable, dropTable } from './table-loader'
export { initializeMosaic, coordinator } from './mosaic'
export { interpolateSQL } from './template'
```

### engine/
Block 渲染和响应式执行引擎。

```typescript
// 导出
export { blockRenderer } from './block-renderer'
export { findAffectedBlocks, reExecuteAffectedBlocks } from './reactive-executor'
export { analyzeDependencies, topologicalSort } from './dependency-graph'
```

### shared/format/
全局格式化系统，提供数字、货币、百分比、日期等格式化功能。

```typescript
import { fmt, formatters } from '@core/shared/format'

// 基本使用
fmt(1234567.89, 'currency')    // ¥1,234,567.89
fmt(0.1234, 'percent')         // 12.34%
fmt(1234567, 'num0')           // 1,234,568
fmt(1234567, 'compact')        // 123.5万
fmt(new Date(), 'date')        // 2024-01-15
fmt(new Date(), 'relative')    // 3天前

// 支持的格式类型
// number, num0, num1, num2, num3 - 数字格式
// currency, usd, eur - 货币格式
// percent, pct0, pct1 - 百分比格式
// date, datetime, time, shortdate, longdate, relative - 日期格式
// compact - 紧凑格式 (1.2K, 3.4M, 123万)
// bytes - 字节格式 (1.5 KB, 2.3 MB)
```

### registry/
组件注册系统 - 插件架构的核心。

```typescript
// 导出
export { ComponentRegistry, componentRegistry } from './component-registry'
export { defineComponent, createRegistration } from './component-definition'
export { configParser } from './config-parser'
export { dataResolver } from './data-resolver'
```

### markdown/
Markdown 解析和 SQL 执行。

```typescript
// 导出
export { parseMarkdown, extractSQLBlocks } from './parser'
export { executeReport, executeSQLBlock } from './sql-executor'
export { processConditionals } from './conditional-processor'
export { processLoops } from './loop-processor'
```

## 模板语法 (Templating)

Miao Vision 支持类似 Svelte 的模板语法，用于在报告中实现动态内容。

### 变量插值

使用 `${expression}` 语法插入动态值：

```markdown
# Report for ${metadata.company}

Total sales: $${sales_data.total}
```

### 条件渲染 {#if}

根据条件显示不同内容：

```markdown
{#if ${revenue.value} > 1000000}
## Great Performance! 🎉
Revenue exceeded $1M this quarter.
{:else}
## Room for Improvement
Consider strategies to boost revenue.
{/if}
```

**支持的操作符**: `>`, `<`, `>=`, `<=`, `===`, `!==`, `&&`, `||`

### 循环渲染 {#each}

遍历查询结果生成重复内容：

```markdown
## Top Products

{#each top_products as product}
- **${product.name}**: $${product.revenue} (${product.units} units)
{/each}
```

**带索引的循环**:

```markdown
{#each customers as customer, index}
${index + 1}. ${customer.name} - ${customer.email}
{/each}
```

**空数据处理**:

```markdown
{#each orders as order}
- Order #${order.id}: $${order.total}
{:else}
No orders found for this period.
{/each}
```

### 完整示例

```markdown
# Sales Report for ${inputs.region}

```sql name=summary
SELECT
  SUM(revenue) as total_revenue,
  COUNT(*) as order_count
FROM sales
WHERE region = '${inputs.region}'
```

{#if ${summary.total_revenue} > 100000}
## 🎉 Target Achieved!
{:else}
## 📊 Progress Report
{/if}

Total Revenue: $${summary.total_revenue}

## Top Sellers

```sql name=top_sellers
SELECT product_name, revenue
FROM sales
WHERE region = '${inputs.region}'
ORDER BY revenue DESC
LIMIT 5
```

{#each top_sellers as item, i}
${i + 1}. **${item.product_name}**: $${item.revenue}
{/each}
```

## 插件系统 (plugins/)

### 插件结构

每个插件遵循统一的目录结构：

```
plugins/
└── inputs/
    ├── index.ts           # 插件入口，导出和注册
    ├── dropdown/
    │   ├── index.ts       # 组件入口
    │   ├── Dropdown.svelte # Svelte 组件
    │   ├── definition.ts  # 组件定义
    │   ├── metadata.ts    # 元数据
    │   └── types.ts       # 类型定义
    ├── buttongroup/
    │   └── ...
    └── use-input.svelte.ts # 共享 composable
```

### 创建新插件

#### 1. 定义元数据

```typescript
// plugins/my-plugin/metadata.ts
import { createMetadata } from '@core/registry'

export const MyComponentMetadata = createMetadata({
  type: 'input',           // 组件类型
  language: 'mycomponent', // Markdown 代码块语言标识
  displayName: 'My Component',
  description: '组件描述',
  icon: '🔧',
  category: 'custom',
  tags: ['input', 'custom'],
  props: [
    {
      name: 'value',
      type: 'string',
      required: true,
      description: '当前值'
    },
    {
      name: 'options',
      type: 'array',
      required: false,
      description: '选项列表'
    }
  ],
  examples: [
    `\`\`\`mycomponent
value: default
options: a, b, c
\`\`\``
  ]
})
```

#### 2. 定义组件

```typescript
// plugins/my-plugin/definition.ts
import { defineComponent } from '@core/registry'
import { MyComponentSchema } from '@core/registry/schemas'
import MyComponent from './MyComponent.svelte'
import { MyComponentMetadata } from './metadata'

export const myComponentRegistration = defineComponent({
  metadata: MyComponentMetadata,
  schema: MyComponentSchema,
  component: MyComponent,

  // 解析配置
  parseConfig: (block, context) => {
    return configParser.parse(block.content, MyComponentSchema)
  },

  // 解析数据
  resolveData: async (config, context) => {
    return {
      config,
      options: config.options || []
    }
  }
})
```

#### 3. 创建 Svelte 组件

```svelte
<!-- plugins/my-plugin/MyComponent.svelte -->
<script lang="ts">
  import type { MyComponentData } from './types'
  import type { InputStore } from '@app/stores'
  import { useStringInput } from '../use-input.svelte'

  interface Props {
    data: MyComponentData
    inputStore: InputStore
  }

  let { data, inputStore }: Props = $props()

  const input = useStringInput(
    inputStore,
    data.config.name,
    data.config.defaultValue
  )
</script>

<div class="my-component">
  <select value={input.value} onchange={e => input.setValue(e.target.value)}>
    {#each data.options as option}
      <option value={option.value}>{option.label}</option>
    {/each}
  </select>
</div>
```

#### 4. 注册插件

```typescript
// plugins/my-plugin/index.ts
import type { ComponentRegistry } from '@core/registry'
import { myComponentRegistration } from './definition'

export { myComponentRegistration }
export { default as MyComponent } from './MyComponent.svelte'

export function registerMyPlugin(registry: ComponentRegistry): void {
  registry.register(myComponentRegistration)
}
```

#### 5. 添加到主插件系统

```typescript
// plugins/index.ts
import { registerMyPlugin } from './my-plugin'

export function registerAllPlugins(registry: ComponentRegistry): void {
  // ... 其他插件
  registerMyPlugin(registry)
}
```

## 插件注册流程

### 应用启动时

```typescript
// main.ts
import { componentRegistry } from '@core/registry'
import { initializePlugins } from '@core/registry/init-plugins'

// 初始化插件系统
initializePlugins()

// 现在可以使用所有注册的组件
console.log('Registered:', componentRegistry.getAllLanguages())
```

### initializePlugins 流程

```typescript
// core/registry/init-plugins.ts
export function initializePlugins(): void {
  // 1. 注册图表组件（使用 vgplot 渲染）
  componentRegistry.register({
    metadata: ChartMetadata,
    parser: createChartParser(),
    renderer: createChartRenderer('chart')
  })

  // 2. 注册其他所有插件
  registerAllPlugins(componentRegistry)
}
```

## 内置插件（43 个组件）

### inputs/ - 输入组件（8 个）

| 组件 | 语言标识 | 描述 |
|------|----------|------|
| Dropdown | `dropdown` | 下拉选择器 |
| ButtonGroup | `buttongroup` | 按钮组选择 |
| TextInput | `textinput` | 文本搜索框 |
| Slider | `slider` | 数值滑块 |
| DateRange | `daterange` | 日期范围选择 |
| Checkbox | `checkbox` | 复选框 |
| DimensionGrid | `dimensiongrid` | 维度网格选择器 |

```markdown
\`\`\`dropdown
name: region
data: regions_query
value: region_code
label: region_name
title: 选择区域
\`\`\`

\`\`\`textinput
name: search_term
title: 搜索产品
placeholder: 输入关键词...
debounce: 300
\`\`\`

\`\`\`slider
name: price_max
title: 最高价格
min: 0
max: 1000
step: 10
defaultValue: 500
format: currency
\`\`\`

\`\`\`daterange
name: date_filter
title: 选择日期范围
presets: true
\`\`\`
```

### data-display/ - 数据展示（22 个）

| 组件 | 语言标识 | 描述 |
|------|----------|------|
| BigValue | `bigvalue` | 大数值卡片 |
| DataTable | `datatable` | 数据表格（搜索/排序/筛选/导出） |
| Value | `value` | 内联数值 |
| Sparkline | `sparkline` | 迷你趋势图 |
| BarChart | `bar-chart` | 柱状图 |
| PieChart | `pie-chart` | 饼图/环形图 |
| Histogram | `histogram` | 直方图 |
| Delta | `delta` | 变化指示器 |
| Sankey | `sankey` | 桑基图（流向分析） |
| Waterfall | `waterfall` | 瀑布图 |
| Progress | `progress` | 进度条 |
| BulletChart | `bullet-chart` | 子弹图 |
| BoxPlot | `boxplot` | 箱线图 |
| CalendarHeatmap | `calendar-heatmap` | 日历热力图 |
| Gauge | `gauge` | 仪表盘 |
| KPIGrid | `kpigrid` | KPI 网格 |
| Heatmap | `heatmap` | 热力图 |
| Radar | `radar` | 雷达图 |
| Funnel | `funnel` | 漏斗图 |
| Treemap | `treemap` | 树状图 |

```markdown
\`\`\`bigvalue
query: total_revenue
value: revenue
title: 总收入
format: currency
comparison: last_month_revenue
comparisonLabel: 环比
\`\`\`

\`\`\`sparkline
query: daily_sales
value: revenue
type: line
color: #10B981
height: 40
\`\`\`
```

### viz/ - 图表（7 个 vgplot）

| 类型 | 语言标识 | 描述 |
|------|----------|------|
| Chart | `chart` | 通用图表 |
| Line | `line` | 折线图 |
| Bar | `bar` | 柱状图 |
| Area | `area` | 面积图 |
| Scatter | `scatter` | 散点图 |
| Histogram | `histogram` | 直方图 |
| Pie | `pie` | 饼图 |

```markdown
\`\`\`line
data: sales_data
x: month
y: revenue
title: 月度收入趋势
\`\`\`
```

### ui/ - UI 组件（6 个）

| 组件 | 语言标识 | 描述 |
|------|----------|------|
| Alert | `alert` | 提示框 |
| Tabs | `tabs` | 标签页 |
| Accordion | `accordion` | 手风琴折叠 |
| Tooltip | `tooltip` | 工具提示 |
| Details | `details` | 详情折叠 |
| Modal | `modal` | 模态对话框 |

### layout/ - 布局组件（1 个）

| 组件 | 语言标识 | 描述 |
|------|----------|------|
| Grid | `grid` | 网格布局 |

```markdown
\`\`\`alert
type: warning
title: 注意

这是一条警告信息。
\`\`\`
```

## 组件注册表 API

### ComponentRegistry

```typescript
interface ComponentRegistry {
  // 注册组件
  register<T>(component: RegisteredComponent<T>): void

  // 查询组件
  get(language: string): RegisteredComponent<any> | undefined
  has(language: string): boolean
  getAllLanguages(): string[]
  getAllMetadata(): ComponentMetadata[]

  // 按分类查询
  getByCategory(category: ComponentCategory): ComponentMetadata[]
  getByType(type: string): ComponentMetadata[]

  // 渲染组件
  render(language: string, container: HTMLElement, props: any, context: RenderContext): Promise<any>
}
```

### 使用示例

```typescript
import { componentRegistry } from '@core/registry'

// 检查组件是否存在
if (componentRegistry.has('dropdown')) {
  const component = componentRegistry.get('dropdown')
  console.log(component.metadata.displayName)
}

// 获取所有输入组件
const inputs = componentRegistry.getByCategory('input')

// 渲染组件
await componentRegistry.render('dropdown', container, props, context)
```

## 最佳实践

### 1. 保持插件独立

每个插件应该是自包含的，避免跨插件依赖。

```typescript
// ✅ 好：从 core 导入
import { configParser } from '@core/registry'

// ❌ 避免：从其他插件导入
import { something } from '@plugins/other-plugin'
```

### 2. 使用共享 composables

输入组件应使用 `use-input.svelte.ts` 来管理状态。

```typescript
import { useStringInput } from '../use-input.svelte'

const input = useStringInput(inputStore, name, defaultValue)
```

### 3. 类型安全

为每个组件定义完整的类型。

```typescript
// types.ts
export interface MyComponentConfig {
  name: string
  value: string
  options?: string[]
}

export interface MyComponentData {
  config: MyComponentConfig
  resolvedOptions: SelectOption[]
}
```

### 4. 元数据完整

提供完整的元数据以支持文档生成和 IDE 支持。

```typescript
createMetadata({
  type: 'input',
  language: 'mycomponent',
  displayName: 'My Component',
  description: '详细描述',
  icon: '🔧',
  category: 'custom',
  tags: ['input', 'custom'],
  props: [...],
  examples: [...]
})
```

## 调试

### 查看已注册组件

```typescript
import { componentRegistry } from '@core/registry'

console.log('All components:', componentRegistry.getAllLanguages())
console.log('Input components:', componentRegistry.getByCategory('input'))
```

### 插件初始化日志

启动时会输出插件注册信息：

```
🚀 Main.ts: App starting...
🔌 Initializing Plugin System...
📝 Registering input plugins...
✅ Input plugins registered: 8 components
📊 Registering data display plugins...
✅ Data display plugins registered: 22 components
🎨 Registering UI plugins...
✅ UI plugins registered: 6 components
📐 Registering layout plugins...
✅ Layout plugins registered: 1 component
✅ All plugins registered!
📚 Plugin Documentation:
  Total components: 43
  By category: { chart: 7, input: 8, dataDisplay: 22, ui: 6, layout: 1 }
✨ Plugin system initialized successfully!
```
