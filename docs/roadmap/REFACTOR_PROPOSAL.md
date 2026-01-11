# 代码结构重构方案

> 目标：易于扩展、易于测试、易于 AI 理解

## 现状分析

### 项目规模

| 指标 | 数值 |
|------|------|
| 总代码 | 92,489 行 |
| TypeScript | 48,557 行 (448 文件) |
| Svelte | 43,932 行 (141 文件) |
| 测试文件 | 33 个 (~5% 覆盖) |
| 最大文件 | 2,586 行 |

### 问题总结

| 问题 | 影响 |
|------|------|
| 文件过大 (>500行 有 10+ 个) | AI 无法一次理解，测试困难 |
| 纯函数比例低 | 难以单元测试 |
| 插件结构不一致 | 新开发者困惑 |
| 文档过多且分散 | 信息过载 |
| 缺少开发者引导 | 二次开发门槛高 |

---

## 重构方案

### 核心原则

```
1. 每个文件 ≤ 300 行
2. 每个函数 ≤ 30 行
3. 业务逻辑 = 纯函数（可测试）
4. UI 组件 = 渲染 + 事件（薄层）
5. 纯函数必须有测试
```

---

## Phase 1: 文件拆分（易于 AI 理解）

### 目标
- 所有文件 < 300 行
- 单一职责

### 拆分清单

| 文件 | 当前行数 | 拆分方案 |
|------|---------|---------|
| `App.svelte` | 1,887 | → AppShell + AppRouter + AppSidebar + AppHeader |
| `DataTable.svelte` | 1,723 | → TableCore + TableHeader + TableBody + TablePagination + TableSearch |
| `ResultsChart.svelte` | 1,382 | → ChartSelector + ChartRenderer + ChartConfig |
| `ReportRenderer.svelte` | 856 | → ReportContent + ReportBlocks + ReportError |
| `DataExplorer.svelte` | 805 | → ExplorerTree + ExplorerPreview + ExplorerActions |

### 拆分示例：DataTable

```
现状:
  DataTable.svelte (1,723 行)
    - 表头渲染
    - 数据渲染
    - 分页逻辑
    - 搜索逻辑
    - 排序逻辑
    - 导出逻辑
    - Drilldown 逻辑

重构后:
  datatable/
  ├── DataTable.svelte        (< 100 行) # 组合层
  ├── components/
  │   ├── TableHeader.svelte  (< 150 行)
  │   ├── TableBody.svelte    (< 150 行)
  │   ├── TablePagination.svelte (< 100 行)
  │   └── TableSearch.svelte  (< 100 行)
  ├── logic/
  │   ├── sorting.ts          (纯函数)
  │   ├── filtering.ts        (纯函数)
  │   ├── pagination.ts       (纯函数)
  │   └── export.ts           (纯函数)
  ├── logic.test.ts           (测试)
  └── types.ts
```

---

## Phase 2: 提取纯函数（易于测试）

### 目标
- 业务逻辑与 UI 分离
- 纯函数覆盖率 > 80%

### 纯函数目录结构

```
src/core/shared/pure/
├── index.ts
├── array/
│   ├── sort.ts
│   ├── filter.ts
│   ├── group.ts
│   └── array.test.ts
├── chart/
│   ├── bindins.ts
│   ├── scales.ts
│   ├── colors.ts
│   └── chart.test.ts
├── table/
│   ├── pagination.ts
│   ├── sorting.ts
│   ├── export.ts
│   └── table.test.ts
├── format/
│   ├── number.ts
│   ├── date.ts
│   ├── currency.ts
│   └── format.test.ts
└── validation/
    ├── schema.ts
    ├── config.ts
    └── validation.test.ts
```

### 提取示例

