# 自研轻量级路由系统设计方案

## 设计理念

**核心原则**:
- 🚀 **零依赖** - 仅使用浏览器原生 History API
- 🎯 **轻量级** - 核心代码 < 300 行
- 💎 **类型安全** - 完整 TypeScript 支持
- ⚡ **Svelte 5 原生** - 利用 Runes ($state, $derived, $effect)
- 🎨 **声明式 API** - 简洁优雅的使用方式

---

## 技术架构

### 1. 核心路由系统

#### 1.1 路由匹配器 (Router Matcher)

```typescript
// src/core/router/matcher.ts

/**
 * 路由参数提取
 * /users/:id/posts/:postId → { id: "123", postId: "456" }
 */
export interface RouteParams {
  [key: string]: string
}

/**
 * 路由匹配结果
 */
export interface RouteMatch {
  pattern: string
  params: RouteParams
  path: string
}

/**
 * 路由定义
 */
export interface Route {
  pattern: string         // "/reports/:reportId/pages/:pageId"
  component?: any         // Svelte 组件
  load?: () => Promise<any>  // 懒加载
}

/**
 * 路由匹配器
 */
export class RouteMatcher {
  private routes: Route[] = []

  /**
   * 注册路由
   */
  register(route: Route): void {
    this.routes.push(route)
  }

  /**
   * 匹配路径
   */
  match(path: string): RouteMatch | null {
    for (const route of this.routes) {
      const params = this.matchPattern(route.pattern, path)
      if (params !== null) {
        return {
          pattern: route.pattern,
          params,
          path
        }
      }
    }
    return null
  }

  /**
   * 匹配单个路由模式
   *
   * @example
   * matchPattern("/users/:id", "/users/123")
   * → { id: "123" }
   *
   * matchPattern("/posts/:category/:slug", "/posts/tech/hello-world")
   * → { category: "tech", slug: "hello-world" }
   */
  private matchPattern(pattern: string, path: string): RouteParams | null {
    const patternParts = pattern.split('/').filter(Boolean)
    const pathParts = path.split('/').filter(Boolean)

    // 长度不匹配，直接返回
    if (patternParts.length !== pathParts.length) {
      return null
    }

    const params: RouteParams = {}

    for (let i = 0; i < patternParts.length; i++) {
      const patternPart = patternParts[i]
      const pathPart = pathParts[i]

      // 动态参数 :param
      if (patternPart.startsWith(':')) {
        const paramName = patternPart.slice(1)
        params[paramName] = decodeURIComponent(pathPart)
      }
      // 通配符 *
      else if (patternPart === '*') {
        params['*'] = pathParts.slice(i).join('/')
        break
      }
      // 静态匹配
      else if (patternPart !== pathPart) {
        return null
      }
    }

    return params
  }

  /**
   * 生成路径
   *
   * @example
   * buildPath("/users/:id", { id: "123" })
   * → "/users/123"
   */
  buildPath(pattern: string, params: RouteParams): string {
    let path = pattern
    for (const [key, value] of Object.entries(params)) {
      path = path.replace(`:${key}`, encodeURIComponent(value))
    }
    return path
  }
}
```

#### 1.2 路由状态管理 (Svelte 5 Runes)

