# REST API Connector

**版本**: v0.2.0
**状态**: ✅ 已实现
**最后更新**: 2024-12-23

---

## 📋 概述

REST API Connector 允许您从任意 REST API 获取数据并加载到 DuckDB 中进行分析。支持多种认证方式、分页、速率限制等高级功能。

### 核心功能

- ✅ **多种认证方式** - Bearer Token, API Key, Basic Auth
- ✅ **自动分页** - Offset, Page, Cursor 三种分页模式
- ✅ **速率限制** - 防止 API 请求过于频繁
- ✅ **自定义请求头** - 完全可配置的 HTTP 请求
- ✅ **数据路径提取** - 支持嵌套 JSON 数据提取
- ✅ **与 DuckDB 集成** - 数据自动加载到 DuckDB 表中

---

## 🚀 快速开始

### 1. 基本用法

```typescript
import { createRestApiConnector } from '@core/connectors'
import { wasmConnector } from './your-wasm-connector'

// 创建连接器（需要传入 WASM 连接器）
const restConnector = createRestApiConnector({
  wasmConnector
})

// 连接到 API
await restConnector.connect({
  id: 'my-api',
  name: 'My REST API',
  type: 'rest',
  options: {
    baseUrl: 'https://api.example.com',
    authMethod: 'bearer',
    token: 'your-api-token'
  }
})

// 加载数据
await restConnector.loadEndpoint({
  path: '/users',
  tableName: 'users'
})

// 查询数据
const result = await restConnector.query('SELECT * FROM users')
```

---

## 🔐 认证方式

### Bearer Token

```typescript
await restConnector.connect({
  id: 'api',
  name: 'API',
  type: 'rest',
  options: {
    baseUrl: 'https://api.example.com',
    authMethod: 'bearer',
    token: 'your-bearer-token'
  }
})
```

请求头：`Authorization: Bearer your-bearer-token`

---

### API Key

```typescript
await restConnector.connect({
  id: 'api',
  name: 'API',
  type: 'rest',
  options: {
    baseUrl: 'https://api.example.com',
    authMethod: 'apiKey',
    token: 'your-api-key',
    apiKeyHeader: 'X-API-Key' // 可选，默认 'X-API-Key'
  }
})
```

请求头：`X-API-Key: your-api-key`

---

### Basic Auth

```typescript
await restConnector.connect({
  id: 'api',
  name: 'API',
  type: 'rest',
  options: {
    baseUrl: 'https://api.example.com',
    authMethod: 'basic',
    username: 'your-username',
    password: 'your-password'
  }
})
```

请求头：`Authorization: Basic base64(username:password)`

---

### 无认证

```typescript
await restConnector.connect({
  id: 'api',
  name: 'API',
  type: 'rest',
  options: {
    baseUrl: 'https://api.example.com',
    authMethod: 'none' // 可省略
  }
})
```

---

## 📄 分页

REST API Connector 支持三种分页模式：

### Offset 分页

```typescript
await restConnector.connect({
  id: 'api',
  name: 'API',
  type: 'rest',
  options: {
    baseUrl: 'https://api.example.com',
    pagination: {
      type: 'offset',
      pageSize: 100,
      offsetParam: 'offset', // 可选，默认 'offset'
      limitParam: 'limit',   // 可选，默认 'limit'
      maxPages: 10           // 可选，最多获取页数
    }
  }
})

// 自动请求：
// GET /users?offset=0&limit=100
// GET /users?offset=100&limit=100
// ...
```

---

### Page 分页

```typescript
pagination: {
  type: 'page',
  pageSize: 50,
  pageParam: 'page',   // 可选，默认 'page'
  limitParam: 'limit', // 可选，默认 'limit'
  maxPages: 20
}

// 自动请求：
// GET /users?page=1&limit=50
// GET /users?page=2&limit=50
// ...
```

---

### Cursor 分页

```typescript
pagination: {
  type: 'cursor',
  pageSize: 100,
  cursorParam: 'cursor',          // 可选，默认 'cursor'
  nextCursorPath: 'meta.nextCursor', // 响应中下一页游标的路径
  maxPages: 10
}

// 自动请求：
// GET /users?cursor=<initial>
// GET /users?cursor=<next-from-response>
// ...
```

---

## 🎯 数据提取

### 简单数组

如果 API 返回的是数组：

```json
[
  { "id": 1, "name": "Alice" },
  { "id": 2, "name": "Bob" }
]
```

不需要配置 `dataPath`：

