# OPFS 数据丢失问题分析

## 问题现象

**症状**:
- 在 SQL Workspace 上传 CSV/Parquet 文件
- 文件成功加载，可以查询
- **刷新页面后，数据丢失**

## 根本原因分析

### 当前实现流程

```typescript
// src/core/database/duckdb.ts:161-182
async loadCSV(file: File, tableName: string): Promise<void> {
  const buffer = await file.arrayBuffer()
  const fileName = `/${file.name}`

  // ❌ 问题 1: 注册到内存，不是 OPFS
  await this.db.registerFileBuffer(fileName, new Uint8Array(buffer))

  // ❌ 问题 2: 表依赖内存中的文件缓冲区
  await this.conn.query(`
    CREATE TABLE ${tableName} AS
    SELECT * FROM read_csv_auto('${fileName}')
  `)
}
```

### 数据流向

```
1. 用户上传 file.csv
   ↓
2. file.arrayBuffer() → Uint8Array (浏览器内存)
   ↓
3. db.registerFileBuffer('/file.csv', buffer)
   ↓ 注册到 DuckDB 内存文件系统（不是 OPFS！）
   ↓
4. CREATE TABLE data AS SELECT * FROM read_csv_auto('/file.csv')
   ↓ 从内存文件读取，创建表
   ↓
5. ✅ 表 data 存在于 DuckDB
   ✅ 数据可以查询

6. 用户刷新页面
   ↓
7. 新的 DuckDB 实例启动
   ↓ db.open({ path: 'workspace.db' }) → 连接到 OPFS
   ↓
8. ❌ 表 data 不存在！
   ↓ 原因: 表依赖的 /file.csv 文件缓冲区丢失
```

### 三个层级的存储

```
┌─────────────────────────────────────────────┐
│  Layer 1: 浏览器内存 (JS Heap)              │
│  - file.arrayBuffer() 的结果                │
│  - 生命周期: 页面会话                       │
│  - 刷新后: ❌ 丢失                           │
└─────────────────────────────────────────────┘
         ↓ registerFileBuffer()
┌─────────────────────────────────────────────┐
│  Layer 2: DuckDB 内存文件系统                │
│  - db.registerFileBuffer() 注册的文件       │
│  - 生命周期: DuckDB 实例                    │
│  - 刷新后: ❌ 丢失                           │
└─────────────────────────────────────────────┘
         ↓ CREATE TABLE AS SELECT FROM
┌─────────────────────────────────────────────┐
│  Layer 3: DuckDB 表数据                     │
│  - CREATE TABLE 创建的表                    │
│  - 生命周期: 取决于是否持久化               │
│  - OPFS 模式: ✅ 应该持久化（但依赖 Layer 2）│
└─────────────────────────────────────────────┘
         ↓ 但是...
┌─────────────────────────────────────────────┐
│  ❌ 问题: 表结构持久化了，但数据引用丢失    │
│                                              │
│  workspace.db (OPFS) 保存了:                │
│  - 表结构 metadata                           │
│  - 可能的外部文件引用 '/file.csv'           │
│                                              │
│  刷新后:                                     │
│  - ✅ 打开 workspace.db                      │
│  - ❌ '/file.csv' 不存在 (Layer 2 丢失)     │
│  - ❌ 无法读取表数据                         │
└─────────────────────────────────────────────┘
```

## 验证问题

### 测试 1: 检查 OPFS 是否有数据

```javascript
// 浏览器 Console
const root = await navigator.storage.getDirectory();
const files = [];
for await (const entry of root.values()) {
  files.push(entry.name);
}
console.log('OPFS files:', files);
// 预期: 应该看到 'workspace.db' 或相关文件
```

### 测试 2: 检查表是否被标记为外部表

```sql
-- 上传文件后，立即查询
SELECT * FROM duckdb_tables();

-- 查看表的存储信息
PRAGMA table_info('your_table');

-- 检查是否有外部文件依赖
SELECT * FROM duckdb_databases();
```

### 测试 3: 检查 WAL 和 Checkpoint

```sql
-- 检查 Write-Ahead Log
PRAGMA wal_autocheckpoint;

-- 手动 checkpoint
CHECKPOINT;

-- 刷新页面，看数据是否保留
```

