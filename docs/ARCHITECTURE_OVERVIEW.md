# Architecture Overview

> 完整的架构说明，涵盖系统设计、技术选型和组织原则

## 目录

- [系统概述](#系统概述)
- [技术栈](#技术栈)
- [分层架构](#分层架构)
- [核心模块](#核心模块)
- [数据流](#数据流)
- [架构原则](#架构原则)
- [关键技术决策](#关键技术决策)

---

## 系统概述

**Miao Vision** 是一个完全运行在浏览器端的数据分析框架，无需任何后端服务器。它结合了：

- **DuckDB-WASM** - 浏览器端 SQL 分析引擎
- **Svelte 5 + SVG** - 27 种图表组件（纯前端渲染）
- **Markdown 报告系统** - Evidence.dev 风格的文档驱动分析
- **插件架构** - 43+ 可扩展组件

**设计目标：**
1. 🔒 **隐私优先** - 所有数据处理在本地完成
2. ⚡ **高性能** - 接近原生的 SQL 分析速度
3. 🎯 **零运维** - 纯静态部署，无服务器成本
4. 🔌 **可扩展** - 插件化架构，易于添加新组件

---

## 技术栈

### 核心技术

| 技术 | 版本 | 用途 |
|------|------|------|
| **Svelte 5** | ^5.15 | UI 框架（Runes 模式）+ 图表渲染 |
| **TypeScript** | ^5.7 | 类型系统，严格模式 |
| **DuckDB-WASM** | ^1.29 | 浏览器端 SQL 引擎 |
| **Monaco Editor** | ^0.52 | SQL/Markdown 编辑器 |
| **Unified/Remark** | ^11.0 | Markdown 解析管道 |
| **Vite** | ^6.0 | 构建工具 |

**图表渲染方式:**
- 27 种图表组件使用 **纯 Svelte + SVG** 渲染（无第三方图表库依赖）
- SQL Workspace 可选使用 Mosaic vgplot（用于大数据集和高级交互功能）

### 关键依赖

```json
{
  "dependencies": {
    "@duckdb/duckdb-wasm": "^1.29.0",
    "monaco-editor": "^0.52.2",
    "mosaic-core": "latest",
    "mosaic-sql": "latest",
    "mosaic-vgplot": "latest",
    "unified": "^11.0.5",
    "remark": "^15.0.1",
    "rehype": "^13.0.2"
  }
}
```

---

## 分层架构

项目采用 **清晰分层架构** + **依赖注入** 模式，确保各层职责明确，依赖关系单向。

### 架构图

```
┌─────────────────────────────────────────────────────────────────┐
│  Layer 4: Application Entry (main.ts, App.svelte)              │
│                              │                                   │
│                              ▼                                   │
│  Layer 3: Bootstrap (Composition Root)                          │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ bootstrap/  - Wires all dependencies                        ││
│  │   ├── init-services.ts  (DI adapters)                       ││
│  │   ├── init-charts.ts    (chart registration for workspace)  ││
│  │   └── init-plugins.ts   (43+ plugin components)             ││
│  └─────────────────────────────────────────────────────────────┘│
│                              │                                   │
│              ┌───────────────┼───────────────┐                  │
│              ▼               ▼               ▼                  │
│  Layer 2: Features                                               │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                │
│  │  plugins/   │ │    app/     │ │ components/ │                │
│  │  (43 comp)  │ │  (stores)   │ │  (UI)       │                │
│  └─────────────┘ └─────────────┘ └─────────────┘                │
│              │               │               │                   │
│              └───────────────┼───────────────┘                  │
│                              ▼                                   │
│  Layer 1: Core (Pure logic, interface-only dependencies)        │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ core/  - registry, database, markdown, engine, shared       ││
│  └─────────────────────────────────────────────────────────────┘│
│                              │                                   │
│                              ▼                                   │
│  Layer 0: Types / Contracts                                      │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ types/  - interfaces, type definitions                      ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### 依赖规则

| 层级 | 可以依赖 | 禁止依赖 |
|------|---------|---------|
| **main.ts** | bootstrap, app, components | - |
| **bootstrap/** | core, plugins, app | - |
| **plugins/** | core, types | app, components, 其他 plugins |
| **app/** | core, types | plugins, components |
| **components/** | core, app, plugins, types | - |
| **core/** | types **仅此** | plugins, app, components |
| **types/** | **无** | 任何东西 |

**验证依赖规则：**

```bash
# Core 层不应依赖 App 或 Plugins
$ grep -r "from '@app" src/core/
# 应无结果

$ grep -r "from '@plugins" src/core/
# 应无结果
```

---

## 核心模块

### 1. Bootstrap Layer (`src/bootstrap/`)

**作用：** 组合根（Composition Root），负责在应用启动时注册所有依赖。

**文件：**
- `index.ts` - 主入口，导出 `initializeApp()`
- `init-services.ts` - 注册 DI 服务适配器
- `init-charts.ts` - 注册 SQL Workspace 图表组件
- `init-plugins.ts` - 注册所有插件组件

**初始化流程：**

```typescript
// main.ts
import { initializeApp } from '@/bootstrap'

initializeApp()  // 一键初始化
  ├─ registerServices()      // Chart builder, input initializer
  ├─ registerVgplotCharts()  // chart, line, area, scatter, pie, bar
  └─ registerPlugins()       // 43 plugin components
```

**设计目的：**
- 保持 `core/` 层纯净，不依赖具体实现
- 集中管理所有依赖注入
- 控制组件注册顺序
- 简化测试配置

---

### 2. Core Layer (`src/core/`)

核心引擎层，包含框架的核心逻辑，**仅依赖 `types/` 层**。

#### 2.1 Connectors (`core/connectors/`)

**多数据源连接器系统**，支持可插拔的数据库后端。

**连接器类型：**
- **WasmConnector** - DuckDB-WASM，支持 OPFS 持久化
- **MotherDuckConnector** - 云端 DuckDB（付费服务）
- **HttpConnector** - 通过 HTTP 代理连接远程数据库

**核心接口：**

```typescript
export interface Connector {
  readonly type: ConnectorType
  readonly capabilities: ConnectorCapabilities

  connect(config: ConnectorConfig): Promise<Result<void, ConnectorError>>
  query(sql: string, options?: QueryOptions): Promise<Result<QueryResult, QueryError>>
  loadTable(name: string, source: TableSource): Promise<Result<void, TableError>>
  disconnect(): Promise<Result<void, ConnectorError>>
  // ... 更多方法
}
```

**Result 模式：** 使用显式错误处理，避免异常

```typescript
type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E }

// 使用示例
const result = await connector.query('SELECT * FROM users')
if (result.ok) {
  console.log(result.value.rows)
} else {
  console.error(result.error.message)
}
```

**文件结构：**
```
connectors/
├── types.ts              # 核心接口定义
├── result.ts             # Result 类型和工具函数
├── errors.ts             # 错误类型
├── registry.ts           # 连接器注册表
├── wasm/                 # DuckDB-WASM 实现
├── motherduck/           # MotherDuck 实现
├── http/                 # HTTP 代理实现
└── compat.ts             # 向后兼容层
```

#### 2.2 Database (`core/database/`)

**数据库管理和数据加载**

- `duckdb.ts` - 旧版 DuckDB 管理器（被 WasmConnector 替代）
- `mosaic.ts` - Mosaic Coordinator 集成
- `table-loader.ts` - CSV/Parquet 文件加载
- `template.ts` - SQL 模板插值（`${variable}` 语法）

#### 2.3 Markdown (`core/markdown/`)

**Markdown 解析和模板处理**

- `parser.ts` - Unified/Remark/Rehype 管道
- `sql-executor.ts` - 执行 SQL 代码块，管理结果
- `conditional-processor.ts` - `{#if}` 条件渲染
- `loop-processor.ts` - `{#each}` 循环处理
- `rehype-block-placeholder.ts` - 为组件创建 DOM 占位符

**支持的模板语法：**

```markdown
# 变量插值
Total: ${summary.total}

# 条件渲染
{#if ${revenue} > 1000000}
## Great! 🎉
{:else}
## Need improvement
{/if}

# 循环
{#each products as product}
- ${product.name}: $${product.price}
{/each}
```

#### 2.4 Registry (`core/registry/`)

**组件注册系统** - 插件架构的核心

```typescript
class ComponentRegistry {
  register<T>(registration: RegisteredComponent<T>): void
  get(language: string): RegisteredComponent | undefined
  getByCategory(category: ComponentCategory): RegisteredComponent[]
  getAllLanguages(): string[]
  render(language: string, container: HTMLElement, props: any, context: RenderContext): Promise<any>
}
```

**关键文件：**
- `component-registry.ts` - 主注册表类
- `component-definition.ts` - 组件定义助手
- `config-parser.ts` - YAML 配置解析
- `data-resolver.ts` - 数据源解析
- `component-mount.ts` - Svelte 组件挂载
- `schemas.ts` - Zod 验证模式

#### 2.5 Engine (`core/engine/`)

**执行引擎**

- `report-execution.service.ts` - 报告执行编排
- `reactive-executor.ts` - 响应式重新执行
- `dependency-graph.ts` - 依赖图分析
- `block-renderer.ts` - Block 渲染器
- `drilldown/` - 图表下钻功能

#### 2.6 Shared (`core/shared/`)

**共享工具和服务**

**DI Container (`di/`):**
```typescript
// 单例/瞬态生命周期管理
container.registerSingleton('chartBuilder', chartBuilderAdapter)
container.registerTransient('tempService', () => new TempService())

const service = container.resolve<IChartBuilder>('chartBuilder')
```

**Pure Functions (`pure/`):**
- `block-utils.ts` - Block 操作（有测试）
- `dependency-analysis.ts` - 依赖图算法（有测试）
- `template-utils.ts` - 模板字符串工具（有测试）
- `contracts.ts` - 类型契约（有测试）

**Format System (`format/`):**
```typescript
import { fmt } from '@core/shared/format'

fmt(1234567.89, 'currency')  // ¥1,234,567.89
fmt(0.1234, 'percent')       // 12.34%
fmt(1234567, 'compact')      // 123.5万
fmt(new Date(), 'relative')  // 3天前
```

**Chart Service:**
- `chart.service.ts` - 图表配置构建器

---

### 3. Plugins Layer (`src/plugins/`)

**43 个可插拔组件**，按类别组织。

#### 插件结构

每个插件遵循统一结构：

```
plugins/inputs/dropdown/
├── index.ts           # 导出
├── Dropdown.svelte    # Svelte 组件
├── definition.ts      # 组件注册定义
├── metadata.ts        # 元数据（props、examples）
└── types.ts           # TypeScript 类型
```

#### 组件分类

**输入组件 (8 个)**
```
inputs/
├── dropdown/          # 下拉选择
├── buttongroup/       # 按钮组
├── textinput/         # 文本搜索
├── slider/            # 滑块
├── daterange/         # 日期范围
├── checkbox/          # 复选框
├── dimensiongrid/     # 维度网格
└── use-input.svelte.ts  # 共享状态管理
```

**数据展示 (22 个)**
```
data-display/
├── bigvalue/          # 大数值卡片
├── datatable/         # 数据表格
├── value/             # 内联值
├── sparkline/         # 迷你趋势图
├── bar-chart/         # 柱状图
├── pie-chart/         # 饼图
├── histogram/         # 直方图
├── delta/             # 变化指示器
├── sankey/            # 桑基图
├── waterfall/         # 瀑布图
├── progress/          # 进度条
├── bullet-chart/      # 子弹图
├── boxplot/           # 箱线图
├── calendar-heatmap/  # 日历热力图
├── gauge/             # 仪表盘
├── kpigrid/           # KPI 网格
├── heatmap/           # 热力图
├── radar/             # 雷达图
├── funnel/            # 漏斗图
├── treemap/           # 树状图
└── shared/            # 共享工具
```

**UI 组件 (6 个)**
```
ui/
├── alert/             # 提示框
├── tabs/              # 标签页
├── accordion/         # 手风琴
├── tooltip/           # 工具提示
├── details/           # 详情折叠
└── modal/             # 模态框
```

**布局组件 (1 个)**
```
layout/
└── grid/              # 网格布局
```

**可视化工具 (SQL Workspace)**
```
viz/
├── chart-builder.ts   # 图表配置构建
└── data-adapter.ts    # 数据适配 (SQL Workspace)
```

> 注：所有 BI Report 图表使用 `plugins/data-display/` 中的 27 种 Svelte + SVG 组件。
> `viz/` 目录用于 SQL Workspace 的快速图表功能。

#### 插件定义示例

```typescript
// metadata.ts
export const DropdownMetadata = createMetadata({
  type: 'input',
  language: 'dropdown',
  displayName: 'Dropdown',
  description: '下拉选择器',
  props: [
    { name: 'name', type: 'string', required: true },
    { name: 'data', type: 'string', required: true },
    { name: 'value', type: 'string', required: false },
    { name: 'label', type: 'string', required: false }
  ],
  examples: [
    `\`\`\`dropdown
name: region
data: regions_query
value: region_code
label: region_name
\`\`\``
  ]
})

// definition.ts
export const componentRegistration = defineComponent({
  metadata: DropdownMetadata,
  schema: DropdownSchema,
  component: Dropdown,
  parseConfig: (block, context) => configParser.parse(block.content, DropdownSchema),
  resolveData: async (config, context) => {
    const data = await dataResolver.resolve(config.data, context)
    return { config, options: transformToOptions(data) }
  }
})
```

---

### 4. App Layer (`src/app/`)

**应用层** - Svelte stores，通过接口与 core 交互。

**Stores:**
- `database.svelte.ts` - 数据库连接状态
- `report.svelte.ts` - 报告内容和执行状态
- `report-inputs.ts` - 输入值存储
- `chart.svelte.ts` - 图表配置
- `query-workspace.svelte.ts` - SQL 工作区状态
- `connection.svelte.ts` - 连接管理

**所有 stores 实现接口契约：**

```typescript
// types/interfaces/stores.ts
export interface IInputStore {
  get(): InputState
  subscribe(fn: (state: InputState) => void): () => void
  update(fn: (state: InputState) => InputState): void
}

export interface IDatabaseStore {
  getConnection(): DuckDBConnection | null
}

export interface ISQLTemplateContext {
  inputs: Record<string, any>
  queryResults: Map<string, any>
}
```

这样 `core/` 可以依赖接口，而不是具体的 store 实现。

---

### 5. Types Layer (`src/types/`)

**类型定义和接口契约** - 项目的最底层，不依赖任何其他模块。

**类型文件：**
- `chart.ts` - 图表类型
- `connection.ts` - 连接类型
- `data-viz.ts` - 数据可视化类型
- `database.ts` - 数据库类型
- `editor.ts` - 编辑器类型
- `inputs.ts` - 输入组件类型
- `report.ts` - 报告类型
- `ui.ts` - UI 类型

**接口契约 (`types/interfaces/`):**
- `chart-builder.ts` - IChartBuilder、IInputInitializer
- `stores.ts` - IInputStore、IDatabaseStore、ISQLTemplateContext
- `index.ts` - 聚合所有接口

---

## 数据流

### 1. 文件上传 → DuckDB

```
User uploads file
     │
     ▼
FileUploader.svelte
     │
     ▼
loadDataIntoTable()
     │
     ▼
DuckDB-WASM (Web Worker)
     │
     ▼
OPFS Persistence
```

### 2. SQL 查询 → 可视化

```
User writes SQL
     │
     ▼
Monaco Editor
     │
     ▼
parseMarkdown()
     │
     ▼
executeSQLBlock()
     │
     ▼
DuckDB-WASM.query()
     │
     ▼
Apache Arrow → JSON
     │
     ▼
BlockRenderer
     │
     ▼
ComponentRegistry.mount()
     │
     ▼
Svelte + SVG Component → DOM
```

### 3. Markdown 报告渲染

```
User writes Markdown
     │
     ▼
parseMarkdown()  (Unified pipeline)
     │
     ├─ Extract SQL blocks
     │     │
     │     ▼
     │  executeSQLBlock()
     │     │
     │     ▼
     │  DuckDB → Results
     │
     ├─ Process templates
     │     │
     │     ▼
     │  interpolateSQL()  (${variable})
     │
     ├─ Process conditionals
     │     │
     │     ▼
     │  processConditionals()  ({#if})
     │
     ├─ Process loops
     │     │
     │     ▼
     │  processLoops()  ({#each})
     │
     ▼
Render to HTML
     │
     ▼
blockRenderer.render()
     │
     ▼
Mount Svelte components
     │
     ▼
Final DOM
```

### 4. 响应式执行

```
User changes input
     │
     ▼
inputStore.update()
     │
     ▼
findAffectedBlocks()
     │
     ▼
Dependency Graph
     │
     ▼
topologicalSort()
     │
     ▼
reExecuteAffectedBlocks()
     │
     ▼
Update visualizations
```

---

## 架构原则

### 1. 单向依赖

依赖关系只能从上层指向下层，严格禁止循环依赖。

```
main.ts
  ↓
bootstrap
  ↓
plugins / app / components
  ↓
core
  ↓
types
```

### 2. 接口隔离

Core 层通过接口与其他层交互，不依赖具体实现。

```typescript
// ✅ Good: Core 依赖接口
import type { IChartBuilder } from '@/types/interfaces'

const builder = container.resolve<IChartBuilder>('chartBuilder')

// ❌ Bad: Core 依赖具体实现
import { chartService } from '@plugins/viz'
```

### 3. 依赖注入

使用 DI 容器管理依赖，在 bootstrap 层统一配置。

```typescript
// bootstrap/init-services.ts
import { container } from '@core/shared/di'
import { chartBuilderAdapter } from './adapters/chart-builder'

container.registerSingleton<IChartBuilder>('chartBuilder', chartBuilderAdapter)
```

### 4. 纯函数优先

将纯逻辑提取到 `core/shared/pure/`，便于测试。

```typescript
// ✅ Good: 纯函数
export function extractSQLBlocks(content: string): ParsedCodeBlock[] {
  // No side effects
  return blocks
}

// ❌ Avoid: 副作用
export function extractSQLBlocks(content: string): void {
  globalState.blocks = blocks  // Side effect!
}
```

### 5. 类型安全

所有模块使用 TypeScript 严格模式，完整的类型定义。

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    // ...
  }
}
```

### 6. 测试驱动

核心算法和纯函数都有对应的测试文件（`.test.ts`）。

```
core/shared/pure/
├── block-utils.ts
├── block-utils.test.ts  ✅
├── dependency-analysis.ts
├── dependency-analysis.test.ts  ✅
```

---

## 关键技术决策

### 1. 为什么选择 DuckDB-WASM？

**优势：**
- ✅ 完整的 SQL 支持（窗口函数、CTE、JOIN 等）
- ✅ 接近原生的性能（C++ → WebAssembly）
- ✅ 支持 Parquet、CSV 等多种格式
- ✅ 支持 OPFS 持久化
- ✅ 活跃的社区和维护

**替代方案对比：**
- **alasql** - 性能较差，功能受限
- **sql.js** - SQLite，不支持列式存储，性能不如 DuckDB
- **Lovefield** - 已停止维护

### 2. 为什么选择 Svelte + SVG 作为主要图表渲染方式？

**当前架构：**
- 27 种图表组件 (`plugins/data-display/`) 全部使用 **纯 Svelte + SVG** 渲染
- SQL Workspace 可选使用 Mosaic vgplot（用于大数据集场景）

**Svelte + SVG 优势：**
- ✅ 无第三方依赖，完全控制渲染逻辑
- ✅ 与 Svelte 5 Runes 模式完美集成
- ✅ 类型安全，Zod 配置验证
- ✅ 更小的打包体积

**SQL Workspace 为何可选 vgplot：**
- ✅ 大数据集场景（100K+ 行）性能更优
- ✅ 直接与 DuckDB 集成，避免数据复制
- ✅ 支持 M4 算法自动降采样

**替代方案对比：**
- **ECharts** - 体积大，需要将数据加载到内存
- **D3.js** - 灵活但复杂，需要大量代码

### 3. 为什么选择 Svelte 5？

**优势：**
- ✅ 更简洁的响应式语法（Runes mode）
- ✅ 编译时优化，运行时性能优异
- ✅ 更小的打包体积
- ✅ 更好的 TypeScript 支持

**Runes vs Stores:**

```typescript
// Old: Svelte 4 Stores
let count = writable(0)
$count = 1

// New: Svelte 5 Runes
let count = $state(0)
count = 1  // More natural
```

### 4. 为什么使用 OPFS？

**Origin Private File System (OPFS)** 提供持久化存储：

- ✅ 跨会话保存数据
- ✅ 高性能（直接文件访问）
- ✅ 隐私保护（仅本域访问）
- ✅ 无需服务器

**对比 IndexedDB：**
- OPFS 更快（同步 API）
- OPFS 更适合大文件
- DuckDB-WASM 原生支持 OPFS

### 5. 为什么使用 Bootstrap Layer？

**清晰架构的关键：**

```
Without Bootstrap:
core/ → import chartService from '@plugins/viz'  ❌

With Bootstrap:
bootstrap/ → register(chartService)
core/ → resolve<IChartBuilder>('chartBuilder')  ✅
```

**好处：**
- ✅ Core 层保持纯净
- ✅ 易于测试（可替换实现）
- ✅ 清晰的初始化流程
- ✅ 符合 SOLID 原则

### 6. 为什么使用 Result 类型？

**显式错误处理，避免异常：**

```typescript
// ❌ Exception-based
try {
  const result = await connector.query(sql)
} catch (error) {
  // 可能忘记处理
}

// ✅ Result-based
const result = await connector.query(sql)
if (!result.ok) {
  handleError(result.error)  // 强制处理
}
```

**好处：**
- ✅ 编译时强制错误处理
- ✅ 更清晰的错误传播
- ✅ 类型安全的错误类型

---

## 实现状态

| 特性 | 状态 |
|------|------|
| Bootstrap 层 | ✅ 完成 |
| 依赖注入 | ✅ 完成 |
| 接口隔离 | ✅ 完成 |
| 43 个插件组件 | ✅ 完成 |
| 连接器系统 | ✅ 完成 |
| OPFS 持久化 | ✅ 完成 |
| Markdown 模板 | ✅ 完成 |
| 响应式执行 | ✅ 完成 |
| 完整测试 | ⚠️ 部分完成 |
| 地图组件 | ❌ 未实现 |
| 多页面路由 | ❌ 未实现 |

---

## 参考文档

- [DEPENDENCY_ARCHITECTURE.md](./DEPENDENCY_ARCHITECTURE.md) - 依赖规则详解
- [PLUGIN_ARCHITECTURE.md](./PLUGIN_ARCHITECTURE.md) - 插件开发指南
- [DATA_SOURCES_ARCHITECTURE.md](./DATA_SOURCES_ARCHITECTURE.md) - 连接器系统设计
- [DUCKDB_PERSISTENCE_ARCHITECTURE.md](./DUCKDB_PERSISTENCE_ARCHITECTURE.md) - OPFS 持久化
- [MOSAIC_STATE_MANAGEMENT.md](./MOSAIC_STATE_MANAGEMENT.md) - Mosaic 集成

---

**最后更新：** 2025-12-23
**架构版本：** v1.0 (Bootstrap + DI + 43 Components)
