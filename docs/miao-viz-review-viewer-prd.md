# Miao Vision Review Viewer 产品规划

> 状态：P0–P2 Implemented  
> 版本：v0.3  
> 更新时间：2026-09-22  
> 产品方向：在 Codex 内实时查看 Agent 生成、校验和修订 Miao Vision artifact

## 1. 一句话结论

借鉴 Maestro Viewer 的产品模式，Miao Vision 应增加一个轻量的本地 **Review Viewer**：Agent 继续通过 `miao-viz-cli` 完成数据分析、Spec 生成、验证和渲染；Viewer 只负责在 Codex 内展示执行过程、当前 artifact、证据状态和交付结果。

它不是新的 BI 工作台，也不是报告编辑器，而是连接 **Agent 工作流** 和 **最终视觉产物** 的审稿界面。

## 2. 背景与问题

Miao Vision 当前的优势是 artifact-first、local-first 和 agent-native：用户用一句话提出目标，Agent 生成 VizSpec/DeckSpec，CLI 输出独立 HTML、SVG 或 PDF。

现阶段体验仍有三个断点：

1. Agent 执行期间用户只能等待终端或聊天回复，不知道当前处于 profile、spec、validate 还是 render。
2. 报告生成后，用户还要自己寻找输出文件并打开，视觉判断被推迟到 Agent 已经结束之后。
3. 用户看到图表或洞察有问题时，缺少证据、数据质量和 Spec 状态的上下文，反馈通常只能是“这个不对，重做”。

Maestro 的可复用经验不是“做一个设备控制台”，而是：**MCP 负责执行，独立本地 Viewer 负责实时投影，Agent 负责把 Viewer URL 打开到宿主应用。**

## 3. 产品目标

### 3.1 目标

- 让用户在 Codex 内实时看到一次可视化生成任务的阶段、结果和失败原因。
- 渲染完成后自动打开当前 HTML artifact，缩短“生成 → 判断 → 修订”闭环。
- 将 evidence、验证状态、数据质量和交付检查变成用户可理解的视觉信息。
- 保持 Miao Vision 的本地优先、无后端、无账号、artifact-first 定位。
- 让 Agent 可以基于当前任务状态进行定向修订，而不必从头猜测问题。

### 3.2 成功标准

首个版本发布后，用户应能完成以下闭环：

```text
提出报告需求
  -> Agent 执行 analyze / spec / validate / render
  -> Codex 打开 Review Viewer
  -> 用户看到报告与证据状态
  -> 用户提出针对某个图表或洞察的修改
  -> Agent 重新生成并刷新 Viewer
```

建议验证指标：

| 指标 | 目标 |
| --- | --- |
| 首次生成后打开 artifact 的成功率 | ≥ 95% |
| Viewer 能显示完整阶段状态的任务比例 | ≥ 95% |
| 用户无需手动查找文件即可看到成品的比例 | ≥ 90% |
| evidence 状态与 CLI 校验结果一致率 | 100% |
| Viewer 不可用时 artifact 仍可正常交付 | 100% |

## 4. 非目标与边界

不做以下事情：

- 不恢复 SQL Workspace、任意 SQL 编辑器或多数据源连接器。
- 不做拖拽布局编辑器、图表属性面板或可视化搭建器。
- 不在 Viewer 中让用户直接修改数据、Spec 或 JavaScript。
- 不引入后端、云端会话、登录、权限和协作状态。
- 不把 Viewer 变成必须依赖的交付物；最终 HTML/PDF/SVG 必须仍可独立打开。
- 不复制 Maestro 的设备画面流、输入代理和长驻设备控制能力。

## 5. 目标用户与核心场景

### 5.1 AI Agent 用户

使用 Codex 或其他 Coding Agent，将本地 CSV/XLSX/JSON 变成报告、信息图或 deck。他们最关心 Agent 是否真的完成、结果是否可信、如何快速指出问题。

### 5.2 业务分析用户

不想维护 BI 系统，只需要把一次分析结果交给同事或用于会议。他们需要快速判断视觉层级、数字可信度和导出结果。

### 5.3 内容创作者与开发者

需要反复调整主题、版式和数据叙事，并通过脚本或 CI 生成稳定 artifact。他们需要可重复、可诊断的生成状态。

## 6. 核心体验

