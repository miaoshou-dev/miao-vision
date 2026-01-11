# Testing Implementation Plan

Detailed implementation guide for addressing testing gaps identified in the Hybrid GNode race condition bugs.

---

## P0: Critical (This Week)

### 1. Enable E2E Tests in CI/CD

**Goal**: Automatically run E2E tests on every commit

**Implementation**:

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Build app
        run: npm run build

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

**Success Criteria**:
- [ ] E2E tests run on every PR
- [ ] Failures block merge
- [ ] Test reports uploaded as artifacts

---

### 2. Add Concurrency Stress Tests

**Goal**: Catch race conditions before production

**Implementation**:

```typescript
// tests/stress/hybrid-gnode-concurrency.test.ts
import { describe, it, expect } from 'vitest'
import { HybridGNode } from '@core/engine'

describe('HybridGNode Concurrency Stress Tests', () => {
  it('should handle 1000 rapid sequential updates', async () => {
    const gnode = new HybridGNode()
    await gnode.createTable('test', { value: 'INTEGER' })
    await gnode.createView('summary', {
      source: 'test',
      aggregates: { value: 'sum' }
    })

    const errors: Error[] = []

    // Rapid fire 1000 updates
    for (let i = 0; i < 1000; i++) {
      try {
        await gnode.update('test', [{ value: i }])
      } catch (error) {
        errors.push(error as Error)
      }

      // Random delays to create timing variations
      if (i % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, Math.random() * 10))
      }
    }

    expect(errors).toHaveLength(0)
  })

  it('should handle concurrent updates from multiple sources', async () => {
    const gnode = new HybridGNode()
    await gnode.createTable('sales', {
      region: 'VARCHAR',
      revenue: 'DOUBLE'
    })

    await gnode.createView('summary', {
      source: 'sales',
      rowPivots: ['region'],
      aggregates: { revenue: 'sum' }
    })

    // Simulate 10 concurrent data sources
    const concurrentUpdates = Array.from({ length: 10 }, (_, i) =>
      Promise.all(
        Array.from({ length: 100 }, (_, j) =>
          gnode.update('sales', [{
            region: `Region${i}`,
            revenue: Math.random() * 1000
          }])
        )
      )
    )

    // Should NOT throw "already exists" or "does not exist"
    await expect(Promise.all(concurrentUpdates)).resolves.not.toThrow()
  })

  it('should handle rapid clear and restart cycles', async () => {
    const gnode = new HybridGNode()

    for (let cycle = 0; cycle < 50; cycle++) {
      // Create
      await gnode.createTable(`table_${cycle}`, { value: 'INTEGER' })
      await gnode.createView(`view_${cycle}`, {
        source: `table_${cycle}`,
        aggregates: { value: 'count' }
      })

      // Update
      await gnode.update(`table_${cycle}`, [{ value: cycle }])

      // Query
      const result = await gnode.query(`view_${cycle}`)
      expect(result).toBeDefined()

      // Short random delay
      await new Promise(resolve =>
        setTimeout(resolve, Math.random() * 5)
      )
    }
  })

  it('should handle mutex correctly under high contention', async () => {
    const gnode = new HybridGNode()
    await gnode.createTable('test', { value: 'INTEGER' })

    const view = await gnode.createView('summary', {
      source: 'test',
      aggregates: { value: 'sum' }
    })

    let refreshCount = 0
    view.onUpdate(() => refreshCount++)

    // Fire 100 updates in parallel batches
    const batches = Array.from({ length: 10 }, (_, batchIndex) =>
      Promise.all(
        Array.from({ length: 10 }, (_, i) =>
          gnode.update('test', [{ value: batchIndex * 10 + i }])
        )
      )
    )

    await Promise.all(batches)

    // Wait for all refreshes to complete
    await new Promise(resolve => setTimeout(resolve, 200))

    // Refreshes should have been batched (fewer than 100)
    console.log(`Refresh count: ${refreshCount}`)
    expect(refreshCount).toBeLessThan(100)
    expect(refreshCount).toBeGreaterThan(0)
  })
})
```

**Run Command**:
```bash
npm run test:stress
```

**Success Criteria**:
- [ ] All stress tests pass
- [ ] No "already exists" errors
- [ ] No "does not exist" errors
- [ ] Mutex prevents >1 concurrent refresh

---

### 3. Create Race Condition Detection Suite

**Goal**: Automatically detect common race condition patterns

**Implementation**:

