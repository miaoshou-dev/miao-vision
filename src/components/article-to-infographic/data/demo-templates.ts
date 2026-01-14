/**
 * Demo Templates for Article-to-Infographic
 *
 * Pre-generated markdown templates for sample articles.
 * Used when API key is not provided.
 */

export const DEMO_TEMPLATES: Record<string, string> = {
  quarterly: `# Q4 2024 Performance Report

> AI-generated infographic report from article analysis.

\`\`\`infographic-section
template: kpi-row-badge
heading:
  title: "Key Metrics"
  subtitle: "Q4 2024 Performance Highlights"
insight:
  text: "Revenue grew 45% year-over-year, reaching $12.5M with 158K active users."
  highlight: "45%"
palette: vibrant
width: 800
height: 150
items:
  - label: "Revenue"
    value: "$12.5M"
    trend: up
  - label: "Users"
    value: "158K"
    trend: up
  - label: "NPS"
    value: "72"
  - label: "Market Share"
    value: "23%"
footnote:
  text: "Data as of December 31, 2024"
  source: "Finance Department"
\`\`\`

\`\`\`infographic-section
template: flow-timeline
heading:
  title: "Growth Journey"
  subtitle: "Key milestones in Q4"
insight:
  text: "Completed 4 major milestones from product launch to scaling operations."
  highlight: "4 major milestones"
palette: ocean
width: 800
height: 200
items:
  - label: "Product Launch"
    desc: "October 2024"
  - label: "Market Expansion"
    desc: "November 2024"
  - label: "Partnerships"
    desc: "December 2024"
  - label: "Scale Ops"
    desc: "Q1 2025"
\`\`\`

\`\`\`infographic-section
template: pie-distribution
heading:
  title: "Revenue Distribution"
  subtitle: "By customer segment"
insight:
  text: "Enterprise customers contribute 45% of total revenue, followed by SMB at 35%."
  highlight: "45%"
palette: sunset
width: 500
height: 400
items:
  - label: "Enterprise"
    value: 45
  - label: "SMB"
    value: 35
  - label: "Self-serve"
    value: 20
footnote:
  text: "Revenue breakdown by segment"
  source: "Sales Analytics"
\`\`\`

\`\`\`infographic-section
template: grid-comparison
heading:
  title: "Team Performance"
  subtitle: "Department metrics comparison"
insight:
  text: "Engineering delivered 47 features while Sales closed 234 deals worth $8.2M."
  highlight: "234 deals"
palette: forest
width: 800
height: 200
items:
  - label: "Engineering"
    value: "47 features"
    desc: "99.9% uptime"
  - label: "Sales"
    value: "$8.2M"
    desc: "234 deals closed"
  - label: "Support"
    value: "4.8/5"
    desc: "Customer rating"
  - label: "Marketing"
    value: "2.3M"
    desc: "Reach achieved"
\`\`\``,

  techTrends: `# Technology Trends 2025

> AI-generated infographic report from article analysis.

\`\`\`infographic-section
template: kpi-row-badge
heading:
  title: "Top Investment Areas"
  subtitle: "2025 Technology Market Overview"
insight:
  text: "AI leads with $150B market size and 40% CAGR, followed by Cloud Computing at $120B."
  highlight: "40% CAGR"
palette: ocean
width: 800
height: 150
items:
  - label: "AI Market"
    value: "$150B"
    trend: up
  - label: "Cloud"
    value: "$120B"
    trend: up
  - label: "Security"
    value: "$80B"
    trend: up
  - label: "Edge"
    value: "$45B"
    trend: up
\`\`\`

\`\`\`infographic-section
template: flow-timeline
heading:
  title: "AI Adoption Timeline"
  subtitle: "Enterprise deployment phases"
insight:
  text: "Three-phase AI adoption from foundation to optimization over 2024-2026."
  highlight: "Three-phase"
palette: vibrant
width: 800
height: 200
items:
  - label: "Foundation"
    desc: "2024 - Basic integration"
  - label: "Expansion"
    desc: "2025 - Enterprise-wide"
  - label: "Optimization"
    desc: "2026 - AI-driven ops"
\`\`\`

\`\`\`infographic-section
template: pie-distribution
heading:
  title: "Market Distribution"
  subtitle: "Regional breakdown"
insight:
  text: "North America dominates with 42% market share, Europe follows at 28%."
  highlight: "42%"
palette: sunset
width: 500
height: 400
items:
  - label: "North America"
    value: 42
  - label: "Europe"
    value: 28
  - label: "Asia Pacific"
    value: 22
  - label: "Rest of World"
    value: 8
footnote:
  text: "Global technology market distribution"
  source: "Industry Analysis"
\`\`\``,

  startup: `# Startup Growth Playbook

> AI-generated infographic report from article analysis.

\`\`\`infographic-section
template: flow-timeline
heading:
  title: "Funding Milestones"
  subtitle: "From Seed to Series C"
insight:
  text: "Progressive funding journey from $500K seed to $100M Series C for global expansion."
  highlight: "$100M"
palette: vibrant
width: 800
height: 200
items:
  - label: "Seed"
    desc: "$500K - MVP"
  - label: "Series A"
    desc: "$5M - Validation"
  - label: "Series B"
    desc: "$25M - Scale"
  - label: "Series C"
    desc: "$100M - Global"
\`\`\`

\`\`\`infographic-section
template: kpi-row-badge
heading:
  title: "Key Performance Indicators"
  subtitle: "Essential startup metrics"
insight:
  text: "Maintain CAC below 1/3 of LTV with churn rate under 5% monthly."
  highlight: "5% monthly"
palette: ocean
width: 800
height: 150
items:
  - label: "MRR"
    value: "Track"
    desc: "Monthly growth"
  - label: "CAC"
    value: "< 1/3 LTV"
    desc: "Acquisition cost"
  - label: "LTV"
    value: "3x CAC"
    desc: "Lifetime value"
  - label: "Churn"
    value: "< 5%"
    desc: "Monthly rate"
\`\`\`

\`\`\`infographic-section
template: flow-timeline
heading:
  title: "Go-to-Market Process"
  subtitle: "5-step launch strategy"
insight:
  text: "Systematic approach from market identification to scaling marketing and sales."
  highlight: "5-step"
palette: forest
width: 800
height: 200
items:
  - label: "Identify Market"
    desc: "Define ICP"
  - label: "Build MVP"
    desc: "Core product"
  - label: "Launch Beta"
    desc: "Early adopters"
  - label: "Iterate"
    desc: "User feedback"
  - label: "Scale"
    desc: "Growth phase"
\`\`\``
}
