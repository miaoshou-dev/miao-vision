# 项目周期报告设计方案

日期：2026-10-10。状态：实现及自动化验证完成；项目快照、Gantt、基准排期、跨期比较与修订接口已接入，真实团队试用待进行。

## 1. 定位与首版用户

为小型软件交付、设计交付与咨询团队的项目负责人生成每周或每月的项目状态报告，面向客户或管理者。产品承诺：首次确认项目字段、口径和结构，后续替换本期任务快照，得到可追溯的本期状态、跨期变化与下一步。

首版以单项目任务快照为输入，一期一份自包含 HTML。PDF 使用现有导出路径，按需生成。报告聚焦已完成事项、逾期事项、阻塞事项、里程碑和源数据中的下期计划。

## 2. 当前基础与缺口

代码已存在 report init/update/info/history/clean、数据契约与 evidence recipe 重放、report-profile、跨期指标比较、period-outcome-brief、review、HTML/PDF 输出。本方案扩展现有周期报告，不重新实现其生命周期。依据是当前代码，而非旧 PRD 中的待实现清单。

尚缺：稳定任务标识的跨期比较、任务状态归一化、按报告截止日判断逾期、里程碑口径、项目专用展示，以及项目语义校验。

## 3. 首版输入契约

支持一张完整任务快照表：CSV 或 XLSX 的一个明确 Sheet。用户或代理将其他材料整理到表中；CLI 不直接解析会议纪要或连接项目管理平台。

必需字段通过显式映射指定：task_id、title、status、due_date。task_id 为非空字符串并在快照内唯一；title 非空；due_date 可为空，非空时为 YYYY-MM-DD。

可选字段：owner、completed_at、is_milestone、next_action、action_due_date、blocker。completed_at 和 action_due_date 同样是日期；is_milestone 为明确布尔值。缺失负责人或日期展示为未提供。

首次保存状态映射，归一化为 todo、in_progress、done、blocked、cancelled。未知状态阻断更新并返回原始值与行位置。不得猜测字段或状态含义。取消项从有效任务分母排除，独立列出。

配置必需项：项目名称、项目标识、字段映射、状态映射、时区、报告周期起止日。目标受众默认管理者，可显式选择客户；周期按周或月表达，计算一律使用明确日期边界。首版接受完整快照，不接受增量事件或只含本周任务的表。

## 4. 数字与文字口径

所有日期比较使用保存的项目时区，以 period.end 当天结束为观察截止点；运行当天不得影响同一期结果。

- 有效任务数：全部任务减去 cancelled 项。
- 任务完成比例：done 项 / 有效任务数；分母为零时为不可用。名称始终为任务完成比例，不能表述为项目完成进度，也不采用代理推断的任务权重。
- 当前逾期：due_date 早于截止日期，状态为 todo、in_progress 或 blocked。截止当日到期为今日到期，不算逾期。
- 阻塞事项：状态为 blocked；blocker 缺失时说明阻塞原因未提供。
- 本期完成：completed_at 位于本期起止日且状态 done。日期缺失时仅能标为相较上期新完成，不能声称具体在本期完成。
- 里程碑：仅来自 is_milestone=true 的源记录；done 表示源数据报告为完成，不自动等同客户验收。已完成但完成日期缺失时，是否按期完成为未知。
- 下期行动：展示未完成任务中的 next_action、owner、action_due_date；没有明确行动时展示待补充，不自动指定负责人或日期。

源表的完成状态或日期互相矛盾、完成日期晚于报告截止日或早于开始日时阻断。完成日期晚于任务截止日属于延期完成，允许保留事实。done 项缺少 completed_at 不阻断，但限制本期完成与按期完成判断并发出警告。未完成任务均无截止日时仍可展示状态分布，但逾期判断为不可用并进入 needs_review。

总体健康状态仅在用户显式配置规则后生成；没有规则时展示事实摘要。用户声明的风险为来源陈述，推导的风险为规则提示，代理建议单独标识为建议。首版展示逾期和阻塞问题，不提供概率、自动因果解释或交付日期预测。

## 5. 跨期行为

