<script lang="ts">
  /**
   * Landing page for the CLI-first Miao Vision product direction.
   */
  import './landing-page.css'
  import InstallSection from './InstallSection.svelte'
  import {
    ArrowRight,
    BarChart3,
    BookOpen,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Code2,
    Database,
    FileOutput,
    Github,
    Newspaper,
    Presentation,
    Shield,
    Sparkles,
    Terminal
  } from '@lucide/svelte'

  interface Props {
    onNavigate: (tab: string) => void
  }

  let { onNavigate }: Props = $props()

  const productTracks = [
    {
      icon: BarChart3,
      title: 'Data Display',
      input: 'CSV / TSV / XLSX / JSON',
      output: 'KPI, charts, tables, insights, HTML reports'
    },
    {
      icon: Newspaper,
      title: 'Article Infographic',
      input: 'URL / Markdown / long text',
      output: 'Editorial infographic artifacts'
    },
    {
      icon: Presentation,
      title: 'Presentation Deck',
      input: 'Local data file',
      output: 'Browser-presentable executive decks'
    }
  ]


  const workflow = [
    { icon: Database, title: 'Profile', detail: 'Inspect fields and quality' },
    { icon: BookOpen, title: 'Catalog', detail: 'Choose chart patterns' },
    { icon: Sparkles, title: 'Spec', detail: 'AI writes VizSpec' },
    { icon: CheckCircle2, title: 'Validate', detail: 'Repair before render' },
    { icon: FileOutput, title: 'Render', detail: 'Export artifact' }
  ]

  const proofPoints = [
    {
      title: 'Agent-friendly YAML / JSON specs',
      detail: 'VizSpec is compact and predictable — agents write it correctly on the first pass.'
    },
    {
      title: 'Local files stay on the machine',
      detail: 'No upload, no cloud call. Your data never leaves the filesystem.'
    },
    {
      title: 'Self-contained HTML opens offline',
      detail: 'Every artifact is a single file with no external dependencies or CDN calls.'
    },
    {
      title: 'Editorial themes and SVG charts',
      detail: 'Pure SVG rendering with curated palettes — no canvas, no library overhead.'
    },
    {
      title: 'Structured validation errors',
      detail: 'The spec validator returns machine-readable errors the agent can fix autonomously.'
    },
    {
      title: 'Three artifact formats, one workflow',
      detail: 'Reports, infographics, and decks all follow the same profile → spec → render pattern.'
    }
  ]

  const artifacts = [
    {
      title: 'Q1 2025 Sales Intelligence Report',
      label: 'Editorial HTML report with report hero, data tokens, KPI group, regional chart, trends, and detail table.',
      source: 'rich-sales.csv',
      command: 'miao-viz render',
      format: 'HTML report',
      className: 'report'
    },
    {
      title: 'Regional Sales Infographic',
      label: 'Sales data distilled into a narrative infographic with regional focus, growth drivers, and next actions.',
      source: 'sales-summary.md',
      command: 'miao-viz article',
      format: 'Infographic',
      className: 'infographic'
    },
    {
      title: 'Executive Sales Review',
      label: 'Six-slide Sales Review deck with cover, metrics, regional chart, category chart, table, and ending.',
      source: 'sales.csv',
      command: 'miao-viz deck',
      format: 'Browser deck',
      className: 'deck'
    },
    {
      title: 'Region Revenue Chart',
      label: 'Single reusable SVG chart artifact for docs, reports, or slide composition.',
      source: 'region-sales.csv',
      command: 'miao-viz render',
      format: 'SVG chart',
      className: 'chart'
    }
  ]

  const deckSlides = [
    {
      kind: 'cover',
      eyebrow: 'miao-vision',
      title: 'Sales Review',
      detail: 'Regional performance and trend analysis',
      page: '01 / 06'
    },
    {
      kind: 'metrics',
      eyebrow: '01 · KEY METRICS',
      title: 'Quarter at a Glance',
      detail: '$450 · 18 orders · $113 AOV',
      page: '02 / 06'
    },
    {
      kind: 'regional',
      eyebrow: '02 · REGIONAL',
      title: 'Sales by Region',
      detail: 'East leads, West follows, North is opportunity',
      page: '03 / 06'
    },
    {
      kind: 'table',
      eyebrow: '04 · DETAIL',
      title: 'Top Transactions',
      detail: 'Sorted transaction table embedded in the deck',
      page: '05 / 06'
    }
  ]

  let deckSlideIndex = $state(0)
  let activeDeckSlide = $derived(deckSlides[deckSlideIndex])

  function previousDeckSlide() {
    deckSlideIndex = (deckSlideIndex - 1 + deckSlides.length) % deckSlides.length
  }

  function nextDeckSlide() {
    deckSlideIndex = (deckSlideIndex + 1) % deckSlides.length
  }
