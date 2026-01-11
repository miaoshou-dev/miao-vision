# 测试改进 TODO List

## 🔴 P0 - 高优先级 (Critical)

### ✅ 1. 修复测试覆盖率配置 (已完成)
**状态**: ✅ 已完成 (2024-12-24)

**问题**: `vitest.config.ts` 中的覆盖率路径已过时，导致覆盖率报告显示 0%

**已修复配置**:
```typescript
include: [
  'src/core/**/*.ts',
  'src/plugins/**/*.ts',
  'src/app/**/*.ts'
],
exclude: [
  '**/*.test.ts',
  '**/*.spec.ts',
  '**/*.d.ts',
  '**/index.ts',
  '**/types.ts',
  '**/metadata.ts',
  '**/definition.ts',
  '**/*.svelte'
],
thresholds: {
  lines: 25,
  functions: 25,
  branches: 20,
  statements: 25
}
```

**实际收益**: 获得准确的代码覆盖率报告
- **当前覆盖率**: 20.02% (lines)
- **测试数量**: 862 tests (100% passing)
- **设置增量目标**: 25% threshold for gradual improvement

---

### ✅ 2. 为新创建的 BubbleChart 组件添加单元测试 (已完成)
**状态**: ✅ 已完成 (2024-12-24)

**已创建**: `src/plugins/data-display/bubble-chart/bubble-chart.test.ts`

**测试覆盖** (43 tests):
```typescript
describe('BubbleChart Component', () => {
  // ✅ 值格式化 (4 tests)
  describe('formatValue')

  // ✅ 数据验证 (9 tests)
  describe('validateBubbleChartData')

  // ✅ 数据构建 (18 tests)
  describe('buildBubbleChartData')
    - Basic bubble building
    - Group extraction and coloring
    - Range calculation with padding
    - Radius calculation
    - Edge cases (empty, single, equal values)
    - String number parsing
    - Custom configurations

  // ✅ 元数据测试 (10 tests)
  describe('BubbleChartMetadata')

  // ✅ 组件注册 (5 tests)
  describe('bubbleChartRegistration')
})
```

**代码重构**:
- 导出可测试函数: `formatValue()`, `validateBubbleChartData()`, `buildBubbleChartData()`
- 遵循 heatmap 测试模式
- 所有测试通过 ✅

**工作量**: ~3 hours (实际)
**测试增加**: +43 tests (总计 862)

---

### 3. DataTable 组件单元测试
**缺失**: `src/plugins/data-display/datatable/` 核心逻辑没有单元测试

**复杂度**: DataTable 是最复杂的组件之一 (1600+ lines)

**需要测试的核心功能**:
- 数据排序 (sorting)
- 数据筛选 (filtering)
- 虚拟滚动 (virtual scrolling)
- 列冻结 (frozen columns)
- 导出功能 (CSV/Excel/JSON - 已经修复过导出格式bug)
- HTML清理 (stripHTML - 新增功能)
- 分页 (pagination)

**建议**: 拆分为多个测试文件
```
src/plugins/data-display/datatable/
├── datatable-sort.test.ts      # 排序逻辑
├── datatable-filter.test.ts    # 筛选逻辑
├── datatable-export.test.ts    # 导出功能 (包括 stripHTML, getExportValue)
├── datatable-virtual.test.ts   # 虚拟滚动计算
└── datatable-format.test.ts    # 格式化逻辑
```

**工作量**: ~8-10 hours
**优先级**: P0 (核心组件，有复杂业务逻辑，已发现并修复多个bug)

---

## 🟡 P1 - 中优先级 (Important)

### 4. BarChart 和 PieChart 单元测试
**缺失**: 基础图表组件没有测试

**需要创建**:
- `src/plugins/data-display/bar-chart/bar-chart.test.ts`
- `src/plugins/data-display/pie-chart/pie-chart.test.ts`

**工作量**: ~3-4 hours (参考现有图表测试模式)
**优先级**: P1

---

### 5. Map 组件单元测试
**缺失**:
- `src/plugins/maps/area-map/area-map.test.ts`
- `src/plugins/maps/point-map/point-map.test.ts`
- `src/plugins/maps/bubble-map/bubble-map.test.ts`

**工作量**: ~4-5 hours
**优先级**: P1

---

### 6. Input 组件单元测试
**缺失**: 所有 input 组件的交互逻辑
- ButtonGroup, Checkbox, DateRange, Dropdown, Slider, TextInput, DimensionGrid

**当前**: 只有 `use-input.test.ts` 测试了 hook 逻辑

**需要**: 测试每个组件的:
- 值变化逻辑
- 验证逻辑
- 事件触发
- 状态管理

**工作量**: ~6-8 hours
**优先级**: P1

---

### 7. 核心 Store 单元测试
**缺失**: `src/app/stores/` 没有任何测试

**需要创建**:
- `src/app/stores/report.test.ts` - 报告状态管理
- `src/app/stores/database.test.ts` - 数据库连接状态
- `src/app/stores/chart.test.ts` - 图表状态
- `src/app/stores/inputs.test.ts` - 输入状态同步