```typescript
// src/core/router/state.svelte.ts

import { RouteMatcher, type RouteMatch, type RouteParams } from './matcher'

/**
 * 路由状态
 */
class RouterState {
  // 当前路径
  currentPath = $state<string>(window.location.pathname)

  // 当前匹配结果
  currentMatch = $state<RouteMatch | null>(null)

  // 路由参数 (derived from currentMatch)
  params = $derived<RouteParams>(
    this.currentMatch?.params ?? {}
  )

  // 查询参数
  query = $state<URLSearchParams>(new URLSearchParams(window.location.search))

  // Hash
  hash = $state<string>(window.location.hash)

  // 是否正在导航
  isNavigating = $state(false)

  // 路由历史
  history = $state<string[]>([])

  // 路由匹配器
  private matcher = new RouteMatcher()

  constructor() {
    // 监听浏览器前进/后退
    this.setupPopStateListener()

    // 初始化匹配
    this.updateMatch()
  }

  /**
   * 监听 popstate 事件 (浏览器前进/后退)
   */
  private setupPopStateListener() {
    window.addEventListener('popstate', () => {
      this.currentPath = window.location.pathname
      this.query = new URLSearchParams(window.location.search)
      this.hash = window.location.hash
      this.updateMatch()
    })
  }

  /**
   * 注册路由
   */
  register(pattern: string, component?: any, load?: () => Promise<any>) {
    this.matcher.register({ pattern, component, load })
  }

  /**
   * 导航到路径
   */
  navigate(path: string, options?: { replace?: boolean; state?: any }) {
    if (path === this.currentPath) return

    this.isNavigating = true

    // 更新浏览器历史
    if (options?.replace) {
      window.history.replaceState(options?.state ?? null, '', path)
    } else {
      window.history.pushState(options?.state ?? null, '', path)
    }

    // 更新状态
    this.currentPath = path
    this.query = new URLSearchParams(window.location.search)
    this.hash = window.location.hash
    this.history.push(path)

    this.updateMatch()
    this.isNavigating = false
  }

  /**
   * 后退
   */
  back() {
    window.history.back()
  }

  /**
   * 前进
   */
  forward() {
    window.history.forward()
  }

  /**
   * 更新匹配结果
   */
  private updateMatch() {
    this.currentMatch = this.matcher.match(this.currentPath)
  }

  /**
   * 构建路径
   */
  buildPath(pattern: string, params: RouteParams): string {
    return this.matcher.buildPath(pattern, params)
  }
}

// 全局路由状态
export const router = new RouterState()
```

#### 1.3 路由组件

```svelte
<!-- src/core/router/Router.svelte -->
<script lang="ts">
  import { router } from './state.svelte'
  import type { Route } from './matcher'

  interface Props {
    routes: Route[]
    fallback?: any  // 404 组件
  }

  let { routes, fallback }: Props = $props()

  // 注册所有路由
  $effect(() => {
    routes.forEach(route => {
      router.register(route.pattern, route.component, route.load)
    })
  })

  // 当前匹配的路由
  let currentRoute = $derived(
    routes.find(r => r.pattern === router.currentMatch?.pattern)
  )

  // 当前组件
  let CurrentComponent = $derived(
    currentRoute?.component ?? fallback
  )
</script>

{#if CurrentComponent}
  <CurrentComponent params={router.params} />
{:else}
  <div class="route-loading">Loading...</div>
{/if}
```

#### 1.4 Link 组件

```svelte
<!-- src/core/router/Link.svelte -->
<script lang="ts">
  import { router } from './state.svelte'

  interface Props {
    to: string
    replace?: boolean
    class?: string
    activeClass?: string
  }

  let {
    to,
    replace = false,
    class: className = '',
    activeClass = 'active'
  }: Props = $props()

  // 是否激活
  let isActive = $derived(router.currentPath === to)

  // 点击处理
  function handleClick(e: MouseEvent) {
    e.preventDefault()
    router.navigate(to, { replace })
  }

  // 最终 class
  let finalClass = $derived(
    isActive ? `${className} ${activeClass}` : className
  )
</script>

<a
  href={to}
  class={finalClass}
  onclick={handleClick}
>
  <slot />
</a>

<style>
  a.active {
    font-weight: 600;
    color: var(--color-primary);
  }
</style>
```

---

### 2. 文件系统路由

#### 2.1 页面结构定义

```typescript
// src/types/page-structure.ts

/**
 * 页面节点 (文件系统树)
 */
export interface PageNode {
  id: string
  name: string           // 文件名 "overview.md"
  path: string           // 路由路径 "/sales/overview"
  title: string          // 显示标题
  icon?: string
  order?: number         // 排序
  children?: PageNode[]  // 子页面

  // 模板页面
  isTemplate?: boolean
  templateParam?: string // "customer_id"

  // 元数据
  metadata?: {
    hidden?: boolean     // 隐藏不显示在导航
    group?: string       // 分组
  }
}

/**
 * 页面树
 */
export interface PageTree {
  root: PageNode[]
}
```

#### 2.2 页面树构建器

