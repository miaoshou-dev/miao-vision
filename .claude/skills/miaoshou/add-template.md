# Skill: 添加信息图模板

为 `infographic-section` 组件添加新的渲染模板。

## 当前已注册模板

| 模板 ID | 显示名称 | 用途 | 推荐数据量 |
|---------|----------|------|-----------|
| `kpi-row-badge` | KPI Row (Badge) | 关键指标展示 | 2-6 项 |
| `flow-timeline` | Flow Timeline | 流程/时间线 | 3-6 步 |
| `pie-distribution` | Pie Distribution | 比例分布 | 2-8 项 |
| `grid-comparison` | Grid Comparison | 网格对比 | 2-9 项 |

## 相关文件位置

```
src/plugins/data-display/infographic-section/
├── templates/
│   ├── registry.ts                    # 模板注册中心
│   └── renderers/
│       ├── KpiRowBadge.svelte         # KPI 行模板
│       ├── FlowTimeline.svelte        # 流程时间线
│       ├── PieDistribution.svelte     # 饼图分布
│       └── GridComparison.svelte      # 网格对比
├── adapters/
│   ├── index.ts
│   ├── row-adapter.ts
│   ├── flow-adapter.ts
│   ├── sector-adapter.ts
│   └── grid-adapter.ts
└── types.ts
```

## 添加新模板步骤

### Step 1: 定义模板信息

确认以下信息：
- 模板 ID (kebab-case): 如 `table-comparison`
- 显示名称: 如 "表格对比"
- 适用场景: 描述何时使用此模板
- 数据字段要求: 需要哪些 item 字段

### Step 2: 创建渲染器组件

文件: `src/plugins/data-display/infographic-section/templates/renderers/{TemplateName}.svelte`

```svelte
<script lang="ts">
  /**
   * {TemplateName} 模板渲染器
   *
   * @description {模板描述}
   */
  import type { TemplateProps, AdaptedItem } from '../../types'

  interface Props extends TemplateProps {
    // 可添加模板特有属性
  }

  let { items, theme, palette, width, height }: Props = $props()

  // 颜色配置
  const PALETTES: Record<string, string[]> = {
    vibrant: ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981'],
    ocean: ['#0EA5E9', '#06B6D4', '#14B8A6', '#3B82F6', '#6366F1'],
    sunset: ['#F59E0B', '#EF4444', '#EC4899', '#8B5CF6', '#F97316'],
    forest: ['#10B981', '#059669', '#34D399', '#6EE7B7', '#14B8A6']
  }

  let colors = $derived(PALETTES[palette] || PALETTES.vibrant)

  // 数据处理
  let processedItems = $derived(
    items.map((item, index) => ({
      ...item,
      color: colors[index % colors.length]
    }))
  )
</script>

<div
  class="template-{template-id}"
  style:width="{width}px"
  style:height={height ? `${height}px` : 'auto'}
>
  {#each processedItems as item, i}
    <div class="item" style:--item-color={item.color}>
      <span class="label">{item.label}</span>
      {#if item.value !== undefined}
        <span class="value">{item.value}</span>
      {/if}
      {#if item.desc}
        <span class="desc">{item.desc}</span>
      {/if}
    </div>
  {/each}
</div>

<style>
  .template-{template-id} {
    display: flex;
    gap: 1rem;
    padding: 1rem;
  }

  .item {
    flex: 1;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    border-left: 3px solid var(--item-color);
  }

  .label {
    display: block;
    font-weight: 600;
    color: #f3f4f6;
  }

  .value {
    display: block;
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--item-color);
  }

  .desc {
    display: block;
    font-size: 0.875rem;
    color: #9ca3af;
  }
</style>
```

### Step 3: 创建数据适配器

文件: `src/plugins/data-display/infographic-section/adapters/{template}-adapter.ts`