**关键测试场景**:
```typescript
describe('reportStore', () => {
  test('createReport: should generate unique ID')
  test('updateContent: should prevent race conditions') // 已有防护代码
  test('loadReport: should load from localStorage')
  test('deleteReport: should clean up state')
  test('executeReport: should update execution status')
})
```

**工作量**: ~6-8 hours
**优先级**: P1 (状态管理是应用核心)

---

## 🟢 P2 - 一般优先级 (Nice to Have)

### 8. 核心引擎层单元测试
**缺失**:
- `src/core/database/` - DuckDB WASM 管理器
- `src/core/engine/` - 渲染引擎
- `src/core/registry/` - 组件注册系统
- `src/core/services/` - 图表服务

**挑战**: 这些模块有外部依赖 (DuckDB, Mosaic)

**建议**: 使用 mock 策略
```typescript
// Example
vi.mock('@duckdb/duckdb-wasm', () => ({
  AsyncDuckDB: vi.fn()
}))
```

**工作量**: ~12-15 hours
**优先级**: P2 (复杂度高，可后置)

---

### 9. UI 组件单元测试
**缺失**: Accordion, Alert, Details, Modal, Note, Tabs, Tooltip

**工作量**: ~4-6 hours
**优先级**: P2

---

### 10. 导出功能单元测试
**缺失**: `src/core/export/`

**工作量**: ~2-3 hours
**优先级**: P2

---

## 🔵 P3 - 组件测试 (Component Tests)

### 11. 引入 Svelte Component Testing
**当前问题**: 零组件测试，所有组件只在浏览器中手动测试

**建议方案**: 使用 **Vitest + @testing-library/svelte**

**配置步骤**:
1. 安装依赖:
```bash
npm install -D @testing-library/svelte @testing-library/jest-dom
```

2. 创建首个组件测试示例:
```typescript
// src/plugins/data-display/bigvalue/BigValue.spec.ts
import { render, screen } from '@testing-library/svelte'
import { describe, test, expect } from 'vitest'
import BigValue from './BigValue.svelte'

describe('BigValue Component', () => {
  test('renders value correctly', () => {
    render(BigValue, {
      props: {
        data: { value: 1234.56 },
        config: { format: '#,##0.00' }
      }
    })

    expect(screen.getByText('1,234.56')).toBeInTheDocument()
  })

  test('applies comparison class correctly', () => {
    const { container } = render(BigValue, {
      props: {
        data: { value: 100, comparison: 20 },
        config: {}
      }
    })

    expect(container.querySelector('.positive')).toBeInTheDocument()
  })
})
```

**优先组件**:
- BigValue (最简单，适合入门)
- Alert, Note (UI组件)
- Delta (带状态逻辑)
- DataTable (复杂交互，高优先级)

**工作量**: ~20-30 hours (整个组件测试体系)
**优先级**: P3 (长期投资，回报高)

---

## 🔵 P4 - E2E 测试完善

### 12. 修复 BubbleChart E2E 测试
**问题**: 测试无法正确导航到报告视图并执行渲染

**根本原因**:
1. 应用有复杂的视图切换逻辑 (Workspace vs Report view)
2. 报告创建需要通过 UI 交互，无法完全通过 JavaScript API

**建议方案 A - 简化测试**:
只测试最终渲染的 DOM 结构，不测试完整工作流:
```typescript
test('BubbleChart component exists in app', async ({ page }) => {
  // 直接注入已渲染的 HTML (via fixture)
  await page.setContent(bubbleChartFixtureHTML)

  const chart = page.locator('.bubble-chart-container')
  await expect(chart).toBeVisible()

  const bubbles = page.locator('.bubble')
  expect(await bubbles.count()).toBeGreaterThan(0)
})
```

**建议方案 B - 完整工作流** (需要深入理解应用):
1. 研究应用的 tab 切换机制
2. 找到正确的 selector 触发视图切换
3. 等待 Monaco 编辑器初始化
4. 注入内容并触发执行

**工作量**:
- 方案 A: 2-3 hours
- 方案 B: 6-8 hours

**优先级**: P4 (E2E测试维护成本高，优先级低于单元测试)

---

### 13. 添加更多 E2E 测试
**当前**: 只有 2 个smoke tests

**建议新增**:
- DataTable 导出流程 E2E 测试 (CSV/Excel/JSON)
- Input 组件联动测试 (Dropdown → DataTable 过滤)
- SQL 查询执行流程测试
- 数据上传 → 查询 → 可视化 完整流程

**工作量**: ~15-20 hours
**优先级**: P4

---

## 📊 建议实施路线图

### Phase 1 (Week 1-2): 修复基础设施 + 核心组件
- [x] ✅ E2E 基础设施 (已完成 - 2024-12-24)
- [x] ✅ P0-1: 修复覆盖率配置 (已完成 - 2024-12-24)
- [x] ✅ P0-2: BubbleChart 单元测试 (已完成 - 2024-12-24)
- [ ] 🔴 P0-3: DataTable 单元测试套件