任务按项目标识和 task_id 匹配，避免标题变化导致重复任务。只对同一配置版本且观察截止日早于本期的成功基线进行比较；采用符合条件的最近一期。若最近一期 needs_review，沿用历史机制允许读取其证据，但报告明确展示基线待复核提示；failed 不作为基线。

比较事件包括新增、消失、完成、重新打开、状态变更、截止日调整、负责人变更、新增或解除阻塞。消失项仅表示本期快照缺失，不计作完成或取消，列入 needs_review。更换 task_id 表现为消失和新增，提示可能发生标识变化。

首次运行展示当前状态，不生成环比措辞。较早周期补录不会替代最新周期指针；同一周期禁止覆盖，沿用现有重复运行错误。需要改正时生成带独立 run id 的修订，记录 replacesRunId，保留原产物。基线选择按 period.end，再按修订关系选择，不按目录名或运行时间猜测周期。

保存输入文件指纹、配置版本、源行定位及用于任务比较的规范化快照。该快照包含任务明细，应作为项目本地数据保留；源文件复制仍需显式选择。单份 HTML 保留数值和陈述来源摘要，脱离项目目录分享后仍可查看依据；完整运行诊断留在项目目录。

## 6. 报告结构与视觉

固定结构：项目与周期 → 本期摘要 → 已完成事项与变化 → 里程碑 → 逾期和阻塞 → 下期行动 → 折叠的证据和方法。

摘要最多三条事实，加任务数量、任务完成比例、逾期数和阻塞数。第一期用当前状态填充摘要；没有跨期变化时明确表达无已识别变化。

状态分布采用横向条形或堆叠条；里程碑采用有日期的列表或时间线；问题和行动使用表格。仅有日期点的里程碑不绘制甘特图；没有三个及以上可比较周期不绘制历史趋势。空区块展示相应无事项状态，不生成装饰性数据。

## 7. 技术设计

使用现有 report 命令组，新增可选 --project-config 参数到 init；配置保存到项目目录后 update 无须重复传入。首次和更新均新增 --period-start、--period-end，配合现有 --period 运行标识。新增可选 --replaces-run 指向同一逻辑周期的被修订运行。以上为拟新增接口，当前尚不可执行。

project-config.json 采用独立 schemaVersion=1，包含项目标识、名称、时区、字段映射、状态映射和可选健康规则。普通 report-profile 的指标方向和阈值继续复用；任务规则不混入其数值指标 schema。

项目与 manifest 增加可向后兼容的新版 schema 分支，记录 projectConfigHash、period.start/end/timezone、可选 replacesRunId。旧项目保留当前行为。跨项目或口径版本变化不可比较，明确标注需要新基线。

执行关系无循环：

```text
本地快照 + 项目配置 + 明确周期
  → 加载与语义校验 → 规范化任务快照
  → 项目确定性计算与 Evidence → 现有 spec 验证
  → 基线任务比较 → project-period-brief + review
  → 现有报告渲染与交付 → Run 存储及最新指针
```

领域计算产生包含可执行 recipe 的 Evidence，使用版本化 project-snapshot recipe，复用现有 Evidence id、路径解析和 provenance 校验。不要将逾期、状态集合或日期语义强行编码进现有简单聚合字符串；普通 query recipe 维持兼容。新增 recipe 的解析和执行同时接入 analyze 与 report update，保证可保存和重放。

结构化项目摘要独立保存为 project-period-brief.json，规范化快照为 project-snapshot.json。review 沿用 ready/needs_review/blocked 评审语义及现有运行状态，HTML 展示警告。ready 指系统规则与材料校验通过，不等同实际项目没有风险。

新增错误包括 PROJECT_FIELD_MAPPING_INVALID、PROJECT_DUPLICATE_TASK_ID、PROJECT_UNKNOWN_STATUS、PROJECT_DATE_INVALID、PROJECT_SNAPSHOT_INCONSISTENT、PROJECT_PERIOD_INVALID。返回字段、源行、原值及修复说明，保持 ok/value 与现有结构化错误格式。

## 8. 范围、实施切分与最小版本

最小可用版本为首期项目报告：单表快照、显式映射、当前状态、逾期和阻塞、里程碑和来源，不依赖跨期功能。随后独立提交跨期任务比较与修订支持，每次提交都可交付使用。