## 可能的根本原因

### 原因 1: 表数据未写入 OPFS ⭐ 最可能

**问题**: `CREATE TABLE AS SELECT FROM read_csv_auto()` 创建的表，数据可能仍在内存中，未 flush 到 OPFS。

**证据**:
- DuckDB 使用 WAL (Write-Ahead Log) 模式
- 数据先写入 WAL，需要 checkpoint 才写入主文件
- 没有显式 checkpoint，数据可能未持久化

**验证**:
```typescript
// 上传文件后
await this.conn.query('CHECKPOINT');  // 强制 flush 到 OPFS
```

---

### 原因 2: 外部文件引用丢失 ⭐ 很可能

**问题**: 表引用了外部文件 `/file.csv`，但这个文件只在内存中注册。

**证据**:
- `registerFileBuffer()` 注册到 DuckDB 的内存文件系统
- 表可能存储的是文件引用而非实际数据
- 刷新后文件引用失效

**验证**:
```sql
-- 检查表是否是外部表
SELECT * FROM duckdb_tables() WHERE table_name = 'your_table';
-- 查看 table_type 是否为 'BASE TABLE' 或 'EXTERNAL'
```

---

### 原因 3: OPFS 权限或配置问题 ⭐ 不太可能

**问题**: OPFS 写入权限不足，或 DuckDB-WASM 配置错误。

**证据**:
- `db.open({ path: 'workspace.db' })` 可能静默失败
- OPFS 可能不支持当前浏览器/环境

**验证**:
```javascript
// 检查 OPFS 支持
console.log('OPFS supported:', 'storage' in navigator &&
  typeof navigator.storage.getDirectory === 'function');

// 检查实际写入
const root = await navigator.storage.getDirectory();
const fileHandle = await root.getFileHandle('test.txt', { create: true });
const writable = await fileHandle.createWritable();
await writable.write('test');
await writable.close();
console.log('OPFS write test passed');
```

---

### 原因 4: DuckDB catalog 元数据未持久化 ⭐ 不太可能

**问题**: 表的 catalog 元数据未写入 OPFS。

**证据**:
- 表结构定义可能只在内存中
- 需要显式保存 catalog

**验证**:
```sql
-- 检查 catalog
SELECT * FROM duckdb_schemas();
SELECT * FROM duckdb_tables();
```

## 可能的解决方案对比

### 方案 1: 添加显式 CHECKPOINT ⭐ 推荐 (最简单)

**原理**: 强制 DuckDB 将 WAL 数据写入主文件。

**实现**:
```typescript
async loadCSV(file: File, tableName: string): Promise<void> {
  // ... existing code ...

  await this.conn.query(`
    CREATE TABLE ${tableName} AS
    SELECT * FROM read_csv_auto('${fileName}')
  `)

  // ✅ 添加 checkpoint
  await this.conn.query('CHECKPOINT')

  console.log(`CSV file loaded and persisted to OPFS: ${tableName}`)
}
```

**优点**:
- ✅ 最小改动
- ✅ 符合 DuckDB 持久化机制
- ✅ 性能影响小

**缺点**:
- ⚠️ 每次上传都 checkpoint，可能影响性能（大量上传场景）

---

### 方案 2: 直接 INSERT 数据（不依赖文件缓冲区） ⭐ 推荐 (最可靠)

**原理**: 解析 CSV 到 JS 对象，直接 INSERT 到表，完全不依赖文件引用。

**实现**:
```typescript
async loadCSV(file: File, tableName: string): Promise<void> {
  // 1. 解析 CSV 到 JS
  const text = await file.text()
  const parsed = parseCSV(text)  // 使用 papaparse 或类似库

  // 2. 创建表结构
  const createSQL = inferCreateTableSQL(tableName, parsed.columns, parsed.data[0])
  await this.conn.query(createSQL)

  // 3. 通过 Arrow IPC 插入数据（高效）
  const arrowTable = createArrowTable(parsed.data, parsed.columns)
  await this.db.insertArrowTable(arrowTable, tableName)

  // 4. Checkpoint
  await this.conn.query('CHECKPOINT')
}
```

**优点**:
- ✅ 完全自包含，无外部文件依赖
- ✅ 数据保证持久化到 OPFS
- ✅ 可以预处理/验证数据

