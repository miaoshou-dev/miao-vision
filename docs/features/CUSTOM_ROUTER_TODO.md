# 自研路由系统实施 TODO

## 总览

**目标**: 实现轻量级、零依赖的多页面路由系统，支持 Markdown 页面、侧边栏导航和面包屑

**核心代码量**: ~910 行
**预计时间**: 3-4 天

---

## Phase 1: 核心路由系统 (1 天)

### P1.1: 路由匹配器 (`matcher.ts`)
**文件**: `src/core/router/matcher.ts` (150 行)

**任务**:
- [ ] 定义 TypeScript 接口
  - [ ] `RouteParams` - 路由参数类型
  - [ ] `RouteMatch` - 匹配结果类型
  - [ ] `Route` - 路由定义类型
- [ ] 实现 `RouteMatcher` 类
  - [ ] `register(route)` - 注册路由
  - [ ] `match(path)` - 匹配路径
  - [ ] `matchPattern(pattern, path)` - 单个模式匹配
  - [ ] `buildPath(pattern, params)` - 生成路径
- [ ] 支持动态参数 (`:param`)
- [ ] 支持通配符 (`*`)
- [ ] URL 编码/解码处理

**测试**:
```typescript
const matcher = new RouteMatcher()
matcher.register({ pattern: '/users/:id' })

// 测试匹配
matcher.match('/users/123')  // → { params: { id: '123' } }
matcher.match('/posts/456')  // → null

// 测试路径生成
matcher.buildPath('/users/:id', { id: '123' })  // → '/users/123'
```

**预计时间**: 2-3 小时

---

### P1.2: 路由状态管理 (`state.svelte.ts`)
**文件**: `src/core/router/state.svelte.ts` (120 行)

**任务**:
- [ ] 创建 `RouterState` 类
- [ ] 实现 Svelte 5 Runes 状态
  - [ ] `currentPath = $state()` - 当前路径
  - [ ] `currentMatch = $state()` - 当前匹配
  - [ ] `params = $derived()` - 路由参数
  - [ ] `query = $state()` - 查询参数
  - [ ] `hash = $state()` - Hash
  - [ ] `isNavigating = $state()` - 导航状态
  - [ ] `history = $state([])` - 历史记录
- [ ] 实现导航方法
  - [ ] `navigate(path, options)` - 导航到路径
  - [ ] `back()` - 后退
  - [ ] `forward()` - 前进
- [ ] 监听 `popstate` 事件 (浏览器前进/后退)
- [ ] 集成 `RouteMatcher`
- [ ] 导出全局单例 `router`

**关键实现**:
```typescript
class RouterState {
  currentPath = $state<string>(window.location.pathname)

  navigate(path: string, options?: { replace?: boolean }) {
    if (options?.replace) {
      window.history.replaceState(null, '', path)
    } else {
      window.history.pushState(null, '', path)
    }
    this.currentPath = path
    this.updateMatch()
  }

  private setupPopStateListener() {
    window.addEventListener('popstate', () => {
      this.currentPath = window.location.pathname
      this.updateMatch()
    })
  }
}

export const router = new RouterState()
```

**测试**:
```typescript
router.navigate('/users/123')
console.log(router.currentPath)  // → '/users/123'
console.log(router.params)       // → { id: '123' }

router.back()  // 浏览器后退
```

**预计时间**: 3-4 小时

---

### P1.3: 测试路由核心
- [ ] 编写单元测试 `matcher.test.ts`
  - [ ] 测试静态路由匹配
  - [ ] 测试动态参数
  - [ ] 测试通配符
  - [ ] 测试路径生成
- [ ] 编写集成测试 `router.test.ts`
  - [ ] 测试导航
  - [ ] 测试浏览器前进/后退
  - [ ] 测试查询参数

**预计时间**: 1-2 小时

---

## Phase 2: 路由组件 (0.5 天)

### P2.1: Router 组件
**文件**: `src/core/router/Router.svelte` (40 行)

**任务**:
- [ ] 创建 `Router.svelte` 组件
- [ ] 接收 `routes` prop
- [ ] 注册所有路由到 `router`
- [ ] 使用 `$derived` 计算当前组件
- [ ] 渲染当前组件
- [ ] 传递 `params` 到子组件
- [ ] 支持 fallback (404) 组件

