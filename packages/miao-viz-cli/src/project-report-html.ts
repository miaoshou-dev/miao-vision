import { escapeHtml as esc } from './svg-renderer-utils'
import { renderGanttChart, PROJECT_STATUS_LABELS } from './gantt-chart'
import { renderChartSvg } from './svg-renderer'
import { isOverdue, projectSummary, type ProjectSnapshot, type ProjectTask } from './project-snapshot'
import { buildProjectPeriodBrief, prioritizeTasks, type ProjectPeriodBrief } from './project-period-brief'

const text = (value: unknown) => esc(String(value ?? '未提供'))
const changeLabels: Record<string, string> = { added: '新增', missing: '本期缺失', completed: '相较上期新完成', reopened: '重新打开', status: '状态变化', due_date: '截止日调整', owner: '负责人变更', blocked: '新增阻塞', unblocked: '解除阻塞' }
const boardStatuses = ['todo', 'in_progress', 'blocked', 'done'] as const
function table(headers: string[], rows: unknown[][]): string {
  return rows.length ? `<div class="project-table-scroll"><table><thead><tr>${headers.map(h => `<th>${text(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(v => `<td>${text(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : '<p>暂无事项</p>'
}
export function renderProjectReportHtml(snapshot: ProjectSnapshot, brief: ProjectPeriodBrief = buildProjectPeriodBrief(snapshot), baselineTasks: ProjectTask[] = [], evidence?: unknown, comparisonSnapshot?: ProjectSnapshot | null): string {
  const base = new Map(baselineTasks.map(task => [task.task_id, task]))
  const withBase = (tasks: ProjectTask[]) => tasks.map(task => ({ ...task, baseline_start: base.get(task.task_id)?.start_date, baseline_end: base.get(task.task_id)?.due_date }))
  const gantt = (tasks: ProjectTask[]) => renderGanttChart({ type: 'gantt', title: '项目排期', style: { cutoff: snapshot.period.end } }, withBase(tasks))
  const dated = snapshot.tasks.filter(task => task.due_date), undated = snapshot.tasks.filter(task => !task.due_date)
  const groups = [...new Set(dated.map(task => task.stage))].sort()
  const full = groups.flatMap(group => {
    const tasks = dated.filter(task => task.stage === group).sort((a, b) => a.due_date!.localeCompare(b.due_date!) || a.task_id.localeCompare(b.task_id))
    return Array.from({ length: Math.ceil(tasks.length / 12) }, (_, i) => `<section class="project-schedule-page"><h3>${text(group)} · ${i + 1}</h3>${gantt(tasks.slice(i * 12, (i + 1) * 12))}</section>`)
  }).join('')
  const metrics = projectSummary(snapshot), labels: Record<string, string> = { active: '有效任务', completion_ratio: '任务完成比例', overdue: '逾期任务', blocked: '阻塞任务' }
  const cards = Object.keys(labels).map(key => `<div class="project-kpi"><span>${labels[key]}</span><strong>${metrics[key] === null ? '不可用' : key === 'completion_ratio' ? `${(metrics[key]! * 100).toFixed(1)}%` : metrics[key]}</strong><small>来源：project_summary.values.${key}</small></div>`).join('')
  const states = Object.keys(PROJECT_STATUS_LABELS).map(status => ({ status: PROJECT_STATUS_LABELS[status], count: snapshot.tasks.filter(task => task.status === status).length }))
  const distribution = renderChartSvg({ type: 'bar', variant: 'horizontal', encoding: { x: { field: 'status' }, y: { field: 'count' } } }, states)
  const milestones = snapshot.tasks.filter(task => task.is_milestone).sort((a, b) => (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999'))
  const problems = snapshot.tasks.filter(task => task.status === 'blocked' || isOverdue(task, snapshot.period.end))
  const actions = snapshot.tasks.filter(task => !['done', 'cancelled'].includes(task.status))
  const completed = snapshot.tasks.filter(task => task.status === 'done' && task.completed_at && task.completed_at >= snapshot.period.start)
  const changesByTask = new Map<string, string[]>()
  for (const change of brief.changes) {
    const labels = changesByTask.get(change.taskId) ?? []
    labels.push(changeLabels[change.kind] ?? '有变化')
    changesByTask.set(change.taskId, labels)
  }
  const taskCard = (task: ProjectTask) => {
    const overdue = isOverdue(task, snapshot.period.end)
    const change = changesByTask.get(task.task_id)?.join('、')
    return `<article class="kanban-task"><div class="kanban-task-heading"><span class="kanban-id">${text(task.task_id)}</span>${task.is_milestone ? '<span class="kanban-milestone">里程碑</span>' : ''}</div><div class="kanban-title">${text(task.title)}</div>${task.status === 'blocked' ? `<div class="kanban-blocker">阻塞：${text(task.blocker ?? '原因未提供')}</div>` : ''}${change ? `<div class="kanban-change">↗ ${text(change)}</div>` : ''}<div class="kanban-meta"><span class="${overdue ? 'kanban-overdue' : ''}">${task.due_date ? `${overdue ? '逾期 · ' : '截止 · '}${text(task.due_date)}` : '未设截止日'}</span><span class="kanban-owner">${text(task.owner ?? '未分配')}</span></div></article>`
  }
  const kanbanColumns = boardStatuses.map(status => {
    const tasks = snapshot.tasks.filter(task => task.status === status)
    const visible = status === 'done' ? tasks.slice(0, 6) : tasks
    const rest = tasks.slice(visible.length)
    const cardsHtml = visible.map(taskCard).join('') || '<p class="kanban-empty">暂无任务</p>'
    return `<section class="kanban-column kanban-${status}"><h3><i></i>${text(PROJECT_STATUS_LABELS[status])}<span class="kanban-count">${tasks.length}</span></h3><div class="kanban-cards">${cardsHtml}</div>${rest.length ? `<details class="kanban-more"><summary>查看其余 ${rest.length} 项</summary><div class="kanban-cards">${rest.map(taskCard).join('')}</div></details>` : ''}</section>`
  }).join('')
  const summary = [ `本期按完成日期确认完成 ${metrics.completed_in_period} 项。`, brief.baselineRunId ? `与 ${brief.baselineRunId} 比较，识别 ${brief.changes.length} 项任务变化。` : '首期报告，尚无跨期比较基线。', `${metrics.blocked} 项阻塞；逾期${metrics.overdue === null ? '判断不可用' : ` ${metrics.overdue} 项`}。` ]
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${text(snapshot.config.name)} · 项目报告</title><style>
  *{box-sizing:border-box}body{margin:0;background:#f1f5f9;color:#172033;font:15px/1.6 system-ui}main{max-width:1320px;margin:32px auto;padding:36px;background:white}h1{font-size:32px;line-height:1.2}h2{margin-top:36px;border-bottom:1px solid #cbd5e1;padding-bottom:8px}h3{font-size:16px}.project-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}.project-kpi{border:1px solid #e2e8f0;padding:16px}.project-kpi span,.project-kpi small{display:block}.project-kpi strong{font-size:28px}.project-kpi small{font-size:10px;color:#475569;overflow-wrap:anywhere}table{border-collapse:collapse;width:100%;font-size:13px}th,td{text-align:left;border-bottom:1px solid #e2e8f0;padding:9px;overflow-wrap:anywhere}th{background:#f8fafc}.project-table-scroll,.project-gantt-scroll{overflow-x:auto}small,.method{color:#475569}.review{border-left:4px solid #b45309;padding:12px;background:#fffbeb}.source{white-space:pre-wrap;overflow-wrap:anywhere;font-size:11px}summary{cursor:pointer;font-weight:600}.project-distribution svg{max-width:100%;height:auto}.project-kanban{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;align-items:start}.kanban-column{min-width:0;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:9px}.kanban-column>h3{display:flex;align-items:center;gap:7px;margin:0 0 8px;font-size:13px}.kanban-column>h3 i{width:8px;height:8px;border-radius:50%;background:#94a3b8}.kanban-in_progress>h3 i{background:#3b82f6}.kanban-blocked>h3 i{background:#dc5656}.kanban-done>h3 i{background:#36a269}.kanban-count{color:#64748b;font-size:11px;font-weight:400}.kanban-cards{display:grid;gap:7px}.kanban-task{background:white;border:1px solid #e2e8f0;border-radius:5px;padding:9px;font-size:11px;break-inside:avoid}.kanban-task-heading,.kanban-meta{display:flex;align-items:center;gap:7px}.kanban-id,.kanban-meta{color:#64748b;font-size:10px}.kanban-milestone{color:#7256c7;background:#eee9ff;padding:1px 5px;border-radius:3px;font-size:9px}.kanban-title{font-weight:600;margin:5px 0 8px;line-height:1.45}.kanban-meta{justify-content:space-between;border-top:1px solid #edf0f4;padding-top:6px}.kanban-owner{max-width:48%;overflow-wrap:anywhere;text-align:right}.kanban-overdue{color:#c93636;font-weight:600}.kanban-blocker{color:#b52f37;background:#fff0f0;padding:4px 6px;margin-bottom:7px;border-radius:3px;font-size:10px}.kanban-change{color:#6752b6;font-size:10px;margin-bottom:6px}.kanban-empty{color:#64748b;font-size:11px;padding:5px}.kanban-more{margin-top:8px;color:#475569;font-size:10px}.kanban-more summary{padding:4px}
  @media(max-width:900px){.project-kanban{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:640px){main{margin:0;padding:18px}.project-kpis{grid-template-columns:repeat(2,1fr)}.project-gantt{min-width:850px}.project-kanban{grid-template-columns:1fr}h1{font-size:26px}}
  @media print{@page{size:A4 landscape;margin:12mm}body{background:white}main{margin:0;padding:0;max-width:none}.project-schedule-page{break-inside:avoid;break-before:page}.project-kpis{break-inside:avoid}thead{display:table-header-group}tr{break-inside:avoid}details>summary{display:none}details>*{display:block!important}.project-technical{display:none!important}.project-gantt{min-width:0!important;max-width:100%;height:auto}.project-table-scroll,.project-gantt-scroll{overflow:visible}.project-kanban{grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}.kanban-column{padding:6px}.kanban-task{padding:6px;font-size:9px}*{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
  </style></head><body><main><header><p>项目周期报告 · ${brief.status === 'ready' ? '材料校验通过' : '需要复核'}</p><h1>${text(snapshot.config.name)}</h1><p>${text(snapshot.period.start)} — ${text(snapshot.period.end)} · ${text(snapshot.config.timezone)}</p></header>
  <section><h2>本期摘要</h2><ul>${summary.map(item => `<li>${text(item)}</li>`).join('')}</ul><div class="project-kpis">${cards}</div><p class="method">任务完成比例按有效任务数量计算，不代表整个项目交付进度；取消项排除。</p>${brief.warnings.length ? `<aside class="review"><b>需要复核</b><ul>${brief.warnings.map(w => `<li>${text(w.message)}</li>`).join('')}</ul></aside>` : ''}</section>
  <section><h2>排期与里程碑</h2>${gantt(prioritizeTasks(dated, snapshot.period.end))}<p class="method">正文最多 15 项，优先展示里程碑、阻塞与逾期。浅色条为首次基准计划，日期点表示仅提供截止日。</p><details><summary>完整排期 · ${dated.length} 项</summary>${full}</details>
  <h3>里程碑</h3>${table(['里程碑', '截止日', '状态', '负责人'], milestones.map(task => [task.title, task.due_date, task.status === 'done' ? '已完成（不等同客户验收）' : isOverdue(task, snapshot.period.end) ? '逾期' : '待完成', task.owner]))}<h3>未排期</h3>${table(['任务', '负责人', '状态'], undated.map(task => [task.title, task.owner, PROJECT_STATUS_LABELS[task.status]]))}</section>
  <section><h2>敏捷看板</h2><div class="project-kanban">${kanbanColumns}</div><p class="method">按当前任务状态分列；逾期按报告截止日计算，完成列默认显示 6 项。取消任务单独排除。</p></section>
  <section><h2>状态与本期变化</h2><div class="project-distribution">${distribution}</div><h3>按日期确认的本期完成</h3>${table(['任务', '完成日期', '负责人'], completed.map(task => [task.title, task.completed_at, task.owner]))}<h3>跨期变化</h3>${brief.baselineRunId ? table(['任务', '变化', '上期', '本期'], brief.changes.map(change => [change.title, changeLabels[change.kind], PROJECT_STATUS_LABELS[change.previous ?? ''] ?? change.previous, PROJECT_STATUS_LABELS[change.current ?? ''] ?? change.current])) : '<p>首期报告，尚无跨期比较。</p>'}</section>
  <section><h2>问题与下期行动</h2>${table(['任务', '问题', '负责人', '截止日'], problems.map(task => [task.title, task.status === 'blocked' ? task.blocker ?? '阻塞原因未提供' : '逾期', task.owner, task.due_date]))}<h3>行动清单</h3>${table(['任务', '明确行动', '负责人', '行动截止日'], actions.map(task => [task.title, task.next_action ?? '待补充', task.owner, task.action_due_date]))}</section>
  <details><summary>证据与方法</summary><p>截止日之前仍未完成的任务计为逾期，截止当天不计逾期。完成日期缺失仅表示状态完成。来源行从表头后的第 2 行计数。</p><h3>来源定位</h3><p>本期指标：project_summary.values；任务：project_tasks.rows（按源表顺序）。状态数量：project_states.rows。比较基线：${text(brief.baselineRunId ?? '无')}。任务数量比例不使用估计工时。</p>${table(['任务 ID', '来源行', '任务', '状态', '截止日'], snapshot.tasks.map(task => [task.task_id, task.sourceRow, task.title, PROJECT_STATUS_LABELS[task.status], task.due_date]))}${comparisonSnapshot ? `<h3>比较基线来源</h3>${table(['任务 ID', '来源行', '任务', '状态', '截止日'], comparisonSnapshot.tasks.map(task => [task.task_id, task.sourceRow, task.title, PROJECT_STATUS_LABELS[task.status], task.due_date]))}` : ''}<div class="source project-technical">${text(JSON.stringify({ evidence: evidence ?? { project_summary: metrics, project_tasks: snapshot.tasks }, changes: brief.changes, baselineSchedule: baselineTasks, comparisonSnapshot, fields: snapshot.config.fields }, null, 2))}</div></details></main><script>
  const printMedia=window.matchMedia('print');
  const savedOpen=new Map();
  function applyPrint(){document.querySelectorAll('details').forEach(el=>{if(printMedia.matches){savedOpen.set(el,el.open);el.open=true}else if(savedOpen.has(el)){el.open=savedOpen.get(el);savedOpen.delete(el)}})}
  printMedia.addEventListener('change',applyPrint);applyPrint();
  document.documentElement.dataset.miaoRenderReady='true';
  </script></body></html>`
}
