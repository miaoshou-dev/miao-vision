export const reviewUiRuntime = String.raw`
const $ = id => document.getElementById(id);
const ui = { runs: [], currentId: '', baseId: '', targetId: '', moduleId: '', intent: 'conclusion', signature: null, language: localStorage.getItem('miao-review-language') === 'en' ? 'en' : 'zh' };
const messages = {
  zh: { chooseArtifact:'选择交付物', exportCurrent:'导出当前版本 ▾', exportPreparing:'正在生成导出文件…', exportFailed:'导出失败', exportEmpty:'当前版本暂无可导出的格式', exportPptx:'PPTX · 图片式', slide:'幻灯片', slideTitle:'页标题', slideClaim:'核心主张', deckHint:'选择右侧幻灯片、页标题、核心主张或图表，预览会切换到对应页。', deckGuideEdit:'打开“局部修改”，选幻灯片、页标题、核心主张或图表。预览会跳到对应页，编辑请求后复制给 Agent。', guideExportTitle:'导出当前版本', guideExportBody:'选中左侧版本后，使用右上角导出菜单下载该版本支持的格式。', guideOpen:'使用指南', guideClose:'关闭指南', guideEyebrow:'快速上手', guideTitle:'从查看版本到发起修改', guideCompareTitle:'比较版本', guideCompareBody:'左侧选版本，再用 A / B 选择要比较的两版。查看产物预览和下方的变化详情。', guideEditTitle:'修改一个模块', guideEditBody:'打开“局部修改”，选标题、图表或洞察。预览会定位并高亮，选好意图后编辑请求并复制给 Agent。', guideNote:'复制请求不会直接改文件。Agent 修改 Spec、验证并渲染后，新产物会显示为子版本。', mainFeatures:'主要功能', editableRequest:'可编辑修改请求', project:'当前产物', history:'版本记录', localReview:'● 本地审稿', localNote:'版本、Spec 与成品保存在本机。快速修改会生成给 Agent 的请求，Viewer 不直接改动文件。', intro:'查看每次修订的变化，或选中一个模块提出下一次修改。', openCurrent:'预览当前版本 ↗', compareTab:'版本比较', editTab:'局部修改', changeDetails:'变化详情', previewNote:'预览显示已渲染的真实 HTML 产物。', currentModules:'当前版本 · 可选中的模块', selectHint:'点击报告标题或右侧模块列表，生成限定范围的修改请求。', highlightHint:'高亮只用于选中目标，实际修改仍需经过 Spec 验证。', editThis:'修改这一块', scopeHint:'只携带目标模块、原值和必要证据，减少 Agent 读取范围。', targetModule:'目标模块', editIntent:'修改意图', agentRequest:'发送给 Agent 的请求，可编辑', scopedRevision:'限定模块 · 验证后生成子版本', copyRequest:'复制修改请求', baseline:'基准 A', comparison:'对比 B', swapVersions:'交换比较版本', conclusion:'突出结论', shorter:'更简洁', custom:'自定义要求', initial:'初版', revision:'修订', verified:'已验证', localFile:'本地文件', verifiedEvidence:'✓ 证据已验证', pendingEvidence:'○ 证据待验证', noPreview:'此版本还没有可预览的产物。', none:'无', unchanged:'未变化', modified:'已修改', uncertain:'待确认', title:'主标题', theme:'主题', chart:'图表', insight:'洞察', evidence:'证据', data:'数据', specChanged:'内容已变，当前模块摘要没有更细的定位', fingerprintSame:'数据指纹一致', fingerprintChanged:'数据指纹发生变化', fingerprintMissing:'缺少数据指纹', changesFound:n=>'发现 '+n+' 处模块变化', changesCount:n=>n+' 处变化', changesUnknown:'Spec 已变，模块变化待定位', noChanges:'两个版本没有检测到模块变化', bothVerified:'两个版本的证据检查均已通过。下方显示模块变化和真实产物。', needsReview:'至少一个版本未通过完整证据检查。', dataSame:'数据未变', dataChanged:'数据已变', dataUnknown:'数据未知', evidenceVerified:'证据已验证', evidencePending:'证据待复核', compareUnavailable:'比较暂不可用', compareFailed:'无法比较这两个版本', awaitingArtifact:'等待产物渲染完成', noModules:'这个版本暂无可定位的模块。', reportTitle:'主标题', sourceSpec:'源 Spec', artifactPath:'产物路径', locateSpec:'请先定位源 Spec。', targetPath:'目标路径', currentContent:'当前内容', evidenceIds:'相关证据 ID', promptConclusion:'突出已经验证的主要结论，不引入新数字。', promptShorter:'缩短文字并保留原意。', promptCustom:'请在这里写下具体修改要求。', promptEnd:'只修改这个模块，保留数据与其他已验证内容。验证后渲染为该版本的子版本。', readFailed:'无法读取版本记录', firstArtifact:'等待第一个产物', noHistory:'还没有版本记录', startWorkflow:'运行 Miao Vision 工作流后，版本和产物会出现在这里。', disconnected:'Viewer 连接中断', noArtifact:'产物还未生成', chooseModule:'请先选择可修改的模块', copied:'修改请求已复制', copyManually:'请手动复制选中的文字', versionCount:n=>n+' 个版本' },
  en: { chooseArtifact:'Choose artifact', exportCurrent:'Export version ▾', exportPreparing:'Preparing export…', exportFailed:'Export failed', exportEmpty:'No export format for this version', exportPptx:'PPTX · image slides', slide:'Slide', slideTitle:'Slide title', slideClaim:'Key claim', deckHint:'Select a slide, slide title, key claim, or chart on the right to jump to that page.', deckGuideEdit:'Open Edit a module and select a slide, slide title, key claim, or chart. The preview jumps to that page. Edit the request and copy it for your agent.', guideExportTitle:'Export a version', guideExportBody:'Select a version on the left, then use the export menu to download its available formats.', guideOpen:'How to use', guideClose:'Close guide', guideEyebrow:'QUICK START', guideTitle:'From review to revision', guideCompareTitle:'Compare versions', guideCompareBody:'Choose a version on the left, then select A and B. Review both artifacts and the changes below.', guideEditTitle:'Edit one module', guideEditBody:'Open Edit a module and select a title, chart, or insight. The preview locates it. Choose an intent, edit the request, and copy it for your agent.', guideNote:'Copying a request does not change files. After your agent edits the Spec, validates, and renders it, the result appears as a child version.', mainFeatures:'Main features', editableRequest:'Editable change request', project:'Current artifact', history:'Version history', localReview:'● Local review', localNote:'Versions, Specs, and artifacts stay on this computer. Quick edits create a request for your agent; the Viewer does not edit files.', intro:'Compare revisions or select a module for the next change.', openCurrent:'Open current version ↗', compareTab:'Compare versions', editTab:'Edit a module', changeDetails:'Change details', previewNote:'Previews show the rendered HTML artifacts.', currentModules:'Current version · Select a module', selectHint:'Select a report title or a module on the right to create a scoped request.', highlightHint:'Highlighting only selects a target. Changes still require Spec validation.', editThis:'Edit this module', scopeHint:'Include only the target, current value, and necessary evidence to reduce agent context.', targetModule:'Target module', editIntent:'Edit intent', agentRequest:'Request for your agent, editable', scopedRevision:'Scoped edit · Validate and create a child version', copyRequest:'Copy request', baseline:'Baseline A', comparison:'Compare B', swapVersions:'Swap versions', conclusion:'Highlight conclusion', shorter:'Make concise', custom:'Custom request', initial:'Initial', revision:'Revision', verified:'Verified', localFile:'Local file', verifiedEvidence:'✓ Evidence verified', pendingEvidence:'○ Evidence pending', noPreview:'No artifact is available for this version yet.', none:'None', unchanged:'Unchanged', modified:'Modified', uncertain:'Uncertain', title:'Main title', theme:'Theme', chart:'Chart', insight:'Insight', evidence:'Evidence', data:'Data', specChanged:'Spec changed, but the module summary cannot pinpoint it', fingerprintSame:'Data fingerprints match', fingerprintChanged:'Data fingerprint changed', fingerprintMissing:'Data fingerprint unavailable', changesFound:n=>n+' module change'+(n===1?'':'s')+' found', changesCount:n=>n+' change'+(n===1?'':'s'), changesUnknown:'Spec changed; module changes need inspection', noChanges:'No module changes detected between these versions', bothVerified:'Evidence checks passed for both versions. Module changes and artifacts appear below.', needsReview:'At least one version has not passed all evidence checks.', dataSame:'Data unchanged', dataChanged:'Data changed', dataUnknown:'Data unknown', evidenceVerified:'Evidence verified', evidencePending:'Evidence needs review', compareUnavailable:'Comparison unavailable', compareFailed:'Could not compare these versions', awaitingArtifact:'Waiting for the artifact to render', noModules:'No addressable modules are available for this version.', reportTitle:'Main title', sourceSpec:'Source Spec', artifactPath:'Artifact path', locateSpec:'Locate its source Spec first.', targetPath:'Target path', currentContent:'Current content', evidenceIds:'Related evidence IDs', promptConclusion:'Emphasize the main verified conclusion without adding new figures.', promptShorter:'Make the text shorter while preserving its meaning.', promptCustom:'Describe the exact change here.', promptEnd:'Change only this module. Preserve the data and other verified content. Validate, then render a child version of this run.', readFailed:'Could not load version history', firstArtifact:'Waiting for the first artifact', noHistory:'No versions yet', startWorkflow:'Run a Miao Vision workflow to see versions and artifacts here.', disconnected:'Viewer connection lost', noArtifact:'The artifact has not been generated yet', chooseModule:'Select a module first', copied:'Request copied', copyManually:'Select the text and copy it manually', versionCount:n=>n+' version'+(n===1?'':'s') }
};
const t = key => messages[ui.language][key];
function applyLanguage() {
  document.documentElement.lang = ui.language === 'en' ? 'en' : 'zh-CN';
  document.querySelectorAll('[data-i18n]').forEach(node => { node.textContent = t(node.dataset.i18n); });
  document.querySelectorAll('[data-i18n-aria]').forEach(node => node.setAttribute('aria-label', t(node.dataset.i18nAria)));
  document.querySelectorAll('[data-i18n-title]').forEach(node => node.title = t(node.dataset.i18nTitle));
  document.querySelectorAll('#intents .chip').forEach(node => { node.textContent = t(node.dataset.intent); node.classList.toggle('active', node.dataset.intent === ui.intent); });
  $('languageToggle').textContent = ui.language === 'en' ? '中文' : 'English';
  $('languageToggle').setAttribute('aria-label', ui.language === 'en' ? '切换到中文' : 'Switch to English');
}
const current = () => ui.runs.find(run => run.runId === ui.currentId);
function family() {
  let run = current(); if (!run) return [];
  const visited = new Set();
  while (run.parentRunId && !visited.has(run.runId)) {
    visited.add(run.runId);
    const parent = ui.runs.find(item => item.runId === run.parentRunId);
    if (!parent) break;
    run = parent;
  }
  const ids = new Set([run.runId]);
  let changed = true;
  while (changed) { changed = false; for (const item of ui.runs) if (item.parentRunId && ids.has(item.parentRunId) && !ids.has(item.runId)) { ids.add(item.runId); changed = true; } }
  return ui.runs.filter(item => ids.has(item.runId)).reverse();
}
const label = run => run?.artifact?.composition?.title?.title || run?.title || 'Untitled artifact';
const short = value => value && value.length > 27 ? value.slice(0, 20) + '…' : value;
const date = run => new Date(run.startedAt).toLocaleString((ui.language === 'en' ? 'en-US' : 'zh-CN'), { month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit' });
const artifactUrl = run => '/artifacts/' + encodeURIComponent(run.runId) + '/primary';
function setText(id, value) { document.getElementById(id).textContent = value; }
function toast(message) { const node = $('toast'); node.textContent = message; node.classList.add('show'); clearTimeout(ui.toastTimer); ui.toastTimer = setTimeout(() => node.classList.remove('show'), 2200); }
function preview(id, run) {
  const host = $(id);
  if (!run?.artifact) { host.textContent = t('noPreview'); return; }
  const url = artifactUrl(run), existing = host.querySelector('iframe');
  if (existing?.getAttribute('src') === url) return existing;
  host.replaceChildren();
  const frame = document.createElement('iframe'); frame.className = 'real-report' + (run.kind === 'deck' ? ' deck-preview' : ''); frame.title = label(run); frame.src = url;
  if (run.kind === 'deck') frame.addEventListener('load', () => { try {
    const style = frame.contentDocument.createElement('style'); style.textContent = '.slide-canvas{flex-shrink:0!important}'; frame.contentDocument.head.appendChild(style);
  } catch { /* A cross-origin artifact cannot be restyled inside the preview. */ } });
  frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups'); host.appendChild(frame); return frame;
}
function renderVersions() {
  const runs = family(), list = $('versionList'); list.replaceChildren();
  const rootId = run => { const seen = new Set(); while (run?.parentRunId && !seen.has(run.runId)) { seen.add(run.runId); run = ui.runs.find(item => item.runId === run.parentRunId) || run; if (seen.has(run.runId)) break; } return run?.runId; };
  const picker = $('artifactSelect'), roots = new Set(); picker.replaceChildren();
  for (const run of ui.runs) {
    const id = rootId(run); if (!id || roots.has(id)) continue; roots.add(id);
    const option = document.createElement('option'); option.value = id;
    option.textContent = (run.kind === 'deck' ? 'Deck' : run.kind === 'report' ? 'Report' : 'Article') + ' · ' + short(label(run));
    picker.appendChild(option);
  }
  picker.value = rootId(current()) || '';
  picker.onchange = () => { const next = ui.runs.find(item => rootId(item) === picker.value); if (!next) return; ui.currentId = next.runId; ui.targetId = next.runId; ui.baseId = next.parentRunId || next.runId; ui.moduleId = ''; renderAll(); };
  runs.forEach((run, index) => {
    const button = document.createElement('button'); button.className = 'version' + (run.runId === ui.currentId ? ' selected' : '');
    const node = document.createElement('span'); node.className = 'node';
    const body = document.createElement('span'); const title = document.createElement('strong'); title.textContent = 'v' + (index + 1) + ' · ' + short(label(run));
    const meta = document.createElement('small'); meta.textContent = date(run) + ' · ' + (run.artifact?.verified ? t('verified') : run.status);
    const tag = document.createElement('span'); tag.className = 'tag'; tag.textContent = run.parentRunId ? t('revision') : t('initial');
    body.append(title, meta); button.append(node, body, tag);
    button.onclick = () => { ui.currentId = run.runId; ui.targetId = run.runId; ui.baseId = runs.find(item => item.runId === run.parentRunId)?.runId || runs.find(item => item.runId !== run.runId)?.runId || run.runId; ui.moduleId = ''; renderAll(); };
    list.appendChild(button);
  });
  setText('versionCount', t('versionCount')(runs.length));
  document.querySelector('.project b').textContent = label(runs[0] || current());
  document.querySelector('.project small').textContent = current()?.kind.toUpperCase() + ' · ' + t('localFile');
  document.querySelector('.top h1').textContent = label(runs[0] || current());
  document.querySelector('.kicker').textContent = 'Artifact review / ' + (current()?.kind ?? 'report');
  document.querySelector('[data-i18n="guideEditBody"]').textContent = current()?.kind === 'deck' ? t('deckGuideEdit') : t('guideEditBody');
  document.querySelector('.pill').textContent = current()?.artifact?.verified ? t('verifiedEvidence') : t('pendingEvidence');
}
function renderSelects() {
  const runs = family();
  for (const [id, selected] of [['baseVersion', ui.baseId], ['targetVersion', ui.targetId]]) {
    const control = $(id); control.replaceChildren();
    runs.forEach((run, index) => { const option = document.createElement('option'); option.value = run.runId; option.textContent = 'v' + (index + 1) + ' · ' + (run.parentRunId ? t('revision') : t('initial')); control.appendChild(option); });
    control.value = selected;
  }
}
function diffRow(name, before, after, type) {
  const row = document.createElement('div'); row.className = 'diff-row';
  const heading = document.createElement('strong'); heading.textContent = name;
  const content = document.createElement('span');
  if (type === 'changed') {
    const old = document.createElement('span'); old.className = 'before'; old.textContent = before || t('none');
    const arrow = document.createElement('span'); arrow.className = 'arrow'; arrow.textContent = '→';
    const next = document.createElement('span'); next.className = 'after'; next.textContent = after || t('none');
    content.append(old, arrow, next);
  } else { content.className = 'muted'; content.textContent = after; }
  const badge = document.createElement('span'); badge.className = 'badge' + (type === 'same' ? ' same' : '');
  badge.textContent = type === 'same' ? t('unchanged') : type === 'changed' ? t('modified') : t('uncertain');
  row.append(heading, content, badge); return row;
}
async function renderComparison() {
  const a = ui.runs.find(run => run.runId === ui.baseId), b = ui.runs.find(run => run.runId === ui.targetId);
  renderSelects(); if (!a || !b) return;
  setText('leftLabel', short(label(a))); setText('rightLabel', short(label(b)));
  setText('leftMeta', date(a) + ' · ' + a.runId); setText('rightMeta', date(b) + ' · ' + b.runId);
  preview('leftReport', a); preview('rightReport', b);
  try {
    const response = await fetch('/api/compare?before=' + encodeURIComponent(a.runId) + '&after=' + encodeURIComponent(b.runId));
    if (!response.ok) throw Error(t('compareFailed'));
    const body = await response.json(); if (ui.baseId !== a.runId || ui.targetId !== b.runId) return;
    const change = body.value.changes, list = $('diffRows'); list.replaceChildren(); let count = 0;
    if (change.title?.changed) { list.appendChild(diffRow(t('title'), change.title.before, change.title.after, 'changed')); count++; }
    if (change.theme?.changed) { list.appendChild(diffRow(t('theme'), change.theme.before, change.theme.after, 'changed')); count++; }
    for (const [kind, name] of [['slides',t('slide')], ['charts',t('chart')], ['insights',t('insight')], ['evidence',t('evidence')]]) {
      const group = change[kind];
      const slideLabel = (run, id) => { const item = run.artifact?.composition?.slides?.find(slide => slide.id === id); return item ? t('slide') + ' ' + (item.slideIndex + 1) + ' · ' + (item.title || id) : id; };
      const append = (id, before, after) => {
        const row = diffRow(name, before, after, 'changed');
        if (kind === 'slides') {
          const slide = b.artifact?.composition?.slides?.find(item => item.id === id) || a.artifact?.composition?.slides?.find(item => item.id === id);
          if (slide) { row.classList.add('navigable'); row.tabIndex = 0; row.setAttribute('role', 'button'); row.setAttribute('aria-label', t('slide') + ' ' + (slide.slideIndex + 1)); row.onclick = () => { for (const [frameId, run] of [['leftReport',a],['rightReport',b]]) { const frame = $(frameId).querySelector('iframe'); if (frame) focusReportTarget(frame, { kind:'slide', slideIndex:slide.slideIndex }, false, run); } }; row.onkeydown = event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); row.click(); } }; }
        }
        list.appendChild(row); count++;
      };
      for (const id of group?.added || []) append(id, t('none'), kind === 'slides' ? slideLabel(b, id) : id);
      for (const id of group?.removed || []) append(id, kind === 'slides' ? slideLabel(a, id) : id, t('none'));
      for (const id of group?.modified || []) append(id, kind === 'slides' ? slideLabel(a, id) : id, kind === 'slides' ? slideLabel(b, id) : id + ' (' + t('revision') + ')');
    }
    if (change.specChanged && !count) list.appendChild(diffRow('Spec', '', t('specChanged'), 'unknown'));
    const data = a.artifact?.fingerprints?.dataFingerprint && b.artifact?.fingerprints?.dataFingerprint;
    const same = data && a.artifact.fingerprints.dataFingerprint === b.artifact.fingerprints.dataFingerprint;
    list.appendChild(diffRow(t('data'), '', data ? (same ? t('fingerprintSame') : t('fingerprintChanged')) : t('fingerprintMissing'), same ? 'same' : 'unknown'));
    setText('summaryTitle', count ? t('changesFound')(count) : change.specChanged ? t('changesUnknown') : t('noChanges'));
    setText('summaryDetail', a.artifact?.verified && b.artifact?.verified ? t('bothVerified') : t('needsReview'));
    setText('dataSignal', same ? t('dataSame') : data ? t('dataChanged') : t('dataUnknown'));
    setText('changeSignal', t('changesCount')(count));
    $('evidenceSignal').textContent = a.artifact?.verified && b.artifact?.verified ? t('evidenceVerified') : t('evidencePending');
  } catch (error) { setText('summaryTitle', t('compareUnavailable')); setText('summaryDetail', error.message); }
}
const intents = { conclusion:'promptConclusion', shorter:'promptShorter', custom:'promptCustom' };
function promptFor(run, item) {
  const kind = item.kind === 'title' ? t('reportTitle') : t(item.kind);
  const source = run.artifact?.composition?.sourceSpecPath ? t('sourceSpec') + ': ' + JSON.stringify(run.artifact.composition.sourceSpecPath) + '. ' : t('artifactPath') + ': ' + JSON.stringify(run.artifact?.primaryPath) + '. ' + t('locateSpec') + ' ';
  const evidence = item.evidenceIds?.length ? t('evidenceIds') + ': ' + item.evidenceIds.join(', ') + '. ' : '';
  if (ui.language === 'en') return 'Revise the ' + kind + ' in Miao Vision ' + run.kind + ' run ' + run.runId + '. ' + source + t('targetPath') + ': ' + item.path + '. ' + t('currentContent') + ': ' + JSON.stringify(item.title || item.id) + '. ' + t(intents[ui.intent]) + ' ' + evidence + t('promptEnd');
  return '修改 Miao Vision ' + run.kind + ' 版本 ' + run.runId + ' 的' + kind + '。' + source + t('targetPath') + ': ' + item.path + '。' + t('currentContent') + ': ' + JSON.stringify(item.title || item.id) + '。' + t(intents[ui.intent]) + evidence + t('promptEnd');
}
function reportTarget(doc, item, run) {
  if (run.kind === 'deck') {
    const slideIndex = item.kind === 'title' ? 0 : item.slideIndex;
    const slides = [...doc.querySelectorAll('.slide')], slide = slides[slideIndex];
    if (!slide) return null;
    const active = slides.findIndex(node => node.classList.contains('active'));
    const direction = slideIndex >= active ? '#btn-next' : '#btn-prev';
    for (let i = 0; i < Math.abs(slideIndex - active); i++) doc.querySelector(direction)?.click();
    if (item.kind === 'chart') return [...slide.querySelectorAll('[data-miao-chart]')].find(node => node.getAttribute('data-miao-chart') === item.id) || slide.querySelector('[data-chart-index="' + item.chartIndex + '"]') || slide;
    if (item.kind === 'slideTitle' || item.kind === 'title') return slide.querySelector('h1,.slide-title') || slide;
    if (item.kind === 'slideClaim') return slide.querySelector('.slide-claim') || slide;
    return slide;
  }
  if (item.kind === 'title') return doc.querySelector('h1');
  if (item.kind === 'chart') {
    const charts = [...doc.querySelectorAll('[data-miao-chart]')];
    return charts.find(node => node.getAttribute('data-miao-chart') === item.id) || charts[Number(/charts\[(\d+)\]/.exec(item.path)?.[1])];
  }
  if (item.kind === 'insight') return doc.querySelectorAll('.insights-list li')[Number(/insights\[(\d+)\]/.exec(item.path)?.[1])];
  return null;
}
function focusReportTarget(frame, item, scroll, run) {
  try {
    const doc = frame.contentDocument; if (!doc?.body) return;
    let style = doc.getElementById('miao-review-selection-style');
    if (!style) { style = doc.createElement('style'); style.id = 'miao-review-selection-style'; style.textContent = '[data-miao-review-selected]{outline:3px solid #176a69!important;outline-offset:5px!important;box-shadow:0 0 0 9px #e2f0ebbb!important;border-radius:4px;scroll-margin:24px}'; doc.head.appendChild(style); }
    const heading = run.kind === 'report' ? doc.querySelector('h1') : null;
    if (heading && !heading.dataset.miaoReviewClick) { heading.dataset.miaoReviewClick = 'true'; heading.style.cursor = 'pointer'; heading.addEventListener('click', () => { ui.moduleId = 'title:title'; renderEdit(); }); }
    doc.querySelectorAll('[data-miao-review-selected]').forEach(node => node.removeAttribute('data-miao-review-selected'));
    const target = reportTarget(doc, item, run); if (!target) return;
    target.setAttribute('data-miao-review-selected', '');
    if (scroll) { frame.scrollIntoView({ behavior:'smooth', block:'center' }); target.scrollIntoView({ behavior:'smooth', block:'center' }); }
  } catch { /* A cross-origin artifact cannot be inspected inside the preview. */ }
}
async function renderEdit(scrollToTarget = false) {
  const run = current(), targets = $('targets'); targets.replaceChildren();
  if (!run?.artifact) { $('editReport').textContent = t('awaitingArtifact'); $('prompt').value = ''; return; }
  preview('editReport', run);
  $('selectHint').textContent = run.kind === 'deck' ? t('deckHint') : t('selectHint');
  let items = [];
  try { const response = await fetch('/api/runs/' + encodeURIComponent(run.runId) + '/spec-map'); const body = await response.json(); items = (body.value?.items || []).filter(item => (run.kind === 'deck' ? ['slide','slideTitle','slideClaim','chart'].includes(item.kind) : ['title','chart','insight'].includes(item.kind)) && item.path); } catch { /* Preview remains usable. */ }
  if (ui.currentId !== run.runId) return;
  if (!items.length) { targets.textContent = t('noModules'); $('prompt').value = ''; return; }
  if (!items.some(item => item.kind + ':' + item.id === ui.moduleId)) ui.moduleId = items[0].kind + ':' + items[0].id;
  items.forEach(item => {
    const key = item.kind + ':' + item.id, button = document.createElement('button'); button.className = 'target' + (key === ui.moduleId ? ' active' : '');
    const title = document.createElement('b'); title.textContent = item.kind === 'title' ? t('title') : item.kind === 'slide' ? t('slide') + ' ' + (item.slideIndex + 1) : t(item.kind) + ' · ' + (item.slideIndex !== undefined ? (item.slideIndex + 1) : item.id);
    const detail = document.createElement('small'); detail.textContent = item.path + ' · ' + (item.title || item.id);
    button.append(title, detail); button.onclick = () => { ui.moduleId = key; renderEdit(true); }; targets.appendChild(button);
  });
  const selected = items.find(item => item.kind + ':' + item.id === ui.moduleId); $('prompt').value = promptFor(run, selected);
  const frame = $('editReport').querySelector('iframe');
  if (frame.contentDocument?.readyState === 'complete') focusReportTarget(frame, selected, scrollToTarget, run);
  else frame.addEventListener('load', () => focusReportTarget(frame, selected, scrollToTarget, run), { once:true });
}
async function renderExports() {
  const run = current(), menu = $('exportMenu'); menu.replaceChildren(); menu.hidden = true;
  $('exportToggle').setAttribute('aria-expanded', 'false'); $('exportToggle').disabled = !run?.artifact;
  if (!run?.artifact) return;
  try {
    const response = await fetch('/api/runs/' + encodeURIComponent(run.runId) + '/export');
    const body = await response.json(); if (!response.ok || ui.currentId !== run.runId) return;
    const formats = body.value?.formats || [];
    if (!formats.length) { $('exportToggle').disabled = true; return; }
    for (const format of formats) {
      const button = document.createElement('button'); button.type = 'button';
      button.textContent = format === 'pptx' ? t('exportPptx') : format.toUpperCase();
      button.onclick = async () => {
        menu.hidden = true; $('exportToggle').setAttribute('aria-expanded', 'false'); toast(t('exportPreparing'));
        try {
          const result = await fetch('/api/runs/' + encodeURIComponent(run.runId) + '/export/' + format);
          if (!result.ok) { const error = await result.json(); throw Error(error.message || t('exportFailed')); }
          const blob = await result.blob(), url = URL.createObjectURL(blob), link = document.createElement('a');
          link.href = url; link.download = (label(run).replace(/[\\/:*?"<>|]/g, '-') || 'artifact') + '-' + run.runId + '.' + format;
          document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000);
        } catch (error) { toast(t('exportFailed') + ': ' + error.message); }
      };
      menu.appendChild(button);
    }
  } catch { $('exportToggle').disabled = true; }
}
function renderAll() { renderVersions(); renderComparison(); renderEdit(); renderExports(); }
async function load() {
  try {
    const response = await fetch('/api/runs'); if (!response.ok) throw Error(t('readFailed'));
    const body = await response.json(), runs = body.value || [];
    const signature = runs.map(run => run.runId + ':' + run.events.length).join('|');
    if (signature === ui.signature) return;
    ui.signature = signature; ui.runs = runs;
    if (!runs.length) { renderEmpty(); return; }
    if (!runs.some(run => run.runId === ui.currentId)) ui.currentId = runs[0].runId;
    const versions = family();
    if (!versions.some(run => run.runId === ui.targetId)) ui.targetId = ui.currentId;
    if (!versions.some(run => run.runId === ui.baseId)) ui.baseId = versions.find(run => run.runId === current().parentRunId)?.runId || versions.find(run => run.runId !== ui.currentId)?.runId || ui.currentId;
    renderAll();
  } catch (error) { setText('summaryTitle', t('disconnected')); setText('summaryDetail', error.message); }
}
function setGuideOpen(open) { $('quickGuide').hidden = !open; $('guideToggle').setAttribute('aria-expanded', String(open)); localStorage.setItem('miao-review-guide-dismissed', String(!open)); }
$('guideToggle').onclick = () => setGuideOpen($('quickGuide').hidden);
$('guideClose').onclick = () => setGuideOpen(false);
$('quickGuide').hidden = localStorage.getItem('miao-review-guide-dismissed') === 'true';
$('guideToggle').setAttribute('aria-expanded', String(!$('quickGuide').hidden));
$('baseVersion').onchange = event => { ui.baseId = event.target.value; renderComparison(); };
$('targetVersion').onchange = event => { ui.targetId = event.target.value; renderComparison(); };
$('swap').onclick = () => { [ui.baseId, ui.targetId] = [ui.targetId, ui.baseId]; renderComparison(); };
document.querySelectorAll('.tab').forEach(tab => tab.onclick = () => { document.querySelectorAll('.tab,.screen').forEach(node => node.classList.remove('active')); tab.classList.add('active'); $(tab.dataset.screen).classList.add('active'); });
$('exportToggle').onclick = () => { const menu = $('exportMenu'); menu.hidden = !menu.hidden; $('exportToggle').setAttribute('aria-expanded', String(!menu.hidden)); };
$('openMode').onclick = () => { const run = current(); if (!run?.artifact) return toast(t('noArtifact')); window.open(artifactUrl(run), '_blank', 'noopener'); };
document.querySelectorAll('#intents .chip').forEach(chip => chip.onclick = () => { ui.intent = chip.dataset.intent; document.querySelectorAll('#intents .chip').forEach(item => item.classList.remove('active')); chip.classList.add('active'); renderEdit(); });
$('copyPrompt').onclick = async () => { if (!$('prompt').value.trim()) return toast(t('chooseModule')); try { await navigator.clipboard.writeText($('prompt').value); toast(t('copied')); } catch { $('prompt').select(); toast(t('copyManually')); } };
function renderEmpty() { $('artifactSelect').replaceChildren(); $('exportToggle').disabled = true; $('exportMenu').hidden = true; document.querySelector('.top h1').textContent = t('firstArtifact'); document.querySelector('.project b').textContent = t('firstArtifact'); document.querySelector('.project small').textContent = t('localFile'); document.querySelector('.pill').textContent = t('pendingEvidence'); setText('summaryTitle', t('noHistory')); setText('summaryDetail', t('startWorkflow')); setText('dataSignal', ''); setText('evidenceSignal', ''); setText('changeSignal', ''); setText('versionCount', t('versionCount')(0)); $('versionList').replaceChildren(); for (const id of ['leftReport','rightReport','editReport','targets','diffRows']) $(id).replaceChildren(); $('prompt').value = ''; }
$('languageToggle').onclick = () => { ui.language = ui.language === 'en' ? 'zh' : 'en'; localStorage.setItem('miao-review-language', ui.language); applyLanguage(); if (ui.runs.length) renderAll(); else renderEmpty(); };
applyLanguage(); load(); setInterval(load, 2500);
`;