```text
本地数据 + 用户意图
        |
        v
Agent / MCP
  analyze -> instantiate -> validate -> render
        |
        | 阶段事件、校验结果、artifact URL
        v
Review Viewer（localhost）
  ├─ 任务阶段时间线
  ├─ 当前 artifact 预览
  ├─ Evidence / 数据质量检查
  └─ 交付文件与警告
        |
        v
用户反馈：改布局 / 改图表 / 补证据 / 重跑
```

用户打开 Viewer 后，默认看到两栏：

- 左侧：任务状态、阶段耗时、警告和证据覆盖率。
- 右侧：当前报告、信息图或 deck 的真实 HTML 预览。

当新一轮 render 完成时，Viewer 自动刷新预览，同时保留任务历史和前后版本摘要。

## 7. Feature 规划

### 7.1 MVP（必须做）

| Feature | 用户价值 | 关键行为 | 优先级 |
| --- | --- | --- | --- |
| Viewer 本地服务 | 在 Codex 中稳定打开实时页面 | CLI/MCP 启动 localhost 服务并返回 URL | P0 |
| 首次 URL 提示 | 降低发现成本 | 首个 MCP 工具响应带出 Viewer URL | P0 |
| 任务阶段时间线 | 知道 Agent 正在做什么 | 显示 profile、analyze、spec、validate、render、done/failed | P0 |
| 实时日志摘要 | 快速定位失败原因 | 显示结构化 code、message、文件路径，不展示噪声日志 | P0 |
| Artifact 预览 | 立即判断视觉结果 | 内嵌当前 HTML；支持 report、article、deck | P0 |
| 交付摘要 | 判断是否能分享 | 显示输出路径、格式、大小、验证状态、警告 | P0 |
| Evidence 状态 | 建立对数字的信任 | 显示 verified、coverage、evidence id、缺失项 | P0 |
| 数据质量摘要 | 解释结果局限 | 显示缺失率、字段类型问题、样本或异常提示 | P0 |
| 无 Viewer 降级 | 不影响现有 CLI | Viewer 失败时仍输出正常 artifact 和 CLI 结果 | P0 |

### 7.2 V1（建议做）

| Feature | 用户价值 | 关键行为 | 优先级 |
| --- | --- | --- | --- |
| 版本历史 | 对比修改前后结果 | 按 run 保存摘要、artifact path、spec hash、data fingerprint | P1 |
| 变更摘要 | 让用户知道本次改了什么 | 展示主题、图表、洞察、Evidence 的增删改 | P1 |
| Artifact 内证据检查 | 从结论直接追溯依据 | 点击 KPI/洞察打开 evidence 查询和 caveat | P1 |
| Render 重试 | 快速恢复暂时性失败 | 对同一输入执行 retry，不改变源文件 | P1 |
| 预览模式切换 | 支持不同交付物 | report / deck / article 之间切换当前 run 产物 | P1 |
| 打开文件与复制路径 | 简化交付 | 在 Codex 面板中打开 artifact 或复制绝对路径 | P1 |

### 7.3 V2（验证需求后再做）

| Feature | 价值 | 边界 |
| --- | --- | --- |
| 视觉 diff | 判断修订是否改善 | 只比较渲染截图或 HTML 结构摘要，不做像素级自动评分 |
| Agent 修订快捷动作 | 减少反馈成本 | 生成自然语言 prompt 草稿，仍由 Agent 执行 |
| 选择图表后定位 Spec | 建立产物到源的映射 | 只读展示，不提供直接编辑器 |
| CI/批量任务查看 | 观察自动化生成 | 仍保持本地文件和本地服务，不引入云端队列 |

## 8. Viewer 信息架构

### 8.1 顶部栏

- 任务标题和 artifact 类型。
- 当前状态：Running、Ready、Warning、Failed。
- 当前 run ID、开始时间和总耗时。
- `Open artifact`、`Copy path`、`Retry` 操作。

### 8.2 左侧任务面板

阶段顺序固定为：

1. Input resolved
2. Data profiled
3. Context/analyze completed
4. Spec instantiated
5. Spec validated
6. Artifact rendered
7. Delivery verified

每个阶段显示：状态、耗时、结构化摘要、失败 code 和建议的下一步。

### 8.3 右侧预览面板

- 直接展示当前生成的 HTML artifact。
- report 支持滚动和 artifact 内置轻交互。
- deck 支持键盘导航和当前 slide 指示。
- article/infographic 支持长页面滚动。
- 预览不可用时显示明确原因，并提供文件路径。

