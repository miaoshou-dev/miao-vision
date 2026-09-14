<script lang="ts">
  /**
   * Landing page for the CLI-first Miao Vision product direction.
   */
  import './landing-page.css'
  import InstallSection from './InstallSection.svelte'
  import { installManifest } from '../install-manifest'
  import { recordFunnelEvent } from '../funnel-events'
  import {
    ArrowRight,
    BookOpen,
    CheckCircle2,
    Database,
    Filter,
    FileOutput,
    Github,
    Shield,
    Sparkles,
    Terminal
  } from '@lucide/svelte'

  interface Props {
    onNavigate: (tab: string) => void
  }

  let { onNavigate }: Props = $props()
  let lang = $state<'zh' | 'en'>('zh')

  const translations = {
    zh: {
      skip: '跳到主要内容', workflowLabel: '工作流', examples: '真实产物', install: '安装',
      eyebrow: '本地优先的 AI 数据报告', hero: '用一句话，把本地数据变成可验证的业务报告。',
      heroCopy: '用一句话描述目标，Miao Vision 就能把本地 CSV、Excel 或 JSON 变成可直接分享的业务报告。无账号、无需上传，数字保留可验证的证据来源。',
      create: '生成第一份报告', view: '查看真实报告', local: '本地处理', noUpload: '无账号 / 无上传', offline: '离线 HTML',
      preview: '本地预览', caption: '从本地数据到可验证的自包含报告。',
      gallery: '先看一份可信的销售报告', galleryNote: '自包含 HTML，可离线打开；KPI、图表和洞察均带证据说明。',
      open: '打开示例报告', sample: '下载样例数据', start: '复制提示词并开始',
      workflowTitle: '你提供数据，Agent 完成其余工作。', workflowCopy: '告诉 Claude 或 Codex 你想要的结果，Agent 会分析文件、编写 VizSpec、验证并输出可离线打开的 HTML，不需手写 YAML。',
      whyTitle: '为 Agent 而生，用产物说话。',
      tracks: [{ title: '数据报告', input: 'CSV / TSV / XLSX / JSON', output: '27 种图表、有证据的 KPI、筛选与下钻' }, { title: '文章信息图', input: 'Markdown / text / Agent 笔记', output: '叙事流、标注卡片、对比布局' }, { title: '浏览器演示', input: 'CSV / JSON / YAML spec', output: '8 种布局、键盘导航、可打印 PDF' }],
      workflow: [{ title: '分析', detail: '检查字段与数据质量' }, { title: '选择', detail: '选择合适的图表' }, { title: '编写', detail: 'AI 生成 VizSpec' }, { title: '验证', detail: '渲染前自动修复' }, { title: '输出', detail: '导出自包含产物' }],
      proof: [{ title: '为 AI Agent 而设计', detail: '无需学习 UI，在一次对话中完成分析、验证和渲染。' }, { title: '一份紧凑 spec 驱动 27 种图表', detail: '柱状、折线、点状、热力图等都遵循同一 VizSpec。' }, { title: '所有数字都有证据', detail: '证据指令绑定预计算查询，避免编造结论。' }, { title: '无服务器也能交互', detail: '筛选、提示框和下钻都包含在一个 HTML 文件里。' }, { title: '文件留在本机', detail: '不上传，数据不离开当前文件系统。' }, { title: '结构化验证错误', detail: '机器可读的错误可以由 Agent 自动修复。' }],
      artifacts: [{ name: 'Report', description: 'KPI、图表、证据洞察和下钻表格，一份完整的业务报告。', tags: ['Interactive', '证据', '下钻'] }, { name: 'Infographic', description: '将长文章变成可扫读的数据叙事。', tags: ['叙事', '标注', '洞察'] }, { name: 'Browser Deck', description: '带键盘导航的多页演示文稿。', tags: ['Slides', '键盘', 'PDF'] }, { name: 'Poster', description: '将排名、构成或趋势压缩成可分享的视觉海报。', tags: ['排名', '趋势', '可分享'] }]
    },
    en: {
      skip: 'Skip to main content', workflowLabel: 'Workflow', examples: 'Examples', install: 'Install', eyebrow: 'LOCAL-FIRST AI DATA REPORTS', hero: 'Turn local data into a verifiable business report.', heroCopy: 'Describe the outcome in one sentence. Miao Vision turns local CSV, Excel, or JSON into a shareable report with traceable evidence. No account, no upload.', create: 'Generate a report', view: 'View a real report', local: 'Local processing', noUpload: 'No account / no upload', offline: 'Offline HTML', preview: 'Local preview', caption: 'From local data to a verifiable, self-contained report.', gallery: 'See a credible sales report first', galleryNote: 'Self-contained HTML that opens offline, with evidence for every KPI, chart, and insight.', open: 'Open example report', sample: 'Download sample data', start: 'Copy prompt and start', workflowTitle: 'You bring data. The agent does the rest.', workflowCopy: 'Tell Claude or Codex the outcome you want. The agent profiles the file, writes a VizSpec, validates it, and renders an offline-ready HTML artifact with no manual YAML.', whyTitle: 'Built for agents, judged by the artifact.', tracks: [{ title: 'Data Report', input: 'CSV / TSV / XLSX / JSON', output: '27 chart types, evidence-backed KPIs, filters, and drilldowns' }, { title: 'Article Infographic', input: 'Markdown / text / agent notes', output: 'Narrative flow, callouts, comparisons, and editorial themes' }, { title: 'Browser Deck', input: 'CSV / JSON / YAML spec', output: '8 layouts, keyboard navigation, and print-to-PDF' }], workflow: [{ title: 'Profile', detail: 'Inspect fields and quality' }, { title: 'Choose', detail: 'Pick a chart pattern' }, { title: 'Write', detail: 'AI generates VizSpec' }, { title: 'Validate', detail: 'Repair before render' }, { title: 'Render', detail: 'Export the artifact' }], proof: [{ title: 'Designed for AI agents', detail: 'No UI to learn. Analyze, validate, and render in one conversation.' }, { title: '27 chart types, one compact spec', detail: 'Bar, line, scatter, heatmap, and more follow the same VizSpec.' }, { title: 'Every number has evidence', detail: 'Evidence directives bind claims to pre-computed queries.' }, { title: 'Interactive without a server', detail: 'Filters, tooltips, and drilldowns live in one HTML file.' }, { title: 'Local files stay local', detail: 'No upload. Data never leaves the filesystem.' }, { title: 'Structured validation errors', detail: 'Machine-readable errors can be fixed by the agent.' }], artifacts: [{ name: 'Report', description: 'KPI metrics, evidence-backed insights, charts, and drilldown tables in one report.', tags: ['Interactive', 'Evidence', 'Drilldown'] }, { name: 'Infographic', description: 'A scannable narrative data story with highlights and callouts.', tags: ['Narrative', 'Callouts', 'Insights'] }, { name: 'Browser Deck', description: 'A multi-slide presentation with keyboard navigation and PDF output.', tags: ['Slides', 'Keyboard', 'PDF'] }, { name: 'Poster', description: 'A shareable visual poster for rankings, composition, or trends.', tags: ['Ranking', 'Trend', 'Shareable'] }]
    }
  } as const
  let t = $derived(translations[lang])

  $effect(() => { recordFunnelEvent('landing_view') })


  const workflow = $derived(t.workflow.map((step, index) => ({ ...step, icon: [Database, BookOpen, Sparkles, CheckCircle2, FileOutput][index] })))

  const proofPoints = $derived(t.proof)

  const artifacts = $derived(t.artifacts.map((artifact, index) => ({ ...artifact, url: ['/examples/report.html', '/examples/infographic.html', '/examples/deck.html', '/examples/poster.html'][index], color: ['#2563eb', '#16a085', '#e07a3f', '#7c5ce6'][index] })))


