# Miao Vision Backlog Disposition

> 日期：2026-06-23  
> 目的：在产品路线收敛到 `miao-viz-cli`、VizSpec、数据展示 artifact、信息图和演示文稿后，锁定旧 backlog 的处理方式。本文用于评审哪些需求关闭，哪些能力迁移，哪些只保留为内部支撑能力。

## 一、判定原则

新产品短期只服务一个主线：

```text
Agent / User
  -> local file / article markdown
  -> miao-viz profile / article
  -> AI writes VizSpec / DeckSpec / InfographicSpec
  -> validate / render / deck
  -> static shareable artifact
```

三条主产品路线：

- Data Display：本地数据文件到图表、KPI、表格、注释、洞察和静态 HTML 报告。
- Article-to-Infographic：文章 URL/Markdown 到静态信息图 artifact。
- Presentation Deck：本地数据文件到浏览器可播放的演示文稿。

因此 backlog 按以下规则处理：

- 能增强 `miao-viz-cli`、Agent skill、VizSpec/DeckSpec、静态视觉质量、导出质量的，迁移到新主线。
- 需要用户长时间操作 Web App、手写 SQL、维护交互状态、搭 dashboard 的，关闭或降级。
- 只对开发调试有价值的，保留为 hidden/internal/debug，不进入用户叙事。
- 依赖复杂浏览器 runtime、后端连接器、实时状态同步的，延期到新主线稳定后再评估。

## 二、Disposition 总表

| Backlog / 能力 | 处理 | 理由 | 新归属 | 状态 |
| --- | --- | --- | --- | --- |
| 完整 SQL Workspace | 关闭 | 与 CLI-first 静态输出路线冲突，用户学习成本和维护成本过高 | 无 | 执行中 |
| Monaco SQL Editor | 关闭 | 手写 SQL 不再是主用户路径 | 无 | 已移除 |
| Query Tabs | 关闭 | 多查询会话是 BI 工作台能力，不适合静态 artifact 产品 | 无 | 已移除 |
| SQL Snippets | 关闭 | 鼓励用户维护 SQL 模板，不符合 Agent 生成 spec 的方向 | 无 | 已移除 |
| Query History | 关闭 | 依赖 Workspace 会话模型，短期不进入 CLI 产品 | 无 | 关闭 |
| ResultsPanel 图表配置器 | 迁移 | 配图规则有价值，但 UI 配置器不保留 | `src/agent` catalog / recommendation hints | 部分完成 |
| QuickInsights / ColumnStats | 迁移 | 数据理解能力对 Agent profile 有价值 | `miao-viz profile` | 已迁移主要规则 |
| Data Explorer / 数据预览 | 迁移 | 文件预览、字段摘要仍有价值 | profile readable output / Web preview | 待细化 |
| Data Display 产品路线 | 保留并强化 | 本地数据到图表/KPI/表格/洞察是新主线之一 | `miao-viz render` + VizSpec | 执行中 |
| Data-display chart plugins | 迁移/保留 | 是数据展示、信息图和 deck 的核心视觉资产 | chart catalog / static renderer | 保留 |
| 多数据源连接器 | 关闭 | 会把产品拉回传统 BI 平台 | 远期 advanced/pro 评估 | 已移除主线 |
| MotherDuck / MySQL / PostgreSQL / REST connector | 关闭 | 短期只聚焦本地 CSV/TSV/XLSX/JSON | 无 | 已移除 |
| Browser DuckDB/OPFS 作为主卖点 | 降级 | 对 CLI 用户不是直接价值 | Web preview/debug only | 执行中 |
| DuckDB-WASM report preview 执行 | 保留但降级 | Web 预览和 Markdown report debug 仍可能需要 | preview/debug runtime | 待盘点边界 |
| Workspace OPFS attach | 关闭 | 旧 Workspace/Report 耦合点 | 无 | 已移除 |
| Markdown BI Report 工作台 | 降级 | 语法和状态模型太重，但 Markdown render/debug 仍有价值 | spec preview / report debug | 执行中 |
| Markdown SQL blocks | 保留但降级 | 旧报告兼容和 debug 可用，不作为新手主路径 | Web preview/debug | 待限制入口 |
| CrossFilter | 关闭 | 重交互 dashboard 能力，不适合静态可分享报告 | 轻量 local filter 另行设计 | 已移除主线 |
| Drilldown | 关闭 | 完整 drilldown 状态复杂；静态报告只保留有限展开/链接概念 | Interactive Static Report backlog | 已移除主线 |
| Tabs / Modal 插件 | 关闭 | 通用 Web app 交互组件，不是静态 artifact 核心 | 无 | 已移除 |
| `src/plugins/inputs` | 关闭主线 | dashboard input 控件过重 | 简单 filter controls 重新设计 | 待移除/隔离 |
| Streaming demos | 关闭 | 实时看板方向分散定位 | 无 | 已移除 |
| GNode / Hybrid demo | 关闭 | 实验性过强，不服务 CLI static artifact | 无 | 已移除 |
| Weather demo | 关闭 | 示例噪音，偏离本地文件到报告主线 | 无 | 已移除 |
| Mosaic / vgplot | 关闭 | 与自包含、可控、AI-friendly SVG 输出不一致 | pure SVG renderer | 已移除 |
| 旧 Chart Builder UI | 关闭 | UI 手动配置路线不保留 | Agent-generated VizSpec | 已移除 |
| Pure SVG chart plugins | 迁移/保留 | 是 Data Display 路线的核心视觉资产 | chart catalog / renderer | 保留 |
| KPI / table / line / bar / pie 等基础图表 | 保留 | CLI render/deck 需要稳定基础图表 | `miao-viz render` / `deck` | 保留 |
| Sankey / treemap / radar / funnel / waterfall 等高级图表 | 迁移 | 有视觉价值，适合高级静态报告 | chart catalog / renderer | 保留并增强 |
| Annotation / callout / insight blocks | 迁移 | 静态高级视觉表达核心能力 | VizSpec / DeckSpec | 规划中 |
| Editorial / dark / minimal themes | 迁移 | 用户喜欢结果的关键 | CLI themes | 执行中 |
| PDF / PNG / SVG export | 迁移 | 静态 artifact 产品关键闭环 | CLI export | 规划中 |
| Article-to-Infographic Web demo | 迁移 | 方向正确，但不应独立成 Web 产品 | `miao-viz article` + skill | 规划中 |
| Article URL fetching | 迁移到 Skill | CLI 不承担复杂抓取；Agent 更适合处理网页读取 | `miao-vision` skill | 已写入 skill |
| Markdown article to infographic | 迁移 | 适合 Agent 工作流和静态信息图输出 | `miao-viz article` | 规划中 |
| Slide deck / Presentation | 迁移 | 与“给老板看/演示/汇报”高度匹配 | `miao-viz deck` + DeckSpec | 已接入 skill |
| E2E 测 SQL Workspace | 关闭 | 测试目标已不再是 SQL Workspace | 无 | 已替换 |
| E2E 测 CLI/VizSpec/static export | 迁移 | 新主线质量门禁 | Playwright + CLI smoke | 已迁移 |
| Debug entry / dev mode switch | 保留但隐藏 | 开发调试有价值，不能暴露成主功能 | hidden route / dev flag | 待执行 |