```typescript
// 之前: DataTable.svelte 内部
function sortData(data, column, direction) {
  // 200 行排序逻辑混在组件里
}

// 之后: src/core/shared/pure/table/sorting.ts
export function sortByColumn<T>(
  data: T[],
  column: keyof T,
  direction: 'asc' | 'desc'
): T[] {
  return [...data].sort((a, b) => {
    const aVal = a[column]
    const bVal = b[column]
    const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
    return direction === 'asc' ? cmp : -cmp
  })
}

// 测试: src/core/shared/pure/table/sorting.test.ts
describe('sortByColumn', () => {
  it('sorts ascending', () => {
    const data = [{ name: 'b' }, { name: 'a' }]
    expect(sortByColumn(data, 'name', 'asc')).toEqual([
      { name: 'a' },
      { name: 'b' }
    ])
  })
})
```

---

## Phase 3: 统一插件结构（易于扩展）

### 目标
- 所有插件结构一致
- 提供脚手架命令
- 新插件 5 分钟可创建

### 标准插件结构

```
plugins/category/my-component/
├── index.ts              # 导出
├── MyComponent.svelte    # UI 组件 (< 200 行)
├── definition.ts         # Registry 注册
├── metadata.ts           # 元数据（名称、图标、示例）
├── types.ts              # TypeScript 类型
├── logic.ts              # 业务逻辑（纯函数）
├── logic.test.ts         # 测试
└── README.md             # 组件说明
```

### 脚手架命令

```bash
# 创建新插件
npm run create-plugin my-chart data-display

# 自动生成所有文件
✓ Created src/plugins/data-display/my-chart/
  - index.ts
  - MyChart.svelte
  - definition.ts
  - metadata.ts
  - types.ts
  - logic.ts
  - logic.test.ts
  - README.md
✓ Registered in src/plugins/data-display/index.ts
```

### 脚手架实现

```typescript
// scripts/create-plugin.ts
import { mkdir, writeFile } from 'fs/promises'

const templates = {
  'index.ts': (name) => `export { default as ${name} } from './${name}.svelte'
export { componentRegistration } from './definition'
export type * from './types'`,

  'Component.svelte': (name) => `<script lang="ts">
  import type { ${name}Data } from './types'
  import { process${name}Data } from './logic'

  interface Props {
    data: ${name}Data
  }

  let { data }: Props = $props()
  const processed = $derived(process${name}Data(data))
</script>

<div class="miao-${name.toLowerCase()}">
  <!-- TODO: Implement -->
</div>

<style>
  .miao-${name.toLowerCase()} {
    /* styles */
  }
</style>`,

  'logic.ts': (name) => `import type { ${name}Data, Processed${name}Data } from './types'

export function process${name}Data(data: ${name}Data): Processed${name}Data {
  // Pure function - no side effects
  return {
    // TODO: Implement
  }
}`,

  'logic.test.ts': (name) => `import { describe, it, expect } from 'vitest'
import { process${name}Data } from './logic'

describe('process${name}Data', () => {
  it('should process data correctly', () => {
    const input = { /* TODO */ }
    const result = process${name}Data(input)
    expect(result).toBeDefined()
  })
})`
}
```

---

## Phase 4: 文档整理（易于上手）

### 目标
- 根目录只保留核心文件
- docs/ 结构清晰
- 5 分钟快速上手

### 根目录清理

```
根目录（重构后）
├── README.md           # 项目介绍 + 快速开始
├── CONTRIBUTING.md     # 贡献指南
├── CHANGELOG.md        # 变更日志
├── LICENSE
├── package.json
├── tsconfig.json
├── vite.config.ts
├── src/
├── docs/               # 所有文档
├── scripts/            # 开发脚本
└── examples/           # 示例项目

删除/移动:
- CLAUDE.md → docs/ai/
- ALL_USER_PROMPTS.md → 删除
- COVERAGE_REPORT.md → docs/testing/
- FEATURE_ROADMAP.md → docs/roadmap/
- todo-list.md → 删除（用 GitHub Issues）
- 其他 15+ markdown → docs/archive/
```

### docs/ 结构