```typescript
// src/core/pages/tree-builder.ts

import type { ReportPage } from '@/types/report'
import type { PageNode, PageTree } from '@/types/page-structure'

/**
 * 从页面列表构建树形结构
 */
export class PageTreeBuilder {
  /**
   * 构建页面树
   *
   * @example
   * pages: [
   *   { path: "/" },
   *   { path: "/sales/overview" },
   *   { path: "/sales/regional" },
   *   { path: "/customers/[id]" }
   * ]
   *
   * →
   *
   * tree: [
   *   { name: "Home", path: "/" },
   *   {
   *     name: "Sales",
   *     path: "/sales",
   *     children: [
   *       { name: "Overview", path: "/sales/overview" },
   *       { name: "Regional", path: "/sales/regional" }
   *     ]
   *   },
   *   {
   *     name: "Customers",
   *     path: "/customers",
   *     children: [
   *       { name: "[Customer]", path: "/customers/[id]", isTemplate: true }
   *     ]
   *   }
   * ]
   */
  build(pages: ReportPage[]): PageTree {
    const root: PageNode[] = []
    const nodeMap = new Map<string, PageNode>()

    // 排序页面 (按路径深度)
    const sortedPages = pages.sort((a, b) => {
      const aDepth = a.path.split('/').length
      const bDepth = b.path.split('/').length
      return aDepth - bDepth
    })

    // 构建节点
    for (const page of sortedPages) {
      const node = this.createNode(page)
      nodeMap.set(page.path, node)

      // 根节点
      if (page.path === '/' || !page.path.includes('/', 1)) {
        root.push(node)
      }
      // 子节点
      else {
        const parentPath = this.getParentPath(page.path)
        const parent = nodeMap.get(parentPath)

        if (parent) {
          if (!parent.children) parent.children = []
          parent.children.push(node)
        } else {
          // 父节点不存在，创建虚拟父节点
          const virtualParent = this.createVirtualNode(parentPath)
          nodeMap.set(parentPath, virtualParent)
          virtualParent.children = [node]
          root.push(virtualParent)
        }
      }
    }

    return { root }
  }

  /**
   * 创建页面节点
   */
  private createNode(page: ReportPage): PageNode {
    const isTemplate = page.path.includes('[')
    const templateParam = isTemplate
      ? this.extractTemplateParam(page.path)
      : undefined

    return {
      id: page.id,
      name: page.fileName,
      path: page.path,
      title: page.metadata?.title ?? this.pathToTitle(page.path),
      icon: page.metadata?.icon,
      order: page.metadata?.order,
      isTemplate,
      templateParam,
      metadata: page.metadata
    }
  }

  /**
   * 创建虚拟节点 (目录节点)
   */
  private createVirtualNode(path: string): PageNode {
    return {
      id: `virtual-${path}`,
      name: '',
      path,
      title: this.pathToTitle(path),
      children: []
    }
  }

  /**
   * 获取父路径
   */
  private getParentPath(path: string): string {
    const parts = path.split('/').filter(Boolean)
    parts.pop()
    return '/' + parts.join('/')
  }

  /**
   * 路径转标题
   */
  private pathToTitle(path: string): string {
    const parts = path.split('/').filter(Boolean)
    const last = parts[parts.length - 1] || 'Home'
    return last
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  /**
   * 提取模板参数
   */
  private extractTemplateParam(path: string): string {
    const match = path.match(/\[([^\]]+)\]/)
    return match ? match[1] : ''
  }
}
```

---

### 3. 侧边栏导航

#### 3.1 侧边栏组件

```svelte
<!-- src/components/navigation/Sidebar.svelte -->
<script lang="ts">
  import { router } from '@/core/router/state.svelte'
  import type { PageNode } from '@/types/page-structure'
  import SidebarItem from './SidebarItem.svelte'

  interface Props {
    tree: PageNode[]
    collapsible?: boolean
  }

  let { tree, collapsible = true }: Props = $props()

  // 展开状态
  let expandedPaths = $state<Set<string>>(new Set(['/']))

  // 切换展开
  function toggleExpand(path: string) {
    if (expandedPaths.has(path)) {
      expandedPaths.delete(path)
    } else {
      expandedPaths.add(path)
    }
  }

  // 自动展开当前路径的祖先
  $effect(() => {
    const currentPath = router.currentPath
    const parts = currentPath.split('/').filter(Boolean)

    for (let i = 1; i <= parts.length; i++) {
      const ancestorPath = '/' + parts.slice(0, i).join('/')
      expandedPaths.add(ancestorPath)
    }
  })
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

<style>
  .sidebar {
    width: 260px;
    height: 100%;
    background: var(--color-bg-secondary);
    border-right: 1px solid var(--color-border);
    overflow-y: auto;
  }

  .sidebar-header {
    padding: 1rem;
    border-bottom: 1px solid var(--color-border);
  }

  .sidebar-header h3 {
    margin: 0;
    font-size: 0.875rem;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--color-text-secondary);
  }

  .sidebar-tree {
    list-style: none;
    padding: 0.5rem 0;
    margin: 0;
  }
</style>
```

#### 3.2 侧边栏项

