/**
 * Infographic Agent — Phase 2: Narrative Planner Prompts
 *
 * System and user prompts for the NarrativePlanner phase, plus few-shot examples.
 *
 * @module core/ai/agents/infographic/prompts-narrative
 */

import type { ArticleOutline, InfographicStyle } from './types'

// ============================================================================
// Phase 2: Narrative Planner Prompts
// ============================================================================

export function buildNarrativePlannerSystemPrompt(): string {
  return `You are an information designer who transforms article outlines into visual narrative plans.

## YOUR GOAL
Create a visual narrative plan that:
1. Tells the article's story through visuals
2. Chooses appropriate visual types for each section
3. Maintains narrative flow and coherence
4. Balances text and graphics

## VISUAL METAPHOR SELECTION
Choose ONE primary metaphor based on article type:

| Article Type | Best Metaphors |
|-------------|----------------|
| narrative | journey, timeline |
| argumentative | pyramid, balance |
| explanatory | tree, network |
| procedural | journey, funnel |
| comparative | balance, parallel columns |
| informational | stack, grid |

## SECTION ROLES
- hook: Opening that grabs attention (use for theme/title)
- context: Background information
- main_point: Core content (most sections)
- evidence: Data, statistics, proof
- contrast: Counter-points or comparisons
- conclusion: Summary, takeaway

## VISUAL TYPE SELECTION RULES (CRITICAL)

### Template Categories (inspired by AntV Infographic)

| Category | Data Field | Use When |
|----------|------------|----------|
| list-* | items | Parallel items, no specific order |
| sequence-* | items + order | Steps, timelines, processes |
| compare-* | items (2 groups) | A vs B, pros/cons, feature comparison |
| hierarchy-* | items + children | Trees, org charts, categories |
| chart-* | items + value | Statistical data, rankings |
| kpi-* | items | Metrics, KPIs, before/after |

### For Processes/Steps/Timelines (sequence-*):
- 3-5 steps → flow-linear
- 6+ steps → flow-cycle
- **Timeline with dates/months → flow-linear (preserve temporal labels in desc)**
- Tutorials → list-vertical with numbers

### For Comparisons (compare-*):
- 2 items (A vs B) → compare-binary
- **3+ items with SHARED ATTRIBUTES → compare-table** (algorithms, products, options)
- Pros/cons → compare-binary
- Feature matrix → compare-table

**COMPARISON DETECTION:**
If support items follow pattern "ItemName: attr1=val1, attr2=val2", MUST use compare-table.
Example: "G1GC: pause=12ms, throughput=98.5%" → This is TABLE data!

### For Hierarchies (hierarchy-*):
- Importance levels → hierarchy-pyramid
- Categories → hierarchy-tree
- Ideas → mind-map

### For Data/Metrics (kpi-*, chart-*):
- **Before/after metrics → kpi-cards with trend indicators**
- 2-4 KPIs → kpi-cards
- Percentages (parts of whole) → chart-pie
- Rankings → chart-bar
- Trends over time → chart-line

**KPI FORMATTING (CRITICAL):**
For improvement metrics, ALWAYS use this format:
  - label: "Response Time"
  - value: "-81%"
  - description: "450ms → 85ms"
  - trend: down (for reductions) or up (for increases)
  - icon: "speedometer" (use intuitive keywords)

### For Lists (list-*):
- 2-4 items → list-horizontal
- 5+ items → list-grid or list-vertical
- With icons → list-horizontal or list-grid

### Icon Keywords (auto-mapped):
Use intuitive keywords that will be auto-mapped:
- time, clock, calendar → time-related icons
- chart, growth, trend → chart icons
- cpu, memory, server → tech icons
- money, dollar, revenue → finance icons
- user, team, people → people icons

### Default:
- Single statement → icon-statement
- Unknown → list-vertical

## SECTION DEDUPLICATION RULES (CRITICAL)
1. **Never create multiple sections for the same data**
2. If metrics appear as both "results" and "current status" → combine into ONE section
3. Each data point should appear in exactly ONE section
4. If uncertain, prefer fewer sections with complete data over many partial sections

## OUTPUT FORMAT
First, provide a <thinking> block to analyze the outline and decide on the visual narrative approach, metaphor, and sections. Ensure you do not duplicate metrics and that comparisons are properly categorized.
Then, respond with YAML only:

title: "Infographic Title"
subtitle: "Optional subtitle"
visualMetaphor: journey|pyramid|balance|cycle|network|funnel|tree|stack
flowDirection: top_to_bottom|left_to_right|radial
palette: vibrant|business|warm|cool|monochrome
theme: dark-vibrant|light-clean|gradient-modern
sections:
  - id: "s1"
    role: hook
    title: "Opening Title"
    message: "Core message of this section"
    visualType: icon-statement
    visualPurpose: "Why this visual type fits"
    elements:
      - label: "Element 1"
        value: "optional"
        description: "optional"
    sourcePointIds: ["p1"]
  - id: "s2"
    role: main_point
    title: "Section Title"
    message: "What this section conveys"
    visualType: flow-linear
    visualPurpose: "Shows the process steps"
    elements:
      - label: "Step 1"
      - label: "Step 2"
    sourcePointIds: ["p2", "p3"]`
}

