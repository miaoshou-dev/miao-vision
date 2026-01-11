# Multi-Page Report Architecture - Evidence.dev Style

## 调研总结

基于 Evidence.dev 的多页面报告系统调研和当前架构分析，本文档提供实现多页面报告的技术架构设计和实施计划。

---

## 一、Evidence.dev 多页面架构核心特性

### 1.1 文件系统路由 (File-based Routing)

```
pages/
├── index.md                    → /
├── sales/
│   ├── index.md               → /sales
│   ├── overview.md            → /sales/overview
│   └── regional.md            → /sales/regional
└── customers/
    ├── [customer_id].md       → /customers/:customer_id (模板页面)
    └── summary.md             → /customers/summary
```

**核心原则**:
- 每个 `.md` 文件 = 一个页面
- 文件夹结构 = URL 层级
- `[param].md` = 动态路由模板

### 1.2 模板页面 (Templated Pages)

```markdown
<!-- pages/customers/[customer_id].md -->
---
title: Customer Profile
---

# Customer: {params.customer_id}

```sql customers
SELECT * FROM customers WHERE id = '${params.customer_id}'
```

<BigValue data={customers} value=total_revenue />
```

**特点**:
- 一个模板生成多个页面
- URL 参数自动注入
- 构建时预生成所有可能页面

### 1.3 导航系统

**自动生成**:
- 基于文件结构自动生成侧边栏
- 面包屑导航
- 页面间链接

**URL 深度链接**:
- 每个页面有唯一 URL
- 支持直接访问
- 浏览器前进/后退

### 1.4 数据共享

**页面间数据共享**:
```markdown
<!-- Page A: 定义全局数据 -->
```sql global_sales
SELECT * FROM sales WHERE year = 2025
```

<!-- Page B: 引用全局数据 -->
```sql
SELECT * FROM global_sales WHERE region = 'APAC'
```
```

**构建时处理**:
- 查询在构建时执行一次
- 结果静态化
- 页面加载超快（毫秒级）

---

## 二、当前架构 vs Evidence.dev

| 特性 | 当前架构 | Evidence.dev | 差距 |
|------|----------|--------------|------|
| **页面模型** | 单页面报告 | 多页面网站 | ⚠️ 需重构 |
| **路由** | 无 | 文件系统路由 | ❌ 缺失 |
| **导航** | 报告列表 | 侧边栏+面包屑 | ⚠️ 需增强 |
| **模板页面** | 不支持 | [param].md | ❌ 缺失 |
| **数据共享** | 块引用 | 跨页面查询 | ⚠️ 需扩展 |
| **URL 访问** | 无 | 深度链接 | ❌ 缺失 |
| **构建模式** | 实时执行 | 预构建静态化 | ⚠️ 可选优化 |

---

## 三、技术架构调整方案

### 3.1 核心架构变更

#### 变更 1: 报告数据结构

**当前**:
```typescript
interface Report {
  id: string
  name: string
  content: string        // 单个 markdown 文档
  metadata: ReportMetadata
  blocks: ReportBlock[]
}
```

**新设计** (多页面):
```typescript
interface Report {
  id: string
  name: string
  rootPath: string       // 报告根路径
  pages: ReportPage[]    // 多个页面
  navigation: NavigationConfig
  sharedData: SharedDataContext
  metadata: ReportMetadata
}

interface ReportPage {
  id: string
  path: string           // 页面路径 (e.g., "/sales/overview")
  fileName: string       // 文件名 (e.g., "overview.md")
  parentPath: string     // 父页面路径
  content: string        // Markdown 内容
  metadata: PageMetadata
  blocks: ReportBlock[]
  isTemplate: boolean    // 是否为模板页面
  templateParams?: string[] // 模板参数 (e.g., ["customer_id"])
}

interface NavigationConfig {
  sidebar: NavItem[]
  breadcrumbs: BreadcrumbItem[]
}

interface NavItem {
  label: string
  path: string
  icon?: string
  children?: NavItem[]
}
```