</script>

<div class="landing">
  <a class="skip-link" href="#main-content">{t.skip}</a>
  <nav class="top-nav" aria-label="Primary navigation">
    <button class="nav-brand" onclick={() => onNavigate('landing')} aria-label="Miao Vision home">
      <span class="brand-mark">MV</span>
      <span class="brand-text">Miao Vision</span>
    </button>
    <div class="nav-actions">
      <a class="nav-link" href="#workflow">{t.workflowLabel}</a>
      <a class="nav-link" href="#report-example">{t.examples}</a>
      <a href="https://github.com/miaoshou-dev/miao-vision" target="_blank" rel="noopener" class="nav-link icon-link">
        <Github size={18} strokeWidth={1.75} />
        <span>GitHub</span>
      </a>
      <button class="language-toggle" type="button" onclick={() => { lang = lang === 'zh' ? 'en' : 'zh' }} aria-label="Toggle language">{lang === 'zh' ? 'EN' : '中'}</button>
      <a class="nav-btn" href="#install">{t.install}</a>
    </div>
  </nav>

  <header class="hero">
    <div class="hero-copy">
      <p class="eyebrow"><Terminal size={16} strokeWidth={2} /> {t.eyebrow}</p>
      <h1>{lang === 'zh' ? 'CSV / Excel' : 'Local data'}<br />{lang === 'zh' ? '→ 业务报告' : '→ trusted reports'}</h1>
      <p class="hero-statement">{t.heroCopy}</p>
      <div class="hero-actions">
        <a class="btn-primary" href="#first-report">
          <Sparkles size={18} strokeWidth={2} />
          <span>{t.create}</span>
        </a>
        <a class="btn-secondary" href="#report-example">
          <span>{t.view}</span>
          <ArrowRight size={18} strokeWidth={2} />
        </a>
      </div>
      <div class="hero-proof" aria-label="Product principles">
        <span><Shield size={15} strokeWidth={2} /> {t.local}</span>
        <span><Filter size={15} strokeWidth={2} /> {t.noUpload}</span>
        <span><FileOutput size={15} strokeWidth={2} /> {t.offline}</span>
      </div>
    </div>

    <div class="artifact-stage" aria-label="Miao Vision product demo">
      <div class="stage-label"><span>{t.preview}</span><span>sales-report.html</span></div>
      <div class="report-preview" aria-hidden="true">
        <div class="preview-toolbar"><span></span><span></span><span></span><b>sales-report.html</b></div>
        <div class="preview-body"><small>MONTHLY REVENUE</small><strong>$184,260</strong><div class="preview-chart"><i style="height: 42%"></i><i style="height: 64%"></i><i style="height: 51%"></i><i style="height: 82%"></i><i style="height: 70%"></i><i style="height: 94%"></i></div><div class="preview-footer"><span>Evidence-backed</span><span>Offline HTML</span></div></div>
      </div>
      <p class="stage-caption">{t.caption}</p>
    </div>
  </header>

  <div id="main-content" class="landing-main">
    <section id="report-example" class="gallery-section" aria-labelledby="gallery-title">
      <div class="section-heading">
        <p class="section-kicker">{t.examples} · {installManifest.example.cliVersion}</p>
        <h2 id="gallery-title">{t.gallery}</h2>
        <p class="example-note">{t.galleryNote}</p>
      </div>
      <div class="artifact-grid">
        {#each artifacts as artifact, index}
          <a id={index === 0 ? 'report-card' : undefined} href={artifact.url} target="_blank" rel="noopener noreferrer" class="artifact-card" onclick={() => recordFunnelEvent('example_open')}>
            <div class="artifact-mark" style="background: {artifact.color}"></div>
            <div class="artifact-body">
              <h3>{artifact.name} <span class="artifact-arrow">&#8599;</span></h3>
              <p>{artifact.description}</p>
              <div class="artifact-tags">
                {#each artifact.tags as tag}
                  <span class="artifact-tag">{tag}</span>
                {/each}
              </div>
            </div>
          </a>
        {/each}
      </div>
      <div class="example-actions">
        <a class="btn-primary" href={installManifest.example.artifactUrl} target="_blank" rel="noopener noreferrer" onclick={() => recordFunnelEvent('example_open')}>{t.open}</a>
        <a class="btn-secondary" href={installManifest.example.sampleDataUrl} download>{t.sample}</a>
        <a class="btn-secondary" href="#first-report">{t.start}</a>
      </div>
    </section>

    <section id="workflow" class="workflow-section" aria-labelledby="workflow-title">
      <div class="workflow-copy">
        <p class="section-kicker">{t.workflowLabel}</p>
        <h2 id="workflow-title">{t.workflowTitle}</h2>
        <p>{t.workflowCopy}</p>
      </div>
      <div class="command-card">
        <pre><code>{lang === 'zh' ? `# 放入文件，告诉 Agent 你想要什么：
"从 sales.csv 创建销售仪表盘"
"将这篇文章变成信息图"
"制作管理层汇报"

# Agent 负责分析、选图、验证和渲染：
→ sales-report.html（可交互、可离线、无需服务器）` : `# Drop a file, tell your agent what you want:
"Create a sales dashboard from sales.csv"
"Turn this article into an infographic"
"Make an executive deck"

# The agent handles profiling, chart selection, validation, and rendering:
→ sales-report.html  (interactive, offline-ready, no server needed)`}</code></pre>
      </div>
      <div class="workflow-steps">
        {#each workflow as step, index}
          <div class="workflow-step">
            <span class="step-index">{index + 1}</span>
            <step.icon size={20} strokeWidth={1.75} />
            <strong>{step.title}</strong>
            <span>{step.detail}</span>
          </div>
        {/each}
      </div>
    </section>

    <section class="why-section" aria-labelledby="why-title">
      <div>
        <p class="section-kicker">{lang === 'zh' ? '为什么是 Miao Vision' : 'Why Miao Vision'}</p>
        <h2 id="why-title">{t.whyTitle}</h2>
      </div>
      <div class="proof-grid">
        {#each proofPoints as point}
          <div class="proof-card">
            <CheckCircle2 size={18} strokeWidth={2} />
            <div class="proof-body">
              <strong>{point.title}</strong>
              <span>{point.detail}</span>
            </div>
          </div>
        {/each}
      </div>
    </section>

    <InstallSection lang={lang} />
  </div>

  <footer class="footer">
    <span>Miao Vision</span>
    <span>AI-first interactive visualization artifacts</span>
    <span>2026</span>
  </footer>
</div>