```typescript
/**
 * {TemplateName} 数据适配器
 *
 * 将通用 SectionItem 转换为模板特定数据格式
 */
import type { SectionItem } from '../types'

export interface {TemplateName}Item {
  label: string
  value?: string | number
  desc?: string
  // 添加模板特有字段
}

/**
 * 适配数据到 {TemplateName} 格式
 */
export function adaptTo{TemplateName}(items: SectionItem[]): {TemplateName}Item[] {
  return items.map((item, index) => ({
    label: item.label,
    value: item.value,
    desc: item.desc,
    // 转换/计算其他字段
  }))
}
```

### Step 4: 更新适配器索引

文件: `src/plugins/data-display/infographic-section/adapters/index.ts`

```typescript
// 添加导出
export { adaptTo{TemplateName} } from './{template}-adapter'
```

### Step 5: 注册模板

文件: `src/plugins/data-display/infographic-section/templates/registry.ts`

```typescript
// 1. 添加导入
import {TemplateName} from './renderers/{TemplateName}.svelte'
import { adaptTo{TemplateName} } from '../adapters/{template}-adapter'

// 2. 在 templateRegistry 对象中添加
export const templateRegistry: TemplateRegistry = {
  // ... 现有模板

  /**
   * {模板显示名称}
   * Use for: {使用场景描述}
   * Structure: {结构说明}
   */
  '{template-id}': {
    component: {TemplateName},
    adapter: adaptTo{TemplateName},
    defaultHeight: 200,  // 根据模板调整
    displayName: '{显示名称}',
    description: '{模板描述}'
  }
}
```

### Step 6: 添加 AI 模板映射 (关键!)

文件: `src/core/ai/infographic/infographic-generator.ts`

在 `TEMPLATE_MAP` 中添加 AI 可能生成的模板名到实际模板的映射：

```typescript
const TEMPLATE_MAP: Record<string, string> = {
  // ... 现有映射

  // 添加新模板的映射
  '{ai-template-name-1}': '{template-id}',
  '{ai-template-name-2}': '{template-id}',
  // AI 可能用的其他名称
}
```

**常见 AI 命名模式**:
- KPI 类: `kpi-*`, `metrics-*`, `stats-*`
- 流程类: `flow-*`, `timeline-*`, `process-*`, `steps-*`
- 对比类: `compare-*`, `comparison-*`, `versus-*`
- 分布类: `pie-*`, `distribution-*`, `breakdown-*`

### Step 7: 添加到 Demo 模板 (可选)

文件: `src/components/article-to-infographic/data/demo-templates.ts`

如需在 Demo 中展示，添加使用该模板的示例。

## 验证步骤

### 1. TypeScript 检查
```bash
npm run check
```

### 2. 开发服务器测试
```bash
npm run dev
```

访问 Article → Infographic Demo，测试新模板渲染

### 3. 验证 AI 映射
测试 AI 生成内容是否能正确映射到新模板

## 验证清单

- [ ] 渲染器组件创建完成
- [ ] 适配器函数实现完成
- [ ] 已在 `registry.ts` 注册
- [ ] 已在 `TEMPLATE_MAP` 添加映射
- [ ] TypeScript 无错误
- [ ] 开发环境正常渲染
- [ ] 文件行数 < 300 行

## 模板设计指南

### 响应式设计
```svelte
<div style:width="{width}px">
  <!-- 内部使用 flex/grid 自适应 -->
</div>
```

### 颜色使用
```svelte
<!-- 使用 palette 而非硬编码颜色 -->
let colors = $derived(PALETTES[palette] || PALETTES.vibrant)
```

### 空数据处理
```svelte
{#if items.length === 0}
  <div class="empty">暂无数据</div>
{:else}
  <!-- 正常渲染 -->
{/if}
```

### 可访问性
```svelte
<div role="list" aria-label="{模板描述}">
  {#each items as item}
    <div role="listitem">...</div>
  {/each}
</div>
```

## 参考实现

- 简单布局: `KpiRowBadge.svelte`
- SVG 图形: `PieDistribution.svelte`
- 流程箭头: `FlowTimeline.svelte`
- 网格布局: `GridComparison.svelte`