#### 变更 2: 路由系统

**实现方案**: 使用 **Svelte SPA Router** 或 **Page.js**

```typescript
// src/core/router/index.ts
import Router from 'page'

interface Route {
  pattern: string
  handler: (ctx: RouteContext) => void
}

class ReportRouter {
  private routes: Route[] = []

  // 注册路由
  register(pattern: string, handler: RouteHandler) {
    this.routes.push({ pattern, handler })
    Router(pattern, handler)
  }

  // 导航到页面
  navigate(path: string) {
    Router(path)
  }

  // 获取当前路由参数
  getParams(): Record<string, string> {
    return Router.params
  }
}

// 使用示例
router.register('/reports/:reportId/pages/:pageId', (ctx) => {
  reportStore.loadPage(ctx.params.reportId, ctx.params.pageId)
})

router.register('/reports/:reportId/customers/:customerId', (ctx) => {
  // 模板页面: 渲染 [customerId].md
  reportStore.loadTemplatePage(ctx.params.reportId, 'customers', ctx.params)
})
```

#### 变更 3: 文件结构管理

**存储结构** (localStorage):
```typescript
{
  "miao-vision:reports": {
    "report_abc123": {
      id: "report_abc123",
      name: "Sales Dashboard",
      rootPath: "/reports/sales-dashboard",
      pages: [
        {
          id: "page_001",
          path: "/",
          fileName: "index.md",
          content: "# Welcome...",
          ...
        },
        {
          id: "page_002",
          path: "/overview",
          fileName: "overview.md",
          content: "# Sales Overview...",
          ...
        },
        {
          id: "page_003",
          path: "/customers/[customer_id]",
          fileName: "[customer_id].md",
          isTemplate: true,
          templateParams: ["customer_id"],
          content: "# Customer Profile...",
          ...
        }
      ],
      navigation: {
        sidebar: [
          { label: "Home", path: "/" },
          {
            label: "Sales",
            path: "/sales",
            children: [
              { label: "Overview", path: "/overview" },
              { label: "Regional", path: "/regional" }
            ]
          }
        ]
      }
    }
  }
}
```

#### 变更 4: 组件层级调整

**当前**:
```
App.svelte
└── ReportRenderer.svelte (渲染单个报告)
```

**新架构**:
```
App.svelte
└── ReportLayout.svelte
    ├── ReportSidebar.svelte (导航菜单)
    ├── ReportBreadcrumbs.svelte (面包屑)
    └── Router
        └── PageRenderer.svelte (渲染当前页面)
            ├── BlockRenderer (SQL 块)
            ├── ChartRenderer (图表)
            └── ComponentRenderer (其他组件)
```

---

## 四、实施 TODO 清单

### Phase 1: 架构设计与准备 (1-2 天)

#### P1.1: 数据模型设计
- [ ] 定义 `ReportPage` 接口
- [ ] 定义 `NavigationConfig` 接口
- [ ] 更新 `Report` 接口支持多页面
- [ ] 设计页面路径命名规范
- [ ] 设计模板页面参数注入机制

**产出**: `src/types/multi-page-report.ts`

#### P1.2: 路由方案选型
- [ ] 评估 Svelte SPA Router vs Page.js vs Navaid
- [ ] 原型测试路由库性能
- [ ] 确认与现有架构兼容性
- [ ] 编写路由设计文档

**产出**: `docs/ROUTING_SOLUTION.md`

#### P1.3: 存储结构设计
- [ ] 设计多页面报告的 localStorage 结构
- [ ] 设计页面索引和查找机制
- [ ] 考虑迁移现有单页面报告的方案
- [ ] 设计导出/导入格式

**产出**: `docs/STORAGE_SCHEMA.md`

---

### Phase 2: 路由系统实现 (2-3 天)