```svelte
<!-- src/components/navigation/SidebarItem.svelte -->
<script lang="ts">
  import { router } from '@/core/router/state.svelte'
  import Link from '@/core/router/Link.svelte'
  import type { PageNode } from '@/types/page-structure'

  interface Props {
    node: PageNode
    expanded?: boolean
    onToggle?: () => void
    level?: number
  }

  let {
    node,
    expanded = false,
    onToggle,
    level = 0
  }: Props = $props()

  let hasChildren = $derived(node.children && node.children.length > 0)
  let isActive = $derived(router.currentPath === node.path)
  let indentStyle = $derived(`padding-left: ${level * 1.25 + 1}rem`)
</script>

<li class="sidebar-item">
  <div class="item-wrapper" style={indentStyle}>
    {#if hasChildren}
      <button
        class="expand-btn"
        class:expanded
        onclick={onToggle}
      >
        <svg width="12" height="12" viewBox="0 0 12 12">
          <path d="M4 2L8 6L4 10" fill="none" stroke="currentColor" stroke-width="1.5"/>
        </svg>
      </button>
    {:else}
      <span class="expand-placeholder"></span>
    {/if}

    {#if node.icon}
      <span class="item-icon">{node.icon}</span>
    {/if}

    <Link
      to={node.path}
      class="item-link"
      class:active={isActive}
    >
      {node.title}
      {#if node.isTemplate}
        <span class="template-badge">Template</span>
      {/if}
    </Link>
  </div>

  {#if hasChildren && expanded}
    <ul class="sidebar-children">
      {#each node.children as child (child.id)}
        <svelte:self
          node={child}
          level={level + 1}
        />
      {/each}
    </ul>
  {/if}
</li>

<style>
  .sidebar-item {
    list-style: none;
  }

  .item-wrapper {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    cursor: pointer;
    transition: background 0.15s;
  }

  .item-wrapper:hover {
    background: var(--color-bg-hover);
  }

  .expand-btn {
    width: 20px;
    height: 20px;
    padding: 0;
    background: none;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.2s;
  }

  .expand-btn.expanded {
    transform: rotate(90deg);
  }

  .expand-placeholder {
    width: 20px;
  }

  .item-icon {
    font-size: 1rem;
  }

  .item-link {
    flex: 1;
    text-decoration: none;
    color: var(--color-text);
    font-size: 0.875rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .item-link.active {
    font-weight: 600;
    color: var(--color-primary);
  }

  .template-badge {
    padding: 2px 6px;
    background: var(--color-info);
    color: white;
    font-size: 0.625rem;
    border-radius: 4px;
  }

  .sidebar-children {
    list-style: none;
    padding: 0;
    margin: 0;
  }
</style>
```

---

### 4. 面包屑导航

```svelte
<!-- src/components/navigation/Breadcrumbs.svelte -->
<script lang="ts">
  import { router } from '@/core/router/state.svelte'
  import Link from '@/core/router/Link.svelte'
  import type { PageNode, PageTree } from '@/types/page-structure'

  interface Props {
    tree: PageTree
  }

  let { tree }: Props = $props()

  /**
   * 生成面包屑路径
   */
  let breadcrumbs = $derived(() => {
    const path = router.currentPath
    const parts = path.split('/').filter(Boolean)

    const crumbs: Array<{ path: string; title: string }> = [
      { path: '/', title: 'Home' }
    ]

    for (let i = 1; i <= parts.length; i++) {
      const crumbPath = '/' + parts.slice(0, i).join('/')
      const node = findNodeByPath(tree.root, crumbPath)

      crumbs.push({
        path: crumbPath,
        title: node?.title ?? parts[i - 1]
      })
    }

    return crumbs
  })()

  /**
   * 查找节点
   */
  function findNodeByPath(nodes: PageNode[], path: string): PageNode | null {
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
  {#each breadcrumbs as crumb, i (crumb.path)}
    {#if i > 0}
      <span class="separator">/</span>
    {/if}

    {#if i === breadcrumbs.length - 1}
      <span class="current">{crumb.title}</span>
    {:else}
      <Link to={crumb.path} class="crumb-link">
        {crumb.title}
      </Link>
    {/if}
  {/each}
</nav>

<style>
  .breadcrumbs {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    font-size: 0.875rem;
    border-bottom: 1px solid var(--color-border);
  }

  .separator {
    color: var(--color-text-tertiary);
  }

  .crumb-link {
    color: var(--color-text-secondary);
    text-decoration: none;
    transition: color 0.15s;
  }

  .crumb-link:hover {
    color: var(--color-primary);
  }

  .current {
    font-weight: 600;
    color: var(--color-text);
  }
</style>
```

