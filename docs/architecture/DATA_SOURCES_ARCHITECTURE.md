# Data Sources Architecture

> Inspired by [Evidence.dev Data Sources](https://docs.evidence.dev/core-concepts/data-sources/)

## Overview

This document outlines the architecture for implementing a pluggable data source system, enabling connections to multiple database types while maintaining a unified query interface through DuckDB-WASM.

## Current State vs Target State

| Aspect | Current | Target |
|--------|---------|--------|
| Data Sources | File upload only | Multiple connectors |
| Connection Types | WASM (functional), Remote/MotherDuck (placeholder) | All functional |
| Configuration | localStorage JSON | YAML files + localStorage |
| Query Layer | Direct DuckDB | Unified via DuckDB (extract to Parquet) |
| Persistence | None (in-memory) | OPFS + Parquet cache |

## Architecture Design

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Interface                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ Settings    │  │ Data        │  │ SQL Workspace           │  │
│  │ /sources    │  │ Explorer    │  │                         │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                       Store Layer (Svelte 5 Runes)               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ connection  │  │ database    │  │ sourceConfig            │  │
│  │ Store       │  │ Store       │  │ Store                   │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                      Connector Layer                             │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                  ConnectorRegistry                       │    │
│  │  register(type, connector) / get(type) / list()         │    │
│  └─────────────────────────────────────────────────────────┘    │
│         │              │              │              │           │
│  ┌──────▼─────┐ ┌──────▼─────┐ ┌──────▼─────┐ ┌──────▼─────┐   │
│  │ WasmConn   │ │ MotherDuck │ │ HttpConn   │ │ FileConn   │   │
│  │ ector      │ │ Connector  │ │ ector      │ │ ector      │   │
│  │            │ │            │ │            │ │            │   │
│  │ DuckDB     │ │ DuckDB     │ │ Postgres   │ │ CSV/       │   │
│  │ WASM       │ │ Cloud      │ │ MySQL      │ │ Parquet    │   │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│                    Unified Query Layer                           │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                 DuckDB-WASM Engine                       │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │    │
│  │  │ Local WASM  │  │ Extracted   │  │ Cached      │      │    │
│  │  │ Tables      │  │ Parquet     │  │ Results     │      │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘      │    │
│  └─────────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────────┤
│                      Storage Layer                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ OPFS        │  │ localStorage│  │ IndexedDB (future)      │  │
│  │ (Parquet)   │  │ (Config)    │  │                         │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Connector Interface

```typescript
// src/core/connectors/types.ts

interface ConnectorConfig {
  id: string
  name: string
  type: ConnectorType
  options: Record<string, any>
  secrets?: Record<string, string>  // Encrypted/encoded
}

type ConnectorType = 'wasm' | 'motherduck' | 'postgres' | 'mysql' | 'csv' | 'parquet'

interface ConnectorCapabilities {
  supportsStreaming: boolean
  supportsTransactions: boolean
  supportsDDL: boolean
  maxConcurrentQueries: number
}

interface QueryOptions {
  timeout?: number
  maxRows?: number
  signal?: AbortSignal
}

abstract class BaseConnector {
  abstract readonly type: ConnectorType
  abstract readonly capabilities: ConnectorCapabilities

  // Lifecycle
  abstract connect(config: ConnectorConfig): Promise<void>
  abstract disconnect(): Promise<void>
  abstract testConnection(): Promise<{ success: boolean; message?: string }>

  // Query execution
  abstract query(sql: string, options?: QueryOptions): Promise<QueryResult>
  abstract exec(sql: string): Promise<void>

  // Schema inspection
  abstract listTables(): Promise<TableInfo[]>
  abstract getTableSchema(table: string): Promise<ColumnInfo[]>

  // Data extraction (for non-WASM connectors)
  abstract extractToParquet?(table: string): Promise<Uint8Array>

  // Status
  abstract isConnected(): boolean
  abstract getStatus(): ConnectionStatus
}
```

### Connector Implementations

#### 1. WasmConnector (DuckDB-WASM)

```typescript
// src/core/connectors/wasm-connector.ts

class WasmConnector extends BaseConnector {
  readonly type = 'wasm'
  readonly capabilities = {
    supportsStreaming: false,
    supportsTransactions: true,
    supportsDDL: true,
    maxConcurrentQueries: 1
  }

  private db: AsyncDuckDB | null = null
  private conn: AsyncDuckDBConnection | null = null

  async connect(config: ConnectorConfig): Promise<void> {
    // Initialize DuckDB-WASM with OPFS persistence
    const persist = config.options.persist ?? true
    const dbPath = persist ? 'opfs://miao.db' : ':memory:'
    // ... initialization code
  }

  async query(sql: string): Promise<QueryResult> {
    // Direct query execution
  }

  async loadFile(file: File, tableName: string): Promise<void> {
    // CSV/Parquet file loading
  }
}
```

#### 2. MotherDuckConnector

```typescript
// src/core/connectors/motherduck-connector.ts

class MotherDuckConnector extends BaseConnector {
  readonly type = 'motherduck'
  readonly capabilities = {
    supportsStreaming: true,
    supportsTransactions: true,
    supportsDDL: true,
    maxConcurrentQueries: 10
  }

  private token: string = ''
  private database: string = ''

  async connect(config: ConnectorConfig): Promise<void> {
    this.token = config.secrets?.token || ''
    this.database = config.options.database || 'my_db'
    // MotherDuck uses DuckDB-WASM with cloud connection
    // SET motherduck_token='...'
  }

  async testConnection(): Promise<{ success: boolean; message?: string }> {
    try {
      await this.query('SELECT 1')
      return { success: true }
    } catch (e) {
      return { success: false, message: e.message }
    }
  }
}
```

#### 3. HttpConnector (For Remote Databases)

```typescript
// src/core/connectors/http-connector.ts

class HttpConnector extends BaseConnector {
  readonly type = 'postgres' // or 'mysql'
  readonly capabilities = {
    supportsStreaming: false,
    supportsTransactions: false,  // Via HTTP proxy
    supportsDDL: false,
    maxConcurrentQueries: 5
  }

  private endpoint: string = ''
  private apiKey: string = ''

  async connect(config: ConnectorConfig): Promise<void> {
    this.endpoint = config.options.endpoint
    this.apiKey = config.secrets?.apiKey || ''
  }

  async query(sql: string): Promise<QueryResult> {
    const response = await fetch(`${this.endpoint}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sql })
    })
    return response.json()
  }

  async extractToParquet(table: string): Promise<Uint8Array> {
    // Fetch data and convert to Parquet for local caching
    const result = await this.query(`SELECT * FROM ${table}`)
    return convertToParquet(result)
  }
}
```

### Connector Registry

```typescript
// src/core/connectors/registry.ts

