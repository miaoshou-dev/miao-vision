# Tailwind CSS 集成计划

> 为 Miao Vision 集成 Tailwind CSS，保持 Evidence.dev 的设计风格

## 📋 目录

- [项目背景](#项目背景)
- [Evidence.dev 设计系统分析](#evidencedev-设计系统分析)
- [实施计划](#实施计划)
- [颜色系统配置](#颜色系统配置)
- [组件迁移策略](#组件迁移策略)
- [最佳实践](#最佳实践)

---

## 项目背景

### 当前状态
- ❌ 无 CSS 框架
- ❌ 使用内联样式和 `<style>` 块
- ❌ 缺乏统一的设计系统
- ❌ 样式复用困难

### 目标
- ✅ 集成 Tailwind CSS 3.x
- ✅ 采用 Evidence.dev 配色方案
- ✅ 建立统一设计系统
- ✅ 提升开发效率和代码可维护性

---

## Evidence.dev 设计系统分析

### 核心配色方案

#### 主色调 (Primary)
```css
/* Evidence Blue */
--primary-50:  #eff6ff;  /* 最浅 */
--primary-100: #dbeafe;
--primary-200: #bfdbfe;
--primary-300: #93c5fd;
--primary-400: #60a5fa;
--primary-500: #3b82f6;  /* 主色 */
--primary-600: #2563eb;
--primary-700: #1d4ed8;
--primary-800: #1e40af;
--primary-900: #1e3a8a;  /* 最深 */
```

#### 中性色 (Gray)
```css
/* Cool Gray - Evidence 风格 */
--gray-50:  #f9fafb;
--gray-100: #f3f4f6;
--gray-200: #e5e7eb;
--gray-300: #d1d5db;
--gray-400: #9ca3af;
--gray-500: #6b7280;
--gray-600: #4b5563;
--gray-700: #374151;
--gray-800: #1f2937;
--gray-900: #111827;
```

#### 语义色 (Semantic)
```css
/* Success - 成功状态 */
--success-50:  #f0fdf4;
--success-500: #10b981;  /* 主成功色 */
--success-700: #047857;

/* Warning - 警告状态 */
--warning-50:  #fffbeb;
--warning-500: #f59e0b;  /* 主警告色 */
--warning-700: #b45309;

/* Error - 错误状态 */
--error-50:  #fef2f2;
--error-500: #ef4444;    /* 主错误色 */
--error-700: #b91c1c;

/* Info - 信息状态 */
--info-50:  #f0f9ff;
--info-500: #06b6d4;     /* 主信息色 */
--info-700: #0e7490;
```

#### 背景色
```css
--bg-page: #ffffff;        /* 页面背景 */
--bg-surface: #f9fafb;     /* 卡片/表面背景 */
--bg-elevated: #ffffff;    /* 悬浮元素背景 */
```

#### 文本色
```css
--text-primary: #111827;    /* 主文本 */
--text-secondary: #6b7280;  /* 次要文本 */
--text-tertiary: #9ca3af;   /* 三级文本 */
--text-disabled: #d1d5db;   /* 禁用文本 */
```

#### 边框色
```css
--border-light: #e5e7eb;    /* 浅边框 */
--border-default: #d1d5db;  /* 默认边框 */
--border-strong: #9ca3af;   /* 强边框 */
```

### 排版系统

#### 字体家族
```css
--font-sans: 'Inter', 'system-ui', -apple-system, sans-serif;
--font-mono: 'JetBrains Mono', 'Monaco', 'Courier New', monospace;
```

#### 字体大小
```css
--text-xs:   0.75rem;   /* 12px */
--text-sm:   0.875rem;  /* 14px */
--text-base: 1rem;      /* 16px */
--text-lg:   1.125rem;  /* 18px */
--text-xl:   1.25rem;   /* 20px */
--text-2xl:  1.5rem;    /* 24px */
--text-3xl:  1.875rem;  /* 30px */
--text-4xl:  2.25rem;   /* 36px */
```

#### 字重
```css
--font-light:     300;
--font-normal:    400;
--font-medium:    500;
--font-semibold:  600;
--font-bold:      700;
```

### 间距系统
```css
/* Evidence 采用 4px 基础单位 */
--spacing-0:  0;
--spacing-1:  0.25rem;  /* 4px */
--spacing-2:  0.5rem;   /* 8px */
--spacing-3:  0.75rem;  /* 12px */
--spacing-4:  1rem;     /* 16px */
--spacing-5:  1.25rem;  /* 20px */
--spacing-6:  1.5rem;   /* 24px */
--spacing-8:  2rem;     /* 32px */
--spacing-10: 2.5rem;   /* 40px */
--spacing-12: 3rem;     /* 48px */
--spacing-16: 4rem;     /* 64px */
```

### 圆角系统
```css
--radius-sm:  0.25rem;  /* 4px */
--radius-md:  0.375rem; /* 6px */
--radius-lg:  0.5rem;   /* 8px */
--radius-xl:  0.75rem;  /* 12px */
--radius-2xl: 1rem;     /* 16px */
--radius-full: 9999px;  /* 完全圆角 */
```

### 阴影系统
```css
--shadow-sm:  0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-md:  0 4px 6px -1px rgb(0 0 0 / 0.1);
--shadow-lg:  0 10px 15px -3px rgb(0 0 0 / 0.1);
--shadow-xl:  0 20px 25px -5px rgb(0 0 0 / 0.1);
```

---

## 实施计划

### Phase 1: 环境配置 (Day 1) ⏳

#### 1.1 安装依赖
```bash
# 安装 Tailwind CSS 及相关插件
npm install -D tailwindcss@^3.4.0
npm install -D postcss@^8.4.32
npm install -D autoprefixer@^10.4.16

# 安装 Tailwind 表单插件（增强表单样式）
npm install -D @tailwindcss/forms

# 安装 Tailwind 排版插件（优化文本排版）
npm install -D @tailwindcss/typography

# 安装 Tailwind 容器查询插件（响应式设计）
npm install -D @tailwindcss/container-queries
```

#### 1.2 初始化配置
```bash
# 生成 tailwind.config.js 和 postcss.config.js
npx tailwindcss init -p
```

#### 1.3 配置 Vite
确保 `vite.config.ts` 正确处理 PostCSS：
```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  plugins: [svelte()],
  css: {
    postcss: './postcss.config.js'
  }
})
```

---

### Phase 2: Tailwind 配置 (Day 1-2) ⏳

#### 2.1 创建 `tailwind.config.js`
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{svelte,js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      // Evidence.dev 配色方案
      colors: {
        // 主色调 - Evidence Blue
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',  // 主色
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        // 中性色 - Cool Gray
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },
        // 语义色
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        },
        error: {
          50: '#fef2f2',
          100: '#fee2e2',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
        },
        info: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
        },
      },
      // 字体家族
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Monaco', 'Courier New', 'monospace'],
      },
      // 字体大小（与 Evidence 一致）
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.75rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      },
      // 圆角
      borderRadius: {
        sm: '0.25rem',
        DEFAULT: '0.375rem',
        md: '0.375rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1rem',
        full: '9999px',
      },
      // 阴影
      boxShadow: {
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
      },
      // 动画时长
      transitionDuration: {
        DEFAULT: '150ms',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('@tailwindcss/container-queries'),
  ],
}
```

#### 2.2 创建 `postcss.config.js`
```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

#### 2.3 更新 `src/app.css`
```css
/* Tailwind 基础层 */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* 全局样式 */
@layer base {
  :root {
    font-synthesis: none;
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  body {
    @apply bg-white text-gray-900 antialiased;
  }

  #app {
    @apply w-full h-screen m-0 p-0;
  }
}

/* 自定义组件样式 */
@layer components {
  /* 按钮基础样式 */
  .btn {
    @apply px-4 py-2 rounded-md font-medium transition-colors duration-150;
    @apply focus:outline-none focus:ring-2 focus:ring-offset-2;
  }

  .btn-primary {
    @apply bg-primary-600 text-white hover:bg-primary-700;
    @apply focus:ring-primary-500;
  }

  .btn-secondary {
    @apply bg-gray-200 text-gray-900 hover:bg-gray-300;
    @apply focus:ring-gray-500;
  }

  /* 卡片样式 */
  .card {
    @apply bg-white rounded-lg shadow-sm border border-gray-200 p-6;
  }

  /* 输入框样式 */
  .input {
    @apply block w-full rounded-md border-gray-300 shadow-sm;
    @apply focus:border-primary-500 focus:ring-primary-500;
  }

  /* 表格样式 */
  .table {
    @apply min-w-full divide-y divide-gray-200;
  }

  .table thead {
    @apply bg-gray-50;
  }

  .table th {
    @apply px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider;
  }

  .table td {
    @apply px-6 py-4 whitespace-nowrap text-sm text-gray-900;
  }
}

/* 自定义工具类 */
@layer utilities {
  .text-balance {
    text-wrap: balance;
  }

  .scrollbar-thin {
    scrollbar-width: thin;
  }
}
```

---

### Phase 3: 设计系统组件 (Day 2-3) ⏳

#### 3.1 创建设计系统组件库
```
src/lib/ui/
├── Button.svelte
├── Card.svelte
├── Input.svelte
├── Select.svelte
├── Badge.svelte
├── Alert.svelte
├── Modal.svelte
├── Tooltip.svelte
└── index.ts
```

#### 3.2 Button 组件示例
```svelte
<!-- src/lib/ui/Button.svelte -->
<script lang="ts">
  type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  type Size = 'sm' | 'md' | 'lg'

  let {
    variant = 'primary',
    size = 'md',
    disabled = false,
    class: className = '',
    onclick,
    children
  }: {
    variant?: Variant
    size?: Size
    disabled?: boolean
    class?: string
    onclick?: () => void
    children?: any
  } = $props()

  const variants = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500',
    outline: 'border-2 border-primary-600 text-primary-600 hover:bg-primary-50',
    ghost: 'text-primary-600 hover:bg-primary-50',
    danger: 'bg-error-600 text-white hover:bg-error-700 focus:ring-error-500',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  }

  const baseClass = 'inline-flex items-center justify-center rounded-md font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
</script>

<button
  class="{baseClass} {variants[variant]} {sizes[size]} {className}"
  {disabled}
  {onclick}
  type="button"
>
  {@render children?.()}
</button>
```

#### 3.3 Card 组件示例
```svelte
<!-- src/lib/ui/Card.svelte -->
<script lang="ts">
  let {
    title,
    class: className = '',
    children
  }: {
    title?: string
    class?: string
    children?: any
  } = $props()
</script>

<div class="bg-white rounded-lg shadow-sm border border-gray-200 {className}">
  {#if title}
    <div class="px-6 py-4 border-b border-gray-200">
      <h3 class="text-lg font-semibold text-gray-900">{title}</h3>
    </div>
  {/if}
  <div class="p-6">
    {@render children?.()}
  </div>
</div>
```

---

### Phase 4: 组件迁移 (Day 3-5) ⏳

#### 4.1 迁移优先级

**第一批（核心组件）**
- [ ] `App.svelte` - 主应用布局
- [ ] `ReportList.svelte` - 报表列表
- [ ] `ReportRenderer.svelte` - 报表渲染器

**第二批（输入组件）**
- [ ] `Dropdown.svelte` - 下拉选择
- [ ] `ButtonGroup.svelte` - 按钮组

**第三批（数据展示）**
- [ ] `DataTable.svelte` - 数据表格
- [ ] `BigValue.svelte` - 大数值

**第四批（图表容器）**
- [ ] `VgplotChart.svelte` - 图表组件

#### 4.2 迁移清单模板

针对每个组件：
- [ ] 移除内联样式
- [ ] 移除 `<style>` 块
- [ ] 应用 Tailwind 类名
- [ ] 使用设计系统组件
- [ ] 测试响应式布局
- [ ] 测试暗色模式（可选）

---

### Phase 5: 响应式和可访问性 (Day 5-6) ⏳

#### 5.1 响应式断点
```javascript
// tailwind.config.js - 已包含
screens: {
  'sm': '640px',
  'md': '768px',
  'lg': '1024px',
  'xl': '1280px',
  '2xl': '1536px',
}
```

#### 5.2 暗色模式支持（可选）
```javascript
// tailwind.config.js
module.exports = {
  darkMode: 'class', // 或 'media'
  // ...
}
```

```css
/* app.css */
@layer base {
  .dark body {
    @apply bg-gray-900 text-gray-100;
  }
}
```

#### 5.3 可访问性增强
- [ ] 使用语义化 HTML
- [ ] 添加 ARIA 标签
- [ ] 键盘导航支持
- [ ] 聚焦状态样式
- [ ] 颜色对比度检查

---

## 组件迁移策略

### 迁移方法论

#### Before (内联样式)
```svelte
<div style="padding: 1rem; background-color: #f9fafb; border-radius: 0.5rem;">
  <h2 style="font-size: 1.5rem; font-weight: 600; color: #111827;">Title</h2>
  <p style="margin-top: 0.5rem; color: #6b7280;">Content</p>
</div>
```

#### After (Tailwind)
```svelte
<div class="p-4 bg-gray-50 rounded-lg">
  <h2 class="text-2xl font-semibold text-gray-900">Title</h2>
  <p class="mt-2 text-gray-600">Content</p>
</div>
```

### 常用样式映射

#### 布局
```
display: flex               → flex
flex-direction: column      → flex-col
justify-content: center     → justify-center
align-items: center         → items-center
gap: 1rem                   → gap-4
```

#### 间距
```
padding: 1rem               → p-4
margin: 1rem                → m-4
padding-left: 1rem          → pl-4
margin-top: 0.5rem          → mt-2
```

#### 文本
```
font-size: 1rem             → text-base
font-weight: 600            → font-semibold
color: #111827              → text-gray-900
text-align: center          → text-center
```

#### 背景和边框
```
background-color: #f9fafb   → bg-gray-50
border: 1px solid #e5e7eb   → border border-gray-200
border-radius: 0.5rem       → rounded-lg
```

---

## 最佳实践

### 1. 组件类名组织
```svelte
<script>
  // 使用 computed classes
  const buttonClass = $derived(`
    inline-flex items-center justify-center
    px-4 py-2 rounded-md
    font-medium transition-colors
    ${variant === 'primary' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-900'}
    ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary-700'}
  `)
</script>
```

### 2. 使用 @apply 封装重复样式
```css
/* app.css */
@layer components {
  .prose-evidence {
    @apply text-gray-900 leading-relaxed;
  }

  .prose-evidence h1 {
    @apply text-4xl font-bold mb-4;
  }

  .prose-evidence p {
    @apply mb-4;
  }
}
```

### 3. 语义化类名
```svelte
<!-- 好的实践 -->
<button class="btn-primary">Submit</button>

<!-- 避免 -->
<button class="bg-blue-600 text-white px-4 py-2 rounded">Submit</button>
```

### 4. 响应式设计
```svelte
<!-- Mobile first -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <!-- Content -->
</div>
```

### 5. 使用 Tailwind 插件
```javascript
// tailwind.config.js
plugins: [
  require('@tailwindcss/forms')({
    strategy: 'class', // 只在添加 form-* 类时应用样式
  }),
  require('@tailwindcss/typography'),
]
```

---

## 性能优化

### 1. PurgeCSS 配置
```javascript
// tailwind.config.js
module.exports = {
  content: [
    './index.html',
    './src/**/*.{svelte,js,ts,jsx,tsx}',
  ],
  // Tailwind 会自动移除未使用的样式
}
```

### 2. JIT 模式（默认启用）
Tailwind 3.x 默认使用 JIT（Just-in-Time）模式，按需生成样式。

### 3. 生产构建优化
```json
// package.json
{
  "scripts": {
    "build": "vite build",
    "build:analyze": "vite build --mode analyze"
  }
}
```

---

## 测试计划

### 视觉回归测试
- [ ] 对比迁移前后的截图
- [ ] 检查所有组件的视觉一致性
- [ ] 测试不同屏幕尺寸

### 功能测试
- [ ] 确保所有交互功能正常
- [ ] 测试表单提交
- [ ] 测试图表渲染
- [ ] 测试下拉菜单和模态框

### 性能测试
- [ ] 首屏加载时间
- [ ] CSS 文件大小
- [ ] Lighthouse 评分

---

## 实施时间表

### Week 1: 基础配置和设计系统
- **Day 1**: 安装配置 Tailwind + PostCSS ✅
- **Day 2**: 配置颜色系统和主题 ✅
- **Day 3**: 创建设计系统组件库（Button, Card, Input 等）

### Week 2: 核心组件迁移
- **Day 4**: 迁移 App.svelte 和布局组件
- **Day 5**: 迁移 ReportList 和 ReportRenderer
- **Day 6**: 迁移输入组件（Dropdown, ButtonGroup）

### Week 3: 数据组件和优化
- **Day 7**: 迁移数据展示组件（DataTable, BigValue）
- **Day 8**: 迁移图表组件
- **Day 9**: 响应式优化和可访问性
- **Day 10**: 测试、文档和收尾

---

## 验收标准

### 完成定义 (Definition of Done)

- ✅ 所有组件使用 Tailwind 类名
- ✅ 移除所有内联样式
- ✅ 移除 95% 以上的 `<style>` 块
- ✅ 设计系统组件库完整
- ✅ 响应式布局测试通过
- ✅ 可访问性检查通过
- ✅ 性能指标达标（CSS < 50KB gzipped）
- ✅ 文档完整
- ✅ 团队培训完成

---

## 参考资源

### Tailwind CSS
- [官方文档](https://tailwindcss.com/docs)
- [Playground](https://play.tailwindcss.com/)
- [Components](https://tailwindui.com/components)

### Evidence.dev
- [设计系统](https://docs.evidence.dev/design-system)
- [组件库](https://docs.evidence.dev/components)
- [主题定制](https://docs.evidence.dev/customization/theme)

### 工具
- [Tailwind CSS IntelliSense](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss) - VS Code 插件
- [Headless UI](https://headlessui.com/) - 无样式组件库
- [clsx](https://github.com/lukeed/clsx) - 类名工具库

---

**最后更新:** 2025-12-12
**维护者:** Claude Code Assistant
**状态:** 🚧 Ready to Start
