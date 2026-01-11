# Testing Roadmap - Hybrid GNode Quality Improvement

## 背景

发现 3 个严重的并发 Bug，都未被测试捕获：
1. INSERT 列名缺失导致 SQL 错误
2. clearData 竞态条件导致表不存在
3. 并发刷新竞态导致表创建/删除冲突

**根本原因：缺少针对异步并发场景的系统化测试**

---

## 问题分析总结

### 为什么测试没有发现这些 Bug？

| Bug | 未被发现的原因 | 应有的测试 |
|-----|---------------|-----------|
| **INSERT 列名缺失** | • 没有测试文件<br>• Mock 不验证 SQL 语法 | 真实 DuckDB 集成测试 |
| **clearData 竞态** | • 未测试初始化时序<br>• 未测试部分就绪状态 | E2E 快速操作测试 |
| **并发刷新冲突** | • 未测试并发场景<br>• 测试都是串行执行 | 压力测试 + 并发测试 |

### 测试体系缺陷

```
当前状态（倒金字塔）          期望状态（正金字塔）

    ┌────────┐                  ┌──────┐
    │  E2E   │                  │  E2E │ ← 少量，关键路径
    │  无     │                  ├──────┤
    ├────────┤                  │      │
    │  集成   │                  │ 集成 │ ← 中量，真实场景
    │ 跳过    │                  │      │
    ├────────┤                  ├──────┤
    │  单元   │                  │      │
    │  无     │                  │ 单元 │ ← 大量，快速验证
    └────────┘                  │      │
                                └──────┘
```

---

## 实施计划

### P0 - 本周必须完成（Critical）

#### 1. 启用 E2E 测试到 CI/CD

**目标：** 每次 commit 自动运行 E2E 测试

**实施：**
```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests
on: [push, pull_request]
jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npx playwright install chromium
      - run: npm run build
      - run: npm run test:e2e
```

**验收标准：**
- [ ] PR 自动触发 E2E 测试
- [ ] 测试失败阻止合并
- [ ] 测试报告上传为 artifact

**工作量：** 2 小时

---

#### 2. 添加并发压力测试

**目标：** 发现竞态条件和并发冲突

**实施：**
```typescript
// tests/stress/hybrid-gnode-concurrency.test.ts
describe('Concurrency Stress Tests', () => {
  it('should handle 1000 rapid updates', async () => {
    for (let i = 0; i < 1000; i++) {
      await gnode.update('test', [{ value: i }])
    }
    // 不应有 "already exists" 或 "does not exist" 错误
  })

  it('should handle 10 concurrent data sources', async () => {
    const sources = Array.from({ length: 10 }, (_, i) =>
      Promise.all(
        Array.from({ length: 100 }, () =>
          gnode.update('sales', randomData())
        )
      )
    )
    await expect(Promise.all(sources)).resolves.not.toThrow()
  })
})
```

**验收标准：**
- [ ] 1000 次快速更新无错误
- [ ] 10 个并发数据源无冲突
- [ ] 互斥锁正确工作（刷新不重叠）

**工作量：** 4 小时

---

#### 3. 创建竞态检测套件

**目标：** 自动检测常见竞态模式

**实施：**
```typescript
// tests/utils/race-detector.ts
export class RaceConditionDetector {
  private operations: Array<{
    type: 'DROP' | 'CREATE' | 'SELECT'
    timestamp: number
    resource: string
  }> = []

  logOperation(type: string, resource: string) {
    this.operations.push({ type, timestamp: performance.now(), resource })
  }

  detectRaces(): Array<{ resource: string; conflict: string }> {
    // 检测重叠的 DROP/CREATE 操作
    // 时间间隔 < 5ms 视为竞态
  }
}
```

**验收标准：**
- [ ] 集成到压力测试中
- [ ] 自动检测并报告竞态
- [ ] 提供时序信息

**工作量：** 3 小时

---

#### 4. 更新测试要求文档

**目标：** 明确贡献者测试规范

**实施：**
```markdown
# CONTRIBUTING.md

## 测试要求

### 每个 PR 必须包含：

1. **单元测试**（如果添加纯函数）
   - 覆盖率目标：80%+

2. **集成测试**（如果使用 DuckDB 或异步操作）
   - 必须使用真实 DuckDB-WASM

3. **并发测试**（如果处理异步状态）
   - 测试至少 100 次并发操作

### 测试类型

| 类型 | 目标覆盖率 | 工具 |
|-----|----------|------|
| 纯函数 | 80%+ | Vitest |
| 数据库操作 | 100% | E2E |
| UI 组件 | 70%+ | Playwright |
| 竞态条件 | 所有异步操作 | 压力测试 |

### 运行测试

```bash
npm test              # 所有测试
npm run test:run      # 单元测试
npm run test:e2e      # E2E 测试
npm run test:stress   # 压力测试
```
```

**验收标准：**
- [ ] CONTRIBUTING.md 已更新
- [ ] 提供代码示例
- [ ] 定义覆盖率目标

**工作量：** 2 小时

---

### P1 - 下个 Sprint（Important）

#### 5. 配置 Vitest 浏览器模式

**目标：** 在真实浏览器环境运行单元测试

**工作量：** 4 小时