class ConnectorRegistry {
  private static connectors = new Map<ConnectorType, typeof BaseConnector>()

  static register(type: ConnectorType, connector: typeof BaseConnector): void {
    this.connectors.set(type, connector)
  }

  static get(type: ConnectorType): typeof BaseConnector | undefined {
    return this.connectors.get(type)
  }

  static list(): ConnectorType[] {
    return Array.from(this.connectors.keys())
  }

  static create(type: ConnectorType): BaseConnector {
    const Connector = this.connectors.get(type)
    if (!Connector) throw new Error(`Unknown connector type: ${type}`)
    return new Connector()
  }
}

// Register built-in connectors
ConnectorRegistry.register('wasm', WasmConnector)
ConnectorRegistry.register('motherduck', MotherDuckConnector)
ConnectorRegistry.register('postgres', HttpConnector)
```

### Configuration Management

#### Configuration Structure

```yaml
# sources/connections.yaml (version controlled)
sources:
  - id: local-wasm
    name: Local DuckDB
    type: wasm
    options:
      persist: true
      dbPath: opfs://miao.db

  - id: motherduck-prod
    name: MotherDuck Production
    type: motherduck
    options:
      database: analytics_db
    # secrets stored separately

  - id: postgres-warehouse
    name: Data Warehouse
    type: postgres
    options:
      endpoint: https://api.example.com/sql
```

```yaml
# sources/connections.secrets.yaml (NOT version controlled, base64 encoded)
secrets:
  motherduck-prod:
    token: "bWR0X3h4eHh4..."  # base64 encoded
  postgres-warehouse:
    apiKey: "c2tfeHh4eHg..."   # base64 encoded
```

#### Configuration Store

```typescript
// src/app/stores/source-config.svelte.ts

interface SourceConfigState {
  sources: ConnectorConfig[]
  activeSourceId: string | null
  lastSynced: number | null
}

function createSourceConfigStore() {
  let state = $state<SourceConfigState>({
    sources: [],
    activeSourceId: null,
    lastSynced: null
  })

  return {
    get state() { return state },

    async loadFromYaml(yaml: string): Promise<void> {
      const parsed = parseYaml(yaml)
      state.sources = parsed.sources
    },

    exportToYaml(): string {
      return stringifyYaml({ sources: state.sources })
    },

    async importSecrets(yaml: string): Promise<void> {
      const secrets = parseYaml(yaml)
      // Merge secrets into source configs
    }
  }
}
```

### Data Flow: Remote Source Extraction

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Remote     │────▶│  Extract     │────▶│   Cache in   │
│   Database   │     │  to Parquet  │     │   OPFS       │
└──────────────┘     └──────────────┘     └──────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │  Register    │
                     │  in DuckDB   │
                     │  WASM        │
                     └──────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │  Unified     │
                     │  SQL Query   │
                     └──────────────┘
```