---

## 使用示例

### 1. 定义路由

```typescript
// src/routes.ts
import type { Route } from '@/core/router/matcher'

export const routes: Route[] = [
  {
    pattern: '/reports/:reportId',
    component: () => import('./pages/ReportHome.svelte')
  },
  {
    pattern: '/reports/:reportId/pages/:pageId',
    component: () => import('./pages/PageView.svelte')
  },
  {
    pattern: '/reports/:reportId/customers/:customerId',
    component: () => import('./pages/CustomerTemplate.svelte')
  }
]
```

### 2. App.svelte

```svelte
<!-- src/App.svelte -->
<script lang="ts">
  import Router from '@/core/router/Router.svelte'
  import Sidebar from '@/components/navigation/Sidebar.svelte'
  import Breadcrumbs from '@/components/navigation/Breadcrumbs.svelte'
  import { routes } from './routes'
  import { reportStore } from '@/app/stores/report.svelte'
  import { PageTreeBuilder } from '@/core/pages/tree-builder'

  // 构建页面树
  let pageTree = $derived(() => {
    if (!reportStore.state.currentReport) return { root: [] }
    const builder = new PageTreeBuilder()
    return builder.build(reportStore.state.currentReport.pages)
  })()
</script>

<div class="app-layout">
  <Sidebar tree={pageTree.root} />

  <div class="main-content">
    <Breadcrumbs {pageTree} />

    <div class="page-content">
      <Router {routes} />
    </div>
  </div>
</div>

<style>
  .app-layout {
    display: flex;
    height: 100vh;
  }

  .main-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .page-content {
    flex: 1;
    overflow-y: auto;
    padding: 2rem;
  }
</style>
```

### 3. 页面组件

```svelte
<!-- src/pages/PageView.svelte -->
<script lang="ts">
  import { router } from '@/core/router/state.svelte'
  import { reportStore } from '@/app/stores/report.svelte'
  import PageRenderer from '@/components/pages/PageRenderer.svelte'

  // 路由参数
  let params = $derived(router.params)
  let reportId = $derived(params.reportId)
  let pageId = $derived(params.pageId)

  // 加载页面
  $effect(() => {
    if (reportId && pageId) {
      reportStore.loadPage(reportId, pageId)
    }
  })

  let currentPage = $derived(reportStore.state.currentPage)
</script>

{#if currentPage}
  <PageRenderer page={currentPage} />
{:else}
  <div class="loading">Loading page...</div>
{/if}
```

---

## 文件结构

```
src/
├── core/
│   ├── router/
│   │   ├── matcher.ts              (路由匹配器, 150 行)
│   │   ├── state.svelte.ts         (路由状态, 120 行)
│   │   ├── Router.svelte           (路由组件, 40 行)
│   │   └── Link.svelte             (链接组件, 50 行)
│   └── pages/
│       └── tree-builder.ts         (页面树构建, 200 行)
│
├── components/
│   └── navigation/
│       ├── Sidebar.svelte          (侧边栏, 100 行)
│       ├── SidebarItem.svelte      (侧边栏项, 120 行)
│       └── Breadcrumbs.svelte      (面包屑, 80 行)
│
└── types/
    └── page-structure.ts           (页面结构类型, 50 行)
```

**总计**: 约 910 行核心代码

---

## 优势对比

| 特性 | 第三方路由库 | 自研方案 |
|------|-------------|----------|
| **包大小** | 10-50KB | ~3KB |
| **依赖** | 需要安装 | 零依赖 |
| **Svelte 5 集成** | 需要适配 | 原生支持 |
| **类型安全** | 部分支持 | 完全支持 |
| **定制性** | 受限 | 完全可控 |
| **学习成本** | 需要学习 API | 简单直观 |
| **维护** | 依赖社区 | 自主维护 |

---

## 性能优化

### 1. 懒加载
```typescript
{
  pattern: '/reports/:id/pages/:pageId',
  load: async () => {
    const module = await import('./pages/PageView.svelte')
    return module.default
  }
}
```

### 2. 预加载
```typescript
router.preload('/reports/123/pages/456')
```

### 3. 缓存
```typescript
const componentCache = new Map()
```

---

**文档版本**: v1.0
**创建日期**: 2025-12-28
**更新日期**: 2025-12-28