## 三、关闭清单

以下 backlog 不再进入产品路线图，也不再接受 feature expansion。除非出现构建或兼容问题，否则不投入。

- SQL Workspace 用户产品化
- Monaco SQL 编辑器
- Query Tabs
- Query History
- SQL Snippets
- Workspace ResultsPanel 交互式 chart builder
- CrossFilter dashboard runtime
- 完整 Drilldown runtime
- Tabs / Modal 作为通用插件能力
- Streaming / realtime dashboard
- Hybrid GNode / Weather demos
- Mosaic / vgplot runtime
- 多数据源连接器主线，包括 MotherDuck、MySQL、PostgreSQL、REST、HTTP connector
- Workspace OPFS persistence / attach 叙事

关闭含义：

- 不再补设计、不再补文档、不再补测试。
- 如代码已删除，保持删除。
- 如还有残留引用，只做清理型任务。
- 不因为旧 roadmap 或 archive 文档重新恢复。

## 四、迁移清单

以下 backlog 的“用户价值”保留，但实现形态迁到 CLI/Agent/spec。

| 旧能力 | 迁移目标 | 迁移后的形态 |
| --- | --- | --- |
| ColumnStats | `miao-viz profile` | 字段类型、缺失率、分布、sum、分位数、top values |
| QuickInsights | `miao-viz profile` | AI-readable insights / hints / correlations |
| Chart config 推断 | Catalog + spec hints | Agent 根据 profile/catalog 写 VizSpec |
| Data Display | `miao-viz render` | KPI、chart、table、annotation、insight sections |
| Results chart preview | Static renderer | `miao-viz render` 输出 self-contained HTML |
| Data preview | Profile readable output | CLI 输出字段摘要和样本预览 |
| 高级 chart plugins | Agent chart catalog | AI 可选择的静态图表资产 |
| Markdown report 输出 | VizSpec render | YAML/JSON spec 驱动的静态报告 |
| Article-to-Infographic | `miao-viz article` | Agent 把 URL/Markdown 归一化后调用 CLI |
| Report presentation | `miao-viz deck` | DeckSpec 生成 browser-presentable slide deck |
| Theme / visual polish | CLI themes | editorial / dark / minimal / future fashion presets |
| Export | CLI export | HTML first，后续 PNG/PDF/SVG |