**Process**:
1. User configures remote source (e.g., Postgres via HTTP proxy)
2. On demand or schedule, extract tables to Parquet
3. Store Parquet files in OPFS
4. Register Parquet files in DuckDB-WASM
5. Query using unified DuckDB SQL interface

## Implementation Phases

### Phase 1: Connector Foundation (Week 1)

| Task | Description | Priority |
|------|-------------|----------|
| Design Connector interface | `BaseConnector` abstract class | P0 |
| Implement ConnectorRegistry | Plugin registration system | P0 |
| Refactor DuckDBManager | Extract to `WasmConnector` | P0 |
| Update stores | Integrate with new connector system | P1 |

**Deliverables**:
- `src/core/connectors/types.ts`
- `src/core/connectors/base-connector.ts`
- `src/core/connectors/registry.ts`
- `src/core/connectors/wasm-connector.ts`

### Phase 2: MotherDuck & HTTP (Week 2)

| Task | Description | Priority |
|------|-------------|----------|
| Implement MotherDuckConnector | Cloud DuckDB support | P0 |
| Implement HttpConnector | Generic HTTP SQL proxy | P1 |
| Add connection testing | Real connectivity validation | P0 |
| Update ConnectionModal | Support new connector types | P1 |

**Deliverables**:
- `src/core/connectors/motherduck-connector.ts`
- `src/core/connectors/http-connector.ts`
- Enhanced connection testing UI

### Phase 3: Configuration Management (Week 3)

| Task | Description | Priority |
|------|-------------|----------|
| Design config schema | YAML structure | P0 |
| Implement YAML parser | Parse/stringify configs | P0 |
| Add import/export UI | Settings page enhancement | P1 |
| Secrets management | Base64 encoding, secure storage | P1 |

**Deliverables**:
- `src/app/stores/source-config.svelte.ts`
- `src/lib/config/yaml-parser.ts`
- Config import/export in Settings UI

### Phase 4: UI Enhancement (Week 4)

| Task | Description | Priority |
|------|-------------|----------|
| Redesign Settings page | Source management UI | P0 |
| Add source wizard | Guided source creation | P1 |
| Connection status dashboard | Real-time status display | P1 |
| Error handling & messages | User-friendly errors | P1 |

**Deliverables**:
- Enhanced `/connections` or `/sources` page
- New source wizard component
- Connection status indicators

### Phase 5: Persistence & Caching (Week 5)

| Task | Description | Priority |
|------|-------------|----------|
| Integrate OPFS persistence | From previous design | P0 |
| Add Parquet extraction | Remote → Local cache | P1 |
| Implement cache management | View/clear cache UI | P1 |
| Add manual Parquet export | Download functionality | P2 |

**Deliverables**:
- OPFS persistence layer
- Parquet extraction pipeline
- Cache management UI

## File Structure

```
src/
├── core/
│   ├── connectors/
│   │   ├── types.ts              # Interfaces & types
│   │   ├── base-connector.ts     # Abstract base class
│   │   ├── registry.ts           # Connector registry
│   │   ├── wasm-connector.ts     # DuckDB-WASM
│   │   ├── motherduck-connector.ts
│   │   ├── http-connector.ts     # Postgres/MySQL via HTTP
│   │   └── file-connector.ts     # CSV/Parquet files
│   └── database/
│       ├── duckdb.ts             # (Deprecated, use connectors)
│       └── table-loader.ts
├── app/
│   └── stores/
│       ├── connection.svelte.ts  # Connection state
│       ├── database.svelte.ts    # Enhanced for connectors
│       └── source-config.svelte.ts # Config management
├── lib/
│   └── config/
│       ├── yaml-parser.ts        # YAML import/export
│       └── secrets.ts            # Secret encoding
└── components/
    └── sources/
        ├── SourcesPage.svelte    # Main sources UI
        ├── SourceWizard.svelte   # Add source wizard
        ├── SourceCard.svelte     # Source display card
        └── ConnectionTest.svelte # Test connection UI
```

## Security Considerations

1. **Secrets Storage**: Never store raw tokens/passwords
   - Base64 encode in separate file
   - Exclude from version control
   - Consider browser crypto API for encryption

2. **CORS**: HTTP connectors require proper CORS setup
   - Document proxy requirements
   - Provide example proxy implementations

3. **Token Rotation**: Support token refresh
   - MotherDuck token expiry handling
   - API key rotation support

## References

