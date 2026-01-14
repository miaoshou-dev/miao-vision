# 可视化 Chart/Report AI 友好性评估

> 评估日期: 2026-01-14
> 评估目的: 从 AI 理解和生成角度，分析项目可视化系统的改进空间

---

## 一、当前架构优势 ✅

| 方面 | 现状 | AI 友好度 |
|------|------|-----------|
| **类型定义** | 每个图表有完整 `types.ts` | ⭐⭐⭐⭐⭐ 高 |
| **组件注册** | 统一 `definition.ts` 模式 | ⭐⭐⭐⭐ 高 |
| **元数据系统** | 有 `metadata.ts` 描述属性 | ⭐⭐⭐ 中 |
| **报告节类型** | 7 种预定义节类型 | ⭐⭐⭐ 中 |

### 当前图表架构 (3 层模式)

```
src/plugins/data-display/{chart-name}/
├── types.ts        # Layer 1: 类型定义
├── definition.ts   # Layer 2: 组件注册 + 数据绑定
├── metadata.ts     # Layer 3: 人类可读元数据
└── {Chart}.svelte  # 渲染组件
```

---

## 二、关键差距分析 🔴

### Gap 1: 缺少 AI 选图提示 (P0)

**问题**: AI 不知道什么数据适合什么图表

```typescript
// 当前: 只有人类可读描述
displayName: '柱状图'
description: '用于比较不同类别的数值'

// 缺少: AI 可理解的选图指南
// suitableFor: {
//   dataTypes: ['categorical', 'numeric'],
//   cardinalityRange: { min: 2, max: 20 },
//   avoid: ['时序数据用折线图更好']
// }
```

**影响**: AI 可能生成不适合的图表组合

---

### Gap 2: 数据类型推断不足 (P0)

**当前实现** (`report-planner.ts:305-316`):
```typescript
const numericColumns = columns.filter((c) =>
  c.type.toLowerCase().includes('int')  // 仅检查类型字符串
)
```

**问题**:
- 不分析实际数据值
- 无法识别"数字但实际是分类"（如产品ID）
- 无基数分析

**应有能力**:
```typescript
interface ColumnAnalysis {
  name: string
  dbType: string
  semanticType: 'numeric' | 'categorical' | 'temporal'
  cardinality: number      // 唯一值数量
  nullPercent: number
  likelyUse: 'dimension' | 'metric' | 'time'
  timeGranularity?: 'day' | 'month' | 'year'
}
```

---

### Gap 3: 配置约束不完整 (P1)

**当前**: 配置字段无约束
```typescript
{ name: 'sort', type: 'string' }  // 缺少 options: ['asc', 'desc', 'none']
```

**应有**:
```typescript
{
  name: 'sort',
  type: 'string',
  options: ['asc', 'desc', 'none'],  // 枚举值
  range?: { min?: number; max?: number },  // 数值范围
  dependsOn?: string[],  // 依赖字段
  mutuallyExclusive?: string[],  // 互斥字段
  default: 'none'
}
```

---

### Gap 4: 调色板重复定义 (P1)

**问题**: 8 种调色板在 28 个图表组件中重复定义

**位置**:
- `bar-chart/definition.ts:22-31`
- `pie-chart/definition.ts:22-31`
- `line-chart/definition.ts:22-31`
- ... (共 28 处)

**建议**: 集中到 `core/shared/palettes.ts`

```typescript
// src/core/shared/palettes.ts
export const CHART_PALETTES = {
  vibrant: ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981'],
  business: ['#1E40AF', '#1E3A5F', '#374151', '#4B5563', '#6B7280'],
  ocean: ['#0EA5E9', '#06B6D4', '#14B8A6', '#3B82F6', '#6366F1'],
  // ...
} as const

export type PaletteKey = keyof typeof CHART_PALETTES
```

---

### Gap 5: 图表数据 Schema 未文档化 (P1)

**问题**: AI 生成 SQL，但不确定结果是否匹配图表期望

**当前**: 隐式规则
- 柱状图期望 `x`, `y` 列
- 折线图期望 `x`(时间), `y`(数值)
- 饼图期望 `category`, `value`

**应有**:
```typescript
interface DataBinding {
  sourceField: string

  // AI 友好的数据 Schema 文档
  expectedSchema: {
    columns: [
      { name: 'x', type: 'categorical', required: true, description: '分类轴' },
      { name: 'y', type: 'numeric', required: true, description: '数值轴' },
      { name: 'series', type: 'categorical', required: false, description: '分组字段' }
    ],
    minRows: 1,
    maxRows: 100,
    description: '每行代表一个柱子，series 字段用于分组'
  },

  sqlExamples: {
    simple: 'SELECT category as x, SUM(amount) as y FROM sales GROUP BY 1',
    grouped: 'SELECT category as x, region as series, SUM(amount) as y FROM sales GROUP BY 1, 2'
  },

  transform?: (queryResult, config) => unknown
}
```