**进度**: 3/4 完成 (75%)
**当前覆盖率**: 20.02% → 目标 35%
**下一步**: DataTable 测试套件预计可提升覆盖率至 25-30%

---

### Phase 2 (Week 3-4): 补齐基础组件
- [ ] 🟡 P1-4: BarChart + PieChart 测试
- [ ] 🟡 P1-5: Map 组件测试
- [ ] 🟡 P1-6: Input 组件测试

**目标**: 覆盖率 50% → 65%

---

### Phase 3 (Week 5-6): Store + 引擎层
- [ ] 🟡 P1-7: 核心 Store 测试
- [ ] 🟢 P2-8: 引擎层测试 (部分)

**目标**: 覆盖率 65% → 75%

---

### Phase 4 (Long-term): 组件测试体系
- [ ] 🔵 P3-11: 引入 Svelte Component Testing
- [ ] 逐步为关键组件添加组件测试

**目标**: 建立完整测试金字塔

---

## 🎯 成功指标 (KPIs)

| 指标 | 当前 (2024-12-24) | 6个月目标 |
|------|------|----------|
| 单元测试数量 | 862 | 1500+ |
| 单元测试覆盖率 | 20.02% | 75%+ |
| 组件测试覆盖率 | 0% | 40%+ |
| E2E 测试用例数 | 2 (smoke) + 8 (pending) | 15+ |
| 测试执行时间 | ~13s (unit) | <30s |
| 每周测试通过率 | 100% ✅ | 100% |
| Bug 发现 (测试中) | 0 | 3-5/month |

**更新说明**:
- ✅ 覆盖率配置已修复，获得准确的 20.02% 基线
- ✅ 测试数量从 819 增加到 862 (+43 BubbleChart tests)
- ⚠️ 覆盖率低于预期，主要因为 definition.ts 文件被排除在覆盖率统计之外
- 📈 设置增量阈值 (25%) 以逐步提升

---

## 💡 最佳实践建议

### 1. 测试金字塔原则
```
        E2E (10%)
       /         \
    Component (30%)
   /               \
  Unit Tests (60%)
```

**当前倒置**: E2E 刚起步，组件测试为零

**建议**: 先补齐底层单元测试，再向上构建

---

### 2. TDD (Test-Driven Development) for 新功能
**从现在开始**: 所有新组件/功能必须先写测试

**示例流程**:
```
1. 创建 component.test.ts (红灯)
2. 实现最小功能 (绿灯)
3. 重构优化 (保持绿灯)
4. 创建 component.svelte
5. 手动测试 + E2E 测试
```

---

### 3. CI/CD 集成
**建议添加 GitHub Actions**:
```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run test:run
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

---

### 4. 测试数据管理
**建议**: 创建统一的测试数据工厂

```typescript
// src/test-utils/factories.ts
export const createMockBubbleData = (overrides = {}) => ({
  x: 10,
  y: 20,
  size: 100,
  label: 'Test Bubble',
  group: 'A',
  ...overrides
})

export const createMockTableData = (rows = 10) => {
  return Array.from({ length: rows }, (_, i) => ({
    id: i,
    name: `Item ${i}`,
    value: Math.random() * 100
  }))
}
```

---

## 📝 结论

**总体评价** (更新于 2024-12-24):
- ✅ 单元测试基础扎实 (862 tests passing, 100%)
- ✅ 覆盖率工具配置已修复，获得准确基线 (20.02%)
- ✅ BubbleChart 组件测试完成 (43 tests, 遵循最佳实践)
- ❌ 组件测试完全缺失
- ⚠️ E2E 测试刚起步，需完善

**Phase 1 进度**: 3/4 完成 (75%)
- ✅ E2E 基础设施
- ✅ 覆盖率配置修复
- ✅ BubbleChart 单元测试
- ⏳ DataTable 测试套件 (下一步)

**最紧急任务** (本周):
1. ~~🔴 修复 vitest 覆盖率配置~~ ✅ 已完成
2. ~~🔴 为 BubbleChart 添加单元测试~~ ✅ 已完成
3. 🔴 开始 DataTable 测试套件 (export, formatter, operations)

**长期投资** (3-6个月):
- 建立完整的组件测试体系
- 达到 75%+ 代码覆盖率
- 集成 CI/CD 自动化测试

---

**技术专家建议**:
- ✅ Phase 1 进展良好，覆盖率基线已确立
- 📊 当前覆盖率 (20.02%) 低于预期主要是因为 definition.ts 被排除，这是合理的设计选择
- 🎯 下一优先级: DataTable 测试（复杂度高，已有bug修复历史）
- 💡 建议: 继续 Phase 1 完成后，启动 Phase 2 (图表组件) 和 Phase 4 (组件测试体系) 并行推进

**已完成的里程碑** 🎉:
- 测试基础设施完善
- 获得准确的覆盖率基线
- 建立图表组件测试模式 (BubbleChart 可作为模板)