#### P2.1: 路由核心
- [ ] 安装路由库 (`npm install page` 或 `svelte-spa-router`)
- [ ] 创建 `src/core/router/index.ts`
- [ ] 实现 `ReportRouter` 类
- [ ] 实现路由注册方法
- [ ] 实现导航方法 (`navigate`, `goBack`)
- [ ] 实现参数解析 (`getParams`)

**文件**: `src/core/router/index.ts` (150-200 行)

#### P2.2: 路由集成
- [ ] 在 `App.svelte` 集成 Router
- [ ] 注册报告页面路由规则
  - `/reports/:reportId` → 报告首页
  - `/reports/:reportId/pages/:pagePath*` → 普通页面
  - `/reports/:reportId/:category/:param` → 模板页面
- [ ] 实现路由守卫 (报告存在性检查)
- [ ] 实现 404 页面

**文件**: `src/App.svelte`, `src/core/router/routes.ts`

#### P2.3: URL 同步
- [ ] 实现 URL 参数 → 页面状态同步
- [ ] 实现页面状态 → URL 同步
- [ ] 支持浏览器前进/后退
- [ ] 支持书签和分享链接

**文件**: `src/core/router/url-sync.ts`

---

### Phase 3: 页面管理系统 (3-4 天)

#### P3.1: 页面 Store
- [ ] 创建 `pageStore.svelte.ts`
- [ ] 实现 `createPage(reportId, path, content)`
- [ ] 实现 `updatePage(reportId, pageId, updates)`
- [ ] 实现 `deletePage(reportId, pageId)`
- [ ] 实现 `getPage(reportId, pageId)`
- [ ] 实现 `getPageByPath(reportId, path)`
- [ ] 实现页面排序和重组

**文件**: `src/app/stores/page.svelte.ts` (400-500 行)

#### P3.2: Report Store 重构
- [ ] 更新 `reportStore` 支持多页面
- [ ] 实现 `loadReport(reportId)` 加载所有页面
- [ ] 实现 `loadPage(reportId, pageId)` 加载单个页面
- [ ] 实现 `currentPage` 状态管理
- [ ] 实现页面切换逻辑
- [ ] 保持向后兼容 (单页面报告)

**文件**: `src/app/stores/report.svelte.ts` (重构)

#### P3.3: 页面编辑器
- [ ] 创建 `PageEditor.svelte` 组件
- [ ] 支持创建新页面
- [ ] 支持编辑页面内容
- [ ] 支持设置页面路径
- [ ] 支持页面元数据编辑 (title, description)
- [ ] 实时预览

**文件**: `src/components/pages/PageEditor.svelte` (300-400 行)

---

### Phase 4: 导航系统 (2-3 天)

#### P4.1: 侧边栏导航
- [ ] 创建 `ReportSidebar.svelte`
- [ ] 实现树形导航结构
- [ ] 支持折叠/展开
- [ ] 高亮当前页面
- [ ] 支持拖拽排序 (可选)
- [ ] 响应式设计 (移动端)

**文件**: `src/components/navigation/ReportSidebar.svelte` (250-300 行)

**UI 设计参考**: Evidence.dev 左侧导航栏

#### P4.2: 面包屑导航
- [ ] 创建 `Breadcrumbs.svelte`
- [ ] 根据当前路径生成面包屑
- [ ] 支持点击跳转
- [ ] 显示页面层级关系

**文件**: `src/components/navigation/Breadcrumbs.svelte` (100-150 行)

#### P4.3: 页面链接
- [ ] 创建 `<Link>` 组件
- [ ] 支持内部页面链接 (`<Link to="/sales/overview">`)
- [ ] 自动高亮当前页面链接
- [ ] 预加载页面数据 (可选)

**文件**: `src/components/navigation/Link.svelte` (80-100 行)

---

### Phase 5: 页面渲染系统 (2-3 天)

