# Miao Vision Documentation

Miao Vision is now focused on three product directions around `miao-viz-cli`:

- Data Display: local data files to KPI, chart, table, annotation, insight, and static HTML report artifacts.
- Article-to-Infographic: article URL or Markdown to static infographic artifacts through an agent-led workflow.
- Presentation Deck: local data files to browser-presentable slide decks through DeckSpec.

## Product Direction

- [Product Overview](./PRODUCT_OVERVIEW.md)
- [Product Restructure Direction](./miao-viz-product-restructure-direction.md)
- [Backlog Disposition](./backlog-disposition.md)
- [Feature Roadmap](./roadmap/FEATURE_ROADMAP.md)
- [Article-to-Infographic Implementation Plan](./article-to-infographic-implementation-plan.md)
- [Interactive Runtime PRD](./miao-viz-interactive-runtime-prd.md)

## Getting Started

- [Quick Start](./getting-started/quick-start.md)
- [Full Getting Started](./getting-started/GETTING_STARTED.md)

## CLI And Agent

- [Architecture Overview](./architecture/ARCHITECTURE_OVERVIEW.md)
- [CLI Agent Intelligence Design](./architecture/CLI_AGENT_INTELLIGENCE_DESIGN.md)
- [Evidence-Grounded Visualization Generation](./evidence-grounded-visualization-generation.md)
- [Agent Skill PRD](./miao-vision-agent-skill-prd.md)
- [Agent Skill Implementation Plan](./miao-vision-agent-skill-implementation-plan.md)
- [Agent Install Guide](./miao-vision-agent-install.md)

## Visual Output

- [Editorial Theme Plan](./miao-viz-cli-editorial-theme-plan.md)
- [Presentation Design](./architecture/PRESENTATION_KAMI_HYBRID_DESIGN.md)
- [Presentation Tasklist](./architecture/PRESENTATION_TASKLIST.md)

## Current Artifact Capabilities

- Data Display reports use VizSpec with profile-driven field validation, chart catalog guidance, and self-contained HTML output.
- Presentation Decks use DeckSpec with structured `INVALID_DECK_SPEC` errors, profile-backed field validation, browser navigation, fullscreen, and print/PDF export through the browser.
- Deck examples are available for sales, product metrics, finance review, and operations update under `packages/miao-viz-cli/examples/`.
