# DuckDB-WASM Persistence Architecture

> Design document for adding OPFS-based persistence to DuckDB-WASM

## Overview

This document outlines the architecture for adding data persistence to the DuckDB-WASM implementation in Miao Vision. Currently, all data is stored in-memory and lost on page refresh. The proposed solution uses OPFS (Origin Private File System) for browser-native persistence.

## Current State Analysis

### Existing Implementation

**File**: `src/core/database/duckdb.ts`

```typescript
// Current: Pure in-memory database
this.db = new duckdb.AsyncDuckDB(logger, worker)
await this.db.instantiate(bundle.mainModule)
this.conn = await this.db.connect()
```

**Characteristics**:
- Singleton pattern (`DuckDBManager`)
- Web Worker isolation for performance
- Shared instance with Mosaic/vgplot
- All data lost on page refresh

**Version**: `@duckdb/duckdb-wasm v1.29.0`

### Infrastructure Already in Place

The project already has COOP/COEP headers configured (required for both SharedArrayBuffer and OPFS):

```typescript
// vite.config.ts
headers: {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp'
}
```

## Proposed Solution: OPFS Persistence

### Why OPFS?

| Storage Option | Performance | Capacity | Browser Support | Complexity |
|----------------|-------------|----------|-----------------|------------|
| **OPFS** | Excellent | GB-level | Chrome/Edge/Safari/Firefox | Medium |
| IndexedDB | Good | ~500MB | All browsers | Low |
| LocalStorage | Poor | 5-10MB | All browsers | Low |
| File System API | Good | Large | Chrome only | Medium |

**Decision**: OPFS is the optimal choice because:
1. Native file system performance (no serialization overhead)
2. Same browser requirements as SharedArrayBuffer (already required)
3. Official DuckDB-WASM support since v1.30.0
4. GB-level storage capacity

### Prerequisites

**Upgrade Required**:
```json
// package.json
{
  "@duckdb/duckdb-wasm": "^1.30.0"  // Current: ^1.29.0
}
```

