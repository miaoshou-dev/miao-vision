<script lang="ts">
  /**
   * Landing Page for Miaoshou Vision
   * Full-screen centered design with product showcase
   */
  import './landing-page.css'
  import {
    Rocket,
    BarChart3,
    Sparkles,
    Shield,
    Database,
    FileText,
    ArrowRight,
    Github,
    TrendingUp,
    Target,
    Zap,
    Layers,
    MessageSquare,
    FileCheck,
    FileOutput
  } from '@lucide/svelte'

  interface Props {
    onNavigate: (tab: string) => void
  }

  let { onNavigate }: Props = $props()

  // Core features for hero section
  const coreFeatures = [
    { icon: Rocket, label: 'Agent Workflow', tag: 'CLI Ready' },
    { icon: BarChart3, label: '27+ Visualizations', tag: 'Pure SVG' },
    { icon: Sparkles, label: 'AI VizSpec', tag: 'Easy to Generate' },
    { icon: Shield, label: 'Privacy First', tag: 'Local-First' }
  ]

  // Demo cards
  const demos = [
    {
      id: 'article-ai',
      icon: Sparkles,
      title: 'AI Infographic',
      desc: 'Article to Visuals',
      color: '#8B5CF6'
    },
    {
      id: 'report',
      icon: FileText,
      title: 'BI Report',
      desc: 'Markdown Reports',
      color: '#10B981'
    },
    {
      id: 'infographic',
      icon: BarChart3,
      title: 'Chart Gallery',
      desc: 'Visualization Library',
      color: '#F59E0B'
    }
  ]
</script>