```typescript
// tests/utils/race-detector.ts
export class RaceConditionDetector {
  private operations: Array<{
    type: string
    timestamp: number
    resource: string
  }> = []

  logOperation(type: string, resource: string) {
    this.operations.push({
      type,
      timestamp: performance.now(),
      resource
    })
  }

  detectRaces(): Array<{ resource: string; conflict: string }> {
    const races: Array<{ resource: string; conflict: string }> = []
    const resourceOps = new Map<string, typeof this.operations>()

    // Group by resource
    for (const op of this.operations) {
      if (!resourceOps.has(op.resource)) {
        resourceOps.set(op.resource, [])
      }
      resourceOps.get(op.resource)!.push(op)
    }

    // Detect overlapping operations
    for (const [resource, ops] of resourceOps) {
      for (let i = 0; i < ops.length - 1; i++) {
        const op1 = ops[i]
        const op2 = ops[i + 1]

        // If operations overlap in time (< 5ms apart)
        if (op2.timestamp - op1.timestamp < 5) {
          if (
            (op1.type === 'DROP' && op2.type === 'CREATE') ||
            (op1.type === 'CREATE' && op2.type === 'DROP')
          ) {
            races.push({
              resource,
              conflict: `${op1.type} at ${op1.timestamp}ms overlaps with ${op2.type} at ${op2.timestamp}ms`
            })
          }
        }
      }
    }

    return races
  }

  reset() {
    this.operations = []
  }
}

// Usage in tests
describe('Race Detection', () => {
  it('should detect table creation races', async () => {
    const detector = new RaceConditionDetector()
    const gnode = new HybridGNode()

    // Instrument GNode to log operations
    const originalQuery = gnode['query']
    gnode['query'] = async function(...args) {
      const sql = args[0] as string
      if (sql.includes('DROP TABLE')) {
        detector.logOperation('DROP', extractTableName(sql))
      } else if (sql.includes('CREATE TABLE')) {
        detector.logOperation('CREATE', extractTableName(sql))
      }
      return originalQuery.apply(this, args)
    }

    // Run stress test
    // ... perform operations ...

    // Check for races
    const races = detector.detectRaces()
    expect(races).toHaveLength(0)
  })
})
```

**Success Criteria**:
- [ ] Detector integrated into stress tests
- [ ] Automatically fails on detected races
- [ ] Reports timing information

---

### 4. Document Testing Requirements

**Goal**: Make testing expectations clear for contributors

**Implementation**:

```markdown
# CONTRIBUTING.md (add section)

## Testing Requirements

### For All Pull Requests

Every PR must include:

1. **Unit Tests** (if adding pure functions)
   ```bash
   npm run test:run -- path/to/your-feature.test.ts
   ```

2. **Integration Tests** (if using DuckDB or async operations)
   ```bash
   npm run test:e2e -- tests/e2e/your-feature.spec.ts
   ```

3. **Concurrency Tests** (if handling async state or multiple operations)
   ```typescript
   // Required for: database operations, view updates, state management
   test('should handle concurrent operations', async () => {
     const promises = [operation1(), operation2(), operation3()]
     await expect(Promise.all(promises)).resolves.not.toThrow()
   })
   ```

### Test Coverage Targets

| Category | Target | Tools |
|----------|--------|-------|
| Pure functions | 80%+ | Vitest |
| Database operations | 100% | E2E tests |
| UI components | 70%+ | Playwright |
| Race conditions | All async ops | Stress tests |

### Running Tests Locally

```bash
# All tests
npm test

# Unit tests only
npm run test:run

# E2E tests
npm run test:e2e

# Stress tests
npm run test:stress

# With coverage
npm run test:coverage
```

### When Tests Should Fail

- SQL syntax errors
- Race conditions
- Unhandled async errors
- Missing error handling
- Resource leaks

### Example: Good Test

```typescript
describe('MyFeature', () => {
  // ✅ Tests the actual behavior
  it('should handle rapid updates without errors', async () => {
    for (let i = 0; i < 100; i++) {
      await feature.update(randomData())
    }
    expect(await feature.getState()).toBeDefined()
  })

  // ✅ Tests error cases
  it('should throw on invalid input', async () => {
    await expect(feature.update(null)).rejects.toThrow()
  })

  // ✅ Tests concurrency
  it('should handle concurrent calls', async () => {
    await Promise.all([
      feature.update(data1),
      feature.update(data2)
    ])
  })
})
```
```

**Success Criteria**:
- [ ] CONTRIBUTING.md updated
- [ ] Examples provided
- [ ] Coverage targets defined

---

## P1: Short-term (Next Sprint)

### 5. Configure Vitest Browser Mode

**Goal**: Run unit tests in real browser environment

**Implementation**:

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Browser mode for DuckDB-WASM tests
    browser: {
      enabled: true,
      name: 'chromium',
      provider: 'playwright',
      headless: true
    },

    // Separate configs for different test types
    include: [
      'src/**/*.test.ts',          // Unit tests
      'src/**/*.browser.test.ts'   // Browser-specific tests
    ],

    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: ['**/node_modules/**', '**/tests/**']
    }
  }
})
```

```typescript
// src/core/engine/hybrid-gnode.browser.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { HybridGNode } from './hybrid-gnode'
import { duckDBManager } from '@core/database'

