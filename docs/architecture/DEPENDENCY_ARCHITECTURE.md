# Dependency Architecture

## Overview

This document describes the dependency architecture of the project and optimization plans.

## Current Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                           main.ts                                │
│                              │                                   │
│                              ▼                                   │
│                         bootstrap/                               │
│                        /          \                              │
│                       ▼            ▼                             │
│                  plugins/  ────→  core/                          │
│                                     ▲                            │
│                                     │                            │
│                  app/stores ◄───────┘                            │
└─────────────────────────────────────────────────────────────────┘
```

## Dependency Rules

### Allowed Dependencies

| Layer | Can Depend On |
|-------|---------------|
| main.ts | bootstrap/, app/, components/ |
| bootstrap/ | core/, plugins/, app/ |
| plugins/ | core/, types/ |
| app/ | core/, types/ |
| components/ | core/, app/, plugins/, types/ |
| core/ | types/ only |
| types/ | nothing |

### Forbidden Dependencies

| From | To | Reason |
|------|-----|--------|
| core/ | plugins/ | Core should not know about plugins |
| core/ | app/ | Core should not depend on application layer |
| core/ | components/ | Core should not depend on UI |
| types/ | anything | Types are the bottom layer |

## Current Issues

### Issue 1: core → plugins (High Priority)

**Files:**
- `core/engine/report-execution.service.ts` → `@plugins/inputs`, `@plugins/viz`
- `core/markdown/sql-executor.ts` → `@plugins/viz/chart-builder`

**Solution:** Dependency Injection with interfaces

### Issue 2: core → app (Medium Priority)

**Files:**
- `core/database/template.ts` → `@app/stores/report-inputs`
- `core/engine/block-renderer.ts` → `@app/stores/report-inputs`
- `core/engine/report-execution.service.ts` → `@app/stores/report-inputs`
- `core/engine/reactive-executor.ts` → `@app/stores/report-inputs`
- `core/markdown/sql-executor.ts` → `@app/stores/database.svelte`
- `core/shared/di/interfaces.ts` → `@app/stores/report-inputs`

**Solution:** Extract store interfaces to types/

## Optimization Plan

### P0: Bootstrap Layer (Completed)

Created `src/bootstrap/` to handle initialization:
- `init-charts.ts` - vgplot chart registration
- `init-plugins.ts` - plugin registration
- `index.ts` - main entry point

### P1: IChartBuilder Interface (In Progress)

Extract interfaces to break core → plugins dependency:

```typescript
// types/interfaces/chart-builder.ts
export interface IChartBuilder {
  buildFromBlock(
    block: ParsedCodeBlock,
    tableMapping: Map<string, string>,
    context: SQLTemplateContext
  ): ChartConfig | null

  buildFromBlocks(
    blocks: ParsedCodeBlock[],
    tableMapping: Map<string, string>,
    context: SQLTemplateContext
  ): Map<string, ChartConfig>
}

export interface IInputInitializer {
  initializeDefaults(
    blocks: ParsedCodeBlock[],
    inputStore: IInputStore
  ): void
}
```

### P2: Store Interfaces (Planned)

Extract store interfaces to break core → app dependency:

```typescript
// types/interfaces/stores.ts
export interface IInputStore {
  get(): InputState
  subscribe(fn: (state: InputState) => void): () => void
  update(fn: (state: InputState) => InputState): void
}

export interface IDatabaseStore {
  getConnection(): DuckDBConnection | null
}
```

### P3: Event Bus (Future)

For complete decoupling, implement event-driven architecture:

```typescript
// core/events/index.ts
export const eventBus = createEventBus<{
  'chart:build': { block: ParsedCodeBlock, callback: (config: ChartConfig) => void }
  'input:initialize': { blocks: ParsedCodeBlock[] }
}>()
```

## Target Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Layer 4: Application Entry                                     │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ main.ts, App.svelte                                         ││
│  └─────────────────────────────────────────────────────────────┘│
│                              │                                   │
│                              ▼                                   │
│  Layer 3: Bootstrap / Composition Root                          │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ bootstrap/  (wires all dependencies)                        ││
│  └─────────────────────────────────────────────────────────────┘│
│                              │                                   │
│              ┌───────────────┼───────────────┐                  │
│              ▼               ▼               ▼                  │
│  Layer 2: Features                                               │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                │
│  │  plugins/   │ │    app/     │ │ components/ │                │
│  └─────────────┘ └─────────────┘ └─────────────┘                │
│              │               │               │                   │
│              └───────────────┼───────────────┘                  │
│                              ▼                                   │
│  Layer 1: Core (pure logic, interface-only dependencies)        │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ core/  (registry, database, markdown, engine, shared)       ││
│  └─────────────────────────────────────────────────────────────┘│
│                              │                                   │
│                              ▼                                   │
│  Layer 0: Types / Contracts                                      │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ types/  (interfaces, type definitions)                      ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

## Implementation Status

| Priority | Task | Status |
|----------|------|--------|
| P0 | Bootstrap layer | ✅ Completed |
| P1 | IChartBuilder interface | ✅ Completed |
| P2 | Store interfaces | ✅ Completed |
| P3 | Event bus | 📋 Future |

## Verification

```bash
# Verify core/ has no external dependencies
$ grep -r "from '@app" src/core/
# No matches found

$ grep -r "from '@plugins" src/core/
# No matches found
```