### 8.4 证据检查面板

至少显示：

- 总体验证状态：Verified / Partial / Blocked。
- evidence coverage、claim coverage、object coverage。
- 缺失 Evidence ID 或非法 `$evidence:` 路径。
- 数据 fingerprint、Spec hash 和输入文件摘要。
- 每条重要洞察的 evidence 入口和 caveat。

## 9. MCP 与本地服务契约

### 9.1 MCP 工具

新增或扩展一个只读工具：

```text
open_miao_vision_viewer()
```

返回：

```json
{
  "url": "http://127.0.0.1:<port>/",
  "status": "running",
  "message": "Open this URL in the embedded browser"
}
```

工具响应应明确要求 Agent 将 URL 交给 Codex 内嵌浏览器；MCP server 不直接启动外部浏览器。

### 9.2 Viewer 事件

建议采用 SSE，事件保持小而稳定：

```json
{
  "type": "run.stage",
  "runId": "run-42",
  "stage": "validate",
  "status": "completed",
  "message": "Evidence coverage is 100%",
  "code": null,
  "timestamp": "2026-09-21T10:00:00Z"
}
```

```json
{
  "type": "artifact.updated",
  "runId": "run-42",
  "kind": "report",
  "path": "/tmp/miao-vision/sales-report.html",
  "previewUrl": "/artifacts/run-42/sales-report.html",
  "verified": true
}
```

```json
{
  "type": "run.issue",
  "runId": "run-42",
  "severity": "error",
  "code": "EVIDENCE_PATH_INVALID",
  "message": "Insight revenue_growth references a missing evidence path"
}
```

### 9.3 安全与生命周期

- 只监听 `127.0.0.1`，不暴露局域网。
- Viewer API 对写操作做来源检查，并限制 artifact 根目录。
- Viewer 默认只读；MVP 不允许通过网页修改数据或执行任意 CLI 命令。
- CLI/MCP 进程结束时关闭 Viewer。
- Viewer 启动失败、端口占用或浏览器不可用时，不能阻塞 CLI render。
- artifact URL 必须经过路径规范化，禁止读取工作区外任意文件。

## 10. 与现有产品的关系

| 现有能力 | Review Viewer 的作用 |
| --- | --- |
| `data profile/analyze` | 显示输入和数据质量阶段 |
| `spec validate --verify` | 显示结构、证据和修复结果 |
| `render report/deck/article` | 提供真实 artifact 预览 |
| `artifact delivery` | 展示输出路径、验证和交付摘要 |
| interactive runtime | 在预览中保留报告自身的轻交互 |
| Web landing app | 继续负责官网、示例和分发，不承载 Viewer 核心逻辑 |

Viewer 不应复制报告渲染器，也不应把生成逻辑迁移到 Svelte Web App。生成、验证和事件来源仍属于 CLI；Viewer 是一个薄的本地投影层。

## 11. 分阶段落地

### Phase 1：MVP，可独立发布

交付 Viewer 本地服务、MCP URL 工具、阶段事件、artifact 预览、交付摘要和 evidence 总体状态。

完成标准：一个完整的 `analyze -> spec -> validate -> render` 任务，能够在 Codex 内打开并实时显示状态；Viewer 关闭或失败不影响 CLI 输出。

### Phase 2：可审稿

增加 run 历史、变更摘要、逐条 evidence 检查和 retry。此阶段的重点是让用户能够明确告诉 Agent“哪里需要改”。

完成标准：用户能从某条洞察定位 Evidence/Spec 状态，并让 Agent 对同一任务生成下一版，Viewer 能显示前后版本。

实施状态（2026-09-22）：已完成。

- 版本历史保存 run 摘要、父版本、artifact 路径、Spec hash 与 Data fingerprint。
- 变更摘要按 `parentRunId` 比较主题、数据、Spec、图表、洞察和 Evidence。
- Evidence 面板支持逐条展开 query 与 caveat；artifact 自身的 Evidence 入口继续保留。
- MCP 创建的 run 支持按原输入和输出路径 Retry，并将新 run 关联为上一版的修订。
- Viewer 支持 All、Report、Deck、Article 预览类型切换。
- Open artifact 与 Copy path 可直接操作；Clipboard API 不可用时提供本地 fallback。