推荐首个试用版本包含上述两个提交；不加入多项目组合、预算/资源预测、远程连接、调度服务、协同审批或任意布局编辑。调度由用户既有代理或脚本调用 CLI，不作为生成器职责。

预计涉及超过八个源码/测试/文档文件。cli-report.ts 当前 482 行，先将 init/update/run 生命周期实现按责任拆分后再接入，避免超过 500 行。主要修改范围为 cli-report、report-project-types/storage、query-recipe、analyzer/context-schema、report-scene/template/block 注册，新增 project-config、project-snapshot、project-evidence、project-period-brief 与专用展示模块；更新源 skill 的报告参考文档。所有生成逻辑位于 CLI，不进入 web app。

工作量判断：这是领域输入、证据重放和跨期行为的中等规模扩展，并非仅添加报告模板。核心风险为用户能否持续导出具有稳定 task_id 的完整快照。若无法提供，仍可生成单期报告，但不得宣称可靠跨期任务变化。

依赖为仓库已有 Node/TypeScript、Zod、CSV/XLSX 读取与 HTML 渲染；无新增服务、账号或 API key。PDF 沿用现有 Playwright/Chromium，缺失时返回现有结构化导出错误，不阻碍 HTML 单独生成。

## 9. 验证和验收

实现时运行 npm run test:run、npm run build:cli、npm run check:size。烟测覆盖 data analyze → 项目 block/spec → spec validate --context --verify → render report → report init → 第二期 report update，核对项目 Evidence、摘要、review 和实际 HTML。

正常路径：同一配置两期快照；状态、逾期、完成事件与源表逐项一致；首次报告没有环比；HTML 与请求的 PDF 数字一致。

错误路径：必需字段缺失、重复 id、未知状态、非法日期、完成状态/日期冲突、配置 hash 被修改、重复运行 id、非法修订关系、导出环境缺失。

边界路径：无变化、零有效任务、全部取消、全部完成、无截止日、无负责人、无完成日期、截止当天、未来截止日、非默认时区、任务消失或重开、日期延期、历史补录、同周期修订、十倍任务量。相同材料与配置重算的事实结果一致，运行时间元数据除外。

人工验收：客户或管理者能在一分钟内找到本期变化、主要问题与责任人；每项数字和结论能追溯；报告没有把任务数量比例称为整体交付进度。用三组真实脱敏双期快照进行试用，观察是否连续两期使用及准备后一期是否少于十分钟；这些是试用目标，不是已验证结果。

只新增设计文档时运行 check:size。实施后再进行打包与试用交付，不自动发布。回滚只移除项目功能入口，保留旧报告路径和所有已生成快照/产物；新 schema 项目在旧 CLI 中明确提示版本不支持，不静默降级。原始源文件不会被修改。

## 10. 图示与实现接口补充

新增 Gantt 图表类型，label/end 为必需编码，start 为可选日期编码。项目正文按里程碑、阻塞和逾期优先最多展示 15 项；完整排期按阶段每 12 项一个打印块。缺开始日展示日期点，无截止日进入未排期表。首次基准快照冻结且校验 Hash，浅色条展示原计划，不推断实际持续时间。状态图复用横向条形图；里程碑展示日期与明确状态。燃尽、依赖、关键路径与预测不进入首版。

实际保存项目 schemaVersion=3、运行 manifest schemaVersion=4。project-config 当前包含身份、字段/状态映射和时区；健康规则未进入首版，报告展示事实。周期写入每期 manifest；项目专用命令参数见源 Skill 的 project-report.md。

本实现选择最近一个截止日早于本期开始日的成功基线，避免跨期完成描述混用重叠窗口。任务变更保留本期 Evidence 路径及上期 run 引用，报告来源附录同时保存比较快照和首次排期。首版项目配置与普通 numeric report-profile 不混用。

最终验证：Vitest 77 个文件、744 个测试通过；项目浏览器 E2E 2 个通过，涵盖手机、打印与真实 PDF 导出；build:cli、check:size 通过。三组双期样例已完成 analyze → instantiate → validate --verify → render → init → update 工作流。样例为合成材料，未声称完成真实团队试用。