**实现**:
```svelte
<script lang="ts">
  import { router } from './state.svelte'
  import type { Route } from './matcher'

  let { routes, fallback } = $props()

  // 注册路由
  $effect(() => {
    routes.forEach(route => router.register(route.pattern, route.component))
  })

  // 当前组件
  let CurrentComponent = $derived(
    routes.find(r => r.pattern === router.currentMatch?.pattern)?.component
    ?? fallback
  )
</script>

{#if CurrentComponent}
  <CurrentComponent params={router.params} />
{/if}
```

**预计时间**: 1 小时

---

### P2.2: Link 组件
**文件**: `src/core/router/Link.svelte` (50 行)

**任务**:
- [ ] 创建 `Link.svelte` 组件
- [ ] 接收 `to`, `replace`, `class`, `activeClass` props
- [ ] 实现点击处理 (阻止默认行为)
- [ ] 调用 `router.navigate()`
- [ ] 高亮当前激活链接
- [ ] 支持自定义样式

**实现**:
```svelte
<script lang="ts">
  import { router } from './state.svelte'

  let { to, replace = false, class: className = '', activeClass = 'active' } = $props()

  let isActive = $derived(router.currentPath === to)
  let finalClass = $derived(isActive ? `${className} ${activeClass}` : className)

  function handleClick(e: MouseEvent) {
    e.preventDefault()
    router.navigate(to, { replace })
  }
</script>

<a href={to} class={finalClass} onclick={handleClick}>
  <slot />
</a>
```

**预计时间**: 1 小时

---

### P2.3: 集成测试
- [ ] 在 `App.svelte` 中测试 `Router`
- [ ] 创建测试路由
- [ ] 测试页面切换
- [ ] 测试 Link 点击
- [ ] 测试激活状态

**预计时间**: 1 小时

---

## Phase 3: 页面树系统 (0.5 天)

### P3.1: 页面结构类型定义
**文件**: `src/types/page-structure.ts` (50 行)

**任务**:
- [ ] 定义 `PageNode` 接口
  - [ ] `id`, `name`, `path`, `title`
  - [ ] `icon`, `order`
  - [ ] `children: PageNode[]`
  - [ ] `isTemplate`, `templateParam`
  - [ ] `metadata` (hidden, group)
- [ ] 定义 `PageTree` 接口
- [ ] 导出类型

**预计时间**: 30 分钟

---

### P3.2: 页面树构建器
**文件**: `src/core/pages/tree-builder.ts` (200 行)

**任务**:
- [ ] 创建 `PageTreeBuilder` 类
- [ ] 实现 `build(pages)` 方法
  - [ ] 排序页面 (按路径深度)
  - [ ] 创建节点
  - [ ] 构建父子关系
  - [ ] 处理虚拟父节点 (目录)
- [ ] 实现辅助方法
  - [ ] `createNode(page)` - 创建页面节点
  - [ ] `createVirtualNode(path)` - 创建虚拟节点
  - [ ] `getParentPath(path)` - 获取父路径
  - [ ] `pathToTitle(path)` - 路径转标题
  - [ ] `extractTemplateParam(path)` - 提取模板参数

**关键逻辑**:
```typescript
build(pages: ReportPage[]): PageTree {
  const root: PageNode[] = []
  const nodeMap = new Map<string, PageNode>()

  // 按路径深度排序
  const sorted = pages.sort((a, b) =>
    a.path.split('/').length - b.path.split('/').length
  )

  for (const page of sorted) {
    const node = this.createNode(page)
    nodeMap.set(page.path, node)

    // 根节点
    if (page.path === '/') {
      root.push(node)
    } else {
      // 找到父节点并添加
      const parentPath = this.getParentPath(page.path)
      const parent = nodeMap.get(parentPath)
      if (parent) {
        parent.children.push(node)
      }
    }
  }

  return { root }
}
```

**测试**:
```typescript
const pages = [
  { path: '/', ... },
  { path: '/sales/overview', ... },
  { path: '/sales/regional', ... },
  { path: '/customers/[id]', ... }
]

const builder = new PageTreeBuilder()
const tree = builder.build(pages)

console.log(tree)
// {
//   root: [
//     { path: '/', title: 'Home' },
//     {
//       path: '/sales',
//       title: 'Sales',
//       children: [
//         { path: '/sales/overview', title: 'Overview' },
//         { path: '/sales/regional', title: 'Regional' }
//       ]
//     }
//   ]
// }
```