- [Evidence Data Sources](https://docs.evidence.dev/core-concepts/data-sources/)
- [Evidence DuckDB Connector](https://docs.evidence.dev/core-concepts/data-sources/duckdb)
- [Evidence MotherDuck Connector](https://docs.evidence.dev/core-concepts/data-sources/motherduck)
- [DuckDB-WASM OPFS](./DUCKDB_PERSISTENCE_ARCHITECTURE.md)

## Impact Analysis: Report & Workspace

### Dependency Overview

| File | Dependency | Impact | Action |
|------|------------|--------|--------|
| **UI Layer (via store - no changes)** |
| `SQLWorkspace.svelte` | databaseStore | 🟢 None | Keep as-is |
| `DataExplorer.svelte` | databaseStore | 🟢 None | Keep as-is |
| `ReportRenderer.svelte` | databaseStore + coordinator | 🟡 Low | Minor adjust |
| **Core Layer (direct - needs refactor)** |
| `table-loader.ts` | duckDBManager | 🔴 High | **Refactor to DI** |
| `mosaic.ts` | duckDBManager.getDB() | 🔴 High | **Refactor to DI** |
| `report-execution.service.ts` | duckDBManager | 🔴 High | **Refactor to DI** |
| **Store Layer** |
| `database.svelte.ts` | duckDBManager | 🔴 High | **Core refactor** |

### Migration Strategy

**Phase 1: Compatibility Layer**
```typescript
// Keep old exports working while implementing new system
const defaultConnector = createWasmConnector(defaultDeps)

export const duckDBManager = {
  initialize: () => defaultConnector.connect({ type: 'wasm' }),
  query: (sql) => defaultConnector.query(sql),
  getDB: () => (defaultConnector as WasmConnector).getDB(),
}
```

**Phase 2: Gradual Migration**
```
1. database.svelte.ts → accept Connector param (with default)
2. table-loader.ts → accept Connector param (with default)
3. mosaic.ts → accept WasmConnector param
4. report-execution.service.ts → accept deps object
```

**Phase 3: Remove Compatibility Layer**
- Remove old duckDBManager proxy
- All consumers use injected connectors

### Key Insight

**UI components are protected** by the `databaseStore` abstraction layer:
- No changes needed for `SQLWorkspace`, `DataExplorer`
- Only internal implementations change

---

## Design Principles (Testability & AI-Friendliness)

### 1. Dependency Injection over Singleton

```typescript
// ❌ Avoid: Singleton pattern
class DuckDBManager {
  private static instance: DuckDBManager | null = null
  static getInstance() { ... }
}

// ✅ Prefer: Factory with DI
export function createWasmConnector(deps: WasmConnectorDeps): WasmConnector {
  return new WasmConnectorImpl(deps)
}

// Test with mocks
const connector = createWasmConnector({
  duckdb: mockDuckDB,
  storage: mockStorage
})
```

### 2. Result Type for Explicit Error Handling

```typescript
// ✅ Explicit errors, no exceptions in business logic
type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E }

async query(sql: string): Promise<Result<QueryResult, QueryError>> {
  try {
    const data = await this.conn.query(sql)
    return { ok: true, value: transform(data) }
  } catch (e) {
    return { ok: false, error: { code: 'QUERY_FAILED', message: e.message } }
  }
}
```

### 3. Small Files (< 200 lines)

| File | Responsibility | Max Lines |
|------|----------------|-----------|
| types.ts | Type definitions | 80 |
| connector.ts | Main implementation | 150 |
| query-executor.ts | Query logic | 80 |
| file-loader.ts | File operations | 70 |

### 4. Pure Functions + Side Effect Isolation

```typescript
// ✅ Pure function (testable)
export function arrowToJson(arrow: ArrowTable, schema: Schema): Record[] {
  return arrow.toArray().map(row => transformRow(row, schema))
}

// Side effects isolated in connector class
class WasmConnector {
  async query(sql: string) {
    const arrow = await this.conn.query(sql)  // side effect
    return arrowToJson(arrow, this.schema)     // pure
  }
}
```

### 5. Co-located Tests

```
src/core/connectors/wasm/
├── connector.ts
├── connector.test.ts      # Unit tests next to implementation
├── query-executor.ts
└── query-executor.test.ts
```

### 6. JSDoc for AI Context

```typescript
/**
 * DuckDB-WASM Connector
 *
 * @description Browser-based DuckDB with OPFS persistence
 * @example
 * const conn = createWasmConnector(deps)
 * await conn.connect({ persist: true })
 * const result = await conn.query('SELECT * FROM users')
 */
export class WasmConnector implements Connector { ... }
```

---

**Status**: Pending Review
**Author**: Claude Code
**Date**: 2025-12-18
**Updated**: 2025-12-18 (Added testability & AI-friendliness principles)