**缺点**:
- ❌ 需要解析 CSV（内存占用大，大文件慢）
- ❌ 实现复杂度高

---

### 方案 3: 注册文件到 OPFS（如果 DuckDB 支持）

**原理**: 将文件直接注册到 OPFS 文件系统，而不是内存。

**实现** (需验证 API 支持):
```typescript
async loadCSV(file: File, tableName: string): Promise<void> {
  // 1. 写入 OPFS
  const root = await navigator.storage.getDirectory()
  const fileHandle = await root.getFileHandle(file.name, { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(await file.arrayBuffer())
  await writable.close()

  // 2. 注册 OPFS 文件到 DuckDB
  await this.db.registerFileHandle(
    `/opfs/${file.name}`,
    fileHandle,
    DuckDBDataProtocol.BROWSER_FILEREADER,
    false
  )

  // 3. 创建表
  await this.conn.query(`
    CREATE TABLE ${tableName} AS
    SELECT * FROM read_csv_auto('/opfs/${file.name}')
  `)
}
```

**优点**:
- ✅ 文件持久化到 OPFS
- ✅ DuckDB 可以直接从 OPFS 读取

**缺点**:
- ❌ 不确定 DuckDB-WASM 是否支持 OPFS 文件句柄
- ❌ API 可能不稳定

---

### 方案 4: 自动 Checkpoint + 定期 Flush

**原理**: 启用 DuckDB 的自动 checkpoint 机制。

**实现**:
```typescript
async initialize(config: DatabaseConfig = {}): Promise<void> {
  // ... existing code ...

  if (config.persist) {
    await this.db.open({ path: dbPath })

    // ✅ 配置自动 checkpoint
    await this.conn.query(`
      PRAGMA wal_autocheckpoint = 1000;  -- 每 1000 行自动 checkpoint
    `)
  }
}
```

**优点**:
- ✅ 自动化，无需手动调用
- ✅ 性能优化（批量 checkpoint）

**缺点**:
- ⚠️ 可能延迟持久化（不是立即）
- ⚠️ 如果页面在 checkpoint 前关闭，数据仍会丢失

---

## 推荐方案

**短期修复 (立即实施)**:
- ✅ **方案 1: 添加显式 CHECKPOINT**
  - 改动最小，风险最低
  - 立即生效

**长期优化 (后续考虑)**:
- ✅ **方案 2: 直接 INSERT 数据**
  - 最可靠，完全自包含
  - 适合生产环境

**组合方案**:
```typescript
async loadCSV(file: File, tableName: string): Promise<void> {
  // 当前方案: registerFileBuffer + CREATE TABLE AS
  const buffer = await file.arrayBuffer()
  const fileName = `/${file.name}`

  await this.db.registerFileBuffer(fileName, new Uint8Array(buffer))

  await this.conn.query(`
    CREATE TABLE ${tableName} AS
    SELECT * FROM read_csv_auto('${fileName}')
  `)

  // ✅ 添加: 立即 checkpoint
  await this.conn.query('CHECKPOINT')

  // ✅ 添加: 取消文件注册（释放内存）
  await this.db.dropFile(fileName)

  console.log(`✅ CSV persisted to OPFS: ${tableName}`)
}
```

## 验证测试

**测试步骤**:
1. 实施修复（添加 CHECKPOINT）
2. 上传 CSV 文件
3. 查询数据 → 应该成功
4. **刷新页面**
5. 再次查询数据 → **应该成功**（之前会失败）
6. 检查 OPFS:
   ```javascript
   const root = await navigator.storage.getDirectory()
   const fileHandle = await root.getFileHandle('workspace.db')
   const file = await fileHandle.getFile()
   console.log('workspace.db size:', file.size)  // 应该 > 0
   ```

## 总结

**根本原因**:
1. ❌ 数据未 checkpoint 到 OPFS
2. ❌ 表依赖内存文件缓冲区，刷新后丢失

**最简单修复**:
```typescript
await this.conn.query('CHECKPOINT')  // 在 CREATE TABLE 后添加
```

**完整修复**:
- 方案 1 (CHECKPOINT) + 方案 4 (自动 checkpoint)
- 长期迁移到方案 2 (直接 INSERT)