// These tests run in REAL browser with Web Workers
describe('HybridGNode (Browser)', () => {
  beforeEach(async () => {
    await duckDBManager.initialize()
  })

  it('should create table and insert data', async () => {
    const gnode = new HybridGNode()

    await gnode.createTable('test', {
      name: 'VARCHAR',
      value: 'INTEGER'
    })

    // This actually executes SQL in DuckDB-WASM
    await gnode.update('test', [
      { name: 'Alice', value: 100 },
      { name: 'Bob', value: 200 }
    ])

    const result = await gnode.query('test')
    expect(result).toHaveLength(2)
  })
})
```

**Run Commands**:
```bash
# Browser tests
npm run test:browser

# Regular tests
npm run test:run
```

**Success Criteria**:
- [ ] Browser tests run in CI
- [ ] DuckDB-WASM tests no longer skipped
- [ ] Coverage includes browser tests

---

### 6. Implement SQL Validation Layer

**Goal**: Catch SQL errors before execution

**Implementation**:

```typescript
// src/core/database/sql-validator.ts
export class SQLValidator {
  /**
   * Validate INSERT statement has correct column count
   */
  static validateInsert(sql: string, expectedColumns: number): void {
    const match = sql.match(/VALUES\s*\(([^)]+)\)/i)
    if (!match) {
      throw new Error('Invalid INSERT statement')
    }

    const values = match[1].split(',').length
    if (values !== expectedColumns) {
      throw new Error(
        `Column count mismatch: expected ${expectedColumns}, got ${values}\nSQL: ${sql}`
      )
    }
  }

  /**
   * Validate table name is safe (prevent SQL injection)
   */
  static validateTableName(name: string): void {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
      throw new Error(`Invalid table name: ${name}`)
    }
  }

  /**
   * Validate column names
   */
  static validateColumnNames(columns: string[]): void {
    for (const col of columns) {
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(col)) {
        throw new Error(`Invalid column name: ${col}`)
      }
    }
  }

  /**
   * Build safe INSERT statement
   */
  static buildSafeInsert(
    tableName: string,
    columns: string[],
    values: any[][]
  ): string {
    this.validateTableName(tableName)
    this.validateColumnNames(columns)

    const columnList = columns.map(c => `"${c}"`).join(', ')
    const valueLists = values.map(row => {
      if (row.length !== columns.length) {
        throw new Error(`Row has ${row.length} values but ${columns.length} columns defined`)
      }
      return `(${row.map(v => this.escapeValue(v)).join(', ')})`
    }).join(', ')

    return `INSERT INTO "${tableName}" (${columnList}) VALUES ${valueLists}`
  }

  private static escapeValue(value: any): string {
    if (value === null || value === undefined) return 'NULL'
    if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`
    if (value instanceof Date) return `'${value.toISOString()}'`
    return String(value)
  }
}

// Usage in hybrid-gnode.ts
import { SQLValidator } from '@core/database/sql-validator'

async update(tableId: string, data: any[]): Promise<void> {
  // ... existing code ...

  // Build safe SQL using validator
  const sql = SQLValidator.buildSafeInsert(
    `${tableId}_delta`,
    ['_row_id', '_version', '_timestamp', '_op', ...columnNames],
    data.map((row, idx) => [
      Date.now() + idx,
      version,
      timestamp,
      'INSERT',
      ...columnNames.map(col => row[col])
    ])
  )

  await conn.query(sql)
}
```

**Success Criteria**:
- [ ] SQL validator tests pass
- [ ] All INSERT statements use validator
- [ ] Column mismatch caught at build time

---

## P2: Long-term (Next Quarter)

### 7. Chaos Engineering Framework

**Goal**: Test system resilience

**Implementation**:

```typescript
// tests/chaos/framework.ts
export class ChaosTest {
  async injectFailure(
    target: any,
    method: string,
    failureRate: number = 0.1
  ): Promise<() => void> {
    const original = target[method]

    target[method] = async function(...args: any[]) {
      if (Math.random() < failureRate) {
        throw new Error(`Chaos: ${method} failed`)
      }
      return original.apply(this, args)
    }

    // Return cleanup function
    return () => {
      target[method] = original
    }
  }

  async injectLatency(
    target: any,
    method: string,
    delayMs: number = 100
  ): Promise<() => void> {
    const original = target[method]

    target[method] = async function(...args: any[]) {
      await new Promise(resolve => setTimeout(resolve, delayMs))
      return original.apply(this, args)
    }

    return () => {
      target[method] = original
    }
  }
}

// Usage
describe('Chaos Tests', () => {
  it('should recover from connection failures', async () => {
    const chaos = new ChaosTest()
    const cleanup = await chaos.injectFailure(db, 'connect', 0.3)

    try {
      // 30% of connections will fail
      for (let i = 0; i < 100; i++) {
        await gnode.update('test', [{ value: i }])
      }
    } finally {
      cleanup()
    }
  })
})
```

---

## Summary

| Priority | Tasks | Timeline | Owner |
|----------|-------|----------|-------|
| P0 | 4 tasks | This week | TBD |
| P1 | 4 tasks | Next sprint | TBD |
| P2 | 4 tasks | Next quarter | TBD |

**Next Steps**:
1. Review this plan
2. Assign owners
3. Create tracking issues
4. Begin P0 implementation