**预计时间**: 3-4 小时

---

## Phase 4: 侧边栏导航 (1 天)

### P4.1: 侧边栏主组件
**文件**: `src/components/navigation/Sidebar.svelte` (100 行)

**任务**:
- [ ] 创建 `Sidebar.svelte` 组件
- [ ] 接收 `tree: PageNode[]` prop
- [ ] 实现展开/折叠状态管理
  - [ ] `expandedPaths = $state(new Set())`
  - [ ] `toggleExpand(path)` 方法
- [ ] 自动展开当前路径的祖先
  - [ ] 使用 `$effect` 监听 `router.currentPath`
  - [ ] 展开所有祖先路径
- [ ] 渲染侧边栏头部
- [ ] 渲染树形列表

**关键实现**:
```svelte
<script lang="ts">
  import { router } from '@/core/router/state.svelte'
  import SidebarItem from './SidebarItem.svelte'

  let { tree } = $props()
  let expandedPaths = $state(new Set(['/']))

  // 自动展开当前路径祖先
  $effect(() => {
    const parts = router.currentPath.split('/').filter(Boolean)
    for (let i = 1; i <= parts.length; i++) {
      expandedPaths.add('/' + parts.slice(0, i).join('/'))
    }
  })

  function toggleExpand(path: string) {
    if (expandedPaths.has(path)) {
      expandedPaths.delete(path)
    } else {
      expandedPaths.add(path)
    }
  }
</script>

<nav class="sidebar">
  <div class="sidebar-header">
    <h3>Navigation</h3>
  </div>

  <ul class="sidebar-tree">
    {#each tree as node (node.id)}
      <SidebarItem
        {node}
        expanded={expandedPaths.has(node.path)}
        onToggle={() => toggleExpand(node.path)}
      />
    {/each}
  </ul>
</nav>
```

**预计时间**: 2 小时

---

### P4.2: 侧边栏项组件
**文件**: `src/components/navigation/SidebarItem.svelte` (120 行)

**任务**:
- [ ] 创建 `SidebarItem.svelte` 组件
- [ ] 接收 props: `node`, `expanded`, `onToggle`, `level`
- [ ] 实现展开/折叠按钮
  - [ ] 有子节点时显示箭头
  - [ ] 点击切换展开状态
  - [ ] 箭头旋转动画
- [ ] 实现页面链接
  - [ ] 使用 `Link` 组件
  - [ ] 高亮当前激活项
  - [ ] 缩进显示层级
- [ ] 递归渲染子节点
  - [ ] `<svelte:self>` 递归组件
  - [ ] 传递 `level + 1`
- [ ] 支持图标显示
- [ ] 支持模板页面标记

**关键实现**:
```svelte
<script lang="ts">
  import { router } from '@/core/router/state.svelte'
  import Link from '@/core/router/Link.svelte'

  let { node, expanded = false, onToggle, level = 0 } = $props()

  let hasChildren = $derived(node.children?.length > 0)
  let isActive = $derived(router.currentPath === node.path)
  let indentStyle = $derived(`padding-left: ${level * 1.25 + 1}rem`)
</script>

<li class="sidebar-item">
  <div class="item-wrapper" style={indentStyle}>
    {#if hasChildren}
      <button class="expand-btn" class:expanded onclick={onToggle}>
        <svg>...</svg>
      </button>
    {/if}

    <Link to={node.path} class:active={isActive}>
      {node.title}
    </Link>
  </div>

  {#if hasChildren && expanded}
    <ul class="sidebar-children">
      {#each node.children as child (child.id)}
        <svelte:self node={child} level={level + 1} />
      {/each}
    </ul>
  {/if}
</li>
```

**样式要点**:
- 缩进: `padding-left: ${level * 1.25}rem`
- Hover 效果
- 激活状态高亮
- 箭头旋转动画: `transform: rotate(90deg)`

**预计时间**: 3 小时

---