### Phase 3：可持续自动化

增加视觉 diff、CI 任务观察和更细粒度的产物到 Spec 映射；只有在真实用户反复提出需求后再实现。

实施状态（2026-09-22）：已完成本地版本。

- Artifact 到 Spec 映射提供 chart、insight、evidence 的只读 path、标题和 Evidence IDs。
- Agent 修订快捷动作根据验证状态与结构化 issue 生成可复制 Prompt，不在 Viewer 内直接修改文件。
- 视觉 Diff 使用父子 run 的 Before / After 双栏真实 Artifact，并附带结构变更摘要，不做像素质量评分。
- Batch Overview 聚合本地 run 的状态、类型、问题数量和执行时间，不引入云端队列。

## 12. 验收标准

### 功能验收

- `open_miao_vision_viewer` 能返回可访问的 localhost URL。
- 首个相关 MCP 响应能提示 Viewer 的存在，但不会重复污染每次工具输出。
- Viewer 能在无设备、无数据、空任务时正常显示空状态。
- 阶段事件乱序或重复到达时，前端最终状态仍正确。
- render 成功后能显示真实 HTML，而非截图替代品。
- validate 失败时能显示结构化 code、message 和修复提示。
- evidence 未验证时不能显示为 Verified。
- Viewer 关闭后，CLI 仍能完成 render 并返回标准 `{ ok, value }` 或 `{ ok, code, message }`。

### 视觉验收

- 首屏在 Codex 右侧面板中无需额外配置即可理解。
- 成品预览面积明显大于日志区域。
- Failed、Warning、Verified 三种状态有清晰但不过度的视觉区别。
- 长报告、deck 和 infographic 都不会被固定高度裁切到不可用。
- 移动或分享 artifact 时，产物不依赖 Viewer 运行。

### 回归验证

```bash
npm run test:run
npm run build:cli
npm run check:size
```

另外需要增加一条 workflow smoke test，覆盖：

```text
data analyze
  -> spec instantiate / author
  -> spec validate --context --verify
  -> render report
  -> Viewer event / artifact preview
```

## 13. 风险与应对

| 风险 | 影响 | 应对 |
| --- | --- | --- |
| Codex 无法访问 localhost | 无法内嵌预览 | 提供打开本地 artifact 的降级路径；Viewer 不是交付必需品 |
| 大型 HTML 或数据导致预览慢 | 首屏体验差 | Viewer 读取 artifact URL，不通过事件传输 HTML；必要时只传 manifest |
| 事件顺序错乱 | 阶段显示闪烁或回退 | 使用 runId、单调 sequence 和前端快照合并 |
| 误把 Viewer 做成工作台 | 产品边界漂移 | MVP 只读，不提供编辑器、SQL 和数据连接器 |
| 本地 HTTP 访问扩大攻击面 | 本地数据暴露或被写入 | 绑定 loopback、限制根目录、来源检查、禁用任意命令接口 |
| CLI 与 Viewer 状态不一致 | 用户误判验证结果 | 事件由 CLI 结构化结果产生，Viewer 不自行推导验证结论 |

## 14. 最关键的产品决策

1. **Viewer 是审稿层，不是创作层。** 用户反馈通过 Agent 完成修改，Viewer 只帮助用户准确描述问题。
2. **artifact 是唯一交付真相。** Viewer 可以实时展示，但不能成为必须部署的运行时。
3. **证据状态必须一等可见。** Miao Vision 的差异化不是“又一个图表预览”，而是可验证的视觉产物。
4. **先支持本地单任务，再考虑历史与 CI。** 不为尚未验证的协作和云端场景引入后端。
5. **事件契约优先于 UI 细节。** 阶段、artifact、issue、evidence 四类事件稳定后，未来可替换 Viewer 实现。

## 15. 最大不确定性

本规划假设 Codex 的内嵌浏览器能够访问发起 MCP 进程所在机器的 `127.0.0.1` 端口。如果该假设不成立，产品仍可保留阶段状态、交付摘要和文件打开能力，但“实时内嵌 artifact 预览”需要改为 Codex 的本地文件面板或受控临时预览页。

因此 Phase 1 的第一条技术验收应是：在真实 Codex MCP 会话中启动本地 Viewer，并确认 URL 可被 `open_in_codex` 的 browser target 打开；未通过前，不扩展 Viewer 的功能范围。
