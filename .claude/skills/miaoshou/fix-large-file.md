# Skill: 拆分大文件

将超过 500 行的文件拆分为符合项目规范的小文件。

## 项目约束

- **最大行数**: 500 行/文件 (pre-commit 强制检查)
- **推荐行数**: < 300 行 (留有余量)
- **检查命令**: `npm run check:size`

## 分析阶段

### Step 1: 检查文件行数

```bash
wc -l <目标文件>
```

### Step 2: 识别可拆分部分

读取文件内容，识别以下可拆分区块：

| 区块类型 | 识别特征 | 拆分目标 |
|----------|----------|----------|
| **样式块** | `<style>` 标签内容 | `styles.css` 或 `{name}.css` |
| **静态数据** | `const DATA = [...]` 大数组/对象 | `data.ts` 或 `constants.ts` |
| **类型定义** | `interface`/`type` 定义 | `types.ts` |
| **工具函数** | 纯函数，无组件依赖 | `utils.ts` 或 `helpers.ts` |
| **子组件** | 可独立的 UI 片段 | `{SubComponent}.svelte` |

### Step 3: 评估拆分方案

计算各区块行数，制定拆分策略：

```
原文件: Component.svelte (800 lines)
├── <script>    : 200 lines → 保留 + 提取类型/数据
├── <template>  : 150 lines → 识别子组件
└── <style>     : 450 lines → 提取到 CSS 文件
```

## 执行阶段

### 模式 A: Svelte 组件拆分

**适用**: `.svelte` 文件

**目标结构**:
```
component/
├── Component.svelte         # 主组件 (组合层)
├── SubComponentA.svelte     # 子组件
├── SubComponentB.svelte     # 子组件
├── styles.css               # 提取的样式
├── types.ts                 # 类型定义
├── data.ts                  # 静态数据
├── utils.ts                 # 工具函数
└── index.ts                 # 统一导出
```

**样式提取方法**:

```svelte
<!-- 修改前: 内联样式 -->
<style>
  .container { ... }
  /* 400+ lines */
</style>

<!-- 修改后: 外部样式 -->
<script lang="ts">
  import './styles.css'
</script>

<!-- 或使用全局样式 (需谨慎命名) -->
<style global>
  @import './styles.css';
</style>
```

**子组件提取**:

```svelte
<!-- 修改前: 内联模板 -->
<div class="hero">
  <div class="hero-badge">...</div>
  <h1 class="hero-title">...</h1>
  <!-- 100+ lines -->
</div>

<!-- 修改后: 子组件 -->
<script>
  import HeroSection from './HeroSection.svelte'
</script>

<HeroSection {data} on:click={handleClick} />
```

### 模式 B: TypeScript 文件拆分

**适用**: `.ts` 文件

**策略**:
```
原文件: service.ts (600 lines)
         ↓
拆分后:
├── service.ts          # 主服务类
├── service.types.ts    # 类型定义
├── service.utils.ts    # 工具函数
├── service.constants.ts # 常量
└── index.ts            # 统一导出
```

### 模式 C: 数据提取

**识别大数据块**:
```typescript
// 修改前: 内联数据
const SAMPLE_ARTICLES: Record<string, string> = {
  quarterly: `...`, // 50 lines
  techTrends: `...`, // 40 lines
  startup: `...`, // 45 lines
}

// 修改后: 独立数据文件
// data/sample-articles.ts
export const SAMPLE_ARTICLES = { ... }

// Component.svelte
import { SAMPLE_ARTICLES } from './data/sample-articles'
```

## 拆分执行清单

### 1. 创建目录结构
```bash
mkdir -p src/components/{component-name}
```

### 2. 创建类型文件 (types.ts)
提取所有 `interface` 和 `type` 定义

### 3. 创建数据文件 (data.ts)
提取静态数据常量

### 4. 创建样式文件 (styles.css)
提取 `<style>` 内容，注意作用域

### 5. 创建子组件
识别独立 UI 块，提取为子组件

### 6. 创建导出文件 (index.ts)
```typescript
export { default as ComponentName } from './ComponentName.svelte'
export * from './types'
```

### 7. 更新原文件引用
修改导入路径，使用新的模块结构

### 8. 更新外部引用
搜索项目中所有引用该组件的位置，更新导入路径

## 验证步骤

```bash
# 1. 检查文件大小
npm run check:size

# 2. TypeScript 检查
npm run check

# 3. 开发服务器测试
npm run dev

# 4. 运行测试
npm run test
```

## 常见问题

### Q: 样式提取后作用域丢失？

**解决**: 使用 BEM 命名或组件前缀
```css
/* styles.css */
.landing-page__hero { ... }
.landing-page__nav { ... }
```

### Q: 子组件需要访问父组件状态？

**解决**: 通过 props 传递，或使用 Svelte context
```svelte
<!-- 父组件 -->
<SubComponent {data} {config} on:change={handleChange} />

<!-- 子组件 -->
<script>
  let { data, config }: Props = $props()
</script>
```

### Q: 循环依赖问题？

**解决**:
1. 类型定义集中到 `types.ts`
2. 使用 `index.ts` 统一导出
3. 避免组件间直接相互导入

## 示例：拆分 LandingPage

```
拆分前:
  src/components/LandingPage.svelte (845 lines)

拆分后:
  src/components/landing/
  ├── LandingPage.svelte      (~120 lines) - 组合层
  ├── HeroSection.svelte      (~80 lines)  - 主视觉区
  ├── DemoGrid.svelte         (~60 lines)  - Demo 卡片
  ├── FeaturePills.svelte     (~40 lines)  - 特性标签
  ├── NavBar.svelte           (~50 lines)  - 导航栏
  ├── Footer.svelte           (~30 lines)  - 页脚
  ├── styles.css              (~350 lines) - 集中样式
  ├── types.ts                (~30 lines)  - 类型定义
  ├── data.ts                 (~50 lines)  - 静态数据
  └── index.ts                (~10 lines)  - 导出
```
