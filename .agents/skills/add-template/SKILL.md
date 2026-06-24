---
name: add-template
description: Add new infographic-section templates for rendering. Use when creating new visualization templates like KPI, timeline, pie, grid, comparison layouts. Includes renderer, adapter, registry, and AI mapping.
---

# Add Infographic Template

Add new rendering template to `infographic-section` component.

## Currently Registered Templates

| Template ID | Display Name | Use Case | Items |
|-------------|--------------|----------|-------|
| `kpi-row-badge` | KPI Row (Badge) | Key metrics display | 2-6 |
| `flow-timeline` | Flow Timeline | Process/timeline | 3-6 |
| `pie-distribution` | Pie Distribution | Proportional distribution | 2-8 |
| `grid-comparison` | Grid Comparison | Grid comparison | 2-9 |

## Related File Locations

```
src/plugins/data-display/infographic-section/
├── templates/
│   ├── registry.ts                    # Template registry
│   └── renderers/
│       ├── KpiRowBadge.svelte
│       ├── FlowTimeline.svelte
│       ├── PieDistribution.svelte
│       └── GridComparison.svelte
├── adapters/
│   ├── index.ts
│   ├── row-adapter.ts
│   ├── flow-adapter.ts
│   ├── sector-adapter.ts
│   └── grid-adapter.ts
└── types.ts
```

## Adding New Template Steps

### Step 1: Define Template Info

Confirm:
- Template ID (kebab-case): e.g., `table-comparison`
- Display name: e.g., "Table Comparison"
- Use case: When to use this template
- Required data fields

### Step 2: Create Renderer Component

File: `src/plugins/data-display/infographic-section/templates/renderers/{TemplateName}.svelte`

```svelte
<script lang="ts">
  /**
   * {TemplateName} Template Renderer
   */
  import type { TemplateProps, AdaptedItem } from '../../types'

  interface Props extends TemplateProps {}

  let { items, theme, palette, width, height }: Props = $props()

  // Color configuration
  const PALETTES: Record<string, string[]> = {
    vibrant: ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981'],
    ocean: ['#0EA5E9', '#06B6D4', '#14B8A6', '#3B82F6', '#6366F1'],
    sunset: ['#F59E0B', '#EF4444', '#EC4899', '#8B5CF6', '#F97316'],
    forest: ['#10B981', '#059669', '#34D399', '#6EE7B7', '#14B8A6']
  }

  let colors = $derived(PALETTES[palette] || PALETTES.vibrant)

  // Data processing
  let processedItems = $derived(
    items.map((item, index) => ({
      ...item,
      color: colors[index % colors.length]
    }))
  )
</script>

<div
  class="template-{template-id}"
  style:width="{width}px"
  style:height={height ? `${height}px` : 'auto'}
>
  {#each processedItems as item, i}
    <div class="item" style:--item-color={item.color}>
      <span class="label">{item.label}</span>
      {#if item.value !== undefined}
        <span class="value">{item.value}</span>
      {/if}
      {#if item.desc}
        <span class="desc">{item.desc}</span>
      {/if}
    </div>
  {/each}
</div>

<style>
  .template-{template-id} {
    display: flex;
    gap: 1rem;
    padding: 1rem;
  }

  .item {
    flex: 1;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    border-left: 3px solid var(--item-color);
  }

  .label {
    display: block;
    font-weight: 600;
    color: #f3f4f6;
  }

  .value {
    display: block;
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--item-color);
  }

  .desc {
    display: block;
    font-size: 0.875rem;
    color: #9ca3af;
  }
</style>
```

### Step 3: Create Data Adapter

File: `src/plugins/data-display/infographic-section/adapters/{template}-adapter.ts`

```typescript
/**
 * {TemplateName} Data Adapter
 */
import type { SectionItem } from '../types'

export interface {TemplateName}Item {
  label: string
  value?: string | number
  desc?: string
}

/**
 * Adapt data to {TemplateName} format
 */
export function adaptTo{TemplateName}(items: SectionItem[]): {TemplateName}Item[] {
  return items.map((item, index) => ({
    label: item.label,
    value: item.value,
    desc: item.desc,
  }))
}
```

### Step 4: Update Adapter Index

File: `src/plugins/data-display/infographic-section/adapters/index.ts`

```typescript
// Add export
export { adaptTo{TemplateName} } from './{template}-adapter'
```

### Step 5: Register Template

File: `src/plugins/data-display/infographic-section/templates/registry.ts`

```typescript
// 1. Add import
import {TemplateName} from './renderers/{TemplateName}.svelte'
import { adaptTo{TemplateName} } from '../adapters/{template}-adapter'

// 2. Add to templateRegistry
export const templateRegistry: TemplateRegistry = {
  // ... existing templates

  /**
   * {Display Name}
   * Use for: {Use case description}
   */
  '{template-id}': {
    component: {TemplateName},
    adapter: adaptTo{TemplateName},
    defaultHeight: 200,
    displayName: '{Display Name}',
    description: '{Template description}'
  }
}
```

### Step 6: Add AI Template Mapping (CRITICAL!)

File: `src/core/ai/infographic/infographic-generator.ts`

Add mappings in `TEMPLATE_MAP` for AI-generated template names:

```typescript
const TEMPLATE_MAP: Record<string, string> = {
  // ... existing mappings

  // Add new template mappings
  '{ai-template-name-1}': '{template-id}',
  '{ai-template-name-2}': '{template-id}',
}
```

**Common AI naming patterns**:
- KPI: `kpi-*`, `metrics-*`, `stats-*`
- Flow: `flow-*`, `timeline-*`, `process-*`, `steps-*`
- Compare: `compare-*`, `comparison-*`, `versus-*`
- Distribution: `pie-*`, `distribution-*`, `breakdown-*`

### Step 7: Add to Demo Templates (Optional)

File: `src/components/article-to-infographic/data/demo-templates.ts`

Add example using the new template if needed.

## Verification Steps

### 1. TypeScript Check
```bash
npm run check
```

### 2. Dev Server Test
```bash
npm run dev
```

Visit Article → Infographic Demo, test new template rendering

### 3. Verify AI Mapping
Test that AI-generated content correctly maps to new template

## Verification Checklist

- [ ] Renderer component created
- [ ] Adapter function implemented
- [ ] Registered in `registry.ts`
- [ ] Added to `TEMPLATE_MAP`
- [ ] No TypeScript errors
- [ ] Renders correctly in dev
- [ ] All files < 300 lines

## Template Design Guidelines

### Responsive Design
```svelte
<div style:width="{width}px">
  <!-- Use flex/grid for internal layout -->
</div>
```

### Color Usage
```svelte
<!-- Use palette, not hardcoded colors -->
let colors = $derived(PALETTES[palette] || PALETTES.vibrant)
```

### Empty Data Handling
```svelte
{#if items.length === 0}
  <div class="empty">No data</div>
{:else}
  <!-- Normal render -->
{/if}
```

### Accessibility
```svelte
<div role="list" aria-label="{template description}">
  {#each items as item}
    <div role="listitem">...</div>
  {/each}
</div>
```

## Reference Implementations

- Simple layout: `KpiRowBadge.svelte`
- SVG graphics: `PieDistribution.svelte`
- Flow arrows: `FlowTimeline.svelte`
- Grid layout: `GridComparison.svelte`
