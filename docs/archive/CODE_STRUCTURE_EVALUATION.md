# 代码结构评估方案

## 项目现状概览

| 指标 | 数值 | 评价 |
|------|------|------|
| 总代码量 | 92,489 行 | 中大型项目 |
| TypeScript | 48,557 行 (448 文件) | - |
| Svelte | 43,932 行 (141 文件) | - |
| 测试文件 | 33 个 | 覆盖率偏低 |
| Data-display 插件 | 27+ 组件 | 丰富 |
| 最大文件 | 2,586 行 | 超标严重 |

---

## 一、易于扩展性评估

### 1.1 当前架构

```
src/
├── types/           # 类型定义（底层）
├── core/            # 核心逻辑（14 个模块）
│   ├── registry/    # 组件注册
│   ├── engine/      # 执行引擎
│   ├── database/    # 数据库
│   ├── markdown/    # Markdown 解析
│   ├── connectors/  # 数据连接器
│   └── shared/      # 共享工具
├── plugins/         # 插件（50+ 组件）
│   ├── data-display/
│   ├── inputs/
│   ├── ui/
│   └── layout/
├── app/stores/      # 状态管理
├── bootstrap/       # 初始化
└── components/      # 应用组件
```

### 1.2 优点 ✅

| 优点 | 说明 |
|------|------|
| 分层清晰 | core → plugins → app 单向依赖 |
| 插件化架构 | 新组件只需创建 plugin 目录 |
| 依赖隔离 | core 不依赖 plugins（已验证） |
| 路径别名 | @core, @plugins, @app 清晰 |

### 1.3 问题 ❌

| 问题 | 严重程度 | 说明 |
|------|---------|------|
| 文件过大 | 🔴 严重 | App.svelte 1887行, DataTable.svelte 1723行 |
| core 模块过多 | 🟡 中等 | 14 个子模块，职责边界模糊 |
| 插件结构不一致 | 🟡 中等 | 有的有 metadata.ts，有的没有 |
| 缺少插件模板 | 🟡 中等 | 新开发者不知道如何创建插件 |

### 1.4 扩展性评分：⭐⭐⭐☆☆ (3/5)

---

## 二、易于测试性评估

### 2.1 当前测试分布

```
src/core/shared/pure/           # 纯函数（有测试）✅
├── block-utils.test.ts
├── contracts.test.ts
├── dependency-analysis.test.ts
└── template-utils.test.ts

src/plugins/                    # 插件（几乎无测试）❌
src/components/                 # 组件（无测试）❌
src/core/engine/               # 引擎（部分测试）🟡
```

### 2.2 问题分析

| 问题 | 严重程度 | 说明 |
|------|---------|------|
| 测试覆盖率低 | 🔴 严重 | 33 个测试文件 vs 589 个源文件 (~5%) |
| 纯函数比例低 | 🔴 严重 | 大部分逻辑在 Svelte 组件中 |
| 副作用耦合 | 🟡 中等 | DuckDB, DOM 操作混在业务逻辑中 |
| 缺少 Mock 基础设施 | 🟡 中等 | 难以隔离测试 |

### 2.3 可测试性评分：⭐⭐☆☆☆ (2/5)

---

## 三、易于 AI 理解性评估

### 3.1 AI 理解的关键因素

| 因素 | 当前状态 | 说明 |
|------|---------|------|
| 文件大小 | ❌ 差 | 大文件超出 AI 上下文窗口 |
| 函数长度 | ❌ 差 | 很多函数超过 50 行 |
| 命名清晰度 | ✅ 好 | 命名有意义 |
| 注释/文档 | 🟡 中等 | 部分有 JSDoc |
| 单一职责 | ❌ 差 | 组件职责过多 |
| 类型完整性 | ✅ 好 | TypeScript 严格模式 |

### 3.2 具体问题

**大文件问题（AI 上下文限制）：**
```
InfographicDemo.svelte  2,586 行  ❌ 无法一次读取
App.svelte              1,887 行  ❌ 难以理解全貌
DataTable.svelte        1,723 行  ❌ 逻辑过于复杂
ResultsChart.svelte     1,382 行  ❌ 需要拆分
```

**复杂函数问题：**
- 很多函数超过 100 行
- 嵌套层级过深（超过 3 层）
- 副作用与纯逻辑混合

