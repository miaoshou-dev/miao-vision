# 代码结构改进方案 v2

## 一、现状评分

| 维度 | 评分 | 核心问题 |
|------|------|---------|
| 易于扩展 | ⭐⭐⭐☆☆ | 插件结构不统一，无脚手架 |
| 易于测试 | ⭐⭐☆☆☆ | 逻辑在组件内，纯函数少 |
| 易于 AI 理解 | ⭐⭐☆☆☆ | 大文件多（10+ 文件超 500 行） |

---

## 二、核心问题

### 问题 1：大文件（阻碍 AI 理解）

```
App.svelte           1,887 行  ← AI 无法一次读取
DataTable.svelte     1,723 行  ← 职责过多
ResultsChart.svelte  1,382 行  ← 逻辑与 UI 混合
```

### 问题 2：纯函数少（阻碍测试）

```
当前测试覆盖率: ~5%
原因: 90% 逻辑在 Svelte 组件内，难以单元测试
```

### 问题 3：插件不一致（阻碍扩展）

```
bigvalue/     有 formatter.ts
bar-chart/    无 logic.ts
datatable/    结构完全不同
```

---

## 三、改进方案

### 方案核心：三层分离

```
┌─────────────────────────────────────────┐
│  UI 层 (Svelte)                         │
│  - 只做渲染和事件绑定                      │
│  - 每个文件 < 200 行                      │
└─────────────────┬───────────────────────┘
                  │ 调用
┌─────────────────▼───────────────────────┐
│  逻辑层 (Pure TypeScript)               │
│  - 纯函数，无副作用                        │
│  - 100% 可测试                           │
└─────────────────┬───────────────────────┘
                  │ 使用
┌─────────────────▼───────────────────────┐
│  类型层 (TypeScript Interfaces)         │
│  - 所有类型定义                           │
│  - 契约明确                              │
└─────────────────────────────────────────┘
```

---

## 四、实施步骤

### Step 1: 建立标准插件结构

```
plugins/data-display/example/
├── Example.svelte      # UI（< 200 行）
├── logic.ts            # 纯函数（可测试）
├── logic.test.ts       # 测试
├── types.ts            # 类型
├── definition.ts       # 注册
├── metadata.ts         # 元数据
└── index.ts            # 导出
```

### Step 2: 创建脚手架

```bash
npm run create-plugin <name> <category>

# 例如
npm run create-plugin my-chart data-display
```

### Step 3: 拆分大文件

| 文件 | 拆分为 |
|------|--------|
| DataTable.svelte | TableCore + TableHeader + TableBody + logic.ts |
| App.svelte | AppShell + AppRouter + AppSidebar |
| ResultsChart.svelte | ChartSelector + ChartRenderer + chart-logic.ts |

### Step 4: 提取纯函数

```typescript
// 之前: 组件内
<script>
  function sortData(data, col) { /* 100 行 */ }
  function filterData(data, query) { /* 80 行 */ }
</script>

// 之后: logic.ts
export const sortData = (data, col) => { /* 纯函数 */ }
export const filterData = (data, query) => { /* 纯函数 */ }

// 组件只调用
<script>
  import { sortData, filterData } from './logic'
</script>
```

### Step 5: 补充测试

```
目标覆盖率:
- logic.ts 文件: 90%+
- 工具函数: 80%+
- 组件: 不强求（E2E 覆盖）
```

---

## 五、规范制定

### 文件大小规范

| 类型 | 最大行数 | 说明 |
|------|---------|------|
| Svelte 组件 | 200 行 | 只做渲染 |
| 逻辑文件 | 300 行 | 纯函数 |
| 类型文件 | 200 行 | 接口定义 |
| 测试文件 | 500 行 | 可以长一些 |

### 函数规范

| 规则 | 说明 |
|------|------|
| 单一职责 | 一个函数只做一件事 |
| 最大 30 行 | 超过就拆分 |
| 无副作用 | 相同输入 = 相同输出 |
| 有类型 | 参数和返回值必须有类型 |

### 命名规范

```typescript
// 纯函数: 动词开头
processChartData()
formatCurrency()
validateConfig()

// 组件: 名词
DataTable.svelte
ChartSelector.svelte

// 类型: 名词 + 后缀
interface ChartConfig {}
type ProcessedData = {}
```

---

## 六、预期收益

| 场景 | 当前 | 改进后 |
|------|------|--------|
| AI 读代码 | 分多次，易遗漏 | 一次完整理解 |
| 写测试 | 需 mock 整个组件 | 直接测纯函数 |
| 加新组件 | 复制粘贴改 | 脚手架一键生成 |
| Code Review | 1000 行难审 | 200 行易审 |
| 定位 Bug | 大海捞针 | 快速定位 |

---

## 七、执行计划

| 阶段 | 任务 | 时间 |
|------|------|------|
| **Week 1** | 定义规范 + 创建脚手架 | 2 天 |
| **Week 1** | 重构 1 个示例插件（bar-chart） | 1 天 |
| **Week 2** | 拆分 DataTable.svelte | 2 天 |
| **Week 2** | 拆分 App.svelte | 2 天 |
| **Week 3** | 补充测试 + CI 配置 | 2 天 |

**总计: 9 天**

---

## 八、成功标准

- [ ] 无文件超过 300 行
- [ ] 所有插件结构统一
- [ ] logic.ts 测试覆盖率 > 80%
- [ ] 脚手架可用
- [ ] CI 阻止大文件合入

---

## 九、决策需求

请确认：

1. **优先级**: 先改哪个？
   - A. 先建脚手架（提升扩展性）
   - B. 先拆大文件（提升 AI 理解）
   - C. 先补测试（提升可测试性）

2. **示范组件**: 用哪个做示范？
   - A. bar-chart（简单）
   - B. datatable（复杂但常用）

确认后开始执行。