```
docs/
├── README.md                 # 文档索引
├── getting-started/
│   ├── quick-start.md       # 5 分钟上手
│   ├── installation.md
│   └── first-report.md
├── guides/
│   ├── create-plugin.md     # 创建插件教程
│   ├── create-connector.md  # 创建连接器教程
│   └── testing.md           # 测试指南
├── architecture/
│   ├── overview.md          # 架构概览（合并现有）
│   ├── core.md              # 核心模块
│   └── plugins.md           # 插件系统
├── api/
│   ├── components.md        # 组件 API
│   └── utilities.md         # 工具函数
└── archive/                 # 旧文档存档
```

---

## Phase 5: CI/CD 质量门禁

### 目标
- 自动检查代码质量
- 防止大文件合入
- 保证测试覆盖率

### GitHub Actions

```yaml
# .github/workflows/quality.yml
name: Code Quality

on: [push, pull_request]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Check file sizes
        run: |
          # 检查超过 300 行的文件
          find src -name "*.ts" -o -name "*.svelte" | while read f; do
            lines=$(wc -l < "$f")
            if [ $lines -gt 300 ]; then
              echo "❌ $f has $lines lines (max 300)"
              exit 1
            fi
          done

      - name: Run tests
        run: npm test

      - name: Check coverage
        run: |
          npm run test:coverage
          # 检查 pure/ 目录覆盖率 > 80%
```

### Pre-commit Hook

```bash
# .husky/pre-commit
#!/bin/sh

# 检查是否有超过 300 行的新文件
for file in $(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|svelte)$'); do
  lines=$(wc -l < "$file")
  if [ $lines -gt 300 ]; then
    echo "❌ Error: $file has $lines lines (max 300)"
    echo "Please split into smaller files"
    exit 1
  fi
done
```

---

## 实施计划

| Phase | 任务 | 预计时间 | 优先级 |
|-------|------|---------|--------|
| 1 | 拆分 5 个大文件 | 2-3 天 | 🔴 高 |
| 2 | 提取纯函数 + 测试 | 3-4 天 | 🔴 高 |
| 3 | 插件脚手架 | 1 天 | 🟡 中 |
| 4 | 文档整理 | 1 天 | 🟡 中 |
| 5 | CI/CD 配置 | 0.5 天 | 🟡 中 |

**总计：7-9 天**

---

## 预期收益

| 维度 | 当前 | 目标 |
|------|------|------|
| 易于扩展 | ⭐⭐⭐☆☆ | ⭐⭐⭐⭐⭐ |
| 易于测试 | ⭐⭐☆☆☆ | ⭐⭐⭐⭐☆ |
| 易于 AI 理解 | ⭐⭐☆☆☆ | ⭐⭐⭐⭐⭐ |
| 二次开发体验 | ⭐⭐☆☆☆ | ⭐⭐⭐⭐☆ |

### 具体改善

| 场景 | 当前 | 重构后 |
|------|------|--------|
| AI 读取组件 | 文件太大，需分多次 | 一次读取完整理解 |
| 添加新组件 | 参考现有，结构不一致 | 脚手架一键生成 |
| 写单元测试 | 逻辑在组件内，难 mock | 纯函数直接测试 |
| 定位 bug | 大文件难搜索 | 小文件快速定位 |
| Code Review | 1000+ 行难审查 | 300 行内易审查 |

---

## 风险评估

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|---------|
| 拆分引入 bug | 中 | 高 | 先补测试再拆分 |
| 拆分后性能下降 | 低 | 中 | 性能测试对比 |
| 团队不适应 | 低 | 低 | 文档 + 脚手架降低门槛 |

---

## 决策点

开始前需确认：

1. **拆分优先级**：先拆哪个文件？
   - [ ] App.svelte（核心入口）
   - [ ] DataTable.svelte（最常用组件）
   - [ ] 其他

2. **测试策略**：
   - [ ] 先补测试再拆分（稳健）
   - [ ] 边拆边补测试（快速）

3. **脚手架范围**：
   - [ ] 只支持 data-display
   - [ ] 支持所有 plugin 类型

请确认方案后开始实施。