**关键配置：**
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    browser: {
      enabled: true,
      name: 'chromium',
      provider: 'playwright'
    }
  }
})
```

---

#### 6. 实现 SQL 验证层

**目标：** 构建前捕获 SQL 错误

**工作量：** 6 小时

**关键功能：**
- 验证列数匹配
- 防止 SQL 注入
- 安全构建 INSERT 语句

---

#### 7. 测试最佳实践指南

**目标：** 标准化测试编写

**工作量：** 3 小时

---

#### 8. Pre-commit 测试钩子

**目标：** Commit 前自动运行相关测试

**工作量：** 2 小时

---

### P2 - 下季度（Enhancement）

#### 9. 混沌工程框架

**目标：** 测试系统韧性

**工作量：** 8 小时

**功能：**
- 注入随机失败
- 注入延迟
- 模拟连接中断

---

#### 10. 性能回归测试

**工作量：** 6 小时

---

#### 11. 变异测试

**工具：** Stryker
**工作量：** 4 小时

---

#### 12. 测试覆盖率仪表板

**工作量：** 6 小时

---

## 工作量估算

| 优先级 | 任务数 | 总工作量 | 时间线 |
|-------|-------|---------|--------|
| **P0** | 4 | 11 小时 | 本周（2-3 天） |
| **P1** | 4 | 15 小时 | 下个 Sprint（1 周） |
| **P2** | 4 | 24 小时 | 下季度（分阶段） |

**总计：** 12 个任务，50 小时

---

## 成功指标

### 测试覆盖率

| 指标 | 当前 | 目标（P0后） | 目标（P1后） | 目标（P2后） |
|-----|------|-------------|-------------|-------------|
| 单元测试覆盖率 | ~30% | 50% | 70% | 80%+ |
| 集成测试覆盖率 | 0% | 60% | 80% | 90% |
| E2E 测试数量 | 13 | 25 | 40 | 60 |
| 竞态条件捕获 | 0% | 80% | 95% | 100% |

### 质量指标

| 指标 | 当前 | 目标 |
|-----|------|------|
| 生产环境 Bug（竞态） | 3/月 | 0/月 |
| CI 测试时间 | N/A | <5 分钟 |
| PR 测试覆盖率检查 | 无 | 必须 ≥70% |
| SQL 错误捕获时机 | 运行时 | 构建时 |

---

## 实施时间表

### Week 1（本周）
```
周一：
  - 创建 E2E CI/CD workflow
  - 验证 Playwright 配置

周二-周三：
  - 实现并发压力测试
  - 实现竞态检测器
  - 运行测试并修复发现的问题

周四：
  - 更新 CONTRIBUTING.md
  - 文档审查

周五：
  - P0 任务验收
  - 准备 P1 任务
```

### Sprint 2（下周）
- 配置 Vitest 浏览器模式
- 实现 SQL 验证层
- 编写测试最佳实践

### Q1 2025
- 混沌工程框架
- 性能测试套件
- 测试仪表板

---

## 风险与缓解

| 风险 | 影响 | 概率 | 缓解措施 |
|-----|------|------|---------|
| E2E 测试太慢 | 中 | 高 | 并行执行，优化测试数量 |
| Vitest 浏览器模式配置复杂 | 中 | 中 | 先用 Playwright，后迁移 |
| 压力测试不稳定 | 低 | 中 | 重试机制，调整阈值 |
| 工作量超出预期 | 高 | 中 | 分阶段实施，优先 P0 |

---

## 依赖与资源

### 技术依赖
- Playwright（已安装）
- Vitest（已安装）
- DuckDB-WASM（已安装）
- GitHub Actions（可用）

### 人力资源
- 开发工程师：1 人
- 预计投入：50% 时间，持续 3 周（P0+P1）

### 外部依赖
- 无

---

## 关键决策点

### 需要确认的问题

1. **P0 任务优先级是否正确？**
   - [ ] 同意当前优先级
   - [ ] 需要调整（请说明）

2. **测试覆盖率目标是否合理？**
   - [ ] 80% 单元测试覆盖率可接受
   - [ ] 需要调整目标

3. **时间线是否可行？**
   - [ ] 本周完成 P0 可行
   - [ ] 需要更多时间

4. **资源分配是否充足？**
   - [ ] 1 人 50% 时间充足
   - [ ] 需要更多人力

---

## 后续行动

### 立即执行（待批准后）

1. **创建 GitHub Issues**
   ```
   - Issue #1: [P0] Enable E2E tests in CI/CD
   - Issue #2: [P0] Add concurrency stress tests
   - Issue #3: [P0] Create race condition detector
   - Issue #4: [P0] Update testing documentation
   ```

2. **设置里程碑**
   - Milestone: Testing Infrastructure - Week 1
   - Milestone: Testing Best Practices - Sprint 2
   - Milestone: Advanced Testing - Q1 2025

3. **开始实施**
   - 从 P0 Task #1 开始
   - 每日进度更新
   - 每周验收

---

## 参考文档

- [TESTING_GAP_ANALYSIS.md](./TESTING_GAP_ANALYSIS.md) - 详细的问题分析
- [TESTING_IMPLEMENTATION_PLAN.md](./TESTING_IMPLEMENTATION_PLAN.md) - 完整实施方案
- [hybrid-gnode.test.ts](../src/core/engine/hybrid-gnode.test.ts) - 单元测试示例
- [hybrid-gnode.spec.ts](../tests/e2e/hybrid-gnode.spec.ts) - E2E 测试示例

---

## 版本历史

| 版本 | 日期 | 变更 | 作者 |
|-----|------|------|------|
| 1.0 | 2024-12-30 | 初始版本 | Claude Code |

---

## 审批

- [ ] **技术负责人审批**
  - 签名：________________
  - 日期：________________

- [ ] **项目经理审批**
  - 签名：________________
  - 日期：________________

---

**状态：** 🟡 待审批

**下一步：** 审阅本文档，提供反馈或批准后开始实施