```typescript
await restConnector.loadEndpoint({
  path: '/users',
  tableName: 'users'
})
```

---

### 嵌套数据

如果 API 返回的数据嵌套在对象中：

```json
{
  "status": "success",
  "data": {
    "users": [
      { "id": 1, "name": "Alice" },
      { "id": 2, "name": "Bob" }
    ]
  }
}
```

使用 `dataPath` 提取：

```typescript
await restConnector.connect({
  id: 'api',
  name: 'API',
  type: 'rest',
  options: {
    baseUrl: 'https://api.example.com',
    dataPath: 'data.users' // 点号分隔的路径
  }
})
```

---

## ⚡ 速率限制

防止超过 API 的速率限制：

```typescript
await restConnector.connect({
  id: 'api',
  name: 'API',
  type: 'rest',
  options: {
    baseUrl: 'https://api.example.com',
    rateLimit: {
      maxRequests: 100,   // 每个时间窗口最多 100 个请求
      windowMs: 60000     // 时间窗口：60 秒
    }
  }
})
```

连接器会自动等待，确保不超过速率限制。

---

## 🛠️ 高级配置

### 自定义请求头

```typescript
await restConnector.connect({
  id: 'api',
  name: 'API',
  type: 'rest',
  options: {
    baseUrl: 'https://api.example.com',
    headers: {
      'X-Custom-Header': 'value',
      'Accept-Language': 'en-US'
    }
  }
})
```

---

### 超时设置

```typescript
await restConnector.connect({
  id: 'api',
  name: 'API',
  type: 'rest',
  options: {
    baseUrl: 'https://api.example.com',
    timeout: 60000 // 60 秒超时
  }
})
```

---

### 端点级配置覆盖

每个端点可以覆盖全局配置：

```typescript
await restConnector.loadEndpoint({
  path: '/slow-endpoint',
  tableName: 'slow_data',
  options: {
    timeout: 120000, // 此端点使用 120 秒超时
    dataPath: 'results' // 此端点使用不同的数据路径
  }
})
```

---

## 📚 完整示例

### 示例 1：GitHub API

```typescript
const githubConnector = createRestApiConnector({ wasmConnector })

await githubConnector.connect({
  id: 'github',
  name: 'GitHub API',
  type: 'rest',
  options: {
    baseUrl: 'https://api.github.com',
    authMethod: 'bearer',
    token: process.env.GITHUB_TOKEN,
    headers: {
      'Accept': 'application/vnd.github.v3+json'
    },
    pagination: {
      type: 'page',
      pageSize: 100,
      pageParam: 'page',
      limitParam: 'per_page',
      maxPages: 5
    },
    rateLimit: {
      maxRequests: 60,
      windowMs: 60000 // GitHub: 60 requests/minute
    }
  }
})

// 获取仓库的 issues
await githubConnector.loadEndpoint({
  path: '/repos/owner/repo/issues',
  tableName: 'issues',
  params: {
    state: 'open',
    sort: 'created'
  }
})

// 分析数据
const result = await githubConnector.query(`
  SELECT
    user.login as author,
    COUNT(*) as issue_count
  FROM issues
  GROUP BY user.login
  ORDER BY issue_count DESC
  LIMIT 10
`)
```

---

### 示例 2：公开 JSON API

```typescript
const jsonPlaceholderConnector = createRestApiConnector({ wasmConnector })

await jsonPlaceholderConnector.connect({
  id: 'json-placeholder',
  name: 'JSON Placeholder',
  type: 'rest',
  options: {
    baseUrl: 'https://jsonplaceholder.typicode.com'
  }
})

// 加载用户数据
await jsonPlaceholderConnector.loadEndpoint({
  path: '/users',
  tableName: 'users'
})

// 加载帖子数据
await jsonPlaceholderConnector.loadEndpoint({
  path: '/posts',
  tableName: 'posts'
})

// 关联查询
const result = await jsonPlaceholderConnector.query(`
  SELECT
    u.name as user_name,
    COUNT(p.id) as post_count
  FROM users u
  LEFT JOIN posts p ON u.id = p.userId
  GROUP BY u.name
  ORDER BY post_count DESC
`)
```

---

### 示例 3：带认证的私有 API