OPFS support was added in [DuckDB-WASM v1.30.0](https://github.com/duckdb/duckdb-wasm/releases/tag/v1.30.0) via PR #1856.

## Architecture Design

### System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    Persistence Architecture                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   DuckDBManager (Enhanced)                │   │
│  │                                                           │   │
│  │  ┌─────────────────┐    ┌─────────────────────────────┐  │   │
│  │  │  initialize()   │───▶│  OPFS Detection             │  │   │
│  │  │                 │    │  ├─ isOPFSSupported()       │  │   │
│  │  │  New params:    │    │  └─ navigator.storage       │  │   │
│  │  │  - persist:bool │    └─────────────────────────────┘  │   │
│  │  │  - dbPath:str   │                 │                    │   │
│  │  └─────────────────┘                 ▼                    │   │
│  │                          ┌─────────────────────────────┐  │   │
│  │                          │  Database Open              │  │   │
│  │                          │                             │  │   │
│  │                          │  persist=true:              │  │   │
│  │                          │    path="opfs://miao.db"    │  │   │
│  │                          │    accessMode=READ_WRITE    │  │   │
│  │                          │                             │  │   │
│  │                          │  persist=false:             │  │   │
│  │                          │    path=":memory:"          │  │   │
│  │                          └─────────────────────────────┘  │   │
│  │                                                           │   │
│  │  ┌─────────────────────────────────────────────────────┐  │   │
│  │  │  New Methods                                        │  │   │
│  │  │  ├─ checkpoint()     - Force flush to OPFS          │  │   │
│  │  │  ├─ exportParquet()  - Export table as Parquet      │  │   │
│  │  │  ├─ getStorageInfo() - Get OPFS storage info        │  │   │
│  │  │  └─ clearStorage()   - Clear persisted data         │  │   │
│  │  └─────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   Browser Storage (OPFS)                  │   │
│  │                                                           │   │
│  │    /opfs/                                                 │   │
│  │    └── miao.db          ← DuckDB database file            │   │
│  │        ├── Tables       (user uploaded data)              │   │
│  │        └── WAL          (Write-Ahead Log)                 │   │
│  │                                                           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### API Design

#### Configuration Interface

```typescript
interface PersistenceConfig {
  persist: boolean            // Enable persistence (default: true)
  dbPath?: string             // Custom database path (default: "opfs://miao.db")
  autoCheckpoint?: boolean    // Auto checkpoint on changes (default: true)
  checkpointInterval?: number // Checkpoint interval in ms (default: 30000)
}

interface StorageInfo {
  isOPFSSupported: boolean
  isPersistent: boolean
  dbPath: string
  estimatedSize?: number      // Bytes
  tables: string[]
}
```

#### Enhanced DuckDBManager

```typescript
class DuckDBManager {
  // Existing methods (unchanged)
  async query(sql: string): Promise<QueryResult>
  async exec(sql: string): Promise<void>
  async loadCSV(file: File, tableName: string): Promise<void>
  async loadParquet(file: File, tableName: string): Promise<void>
  async listTables(): Promise<string[]>
  async getTableSchema(tableName: string): Promise<any[]>
  async close(): Promise<void>
  isInitialized(): boolean
  getDB(): AsyncDuckDB | null

  // Enhanced initialization
  async initialize(config?: DatabaseConfig & PersistenceConfig): Promise<void>

  // New persistence methods
  async checkpoint(): Promise<void>
  async exportParquet(tableName: string): Promise<Blob>
  async getStorageInfo(): Promise<StorageInfo>
  async clearStorage(): Promise<void>
  isPersistent(): boolean
}
```

#### OPFS Detection Utility

```typescript
function isOPFSSupported(): boolean {
  return typeof navigator !== 'undefined' &&
         'storage' in navigator &&
         'getDirectory' in navigator.storage
}
```

### Data Flow

#### Startup Flow

```
┌─────────┐    ┌──────────────┐    ┌─────────────┐    ┌──────────┐
│  App    │───▶│ isOPFS       │───▶│ db.open()   │───▶│ Load     │
│  Start  │    │ Supported?   │    │ opfs://     │    │ existing │
└─────────┘    └──────────────┘    └─────────────┘    │ tables   │
                     │                                 └──────────┘
                     │ No
                     ▼
               ┌─────────────┐
               │ db.open()   │
               │ :memory:    │
               └─────────────┘
```

#### Data Write Flow

```
┌─────────┐    ┌──────────────┐    ┌─────────────┐    ┌──────────┐
│ Upload  │───▶│ CREATE TABLE │───▶│ Auto        │───▶│ OPFS     │
│ CSV     │    │              │    │ Checkpoint  │    │ Persist  │
└─────────┘    └──────────────┘    └─────────────┘    └──────────┘
                                         │
                                         │ debounce
                                         │ 30s
                                         ▼
                                   ┌─────────────┐
                                   │ CHECKPOINT  │
                                   │ command     │
                                   └─────────────┘
```

#### Manual Export Flow

```
┌─────────┐    ┌──────────────┐    ┌─────────────┐
│ Export  │───▶│ COPY table   │───▶│ Download    │
│ Button  │    │ TO Parquet   │    │ .parquet    │
└─────────┘    └──────────────┘    └─────────────┘
```

## Implementation Plan

### Phase 1: Core Persistence

| Step | Task | Description |
|------|------|-------------|
| 1.1 | Upgrade duckdb-wasm | `v1.29.0` → `v1.30.0+` |
| 1.2 | Add OPFS detection | `isOPFSSupported()` utility |
| 1.3 | Modify `initialize()` | Support `opfs://` path parameter |
| 1.4 | Add `checkpoint()` | Manual flush to OPFS |
| 1.5 | Add auto-checkpoint | Debounced periodic checkpoint |

### Phase 2: Storage Management

| Step | Task | Description |
|------|------|-------------|
| 2.1 | Add `getStorageInfo()` | Query OPFS usage and tables |
| 2.2 | Add `clearStorage()` | Delete persisted database |
| 2.3 | Add `exportParquet()` | Export table as downloadable file |

### Phase 3: UI Integration

| Step | Task | Description |
|------|------|-------------|
| 3.1 | Storage indicator | Show persistence status in UI |
| 3.2 | Export button | Add Parquet export to DataExplorer |
| 3.3 | Clear data option | Settings to clear persisted data |

## Code Examples

### Initialize with Persistence

```typescript
// src/core/database/duckdb.ts

async initialize(config: DatabaseConfig & PersistenceConfig = {}): Promise<void> {
  const { persist = true, dbPath = 'opfs://miao.db' } = config

  // ... existing bundle selection code ...

  this.db = new duckdb.AsyncDuckDB(logger, worker)
  await this.db.instantiate(bundle.mainModule)

  // Open with OPFS path if persistence enabled and supported
  if (persist && isOPFSSupported()) {
    await this.db.open({
      path: dbPath,
      accessMode: duckdb.DuckDBAccessMode.READ_WRITE
    })
    this._isPersistent = true
  } else {
    await this.db.open({ path: ':memory:' })
    this._isPersistent = false
  }

  this.conn = await this.db.connect()

  // Start auto-checkpoint if enabled
  if (this._isPersistent && config.autoCheckpoint !== false) {
    this.startAutoCheckpoint(config.checkpointInterval || 30000)
  }
}
```

### Checkpoint Implementation

```typescript
async checkpoint(): Promise<void> {
  if (!this.conn || !this._isPersistent) return
  await this.conn.query('CHECKPOINT')
}

private startAutoCheckpoint(intervalMs: number): void {
  this._checkpointInterval = setInterval(() => {
    this.checkpoint().catch(console.error)
  }, intervalMs)
}
```

### Export Parquet

```typescript
async exportParquet(tableName: string): Promise<Blob> {
  if (!this.db || !this.conn) {
    throw new Error('Database not initialized')
  }

  const fileName = `/${tableName}.parquet`
  await this.conn.query(`COPY ${tableName} TO '${fileName}' (FORMAT PARQUET)`)

  const buffer = await this.db.copyFileToBuffer(fileName)
  return new Blob([buffer], { type: 'application/octet-stream' })
}
```

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Version upgrade breaking changes | High | Test thoroughly before deployment |
| OPFS file lock (single tab) | Medium | Add tab detection, show warning |
| Storage quota exceeded | Low | Monitor usage, provide clear data option |
| Data migration from memory | Low | Document that existing data needs re-import |

## Browser Compatibility

| Browser | SharedArrayBuffer | OPFS | Status |
|---------|-------------------|------|--------|
| Chrome 89+ | Yes | Yes | Supported |
| Edge 89+ | Yes | Yes | Supported |
| Safari 16.4+ | Yes | Yes | Supported |
| Firefox 79+ | Yes | Yes | Supported |

**Note**: If the app runs (requires SharedArrayBuffer), OPFS is guaranteed to work.

## References

- [DuckDB-WASM GitHub](https://github.com/duckdb/duckdb-wasm)
- [OPFS Support Discussion #1444](https://github.com/duckdb/duckdb-wasm/discussions/1444)
- [DuckDB-WASM v1.30.0 Release Notes](https://github.com/duckdb/duckdb-wasm/releases/tag/v1.30.0)
- [OPFS Todo Demo](https://github.com/markwylde/duckdb-opfs-todo-list)
- [MDN: Origin Private File System](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system)

---

**Status**: Pending Review
**Author**: Claude Code
**Date**: 2025-12-17