#### P5.1: 布局组件
- [ ] 创建 `ReportLayout.svelte`
- [ ] 集成 Sidebar + Breadcrumbs + Content
- [ ] 实现响应式布局
- [ ] 支持隐藏/显示侧边栏
- [ ] 支持全屏模式

**文件**: `src/components/layouts/ReportLayout.svelte` (200-250 行)

#### P5.2: 页面渲染器
- [ ] 创建 `PageRenderer.svelte`
- [ ] 复用现有 `BlockRenderer` 逻辑
- [ ] 实现页面级 Markdown 解析
- [ ] 支持页面元数据显示
- [ ] 优化渲染性能 (虚拟滚动)

**文件**: `src/components/pages/PageRenderer.svelte` (300-400 行)

#### P5.3: 页面切换动画
- [ ] 实现页面切换淡入淡出
- [ ] 实现滑动动画 (可选)
- [ ] 优化切换性能
- [ ] 支持禁用动画

**文件**: `src/components/pages/PageTransition.svelte` (100 行)

---

### Phase 6: 跨页面数据共享 (3-4 天)

#### P6.1: 全局数据上下文
- [ ] 设计 `SharedDataContext` 接口
- [ ] 实现报告级别数据共享
- [ ] 支持跨页面 SQL 块引用
- [ ] 实现数据缓存机制

**文件**: `src/core/data/shared-context.ts` (200-300 行)

**示例**:
```markdown
<!-- Page 1: 定义共享数据 -->
```sql global_sales
SELECT * FROM sales WHERE year = 2025
```

<!-- Page 2: 引用共享数据 -->
```sql
SELECT region, SUM(amount) FROM global_sales GROUP BY region
```
```

#### P6.2: 数据依赖管理
- [ ] 实现页面间数据依赖图
- [ ] 自动检测循环依赖
- [ ] 优化数据加载顺序
- [ ] 实现懒加载 (按需加载页面数据)

**文件**: `src/core/data/dependency-graph.ts` (250-300 行)

#### P6.3: 跨页面 Input 共享
- [ ] 支持报告级别 Input (全局 Input)
- [ ] 支持页面级别 Input (局部 Input)
- [ ] 实现 Input 继承机制
- [ ] URL 参数 → Input 绑定

**文件**: `src/app/stores/global-inputs.svelte.ts` (150-200 行)

---

### Phase 7: 模板页面 (3-4 天)

#### P7.1: 模板页面解析
- [ ] 支持 `[param].md` 文件名解析
- [ ] 提取模板参数 (`[customer_id]`, `[product_id]`)
- [ ] 支持嵌套参数 (`[category]/[id].md`)
- [ ] 验证参数合法性

**文件**: `src/core/template/parser.ts` (200 行)

#### P7.2: 参数注入
- [ ] 实现 `params` 对象注入
- [ ] 支持 `${params.customer_id}` 语法
- [ ] 支持 URL 参数 → SQL 查询绑定
- [ ] 类型检查和验证

**文件**: `src/core/template/param-injector.ts` (180 行)

**示例**:
```markdown
<!-- pages/customers/[customer_id].md -->
# Customer: ${params.customer_id}

```sql customer
SELECT * FROM customers WHERE id = '${params.customer_id}'
```
```

#### P7.3: 动态路由生成
- [ ] 根据数据源生成所有可能路由
- [ ] 实现路由预生成 (构建时)
- [ ] 实现运行时动态路由
- [ ] 性能优化 (缓存)

**文件**: `src/core/template/route-generator.ts` (250 行)

#### P7.4: 模板页面编辑器
- [ ] UI 支持创建模板页面
- [ ] 参数编辑和预览
- [ ] 测试不同参数值
- [ ] 自动提示可用参数

**文件**: `src/components/pages/TemplatePageEditor.svelte` (200 行)

---

### Phase 8: 迁移与兼容性 (2 天)