### P4.3: 侧边栏样式优化
- [ ] 响应式设计 (移动端折叠)
- [ ] 滚动优化 (当前项自动滚动到可视区)
- [ ] 暗黑模式支持
- [ ] Hover 效果优化
- [ ] 动画性能优化

**预计时间**: 1-2 小时

---

## Phase 5: 面包屑导航 (0.5 天)

### P5.1: 面包屑组件
**文件**: `src/components/navigation/Breadcrumbs.svelte` (80 行)

**任务**:
- [ ] 创建 `Breadcrumbs.svelte` 组件
- [ ] 接收 `tree: PageTree` prop
- [ ] 实现面包屑生成逻辑
  - [ ] 根据 `router.currentPath` 拆分路径
  - [ ] 查找每个路径段对应的节点
  - [ ] 生成面包屑数组
- [ ] 渲染面包屑
  - [ ] 首页链接
  - [ ] 中间层级链接
  - [ ] 当前页面 (不可点击)
  - [ ] 分隔符 `/`
- [ ] 实现节点查找
  - [ ] `findNodeByPath()` 递归查找

**关键实现**:
```svelte
<script lang="ts">
  import { router } from '@/core/router/state.svelte'
  import Link from '@/core/router/Link.svelte'

  let { tree } = $props()

  // 生成面包屑
  let breadcrumbs = $derived(() => {
    const parts = router.currentPath.split('/').filter(Boolean)
    const crumbs = [{ path: '/', title: 'Home' }]

    for (let i = 1; i <= parts.length; i++) {
      const path = '/' + parts.slice(0, i).join('/')
      const node = findNodeByPath(tree.root, path)
      crumbs.push({
        path,
        title: node?.title ?? parts[i - 1]
      })
    }

    return crumbs
  })()

  function findNodeByPath(nodes, path) {
    for (const node of nodes) {
      if (node.path === path) return node
      if (node.children) {
        const found = findNodeByPath(node.children, path)
        if (found) return found
      }
    }
    return null
  }
</script>

<nav class="breadcrumbs">
  {#each breadcrumbs as crumb, i}
    {#if i > 0}<span class="separator">/</span>{/if}

    {#if i === breadcrumbs.length - 1}
      <span class="current">{crumb.title}</span>
    {:else}
      <Link to={crumb.path}>{crumb.title}</Link>
    {/if}
  {/each}
</nav>
```

**样式**:
```css
.breadcrumbs {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
}

.separator {
  color: var(--color-text-tertiary);
}

.current {
  font-weight: 600;
}
```

**预计时间**: 2-3 小时

---

## Phase 6: 布局集成 (0.5 天)

### P6.1: 创建报告布局组件
**文件**: `src/components/layouts/ReportLayout.svelte` (150 行)

**任务**:
- [ ] 创建 `ReportLayout.svelte` 组件
- [ ] 集成所有导航组件
  - [ ] `Sidebar` - 左侧导航
  - [ ] `Breadcrumbs` - 顶部面包屑
  - [ ] `Router` - 内容区域
- [ ] 实现响应式布局
  - [ ] 桌面: 侧边栏 + 内容
  - [ ] 移动: 抽屉式侧边栏
- [ ] 添加侧边栏切换按钮
- [ ] 添加全屏模式

**布局结构**:
```svelte
<script lang="ts">
  import Sidebar from '@/components/navigation/Sidebar.svelte'
  import Breadcrumbs from '@/components/navigation/Breadcrumbs.svelte'
  import Router from '@/core/router/Router.svelte'
  import { reportStore } from '@/app/stores/report.svelte'
  import { PageTreeBuilder } from '@/core/pages/tree-builder'

  let { routes } = $props()

  // 侧边栏状态
  let sidebarOpen = $state(true)

  // 页面树
  let pageTree = $derived(() => {
    if (!reportStore.state.currentReport) return { root: [] }
    const builder = new PageTreeBuilder()
    return builder.build(reportStore.state.currentReport.pages)
  })()
</script>

<div class="report-layout">
  {#if sidebarOpen}
    <Sidebar tree={pageTree.root} />
  {/if}

  <div class="main-content">
    <div class="toolbar">
      <button onclick={() => sidebarOpen = !sidebarOpen}>
        Toggle Sidebar
      </button>
      <Breadcrumbs {pageTree} />
    </div>

    <div class="page-content">
      <Router {routes} />
    </div>
  </div>
</div>

<style>
  .report-layout {
    display: flex;
    height: 100vh;
  }

  .main-content {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .page-content {
    flex: 1;
    overflow-y: auto;
    padding: 2rem;
  }
</style>
```