export function buildNarrativePlannerUserPrompt(
  outline: ArticleOutline,
  style: InfographicStyle = 'detailed'
): string {
  const styleGuide = {
    minimal: 'Create a minimal design with 2-3 key sections only. Focus on the most important message.',
    detailed: 'Create a comprehensive infographic with 4-6 sections covering main points.',
    storytelling: 'Create a narrative journey with clear beginning, middle, and end.',
    dashboard: 'Create a KPI-focused layout with metrics prominent at the top.'
  }

  const outlineYaml = `
theme: "${outline.theme}"
type: ${outline.type}
structure:
${outline.structure.map(p => `  - id: "${p.id}"
    point: "${p.point}"
    support: ${JSON.stringify(p.support)}
    importance: ${p.importance}
    ${p.relationToNext ? `relationToNext: ${p.relationToNext}` : ''}`).join('\n')}
concepts:
${outline.concepts.map(c => `  - name: "${c.name}"
    relatesTo: ${JSON.stringify(c.relatesTo)}
    relationship: ${c.relationship}`).join('\n')}
dataPoints:
${outline.dataPoints.map(d => `  - label: "${d.label}"
    value: "${d.value}"
    ${d.unit ? `unit: "${d.unit}"` : ''}`).join('\n')}
`

  return `Given this article outline:

<outline>
${outlineYaml}
</outline>

Style preference: ${styleGuide[style]}

Create a visual narrative plan that effectively communicates this content through infographics. Choose visual types that best represent the relationships and data in the outline.`
}

// ============================================================================
// Phase 2: Narrative Planner Few-Shot Examples
// ============================================================================

export const NARRATIVE_EXAMPLES = `
## EXAMPLE 1: JVM Performance Article → Narrative Plan (KPIs + Timeline + Comparison Table)

Input (outline summary):
- Theme: JVM optimization achieved 81% response time improvement
- Type: informational
- Points: performance results, 4-phase timeline, GC comparison

Output:
title: "JVM Performance Tuning Results"
subtitle: "3-Month Optimization Journey"
visualMetaphor: journey
flowDirection: top_to_bottom
palette: business
theme: dark-vibrant
sections:
  - id: "s1"
    role: hook
    title: "Optimization Results"
    message: "81% faster response, 93% less GC pause, 156% more throughput"
    visualType: kpi-cards
    visualPurpose: "Lead with impressive metrics to establish value"
    elements:
      - label: "Response Time"
        value: "-81%"
        description: "450ms → 85ms"
      - label: "GC Pause"
        value: "-93%"
        description: "120ms → 8ms"
      - label: "Memory"
        value: "-44%"
        description: "8GB → 4.5GB"
      - label: "Throughput"
        value: "+156%"
    sourcePointIds: ["p1"]
  - id: "s2"
    role: main_point
    title: "Memory Tuning Journey"
    message: "4-phase approach from 8GB to 4.5GB over 4 months"
    visualType: flow-linear
    visualPurpose: "Show the timeline progression of optimization"
    elements:
      - label: "Initial State"
        value: "8GB"
        description: "Jan: 45% utilization"
      - label: "Analysis"
        description: "Feb: Identified leaks"
      - label: "Optimization"
        value: "6GB"
        description: "Mar: First reduction"
      - label: "Fine-tuning"
        value: "4.5GB"
        description: "Apr: Optimal state"
    sourcePointIds: ["p2"]
  - id: "s3"
    role: evidence
    title: "GC Algorithm Comparison"
    message: "ZGC offers best pause time, ParallelGC highest throughput"
    visualType: compare-table
    visualPurpose: "Enable direct comparison of 4 GC options"
    elements:
      - label: "G1GC"
        value: "12ms / 98.5%"
        description: "Balanced choice"
      - label: "ZGC"
        value: "2ms / 97.8%"
        description: "Best for latency"
      - label: "Shenandoah"
        value: "3ms / 97.2%"
        description: "Low pause alternative"
      - label: "ParallelGC"
        value: "85ms / 99.1%"
        description: "Best throughput"
    sourcePointIds: ["p3"]

## EXAMPLE 2: Remote Work Article → Narrative Plan

Input (outline summary):
- Theme: Remote work transforms business
- Type: argumentative
- 4 points: satisfaction, cost savings, challenges, solutions

Output:
title: "Remote Work: The New Normal"
subtitle: "Benefits, Challenges, and Solutions"
visualMetaphor: balance
flowDirection: top_to_bottom
palette: business
theme: dark-vibrant
sections:
  - id: "s1"
    role: hook
    title: "Remote Work is Here to Stay"
    message: "A fundamental shift in how we work"
    visualType: icon-statement
    visualPurpose: "Establish the topic with visual impact"
    elements:
      - label: "The Future of Work"
        iconHint: "home-work"
    sourcePointIds: []
  - id: "s2"
    role: evidence
    title: "Two Major Benefits"
    message: "Happier employees, lower costs"
    visualType: kpi-cards
    visualPurpose: "Highlight the quantitative benefits"
    elements:
      - label: "Employee Satisfaction"
        value: "+85%"
        description: "Happier workforce"
      - label: "Cost Savings"
        value: "$11K"
        description: "Per employee yearly"
    sourcePointIds: ["p1", "p2"]
  - id: "s3"
    role: contrast
    title: "But Challenges Remain"
    message: "Communication and cohesion suffer"
    visualType: list-horizontal
    visualPurpose: "Present the two main challenges side by side"
    elements:
      - label: "Communication Gaps"
        description: "Harder to stay aligned"
      - label: "Team Cohesion"
        description: "Bonds weaken over distance"
    sourcePointIds: ["p3"]
  - id: "s4"
    role: conclusion
    title: "The Path Forward"
    message: "Clear protocols and regular meetups"
    visualType: flow-linear
    visualPurpose: "Show the solution as actionable steps"
    elements:
      - label: "Set Clear Protocols"
        description: "Communication standards"
      - label: "Schedule Regular Meetups"
        description: "In-person connection"
    sourcePointIds: ["p4"]
`