#### P8.1: 单页面报告迁移
- [ ] 编写迁移脚本
- [ ] 将现有单页面报告转换为多页面格式
- [ ] 自动生成首页 (`index.md`)
- [ ] 保留原有内容和元数据
- [ ] 测试迁移结果

**文件**: `src/core/migration/single-to-multi.ts` (200 行)

#### P8.2: 向后兼容
- [ ] 支持加载旧版单页面报告
- [ ] 自动检测报告类型
- [ ] 提供升级提示
- [ ] 支持两种模式共存

**文件**: `src/core/migration/compatibility.ts` (150 行)

---

### Phase 9: 性能优化 (2-3 天)

#### P9.1: 懒加载
- [ ] 实现页面按需加载
- [ ] 预加载下一页 (预测导航)
- [ ] 卸载未使用页面 (释放内存)
- [ ] 虚拟滚动 (长页面)

**文件**: `src/core/optimization/lazy-loading.ts` (200 行)

#### P9.2: 缓存策略
- [ ] 实现页面渲染缓存
- [ ] 实现 SQL 查询结果缓存
- [ ] LRU 缓存淘汰
- [ ] 缓存失效机制

**文件**: `src/core/optimization/cache.ts` (250 行)

#### P9.3: 构建时优化 (可选)
- [ ] 实现报告预构建
- [ ] 生成静态 HTML
- [ ] 优化加载速度
- [ ] 压缩和 CDN 支持

**文件**: `src/core/build/static-generator.ts` (300 行)

---

### Phase 10: UI/UX 优化 (2 天)

#### P10.1: 导航增强
- [ ] 搜索页面功能
- [ ] 最近访问页面
- [ ] 收藏页面
- [ ] 快捷键支持 (Cmd+K 打开搜索)

**文件**: `src/components/navigation/PageSearch.svelte` (200 行)

#### P10.2: 编辑体验
- [ ] 页面管理器 (新建/删除/重命名页面)
- [ ] 拖拽调整页面顺序
- [ ] 批量操作 (复制/移动/删除)
- [ ] 页面模板库

**文件**: `src/components/pages/PageManager.svelte` (350 行)

#### P10.3: 响应式设计
- [ ] 移动端导航抽屉
- [ ] 触摸手势支持
- [ ] 自适应布局
- [ ] 暗黑模式支持

---

### Phase 11: 测试与文档 (2-3 天)

#### P11.1: 单元测试
- [ ] 路由系统测试
- [ ] 页面 Store 测试
- [ ] 模板页面解析测试
- [ ] 数据共享测试

**文件**: `src/**/*.test.ts`

#### P11.2: 集成测试
- [ ] 页面创建和删除
- [ ] 页面导航流程
- [ ] 跨页面数据引用
- [ ] 模板页面生成

**文件**: `tests/integration/**/*.test.ts`

#### P11.3: 用户文档
- [ ] 多页面报告快速入门
- [ ] 模板页面使用指南
- [ ] API 文档
- [ ] 最佳实践

**文件**: `docs/USER_GUIDE_MULTI_PAGE.md`

---

## 五、技术风险与挑战

### 5.1 风险评估

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| 路由库性能问题 | 高 | 中 | 选型时充分测试,考虑自研轻量级路由 |
| 跨页面数据共享复杂 | 高 | 高 | 设计清晰的依赖图,限制共享范围 |
| 迁移现有报告困难 | 中 | 中 | 编写自动化迁移脚本,提供回退机制 |
| 内存占用增加 | 中 | 高 | 实现懒加载和页面卸载机制 |
| UI 一致性问题 | 低 | 中 | 制定设计规范,复用现有组件 |

### 5.2 技术挑战

#### 挑战 1: 状态管理复杂度
- **问题**: 多页面 + 多 Input + 跨页面数据共享
- **解决**: 使用 Svelte Stores 分层管理
  - `reportStore` - 报告级别
  - `pageStore` - 页面级别
  - `inputStore` - Input 状态
  - `sharedDataStore` - 共享数据