</script>

<div class="landing">
  <nav class="top-nav" aria-label="Primary navigation">
    <button class="nav-brand" onclick={() => onNavigate('landing')} aria-label="Miao Vision home">
      <span class="brand-mark">MV</span>
      <span class="brand-text">Miao Vision</span>
    </button>
    <div class="nav-actions">
      <a class="nav-link" href="#workflow">Workflow</a>
      <a class="nav-link" href="#install">Install</a>
      <a href="https://github.com/miaoshou-dev/miao-vision" target="_blank" rel="noopener" class="nav-link icon-link">
        <Github size={18} strokeWidth={1.75} />
        <span>GitHub</span>
      </a>
      <a class="nav-btn" href="#install">Install Skill</a>
    </div>
  </nav>

  <header class="hero">
    <div class="hero-copy">
      <p class="eyebrow">
        <Terminal size={16} strokeWidth={2} />
        Local CLI for agent-made visual artifacts
      </p>
      <h1>Miao Vision</h1>
      <p class="hero-statement">
        Give Codex or Claude a local CSV, article, or Markdown brief. Miao Vision profiles it,
        validates a compact spec, and renders a polished HTML report, infographic, or browser deck.
      </p>
      <div class="hero-actions">
        <a class="btn-primary" href="#gallery">
          <Sparkles size={18} strokeWidth={2} />
          <span>See Outputs</span>
        </a>
        <a class="btn-secondary" href="#install">
          <span>Install CLI + Skill</span>
          <ArrowRight size={18} strokeWidth={2} />
        </a>
      </div>
      <div class="hero-proof" aria-label="Product principles">
        <span><Shield size={15} strokeWidth={2} /> Local-first</span>
        <span><Code2 size={15} strokeWidth={2} /> Spec-light</span>
        <span><FileOutput size={15} strokeWidth={2} /> Static-first</span>
      </div>
    </div>

    <div class="artifact-stage" aria-label="Miao Vision product demo">
      <video
        class="hero-video"
        src="/promo.mp4"
        autoplay
        muted
        loop
        playsinline
        aria-hidden="true"
      ></video>
    </div>
  </header>

  <div class="landing-main">
    <section id="gallery" class="gallery-section" aria-labelledby="gallery-title">
      <div class="section-heading">
        <p class="section-kicker">Artifact gallery</p>
        <h2 id="gallery-title">Designed around the output file</h2>
      </div>
      <div class="artifact-grid">
        {#each artifacts as artifact}
          <article class="artifact-card {artifact.className}">
            {#if artifact.className === 'deck'}
              <div class="artifact-visual deck-carousel" aria-label="Browser deck slide carousel">
                <div class="visual-topline">
                  <span>{artifact.format}</span>
                  <strong>{artifact.source}</strong>
                </div>

                <div class="visual-deck-frame">
                  <button class="deck-control deck-prev" onclick={previousDeckSlide} aria-label="Previous deck slide">
                    <ChevronLeft size={15} strokeWidth={2.2} />
                  </button>
                  <div class="deck-slide-main {activeDeckSlide.kind}">
                    <span class="deck-mark">{activeDeckSlide.eyebrow}</span>
                    <strong>{activeDeckSlide.title}</strong>
                    <em>{activeDeckSlide.detail}</em>
                    {#if activeDeckSlide.kind === 'metrics'}
                      <div class="deck-metrics">
                        <span>$450</span>
                        <span>18</span>
                        <span>$113</span>
                      </div>
                    {:else if activeDeckSlide.kind === 'regional'}
                      <div class="deck-bars">
                        <i style="height: 88%"></i>
                        <i style="height: 52%"></i>
                        <i style="height: 38%"></i>
                      </div>
                    {:else if activeDeckSlide.kind === 'table'}
                      <div class="deck-table">
                        <span>2025-02-01 · East · 140</span>
                        <span>2025-01-02 · West · 120</span>
                        <span>2025-02-02 · North · 90</span>
                      </div>
                    {/if}
                    <i></i>
                    <small>{activeDeckSlide.page}</small>
                  </div>
                  <button class="deck-control deck-next" onclick={nextDeckSlide} aria-label="Next deck slide">
                    <ChevronRight size={15} strokeWidth={2.2} />
                  </button>
                </div>

                <div class="deck-dots" aria-label="Deck slide selection">
                  {#each deckSlides as slide, index}
                    <button
                      class:active={index === deckSlideIndex}
                      onclick={() => deckSlideIndex = index}
                      aria-label="Show {slide.title}"
                    ></button>
                  {/each}
                </div>
              </div>
            {:else}
              <div class="artifact-visual" aria-hidden="true">
                <div class="visual-topline">
                  <span>{artifact.format}</span>
                  <strong>{artifact.source}</strong>
                </div>
                {#if artifact.className === 'report'}
                  <div class="visual-report-hero">
                    <span>Miao Vision Report</span>
                    <small>Generated 2026-06-22</small>
                    <strong>Q1 2025 Sales Intelligence Report</strong>
                    <em>Rows 20 · Columns 8 · Source /tmp/rich-sales.csv</em>
                  </div>
                  <div class="visual-report-kpis">
                    <span><b>104350</b><small>Total Revenue</small></span>
                    <span><b>1332</b><small>Units Sold</small></span>
                    <span><b>1205</b><small>Customers</small></span>
                  </div>
                  <div class="visual-report-chart">
                    <span>Revenue by Region</span>
                    <i style="height: 84%"></i>
                    <i style="height: 82%"></i>
                    <i style="height: 70%"></i>
                    <i style="height: 69%"></i>
                  </div>
                  <div class="visual-report-table">
                    <span>Monthly Revenue Trend</span>
                    <span>Jan · 34300</span>
                    <span>Feb · 35650</span>
                    <span>Mar · 34400</span>
                  </div>
                  <div class="visual-report-table">
                    <span>Order Detail</span>
                    <span>East · Electronics · 12800</span>
                    <span>West · Furniture · 9600</span>
                  </div>
                {:else if artifact.className === 'infographic'}
                  <div class="visual-flow">
                    <span>West leads revenue</span>
                    <span>Repeat buyers grow</span>
                    <span>East needs pipeline</span>
                  </div>
                  <div class="visual-callout">Focus next campaign on high-retention regions</div>
                {:else}
                  <div class="visual-single-chart">
                    <i style="height: 68%"></i>
                    <i style="height: 36%"></i>
                    <i style="height: 82%"></i>
                    <i style="height: 54%"></i>
                    <i style="height: 72%"></i>
                  </div>
                {/if}
              </div>
            {/if}
            <span class="artifact-command">{artifact.command}</span>
            <h3>{artifact.title}</h3>
            <p>{artifact.label}</p>
          </article>
        {/each}
      </div>
    </section>

    <section id="workflow" class="workflow-section" aria-labelledby="workflow-title">
      <div class="workflow-copy">
        <p class="section-kicker">Agent workflow</p>
        <h2 id="workflow-title">You bring data. The agent does the rest.</h2>
        <p>
          Tell Claude or Codex what you want. The agent profiles your file, writes a VizSpec,
          validates it, and renders a self-contained HTML artifact — no manual YAML required.
        </p>
      </div>
      <div class="command-card">
        <pre><code># Drop a file, then tell your agent:
"Create a sales dashboard from sales.csv"
"Turn this article into an infographic"
"Make an executive deck from my data"

# The agent handles the rest and returns:
→ sales-report.html  (open in any browser, no server needed)</code></pre>
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

    <section class="tracks-section" aria-labelledby="tracks-title">
      <div class="section-heading">
        <p class="section-kicker">Product tracks</p>
        <h2 id="tracks-title">One engine, three artifact workflows</h2>
      </div>
      <div class="track-grid">
        {#each productTracks as track}
          <article class="track-card">
            <div class="track-icon"><track.icon size={24} strokeWidth={1.75} /></div>
            <h3>{track.title}</h3>
            <dl>
              <div>
                <dt>Input</dt>
                <dd>{track.input}</dd>
              </div>
              <div>
                <dt>Output</dt>
                <dd>{track.output}</dd>
              </div>
            </dl>
          </article>
        {/each}
      </div>
    </section>

    <section class="why-section" aria-labelledby="why-title">
      <div>
        <p class="section-kicker">Why Miao Vision</p>
        <h2 id="why-title">Built for AI agents, judged by the artifact</h2>
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

    <InstallSection />
  </div>

  <footer class="footer">
    <span>Miao Vision</span>
    <span>AI-first local visualization artifacts</span>
    <span>2026</span>
  </footer>
</div>