<div class="landing">
  <!-- Top Navigation -->
  <nav class="top-nav">
    <div class="nav-brand">
      <span class="brand-icon">
        <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
        </svg>
      </span>
      <span class="brand-text">Miaoshou Vision</span>
    </div>
    <div class="nav-actions">
      <a href="https://github.com" target="_blank" rel="noopener" class="nav-link">
        <Github size={18} strokeWidth={1.5} />
        <span>GitHub</span>
      </a>
      <button class="nav-btn" onclick={() => onNavigate('article-ai')}>
        Launch App
      </button>
    </div>
  </nav>

  <!-- Hero Section -->
  <section class="hero">
    <div class="hero-content">
      <!-- Badge -->
      <div class="hero-badge">
        <span class="badge-dot"></span>
        AI-First Visualization Generator
      </div>

      <!-- Title -->
      <h1 class="hero-title">
        <span class="title-line">Local Data to</span>
        <span class="title-gradient">Beautiful Reports</span>
      </h1>

      <!-- Subtitle -->
      <p class="hero-subtitle">
        Agent-Friendly · Local-First · Pure SVG · Polished HTML
      </p>

      <!-- Feature Pills -->
      <div class="feature-pills">
        {#each coreFeatures as feature}
          <div class="pill">
            <span class="pill-icon">
              <feature.icon size={16} strokeWidth={2} />
            </span>
            <span class="pill-label">{feature.label}</span>
            <span class="pill-tag">{feature.tag}</span>
          </div>
        {/each}
      </div>

      <!-- CTA Buttons -->
      <div class="hero-cta">
        <button class="btn-primary" onclick={() => onNavigate('article-ai')}>
          <span>Get Started</span>
          <ArrowRight size={18} strokeWidth={2} />
        </button>
        <button class="btn-secondary" onclick={() => onNavigate('article-ai')}>
          <Sparkles size={18} strokeWidth={2} />
          <span>Try AI Demo</span>
        </button>
      </div>
    </div>

    <!-- Product Screenshot -->
    <div class="hero-showcase">
      <div class="showcase-window">
        <div class="window-header">
          <div class="window-dots">
            <span class="dot red"></span>
            <span class="dot yellow"></span>
            <span class="dot green"></span>
          </div>
          <span class="window-title">Miao Viz Report</span>
        </div>
        <div class="window-content">
          <!-- Simulated VizSpec -->
          <div class="mock-editor">
            <div class="editor-sidebar">
              <div class="sidebar-item active"></div>
              <div class="sidebar-item"></div>
              <div class="sidebar-item"></div>
            </div>
            <div class="editor-main">
              <div class="code-line">
                <span class="code-keyword">title:</span>
                <span class="code-text"> Sales Report</span>
              </div>
              <div class="code-line">
                <span class="code-keyword">theme:</span>
                <span class="code-table"> editorial</span>
              </div>
              <div class="code-line">
                <span class="code-keyword">charts:</span>
                <span class="code-text"> bar, line, kpi</span>
              </div>
              <div class="code-line">
                <span class="code-keyword">render:</span>
                <span class="code-text"> self-contained HTML</span>
              </div>
            </div>
          </div>
          <!-- Simulated Chart -->
          <div class="mock-chart">
            <div class="chart-bars">
              <div class="bar" style="height: 80%"></div>
              <div class="bar" style="height: 65%"></div>
              <div class="bar" style="height: 90%"></div>
              <div class="bar" style="height: 45%"></div>
              <div class="bar" style="height: 70%"></div>
            </div>
          </div>
        </div>
      </div>
      <!-- Floating elements -->
      <div class="float-card card-1">
        <span class="float-icon">
          <TrendingUp size={20} strokeWidth={2} />
        </span>
        <span class="float-value">+45%</span>
        <span class="float-label">Growth</span>
      </div>
      <div class="float-card card-2">
        <span class="float-icon">
          <Target size={20} strokeWidth={2} />
        </span>
        <span class="float-value">27+</span>
        <span class="float-label">Charts</span>
      </div>
    </div>
  </section>

  <!-- AI Report Showcase Section -->
  <section class="ai-showcase-section">
    <!-- Section Header -->
    <div class="showcase-header">
      <h2 class="showcase-title">
        <span class="title-gradient">AI Report Generation</span>
      </h2>
      <p class="showcase-subtitle">
        Transform local files into polished visualization reports
      </p>
    </div>

    <!-- Feature Highlights (3 columns) -->
    <div class="feature-highlights">
      <!-- Card 1: Smart Planning -->
      <div class="feature-card">
        <div class="feature-icon">
          <Sparkles size={28} strokeWidth={1.75} />
        </div>
        <h3 class="feature-title">Smart Planning</h3>
        <p class="feature-desc">
          AI analyzes your data and suggests optimal visualizations
        </p>
      </div>

      <!-- Card 2: Instant Generation -->
      <div class="feature-card">
        <div class="feature-icon">
          <Zap size={28} strokeWidth={1.75} />
        </div>
        <h3 class="feature-title">Instant Generation</h3>
        <p class="feature-desc">
          Render self-contained HTML reports with charts
        </p>
      </div>

      <!-- Card 3: Multi-Section Reports -->
      <div class="feature-card">
        <div class="feature-icon">
          <Layers size={28} strokeWidth={1.75} />
        </div>
        <h3 class="feature-title">Multi-Section Reports</h3>
        <p class="feature-desc">
          KPIs, trends, rankings, insights - all spec-driven
        </p>
      </div>
    </div>

    <!-- Workflow Visualization (4 steps) -->
    <div class="workflow-viz">
      <div class="workflow-step">
        <span class="step-number">1</span>
        <div class="step-icon">
          <Database size={24} strokeWidth={1.75} />
        </div>
        <h4 class="step-title">Profile Data</h4>
        <p class="step-desc">Inspect local files</p>
      </div>

      <div class="workflow-arrow">→</div>

      <div class="workflow-step">
        <span class="step-number">2</span>
        <div class="step-icon">
          <MessageSquare size={24} strokeWidth={1.75} />
        </div>
        <h4 class="step-title">Generate Spec</h4>
        <p class="step-desc">AI writes VizSpec</p>
      </div>

      <div class="workflow-arrow">→</div>

      <div class="workflow-step">
        <span class="step-number">3</span>
        <div class="step-icon">
          <FileCheck size={24} strokeWidth={1.75} />
        </div>
        <h4 class="step-title">Validate</h4>
        <p class="step-desc">Check fields & charts</p>
      </div>

      <div class="workflow-arrow">→</div>

      <div class="workflow-step">
        <span class="step-number">4</span>
        <div class="step-icon">
          <FileOutput size={24} strokeWidth={1.75} />
        </div>
        <h4 class="step-title">Render</h4>
        <p class="step-desc">Beautiful HTML</p>
      </div>
    </div>

    <!-- CTA Button -->
    <div class="showcase-cta">
      <button class="btn-primary btn-large" onclick={() => onNavigate('report')}>
        <Sparkles size={20} strokeWidth={2} />
        <span>Try AI Report Generator</span>
        <ArrowRight size={20} strokeWidth={2} />
      </button>
    </div>
  </section>

  <!-- Demo Cards Section -->
  <section class="demos-section">
    <h2 class="section-title">Quick Start</h2>
    <div class="demos-grid">
      {#each demos as demo}
        <button
          class="demo-card"
          style="--accent-color: {demo.color}"
          onclick={() => onNavigate(demo.id)}
        >
          <div class="demo-icon" style="background: {demo.color}15">
            <demo.icon size={24} strokeWidth={1.75} color={demo.color} />
          </div>
          <div class="demo-info">
            <h3>{demo.title}</h3>
            <p>{demo.desc}</p>
          </div>
          <ArrowRight size={18} class="demo-arrow" strokeWidth={2} />
        </button>
      {/each}
    </div>
  </section>

  <!-- Footer -->
  <footer class="footer">
    <span>Miaoshou Vision</span>
    <span class="footer-divider">·</span>
    <span>Local-First Analytics</span>
    <span class="footer-divider">·</span>
    <span>© 2024</span>
  </footer>
</div>
