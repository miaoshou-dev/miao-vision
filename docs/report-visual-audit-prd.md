# Report Visual Audit PRD

> Date: 2026-07-09  
> Product area: `miao-viz-cli` agent workflow quality gate  
> Status: proposal

## 1. Background

Miao Vision is positioned as an AI-first, local-first visualization artifact generator. The core workflow lets an agent analyze a local data file, write a compact VizSpec or DeckSpec, validate it, and render a self-contained HTML report or deck.

This improves generation speed and visual consistency, but it does not fully answer the user's most important trust questions:

- Is this number actually computed from my data?
- Is this claim supported by evidence?
- Did the agent overstate a weak signal as a trend or recommendation?
- Is this chart type appropriate for this dataset?
- Did data quality warnings make it into the report?

Current validation already checks structure, fields, chart rules, `$evidence:` paths, and some verify warnings. Report Visual Audit productizes these checks into a first-class audit artifact that agents can use to repair reports and users can use to review risk before sharing.

## 2. Product Positioning

Report Visual Audit is a deterministic quality gate for agent-generated data reports.

```text
Agent = author
CLI Audit = reviewer
Renderer = publisher
```

It does not generate the report. It does not beautify the report. It checks whether the report is evidence-supported, chart-appropriate, and safe enough to share.

The product promise:

> Every number has a source, every claim is checked, and every risk is surfaced.

## 3. Goals

- Turn report trust checks into a structured CLI output, not a prompt-only agent convention.
- Give agents machine-readable issues, severity, and repair suggestions.
- Give users a concise status: `ready`, `needs_review`, or `blocked`.
- Reduce hallucinated numbers, unsupported claims, over-strong language, and misleading chart choices.
- Preserve Miao Vision's separation of responsibilities: agents choose and write, CLI computes and verifies.
- Reuse existing validator, evidence resolver, catalog rules, and patch-hint behavior instead of creating a second rule system.

## 4. Non-Goals

- Do not claim absolute truth or compliance-grade audit.
- Do not verify whether the original dataset itself is correct.
- Do not infer business causality.
- Do not run an LLM inside the CLI.
- Do not make audit mandatory for quick previews.
- Do not turn the CLI into a full autonomous agent loop.
- Do not block all warnings; medium-risk reports may still render with caveats.

## 5. Target Users

### AI Agent Users

Users who ask Codex, Claude Code, or another shell-capable agent to generate a report from a local data file. They need the agent to repair issues without inventing evidence.

### Analysts And Business Users

Users who want to share a generated report with a team, manager, client, or investor and need confidence that key claims are grounded.

### Developers

Users who want a scriptable quality gate in CI, scheduled report generation, or local automation.

## 6. Recommended Workflow

MVP workflow:

```bash
miao-viz data analyze ./sales.csv \
  --intent "monthly trend and top regions" \
  --output /tmp/miao-vision/context.json

# Agent writes /tmp/miao-vision/report.yaml

miao-viz spec validate \
  --spec /tmp/miao-vision/report.yaml \
  --context /tmp/miao-vision/context.json \
  --verify

miao-viz spec audit \
  --spec /tmp/miao-vision/report.yaml \
  --context /tmp/miao-vision/context.json \
  --output /tmp/miao-vision/audit.json

miao-viz render report \
  --input ./sales.csv \
  --spec /tmp/miao-vision/report.yaml \
  --context /tmp/miao-vision/context.json \
  --output /tmp/miao-vision/report.html
```

Later workflow:

```bash
miao-viz render report \
  --input ./sales.csv \
  --spec ./report.yaml \
  --context ./context.json \
  --audit \
  --output ./report.html
```

## 7. Audit Status Model

Audit should avoid a first-version numeric trust score. A score can be misread as "truth percentage." Use a small status model instead:

```text
ready
  No high or medium issues. Safe to render/share.

needs_review
  No high issues, but medium issues remain. Render is allowed with caveats or audit summary.

blocked
  One or more high issues remain. Agent should repair or stop.
```

Severity levels:

```text
high
  Makes the report materially untrustworthy or invalid.

medium
  Needs review or caveat, but may not block rendering.

low
  Quality or polish issue.
```

## 8. Audit Dimensions

### 8.1 Evidence Coverage

Checks:

- Which evidence ids are defined in `context.evidence`.
- Which evidence ids are referenced by `insights[]` and `$evidence:` directives.
- Which generated evidence is unused.
- Whether every `$evidence:<id>.<path>` resolves.
- Whether every structured `insight.evidence[]` id exists.

Example output:

```json
{
  "defined": ["total", "by_dimension", "by_time"],
  "referenced": ["total", "by_dimension"],
  "unreferenced": ["by_time"],
  "missingRefs": []
}
```

### 8.2 Claim Audit

Checks every report insight:

- Numeric claim without structured evidence.
- Missing or invalid `$evidence:` path.
- Missing `insight.evidence[]`.
- High-risk words such as `trend`, `significant`, `drive`, `strong correlation`, and `should`.
- Caveat requirement when `context.sampleWarnings` exists.

Example output:

```json
{
  "path": "/insights/0",
  "status": "verified",
  "text": "East leads with $evidence:by_dimension.rows[0].total_sales.",
  "evidenceRefs": [
    {
      "id": "by_dimension",
      "path": "rows[0].total_sales",
      "resolvedValue": 520000
    }
  ],
  "issues": []
}
```

### 8.3 Chart Audit

Checks every chart:

- Chart type is supported.
- Chart type is not blocked by `context.catalog.blockedCharts`.
- Required encodings exist.
- Encoding fields exist in source data or final transform schema.
- Chart type matches obvious role expectations when available.
- Catalog warning rules are triggered when applicable.
- Common misleading patterns such as too many pie slices, missing rank sort, or weak time-series support.

Example output:

```json
{
  "path": "/charts/1",
  "id": "region_share",
  "type": "pie",
  "status": "warning",
  "issues": [
    {
      "code": "TOO_MANY_SLICES",
      "severity": "medium",
      "message": "Pie chart has too many categories.",
      "suggestion": "Use a bar chart with top-N limit."
    }
  ]
}
```

### 8.4 Caveat Audit

Checks whether context warnings are represented in report claims:

- Small sample.
- Only two time periods.
- Missing or weak distribution support.
- Data quality warnings.

Example output:

```json
{
  "code": "MISSING_SAMPLE_CAVEAT",
  "severity": "medium",
  "message": "context.sampleWarnings exists but no insight contains a caveat.",
  "suggestion": "Add a caveat such as 'based on limited rows only'."
}
```

### 8.5 Repair Suggestions

Every issue should include a human-readable suggestion. Some issues may also include a machine-applicable JSON Patch.

Only include a patch when the fix is local and deterministic.

Good patch:

```json
{
  "op": "add",
  "path": "/insights/1/caveat",
  "value": "Interpret cautiously due to limited sample size."
}
```

Bad patch:

```text
Rewrite the report to be more accurate.
```

## 9. Audit JSON Contract

MVP output:

```json
{
  "ok": true,
  "status": "needs_review",
  "summary": {
    "riskLevel": "medium",
    "claimCount": 5,
    "verifiedClaims": 3,
    "warningClaims": 2,
    "chartCount": 4,
    "chartWarnings": 1,
    "evidenceCoverage": 0.8
  },
  "evidence": {
    "defined": ["total", "by_dimension", "by_time"],
    "referenced": ["total", "by_dimension"],
    "unreferenced": ["by_time"],
    "missingRefs": []
  },
  "claims": [],
  "charts": [],
  "caveats": [],
  "issues": [],
  "repairPolicy": {
    "maxRounds": 2,
    "recommendedNextAction": "apply_patches",
    "stopIfSameIssueRepeats": true
  }
}
```

Issue shape:

```json
{
  "code": "MISSING_SAMPLE_CAVEAT",
  "severity": "medium",
  "path": "/insights/1",
  "fingerprint": "MISSING_SAMPLE_CAVEAT:/insights/1",
  "autoFixable": true,
  "fixStrategy": "append_caveat",
  "message": "A sample warning exists but this insight has no caveat.",
  "suggestion": "Add a caveat to the insight.",
  "patch": {
    "op": "add",
    "path": "/insights/1/caveat",
    "value": "Interpret cautiously due to limited sample size."
  }
}
```

## 10. Agent Repair Loop Policy

Audit is intended to support an agent loop, but the loop must be bounded.

Required agent rules:

- Run at most two repair rounds after the initial audit.
- Apply machine-readable patches before free-form edits.
- Never invent evidence to satisfy audit.
- Do not rewrite the entire spec unless audit reports a structural issue.
- Only auto-fix issues with `autoFixable: true`.
- If the same issue fingerprint appears twice, stop and report it.
- If a repair introduces a new high-severity issue, stop and report both old and new issues.
- For non-auto-fixable high issues, remove or downgrade the unsupported claim instead of guessing.
- High issues block rendering unless explicitly overridden by the user.
- Medium issues may render with caveats or audit summary.
- Low issues do not block rendering.

Recommended loop:

```text
draft spec
  -> audit #1
  -> fix high auto-fixable issues
  -> audit #2
  -> fix remaining safe medium issues
  -> audit #3
  -> render, render with caveats, or stop
```

## 11. CLI Surface

MVP command:

```bash
miao-viz spec audit \
  --spec report.yaml \
  --context context.json \
  --output audit.json
```

Optional flags:

```bash
--format json|html
--strict
--patch-hints
--max-issues 50
```

Later commands:

```bash
miao-viz spec audit \
  --spec report.yaml \
  --context context.json \
  --format html \
  --output audit.html

miao-viz render report \
  --input sales.csv \
  --spec report.yaml \
  --context context.json \
  --audit
```

## 12. Implementation Notes

Suggested modules:

```text
packages/miao-viz-cli/src/report-audit.ts
packages/miao-viz-cli/src/claim-audit.ts
packages/miao-viz-cli/src/chart-audit.ts
```

Reuse existing capabilities:

- `validateEvidencePaths`
- `collectVerifyWarnings`
- `collectValidationWarnings`
- `parseEvidenceRefs`
- `resolveEvidencePath`
- catalog rules and `blockedCharts`
- `patch-hints`
- `cli-inspect`

Do not fork validation logic. Audit should compose validator output, evidence resolution, and catalog checks into a durable product artifact.

## 13. Human-Readable Audit HTML

Phase 2 can add `audit.html` for non-agent users.

Recommended structure:

```text
Summary
  Status, risk level, claim count, chart count.

Evidence Map
  Defined, referenced, unused, missing.

Claim Review
  Verified claims, weak claims, unsupported claims.

Chart Review
  Suitable charts, risky charts, blocked chart choices.

Caveat Review
  Required caveats and where they appear.

Suggested Fixes
  High and medium priority repairs.
```

The report artifact may later include a small optional proof panel:

```text
Evidence checked
5 claims reviewed
1 caveat applied
```

Details should remain collapsed by default so audit does not distract from the main report.

## 14. Phasing

### Phase 1: JSON Audit

- Add `miao-viz spec audit`.
- Output `status`, `summary`, `evidence`, `claims`, `charts`, `issues`, and `repairPolicy`.
- Support evidence coverage, claim support, chart warnings, and caveat warnings.

### Phase 2: Agent Repair Protocol

- Add stable issue fingerprints.
- Mark issues as auto-fixable or not.
- Emit local patches where deterministic.
- Update the Miao Vision skill instructions to run bounded repair loops.

### Phase 3: HTML Audit

- Add `--format html`.
- Produce a readable audit review page.
- Keep HTML self-contained.

### Phase 4: Optional Proof Panel

- Let report render optionally include a collapsed proof panel.
- Show only summary by default.
- Link to full `audit.html` when present.

## 15. Success Metrics

- Fewer generated reports with unsupported numeric claims.
- Fewer invalid `$evidence:` paths reaching render.
- Fewer over-strong trend/significance/causality phrases without support.
- More reports containing required caveats when sample warnings exist.
- Agent repair loops terminate within the configured round budget.
- Users can understand whether a report is `ready`, `needs_review`, or `blocked` without reading the spec.

## 16. Key Product Risk

The main risk is overclaiming. Audit should not be described as proving truth. It should be described as checking evidence support and report risk.

Preferred language:

```text
Evidence checked.
Claims reviewed.
Risks surfaced.
```

Avoid:

```text
Truth verified.
Compliance approved.
Factually guaranteed.
```

## 17. Product Differentiation

Claude and ChatGPT design tools can generate visually polished artifacts, but they rarely provide a deterministic proof chain for every report claim.

Report Visual Audit makes Miao Vision different:

```text
Other tools generate a page that looks right.
Miao Vision generates a report that can show why it is supported.
```