### 3.3 AI 理解性评分：⭐⭐☆☆☆ (2/5)

---

## 四、改进方案

### 方案 A：渐进式重构（推荐）

**目标：** 保持现有架构，逐步改善质量

#### Phase 1：拆分大文件（1-2 周）

| 文件 | 行数 | 拆分策略 |
|------|------|---------|
| App.svelte | 1887 | 拆为 AppLayout + AppRouter + AppHeader |
| DataTable.svelte | 1723 | 拆为 TableCore + TableHeader + TableBody + TablePagination |
| ResultsChart.svelte | 1382 | 拆为 ChartSelector + ChartRenderer + ChartOptions |

**目标：每个文件 < 300 行**

#### Phase 2：提取纯函数（2-3 周）

```
src/core/shared/pure/           # 扩展纯函数库
├── chart-utils.ts              # 图表数据处理
├── table-utils.ts              # 表格数据处理
├── format-utils.ts             # 格式化工具
├── validation-utils.ts         # 验证工具
└── transform-utils.ts          # 数据转换
```

**原则：**
- 每个 Svelte 组件 → 业务逻辑提取到 pure/
- 组件只负责渲染 + 事件绑定

#### Phase 3：补充测试（持续）

```
测试覆盖率目标：
- core/shared/pure/  → 90%+
- core/engine/       → 70%+
- core/registry/     → 70%+
- plugins/           → 50%+ (定义层)
```

#### Phase 4：统一插件结构

```
plugins/category/component-name/
├── index.ts              # 导出
├── Component.svelte      # UI（< 200 行）
├── definition.ts         # 注册定义
├── metadata.ts           # 元数据
├── types.ts              # 类型
├── logic.ts              # 业务逻辑（纯函数）
└── Component.test.ts     # 测试
```

---

### 方案 B：架构重设计（高风险）

**目标：** 彻底重构为更清晰的分层

```
src/
├── domain/              # 领域层（纯业务逻辑）
│   ├── chart/          # 图表领域
│   ├── table/          # 表格领域
│   ├── report/         # 报表领域
│   └── query/          # 查询领域
├── infrastructure/      # 基础设施层
│   ├── database/       # 数据库
│   ├── storage/        # 存储
│   └── http/           # HTTP
├── application/         # 应用层（用例）
│   ├── use-cases/
│   └── services/
├── presentation/        # 展示层
│   ├── components/
│   └── pages/
└── shared/             # 共享
    ├── types/
    └── utils/
```

**风险：** 改动量大，容易引入 bug，不推荐

---

## 五、推荐行动计划

### 立即行动（本周）

1. **拆分 App.svelte**
   - 提取 Header, Sidebar, Router 为独立组件
   - 目标：< 500 行

2. **拆分 DataTable.svelte**
   - 提取 TableHeader, TableBody, Pagination
   - 将数据处理逻辑移到 `table-utils.ts`

### 短期（2 周内）

3. **建立纯函数规范**
   - 创建 `src/core/shared/pure/` 扩展指南
   - 每个新功能必须有对应的纯函数 + 测试

4. **统一插件模板**
   - 创建 `scripts/create-plugin.ts` 脚手架
   - 文档化插件开发流程

### 中期（1 个月）

5. **测试覆盖率提升**
   - 目标：core/shared/pure/ 90%
   - CI 集成覆盖率检查

6. **文件大小 CI 检查**
   - 超过 300 行警告
   - 超过 500 行阻止合并

---

## 六、评估总结

| 维度 | 当前评分 | 目标评分 | 关键改进 |
|------|---------|---------|---------|
| 易于扩展 | ⭐⭐⭐☆☆ | ⭐⭐⭐⭐☆ | 统一插件结构 |
| 易于测试 | ⭐⭐☆☆☆ | ⭐⭐⭐⭐☆ | 提取纯函数 + 补测试 |
| 易于 AI 理解 | ⭐⭐☆☆☆ | ⭐⭐⭐⭐☆ | 拆分大文件 |

**总体评分：⭐⭐☆☆☆ (2.3/5) → 目标 ⭐⭐⭐⭐☆ (4/5)**

**核心原则：**
1. 每个文件 < 300 行
2. 每个函数 < 50 行
3. 业务逻辑 = 纯函数
4. UI 组件 = 渲染 + 事件
5. 纯函数必须有测试