---

### Gap 6: 报告节类型缺少选择指南 (P2)

**当前** (`report-planner.ts:15-23`):
```typescript
const SECTION_TYPES = {
  kpi: 'KPI指标卡 - 展示关键数值指标',
  ranking: '排行榜 - 展示 Top N 数据',
  comparison: '对比分析 - 比较不同类别'
  // 缺少: 何时用 ranking vs comparison?
}
```

**应有**:
```typescript
interface SectionTypeMetadata {
  type: ReportSectionType
  description: string

  // AI 选择指南
  suitableFor: {
    dataPatterns: string[]  // ['有明确排序需求', '需要 Top N']
    minColumns: number
    columnTypes: ('numeric' | 'categorical')[]
  }

  // 与其他类型的区别
  vsOthers: {
    'comparison': '对比强调差异，ranking 强调顺序'
  }

  // 推荐的可视化
  visualizations: {
    primary: ['bar-chart'],
    alternative: ['datatable']
  }
}
```

---

## 三、改进优先级路线图

| 优先级 | 改进项 | 预期收益 | 工作量 |
|--------|--------|----------|--------|
| **P0** | 添加 AI 选图提示 (AIHints) | AI 生成更准确的图表 | 中 |
| **P0** | 增强数据类型推断 | 自动识别维度/指标 | 高 |
| **P1** | 配置字段添加枚举约束 | 减少无效配置 | 低 |
| **P1** | 集中调色板定义 | 代码一致性 | 低 |
| **P1** | 文档化数据 Schema | SQL 生成更可靠 | 中 |
| **P2** | 节类型选择指南 | 报告结构更合理 | 低 |
| **P2** | 图表兼容性验证器 | 自动检测不匹配 | 中 |

---

## 四、具体建议实现

### 建议 1: 创建 AIHints 接口

```typescript
// src/core/registry/ai-hints.ts
export interface AIHints {
  // 适合的数据特征
  suitableFor: {
    dataTypes: ('numeric' | 'categorical' | 'temporal')[]
    cardinalityRange?: { min?: number; max?: number }  // 如饼图 3-10 个分片
    rowCountRange?: { min?: number; max?: number }
  }

  // 不适合的场景
  avoid: string[]  // ['超过 10 个分类用柱状图', '时序数据用折线图']

  // 语义提示
  semantics: {
    purpose: string  // '比较不同类别的数值'
    alternatives: string[]  // ['pie-chart', 'treemap']
  }

  // 选图优先级 (数值越高越优先)
  priority: number
}

// 使用示例
const barChartHints: AIHints = {
  suitableFor: {
    dataTypes: ['categorical', 'numeric'],
    cardinalityRange: { min: 2, max: 20 }
  },
  avoid: [
    '分类超过 20 个时考虑 treemap',
    '时序数据优先用 line-chart'
  ],
  semantics: {
    purpose: '比较不同类别的数值大小',
    alternatives: ['pie-chart', 'treemap', 'datatable']
  },
  priority: 80
}
```

### 建议 2: 创建图表推荐引擎

```typescript
// src/core/ai/chart-recommender.ts
export interface ChartRecommendation {
  chartType: string
  confidence: number  // 0-1
  reasoning: string
  constraints: string[]
  warnings?: string[]
}

export function recommendCharts(
  columns: ColumnAnalysis[],
  rowCount: number,
  userIntent?: string
): ChartRecommendation[] {
  const recommendations: ChartRecommendation[] = []

  // 1. 分析列类型
  const numericCols = columns.filter(c => c.semanticType === 'numeric')
  const categoricalCols = columns.filter(c => c.semanticType === 'categorical')
  const temporalCols = columns.filter(c => c.semanticType === 'temporal')

  // 2. 基于数据特征推荐
  if (temporalCols.length > 0 && numericCols.length > 0) {
    recommendations.push({
      chartType: 'line-chart',
      confidence: 0.9,
      reasoning: '检测到时间列，适合趋势分析',
      constraints: ['需要 x 为时间列', 'y 为数值列']
    })
  }

  if (categoricalCols.length > 0 && numericCols.length > 0) {
    const cardinality = categoricalCols[0].cardinality

    if (cardinality <= 10) {
      recommendations.push({
        chartType: 'pie-chart',
        confidence: 0.7,
        reasoning: `分类数量(${cardinality})适合饼图`,
        constraints: ['分类数量 ≤ 10']
      })
    }

    recommendations.push({
      chartType: 'bar-chart',
      confidence: cardinality <= 20 ? 0.85 : 0.6,
      reasoning: '适合类别比较',
      constraints: ['建议分类数量 ≤ 20'],
      warnings: cardinality > 20 ? ['分类较多，考虑筛选 Top N'] : undefined
    })
  }

  // 3. 按置信度排序
  return recommendations.sort((a, b) => b.confidence - a.confidence)
}
```