**预计时间**: 2-3 小时

---

### P6.2: App.svelte 集成
- [ ] 在 `App.svelte` 中使用 `ReportLayout`
- [ ] 定义路由配置
- [ ] 测试完整导航流程
- [ ] 调试样式

**预计时间**: 1 小时

---

## Phase 7: 测试和优化 (1 天)

### P7.1: 功能测试
- [ ] 路由匹配测试
  - [ ] 静态路由
  - [ ] 动态参数
  - [ ] 嵌套路由
- [ ] 导航测试
  - [ ] 点击链接
  - [ ] 浏览器前进/后退
  - [ ] 直接输入 URL
- [ ] 侧边栏测试
  - [ ] 展开/折叠
  - [ ] 激活状态
  - [ ] 递归渲染
- [ ] 面包屑测试
  - [ ] 路径正确性
  - [ ] 点击跳转

**预计时间**: 3 小时

---

### P7.2: 性能优化
- [ ] 懒加载优化
  - [ ] 页面组件懒加载
  - [ ] 预加载机制
- [ ] 缓存优化
  - [ ] 组件缓存
  - [ ] 匹配结果缓存
- [ ] 渲染优化
  - [ ] 虚拟列表 (大型侧边栏)
  - [ ] 防抖/节流
- [ ] 内存优化
  - [ ] 及时卸载组件
  - [ ] 清理事件监听

**预计时间**: 3 小时

---

### P7.3: 边界情况处理
- [ ] 404 页面
- [ ] 路由冲突处理
- [ ] 循环依赖检测
- [ ] 空状态处理
- [ ] 错误边界

**预计时间**: 2 小时

---

## 验收标准

### 功能完整性
- [x] ✅ 路由匹配 (静态、动态、通配符)
- [x] ✅ 浏览器前进/后退支持
- [x] ✅ URL 参数解析
- [x] ✅ 侧边栏树形导航
- [x] ✅ 展开/折叠
- [x] ✅ 当前页面高亮
- [x] ✅ 面包屑导航
- [x] ✅ 响应式布局

### 性能指标
- [ ] 路由匹配 < 5ms
- [ ] 页面切换 < 50ms
- [ ] 首屏渲染 < 200ms
- [ ] 内存占用 < 50MB (100 页面)

### 代码质量
- [ ] TypeScript 无错误
- [ ] 测试覆盖率 > 80%
- [ ] 文档完整
- [ ] 代码风格一致

---

## 时间估算总结

| Phase | 任务 | 预计时间 |
|-------|------|----------|
| Phase 1 | 核心路由系统 | 6-9 小时 (1 天) |
| Phase 2 | 路由组件 | 3 小时 (0.5 天) |
| Phase 3 | 页面树系统 | 4-5 小时 (0.5 天) |
| Phase 4 | 侧边栏导航 | 6-7 小时 (1 天) |
| Phase 5 | 面包屑导航 | 2-3 小时 (0.5 天) |
| Phase 6 | 布局集成 | 3-4 小时 (0.5 天) |
| Phase 7 | 测试优化 | 8 小时 (1 天) |

**总计**: **32-40 小时** ≈ **4-5 个工作日**

---

## 下一步行动

### 立即开始
1. ✅ 创建文件夹结构
   ```bash
   mkdir -p src/core/router
   mkdir -p src/core/pages
   mkdir -p src/components/navigation
   mkdir -p src/components/layouts
   ```

2. ✅ 安装类型定义 (如果需要)
   ```bash
   npm install --save-dev @types/node
   ```

3. ✅ 开始 Phase 1.1: 创建 `matcher.ts`

### 关键决策
- [ ] 是否需要路由守卫 (beforeEach, afterEach) ?
- [ ] 是否需要路由元信息 (meta) ?
- [ ] 是否需要懒加载支持 ?
- [ ] 是否需要动画/过渡效果 ?

---

**文档版本**: v1.0
**创建日期**: 2025-12-28
**预计完成**: 2026-01-02
