# Phase 4: Connection UI Enhancement

## 目标
在 SQL Workspace 中直接管理连接，无需跳转页面。

---

## 用户流程

```
[Workspace 顶部显示当前连接] → [点击下拉选择/切换] → [点击 +Add 添加新连接]
```

---

## Todo List

### 1. ConnectionSelector 组件 (SQL Workspace 顶部)
- [ ] 显示当前连接：图标 + 名称 + 状态点
- [ ] 点击展开 dropdown，列出所有连接
- [ ] 每个连接项显示：类型图标 + 名称 + 状态
- [ ] 点击连接项 → 切换到该连接
- [ ] 底部 "+ Add Connection" 按钮

### 2. ConnectionSelector Dropdown 设计
```
┌─────────────────────────────┐
│ 🦆 Local DuckDB      ● 🟢  │  ← 当前选中
├─────────────────────────────┤
│ 🦆 Local DuckDB      🟢    │
│ 🌐 MotherDuck Prod   ⚪    │
│ 🔌 Postgres API      🔴    │
├─────────────────────────────┤
│ ＋ Add Connection          │
└─────────────────────────────┘
```

### 3. AddConnectionModal 组件
- [ ] 类型选择：3 个卡片（WASM / MotherDuck / HTTP）
- [ ] 配置表单：根据类型显示对应字段
- [ ] 测试按钮："Test Connection"
- [ ] 保存按钮：测试通过后启用

### 4. 集成到 SQLWorkspace
- [ ] 在 workspace header 左侧添加 ConnectionSelector
- [ ] 位置：在 "SQL Workspace" 标题旁边

### 5. 状态同步
- [ ] 切换连接后自动刷新 Data Explorer
- [ ] 切换连接后清空或保留当前 SQL（可配置）

---

## 文件结构

```
src/components/connections/
├── ConnectionsPage.svelte        # 保留（Settings 页面入口）
├── ConnectionModal.svelte        # 保留（编辑连接）
├── ConnectionSelector.svelte     # 新增：Workspace 顶部下拉选择器
├── ConnectionSelectorItem.svelte # 新增：下拉列表项
└── AddConnectionModal.svelte     # 新增：添加连接弹窗（简化版）
```

---

## UI 细节

### ConnectionSelector 触发按钮
```
┌──────────────────────────┐
│ 🦆 Local DuckDB  🟢  ▼  │
└──────────────────────────┘
```
- 宽度：自适应，最大 200px
- 样式：与 Workspace 工具栏风格一致

### AddConnectionModal 表单字段

| 类型 | 字段 |
|------|------|
| WASM | Name |
| MotherDuck | Name, Token, Database |
| HTTP | Name, Endpoint, API Key |

---

## 键盘支持
- [ ] ↑↓ 键在 dropdown 中导航
- [ ] Enter 选择连接
- [ ] ESC 关闭 dropdown/modal

---

## 验收标准

1. 用户在 Workspace 内完成连接切换（无需跳转）
2. 新建连接 ≤ 3 次点击
3. 当前连接状态一目了然
4. 切换连接后数据自动刷新

---

## 预估工作量

| 任务 | 复杂度 |
|------|--------|
| ConnectionSelector | 中 |
| ConnectionSelectorItem | 低 |
| AddConnectionModal | 中 |
| SQLWorkspace 集成 | 低 |
| 状态同步逻辑 | 低 |

**总计**: ~2 小时

---

**Status**: Pending Review