### 建议 3: 增强 ReportPlanner 验证

```typescript
// src/core/ai/plan-validator.ts
export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

export function validatePlan(
  plan: ReportPlan,
  dataSources: DataSource[]
): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []

  for (const section of plan.sections) {
    // 检查数据源是否存在
    if (!dataSources.find(ds => ds.name === section.dataSource)) {
      errors.push({
        section: section.title,
        message: `数据源 "${section.dataSource}" 不存在`
      })
    }

    // 检查图表类型是否匹配数据
    if (section.type === 'trend') {
      const ds = dataSources.find(ds => ds.name === section.dataSource)
      const hasTimeCol = ds?.columns.some(c =>
        c.type.includes('date') || c.type.includes('timestamp')
      )
      if (!hasTimeCol) {
        warnings.push({
          section: section.title,
          message: '趋势分析建议有时间列'
        })
      }
    }

    // 检查饼图分类数量
    if (section.visualization === 'pie-chart') {
      // 基于 sample data 检查基数
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}
```

---

## 五、文件改动清单

### 需要新建的文件

| 文件路径 | 用途 |
|----------|------|
| `src/core/registry/ai-hints.ts` | AIHints 接口定义 |
| `src/core/ai/chart-recommender.ts` | 图表推荐引擎 |
| `src/core/ai/column-analyzer.ts` | 数据列语义分析 |
| `src/core/ai/plan-validator.ts` | 报告计划验证器 |
| `src/core/shared/palettes.ts` | 集中调色板定义 |

### 需要修改的文件

| 文件路径 | 修改内容 |
|----------|----------|
| `src/core/registry/types.ts` | 添加 AIHints 到 ComponentMetadata |
| `src/plugins/data-display/*/definition.ts` | 添加 aiHints 配置 |
| `src/plugins/data-display/*/definition.ts` | 引用集中调色板 |
| `src/core/ai/report-planner.ts` | 集成图表推荐 + 计划验证 |

---

## 六、总结

当前项目在 **类型系统** 和 **组件注册** 方面已有良好基础，但在以下方面需要加强：

| 维度 | 当前状态 | 目标状态 |
|------|----------|----------|
| **AI 决策支持** | 缺少元数据 | 每个图表有 AIHints |
| **数据理解** | 仅检查类型字符串 | 分析实际数据特征 |
| **配置约束** | 隐式规则 | 显式枚举/范围约束 |
| **SQL 生成** | 无 Schema 文档 | 每个图表有 expectedSchema |
| **计划验证** | 无验证 | 自动检测不匹配 |

**完成这些改进后，AI 将能够**:
- ✅ 根据数据特征自动选择最佳图表
- ✅ 生成符合图表期望的 SQL
- ✅ 避免不合理的配置组合
- ✅ 在生成前验证计划可行性

---

## 附录: 相关文件索引

### 当前图表组件 (28 个)

```
src/plugins/data-display/
├── bar-chart/          # 柱状图
├── line-chart/         # 折线图
├── pie-chart/          # 饼图
├── area-chart/         # 面积图
├── scatter-chart/      # 散点图
├── histogram/          # 直方图
├── sankey/             # 桑基图
├── treemap/            # 树图
├── radar/              # 雷达图
├── gauge/              # 仪表盘
├── heatmap/            # 热力图
├── funnel/             # 漏斗图
├── waterfall/          # 瀑布图
├── bigvalue/           # KPI 卡片
├── datatable/          # 数据表格
└── ...
```

### AI 报告相关文件

```
src/core/ai/
├── types.ts              # ReportPlan, ReportSection 类型
├── report-planner.ts     # 报告计划生成
├── report-generator.ts   # Markdown 生成
└── prompts/
    ├── report-planner.ts     # 计划器 prompt
    └── section-generator.ts  # 节生成器 prompt
```
