---
name: fix-large-file
description: Split files exceeding 500 lines into smaller files. Use when pre-commit fails with file size error, or when refactoring large Svelte components, TypeScript files. Helps extract styles, data, types, and sub-components.
metadata:
  internal: true
---

# Fix Large Files

Split files exceeding 500 lines according to project specifications.

## Project Constraints

- **Max lines**: 500 lines/file (pre-commit enforced)
- **Recommended**: < 300 lines (leave room)
- **Check command**: `npm run check:size`

## Analysis Phase

### Step 1: Check File Size

```bash
wc -l <target-file>
```

### Step 2: Identify Splittable Parts

Read file content and identify these extractable blocks:

| Block Type | Identifier | Target |
|------------|------------|--------|
| **Styles** | `<style>` tag content | `styles.css` or `{name}.css` |
| **Static Data** | `const DATA = [...]` large arrays/objects | `data.ts` or `constants.ts` |
| **Types** | `interface`/`type` definitions | `types.ts` |
| **Utils** | Pure functions, no component deps | `utils.ts` or `helpers.ts` |
| **Sub-components** | Independent UI blocks | `{SubComponent}.svelte` |

### Step 3: Plan Split Strategy

Calculate block sizes, plan strategy:

```
Original: Component.svelte (800 lines)
├── <script>    : 200 lines → Keep + extract types/data
├── <template>  : 150 lines → Identify sub-components
└── <style>     : 450 lines → Extract to CSS file
```

## Execution Phase

### Pattern A: Svelte Component Split

**For**: `.svelte` files

**Target structure**:
```
component/
├── Component.svelte         # Main (composition layer)
├── SubComponentA.svelte     # Sub-component
├── SubComponentB.svelte     # Sub-component
├── styles.css               # Extracted styles
├── types.ts                 # Type definitions
├── data.ts                  # Static data
├── utils.ts                 # Utility functions
└── index.ts                 # Unified exports
```

**Style extraction**:

```svelte
<!-- Before: inline styles -->
<style>
  .container { ... }
  /* 400+ lines */
</style>

<!-- After: external styles -->
<script lang="ts">
  import './styles.css'
</script>
```

**Sub-component extraction**:

```svelte
<!-- Before: inline template -->
<div class="hero">
  <div class="hero-badge">...</div>
  <h1 class="hero-title">...</h1>
  <!-- 100+ lines -->
</div>

<!-- After: sub-component -->
<script>
  import HeroSection from './HeroSection.svelte'
</script>

<HeroSection {data} on:click={handleClick} />
```

### Pattern B: TypeScript File Split

**For**: `.ts` files

**Strategy**:
```
Original: service.ts (600 lines)
         ↓
Split:
├── service.ts           # Main service class
├── service.types.ts     # Type definitions
├── service.utils.ts     # Utility functions
├── service.constants.ts # Constants
└── index.ts             # Unified exports
```

### Pattern C: Data Extraction

**Identify large data blocks**:
```typescript
// Before: inline data
const SAMPLE_ARTICLES: Record<string, string> = {
  quarterly: `...`, // 50 lines
  techTrends: `...`, // 40 lines
}

// After: separate data file
// data/sample-articles.ts
export const SAMPLE_ARTICLES = { ... }

// Component.svelte
import { SAMPLE_ARTICLES } from './data/sample-articles'
```

## Execution Checklist

1. Create directory structure: `mkdir -p src/components/{component-name}`
2. Create types.ts - Extract all `interface` and `type` definitions
3. Create data.ts - Extract static data constants
4. Create styles.css - Extract `<style>` content
5. Create sub-components - Identify independent UI blocks
6. Create index.ts - Unified exports
7. Update original file imports
8. Update external references

## Verification

```bash
# 1. Check file sizes
npm run check:size

# 2. TypeScript check
npm run check

# 3. Dev server test
npm run dev

# 4. Run tests
npm run test
```

## Common Issues

### Q: Style scope lost after extraction?

**Solution**: Use BEM naming or component prefix
```css
/* styles.css */
.landing-page__hero { ... }
.landing-page__nav { ... }
```

### Q: Sub-component needs parent state?

**Solution**: Pass via props or use Svelte context
```svelte
<!-- Parent -->
<SubComponent {data} {config} on:change={handleChange} />

<!-- Child -->
<script>
  let { data, config }: Props = $props()
</script>
```

## Example: Split LandingPage

```
Before:
  src/components/LandingPage.svelte (845 lines)

After:
  src/components/landing/
  ├── LandingPage.svelte      (~120 lines) - Composition
  ├── HeroSection.svelte      (~80 lines)  - Hero area
  ├── DemoGrid.svelte         (~60 lines)  - Demo cards
  ├── FeaturePills.svelte     (~40 lines)  - Feature tags
  ├── NavBar.svelte           (~50 lines)  - Navigation
  ├── Footer.svelte           (~30 lines)  - Footer
  ├── styles.css              (~350 lines) - Centralized styles
  ├── types.ts                (~30 lines)  - Type definitions
  ├── data.ts                 (~50 lines)  - Static data
  └── index.ts                (~10 lines)  - Exports
```
