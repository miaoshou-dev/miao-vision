# Skill: 创建新图表组件

创建符合项目规范的纯 SVG 图表组件。

## 前置信息收集

需要确认以下信息：
1. 图表英文名称 (kebab-case，如 `radar-chart`)
2. 图表中文名称
3. 图表类型描述

## 目录结构

在 `src/plugins/data-display/` 下创建：

```
{chart-name}/
├── index.ts              # 导出入口
├── {ChartName}.svelte    # 主组件 (PascalCase)
├── definition.ts         # 组件注册定义
├── types.ts              # 类型定义
└── {chart-name}.test.ts  # 测试文件
```

## Step 1: 类型定义 (types.ts)

```typescript
/**
 * {ChartName} 图表类型定义
 */

export interface {ChartName}DataPoint {
  // 根据图表特性定义数据点结构
  label: string
  value: number
}

export interface {ChartName}Data {
  columns: string[]
  data: Record<string, unknown>[]
}

export interface {ChartName}Config {
  /** 数据列名 */
  x?: string
  y?: string
  /** 图表尺寸 */
  width?: number
  height?: number
  /** 显示选项 */
  showLabels?: boolean
  showGrid?: boolean
}
```

## Step 2: 主组件 ({ChartName}.svelte)

```svelte
<script lang="ts">
  /**
   * {ChartName} - {中文名称}
   *
   * @description {图表描述}
   */
  import type { {ChartName}Data, {ChartName}Config } from './types'

  interface Props {
    data: {ChartName}Data
    config?: {ChartName}Config
  }

  let { data, config = {} }: Props = $props()

  // 默认配置
  const width = config.width ?? 600
  const height = config.height ?? 400
  const padding = { top: 20, right: 20, bottom: 40, left: 50 }

  // 计算绘图区域
  const plotWidth = width - padding.left - padding.right
  const plotHeight = height - padding.top - padding.bottom

  // 使用 $derived 处理数据
  let processedData = $derived.by(() => {
    if (!data?.data || data.data.length === 0) return []
    // 数据处理逻辑
    return data.data
  })

  // 比例尺计算
  let scales = $derived.by(() => {
    // 计算 x/y 比例尺
    return { x: null, y: null }
  })
</script>

{#if processedData.length === 0}
  <div class="chart-empty">
    <p>暂无数据</p>
  </div>
{:else}
  <svg {width} {height} class="chart-{chart-name}">
    <g transform="translate({padding.left}, {padding.top})">
      <!-- 网格线 -->
      {#if config.showGrid !== false}
        <g class="grid">
          <!-- 横向网格线 -->
        </g>
      {/if}

      <!-- 数据绑定渲染 -->
      <g class="data-elements">
        {#each processedData as item, i}
          <!-- 渲染图表元素 -->
        {/each}
      </g>

      <!-- 坐标轴 -->
      <g class="axis axis-x" transform="translate(0, {plotHeight})">
        <!-- X 轴 -->
      </g>
      <g class="axis axis-y">
        <!-- Y 轴 -->
      </g>

      <!-- 标签 -->
      {#if config.showLabels !== false}
        <g class="labels">
          {#each processedData as item, i}
            <!-- 数据标签 -->
          {/each}
        </g>
      {/if}
    </g>
  </svg>
{/if}

<style>
  .chart-{chart-name} {
    font-family: system-ui, -apple-system, sans-serif;
  }

  .chart-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 200px;
    color: #6b7280;
  }

  .grid line {
    stroke: #e5e7eb;
    stroke-dasharray: 2, 2;
  }

  .axis line,
  .axis path {
    stroke: #d1d5db;
  }

  .axis text {
    fill: #6b7280;
    font-size: 12px;
  }
</style>
```

## Step 3: 组件定义 (definition.ts)

```typescript
/**
 * {ChartName} 组件注册定义
 */
import { defineComponent } from '@core/registry'
import type { ConfigSchema } from '@core/registry'
import {ChartName} from './{ChartName}.svelte'
import type { {ChartName}Data, {ChartName}Config } from './types'

export const {ChartName}Metadata = {
  type: 'data-viz' as const,
  language: '{chart-name}',
  displayName: '{中文名称}',
  description: '{图表描述}',
  category: 'chart',
  icon: 'chart-line',
  props: [
    { name: 'x', type: 'string', description: 'X 轴数据列' },
    { name: 'y', type: 'string', description: 'Y 轴数据列' },
    { name: 'width', type: 'number', description: '图表宽度' },
    { name: 'height', type: 'number', description: '图表高度' }
  ]
}

export const {ChartName}Schema: ConfigSchema = {
  fields: [
    { name: 'data', type: 'string', required: true },
    { name: 'x', type: 'string' },
    { name: 'y', type: 'string' },
    { name: 'width', type: 'number', default: 600 },
    { name: 'height', type: 'number', default: 400 },
    { name: 'showLabels', type: 'boolean', default: true },
    { name: 'showGrid', type: 'boolean', default: true }
  ]
}

export const {chartName}Registration = defineComponent<{ChartName}Config, { data: {ChartName}Data }>({
  metadata: {ChartName}Metadata,
  configSchema: {ChartName}Schema,
  component: {ChartName},

  dataBinding: {
    sourceField: 'data',
    transform: (queryResult, config) => {
      return {
        columns: queryResult.columns,
        data: queryResult.data
      }
    }
  },

  buildProps: (config, extractedData) => {
    if (!extractedData) return null
    return {
      data: extractedData as {ChartName}Data,
      config
    }
  }
})
```

## Step 4: 导出入口 (index.ts)

```typescript
export { default as {ChartName} } from './{ChartName}.svelte'
export * from './types'
export { {chartName}Registration } from './definition'
```

## Step 5: 注册到 Bootstrap

文件: `src/bootstrap/init-plugins.ts`

```typescript
// 添加导入
import { {chartName}Registration } from '@plugins/data-display/{chart-name}'

// 在 registerDataDisplayPlugins() 中添加
registry.register({chartName}Registration)
```

## Step 6: 基础测试 ({chart-name}.test.ts)

```typescript
import { describe, it, expect } from 'vitest'
// 添加基础测试用例

describe('{ChartName}', () => {
  describe('data validation', () => {
    it('should handle empty data', () => {
      // 测试空数据处理
    })

    it('should process valid data', () => {
      // 测试正常数据处理
    })
  })
})
```

## 验证清单

执行以下检查：

- [ ] `npm run check` TypeScript 无错误
- [ ] `npm run dev` 组件正常渲染
- [ ] 文件行数均 < 500 行
- [ ] 在 BI Report 中可通过代码块使用
- [ ] 基础测试通过

## 参考现有实现

- 柱状图: `src/plugins/data-display/bar-chart/`
- 折线图: `src/plugins/data-display/line-chart/`
- 饼图: `src/plugins/data-display/pie-chart/`
- 雷达图: `src/plugins/data-display/radar/`