#### 挑战 2: 性能瓶颈
- **问题**: 大型报告 (50+ 页面) 加载慢
- **解决**:
  - 懒加载页面
  - 虚拟列表渲染
  - Web Worker 处理 Markdown 解析

#### 挑战 3: 向后兼容
- **问题**: 现有单页面报告如何处理
- **解决**:
  - 自动检测报告类型
  - 提供迁移工具
  - 支持两种模式共存

---

## 六、时间估算

| 阶段 | 工作量 | 开发时间 |
|------|--------|----------|
| Phase 1: 架构设计 | 小 | 1-2 天 |
| Phase 2: 路由系统 | 中 | 2-3 天 |
| Phase 3: 页面管理 | 大 | 3-4 天 |
| Phase 4: 导航系统 | 中 | 2-3 天 |
| Phase 5: 页面渲染 | 中 | 2-3 天 |
| Phase 6: 数据共享 | 大 | 3-4 天 |
| Phase 7: 模板页面 | 大 | 3-4 天 |
| Phase 8: 迁移兼容 | 小 | 2 天 |
| Phase 9: 性能优化 | 中 | 2-3 天 |
| Phase 10: UI/UX | 中 | 2 天 |
| Phase 11: 测试文档 | 中 | 2-3 天 |

**总计**: 24-32 个工作日 (约 5-6 周)

---

## 七、优先级建议

### MVP (最小可行产品) - 2 周

**必须实现**:
- ✅ Phase 1: 架构设计
- ✅ Phase 2: 路由系统
- ✅ Phase 3: 页面管理 (基础 CRUD)
- ✅ Phase 4: 导航系统 (侧边栏)
- ✅ Phase 5: 页面渲染

**产出**: 基础多页面报告功能,支持创建和导航多个页面

### V1.0 (完整功能) - 5 周

**增加功能**:
- ✅ Phase 6: 数据共享
- ✅ Phase 7: 模板页面
- ✅ Phase 8: 迁移兼容
- ✅ Phase 9: 性能优化
- ✅ Phase 10: UI/UX 优化
- ✅ Phase 11: 测试文档

**产出**: 功能完整的多页面报告系统,媲美 Evidence.dev

---

## 八、参考资料

### Evidence.dev 官方文档
- [What is Evidence?](https://docs.evidence.dev/)
- [Evidence.dev 主站](https://evidence.dev/)
- [Power BI Drill Through 对比](https://evidence.dev/learn/power-bi-drill-through)
- [GitHub - Evidence 开源项目](https://github.com/evidence-dev/evidence)

### 技术选型参考
- [Svelte SPA Router](https://github.com/ItalyPaleAle/svelte-spa-router)
- [Page.js](https://github.com/visionmedia/page.js)
- [Navaid](https://github.com/lukeed/navaid)

### 设计参考
- Evidence.dev 示例项目: https://evidence.dev/examples
- Evidence.dev 组件库: https://docs.evidence.dev/components/all-components

---

## 九、下一步行动

### 立即开始
1. **评审本文档** - 与团队讨论技术方案
2. **确认优先级** - MVP vs V1.0
3. **选择路由库** - 完成技术选型
4. **创建 Issue** - 在 GitHub 创建 Milestone 和 Issues
5. **开始 Phase 1** - 架构设计与数据模型定义

### 关键决策点
- [ ] 是否采用构建时预生成 (类似 Evidence.dev) ?
- [ ] 是否支持 Markdown 文件导入导出 ?
- [ ] 是否实现协作编辑 (多人同时编辑) ?
- [ ] 是否支持版本控制集成 (Git) ?

---

**文档版本**: v1.0
**创建日期**: 2025-12-28
**作者**: Claude Code
**最后更新**: 2025-12-28