迁移验收标准：

- 新能力可以通过 CLI 命令完成。
- Agent skill 知道何时调用该命令。
- Spec/schema 可被验证或由命令内 schema 校验。
- 输出物是可分享、可归档、尽量自包含的静态 artifact。

## 五、保留但降级清单

这些能力不应出现在主导航、产品卖点或新手教程中，但可以作为开发支撑保留。

| 能力 | 保留原因 | 限制 |
| --- | --- | --- |
| Web preview/gallery/debug | 本地查看报告、主题、图表输出仍有价值 | 不做完整 BI 工作台 |
| DuckDB-WASM preview execution | 旧 Markdown/report debug 可能仍依赖 SQL blocks | 只限 preview/debug，不作为 CLI 核心 |
| Markdown parser / renderer | 历史报告和 debug 仍可能需要 | 不作为新用户主入口 |
| 简单表格 sort/search/filter | 静态报告内的轻量阅读体验有价值 | 不扩展成 dashboard filter system |
| Tooltip / legend toggle | 静态 HTML 的基本阅读交互 | 不引入全局 crossfilter 状态 |
| Hidden debug route / dev mode | 开发验证需要 | 默认隐藏，不能进入用户主路径 |

## 六、延期评估清单

这些方向不是现在关闭，而是等 CLI/report/deck/article 主线稳定后再判断。

- 数据库连接器 advanced/pro：只有当本地文件主线足够稳定后再评估。
- 轻量 Interactive Static Report：只考虑单文件 HTML 内的本地筛选、展开、高亮，不恢复 dashboard builder。
- Web spec editor：只做 VizSpec/DeckSpec 编辑和预览，不恢复 SQL Workspace。
- Cloud sharing：必须建立在本地 artifact 稳定之后。
- PPTX native export：先稳定 browser-presentable deck HTML，再考虑真正 PPTX。

## 七、近期执行顺序

### P0：锁关闭口

- [ ] 清理残留文档中仍把 SQL Workspace 描述为 production/core engine 的内容。
- [ ] 清理残留 UI 入口，确保普通用户路径看不到 Workspace。
- [ ] 隐藏或删除 debug-only 入口。
- [ ] 确认 backlog/roadmap 不再出现 SQL Workspace feature expansion。

### P1：完成迁移闭环

- [ ] 将 Data Display 明确落到 VizSpec sections：KPI、chart、table、annotation、insight。
- [ ] 补齐 data-display chart catalog 的字段要求、适用场景和示例 spec。
- [ ] 完成 `miao-viz article` 的 CLI 入口和 skill 示例。
- [ ] 完善 `miao-viz deck` 的 DeckSpec 文档、示例和 smoke 测试。
- [ ] 补齐 profile readable output，让 Agent 和人都能快速理解数据。
- [ ] 将 annotation/callout/insight 作为 VizSpec/DeckSpec 一等能力。

### P2：导出和视觉质量

- [ ] 强化 editorial theme。
- [ ] 增加 fashion visual presets。
- [ ] 建立 golden examples。
- [ ] 推进 PNG/PDF/SVG export。

## 八、评审问题

执行前需要确认的问题：

1. `src/plugins/inputs` 是否直接删除，还是先隔离为 internal/debug-only？
2. Markdown Report 是否只保留 renderer/debug，还是也保留轻量编辑器？
3. DuckDB-WASM 是否只用于 Web preview，还是从 report runtime 中进一步剥离？
4. Article-to-Infographic 首版是否只支持 Markdown 输入，由 skill 负责 URL 抓取？
5. Deck HTML 是否作为首版正式输出，PPTX 暂不承诺？

## 九、当前结论

短期产品 backlog 应从“功能丰富的 BI 工具”改成“高质量静态 artifact 生成器”。

应关闭：SQL Workspace、连接器、重交互 dashboard、实验 demo、Mosaic/vgplot。

应迁移并强化：数据理解、数据展示、图表资产、洞察、主题、文章信息图、演示文稿、导出。

应保留但降级：Web preview/debug、少量静态 HTML 交互、必要的 Markdown/report runtime 兼容能力。