```typescript
const myApiConnector = createRestApiConnector({ wasmConnector })

await myApiConnector.connect({
  id: 'my-api',
  name: 'My Private API',
  type: 'rest',
  options: {
    baseUrl: 'https://api.mycompany.com',
    authMethod: 'apiKey',
    token: process.env.API_KEY,
    apiKeyHeader: 'X-Company-API-Key',
    headers: {
      'X-Client-Version': '1.0.0'
    },
    pagination: {
      type: 'cursor',
      pageSize: 200,
      cursorParam: 'cursor',
      nextCursorPath: 'pagination.next_cursor',
      maxPages: 50
    },
    dataPath: 'data.items', // 数据嵌套在 response.data.items
    timeout: 30000
  }
})

await myApiConnector.loadEndpoint({
  path: '/analytics/events',
  tableName: 'events',
  params: {
    start_date: '2024-01-01',
    end_date: '2024-12-31',
    event_type: 'page_view'
  }
})
```

---

## 🔧 在 Markdown 中使用

REST API 连接器可以在 Markdown 报告中使用：

```markdown
# API 数据分析报告

## 配置 REST API 连接

```sql setup
-- 假设连接器已在应用初始化时配置
```

## 加载 GitHub Issues

```sql load_issues
-- 使用 REST API 连接器加载数据的 SQL 包装
-- (需要应用层支持)
```

## 分析

```sql issue_stats
SELECT
  state,
  COUNT(*) as count,
  AVG(comments) as avg_comments
FROM issues
GROUP BY state
```

```barchart
data: issue_stats
x: state
y: count
```
```

---

## ⚠️ 注意事项

1. **需要 WASM 连接器** - REST API 连接器依赖 WASM 连接器来存储数据
2. **内存限制** - 大量数据可能导致内存问题，建议使用分页和 `maxPages` 限制
3. **CORS 限制** - 浏览器环境中可能遇到 CORS 问题，需要 API 支持 CORS 或使用代理
4. **速率限制** - 始终配置 `rateLimit` 以尊重 API 的使用限制
5. **认证安全** - 不要在前端代码中硬编码 API 密钥，使用环境变量或安全存储

---

## 🎯 最佳实践

### 1. 使用环境变量存储敏感信息

```typescript
const config = {
  baseUrl: import.meta.env.VITE_API_BASE_URL,
  token: import.meta.env.VITE_API_TOKEN
}
```

### 2. 合理设置分页限制

```typescript
pagination: {
  type: 'offset',
  pageSize: 100,    // 根据 API 文档调整
  maxPages: 10      // 防止无限循环
}
```

### 3. 错误处理

```typescript
const result = await restConnector.loadEndpoint({
  path: '/users',
  tableName: 'users'
})

if (!result.ok) {
  console.error('Failed to load data:', result.error.message)
  return
}

console.log(`Loaded ${result.value.rowCount} rows`)
```

### 4. 数据验证

```typescript
// 加载后验证数据
const checkResult = await restConnector.query(`
  SELECT COUNT(*) as count FROM users
`)

if (checkResult.ok && checkResult.value.data[0].count === 0) {
  console.warn('No data loaded!')
}
```

---

## 📖 API 参考

### RestApiConnectorOptions

| 属性 | 类型 | 必需 | 默认值 | 说明 |
|------|------|------|--------|------|
| `baseUrl` | string | ✅ | - | API 基础 URL |
| `authMethod` | 'none' \| 'bearer' \| 'apiKey' \| 'basic' | ❌ | 'none' | 认证方式 |
| `token` | string | ❌ | - | Bearer/API Key Token |
| `apiKeyHeader` | string | ❌ | 'X-API-Key' | API Key 请求头名称 |
| `username` | string | ❌ | - | Basic Auth 用户名 |
| `password` | string | ❌ | - | Basic Auth 密码 |
| `headers` | Record<string, string> | ❌ | {} | 自定义请求头 |
| `timeout` | number | ❌ | 30000 | 超时（毫秒） |
| `dataPath` | string | ❌ | - | JSON 数据路径 |
| `pagination` | PaginationConfig | ❌ | - | 分页配置 |
| `rateLimit` | RateLimitConfig | ❌ | - | 速率限制配置 |

### RestApiEndpoint

| 属性 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `path` | string | ✅ | 端点路径 |
| `tableName` | string | ✅ | 表名 |
| `method` | 'GET' \| 'POST' \| 'PUT' \| 'DELETE' \| 'PATCH' | ❌ | HTTP 方法，默认 GET |
| `params` | Record<string, any> | ❌ | 查询参数 |
| `body` | object | ❌ | 请求体（POST/PUT/PATCH） |
| `options` | Partial<RestApiConnectorOptions> | ❌ | 覆盖全局配置 |

---

**作者**: Miao Vision Team
**许可证**: MIT
