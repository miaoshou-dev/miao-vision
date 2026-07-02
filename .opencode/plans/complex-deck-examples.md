# Build Complex Deck Examples

## Steps (in order)

### 1. Delete `examples/sales-dashboard.yaml`
```
rm packages/miao-viz-cli/examples/sales-dashboard.yaml
```
This is a report spec, not a deck spec — mixed into examples/ by mistake.

### 2. Create `examples/executive-overview.csv` (36 rows)

```
date,region,product,segment,revenue,units,cost,profit
2025-01-01,East,Alpha,Enterprise,45000,120,28000,17000
2025-01-01,East,Beta,SMB,32000,85,21000,11000
2025-01-01,East,Gamma,Enterprise,28000,70,19000,9000
2025-01-01,West,Alpha,Enterprise,38000,100,25000,13000
2025-01-01,West,Beta,SMB,29000,78,20000,9000
2025-01-01,West,Gamma,Enterprise,22000,55,16000,6000
2025-01-01,North,Alpha,Enterprise,31000,82,21000,10000
2025-01-01,North,Beta,SMB,24000,65,17000,7000
2025-01-01,North,Gamma,Enterprise,18000,48,13000,5000
2025-01-01,South,Alpha,Enterprise,35000,92,23000,12000
2025-01-01,South,Beta,SMB,26000,70,18000,8000
2025-01-01,South,Gamma,Enterprise,20000,52,14000,6000
2025-02-01,East,Alpha,Enterprise,51000,135,31000,20000
2025-02-01,East,Beta,SMB,36000,95,23000,13000
2025-02-01,East,Gamma,Enterprise,32000,80,21000,11000
2025-02-01,West,Alpha,Enterprise,42000,110,27000,15000
2025-02-01,West,Beta,SMB,32000,86,22000,10000
2025-02-01,West,Gamma,Enterprise,25000,62,18000,7000
2025-02-01,North,Alpha,Enterprise,35000,92,23000,12000
2025-02-01,North,Beta,SMB,27000,72,19000,8000
2025-02-01,North,Gamma,Enterprise,21000,55,15000,6000
2025-02-01,South,Alpha,Enterprise,39000,102,25000,14000
2025-02-01,South,Beta,SMB,29000,78,20000,9000
2025-02-01,South,Gamma,Enterprise,23000,60,16000,7000
2025-03-01,East,Alpha,Enterprise,58000,150,34000,24000
2025-03-01,East,Beta,SMB,40000,105,25000,15000
2025-03-01,East,Gamma,Enterprise,36000,90,23000,13000
2025-03-01,West,Alpha,Enterprise,48000,125,30000,18000
2025-03-01,West,Beta,SMB,36000,95,24000,12000
2025-03-01,West,Gamma,Enterprise,29000,72,20000,9000
2025-03-01,North,Alpha,Enterprise,40000,105,26000,14000
2025-03-01,North,Beta,SMB,31000,82,21000,10000
2025-03-01,North,Gamma,Enterprise,24000,62,17000,7000
2025-03-01,South,Alpha,Enterprise,44000,115,28000,16000
2025-03-01,South,Beta,SMB,33000,88,22000,11000
2025-03-01,South,Gamma,Enterprise,26000,68,18000,8000
```

**Schema**: 3 months × 4 regions × 3 products = 36 rows. Revenue grows month-over-month, East > South > West > North. Alpha (Enterprise) > Beta (SMB) > Gamma (Enterprise) in revenue. Profit = revenue - cost.

### 3. Create `examples/executive-overview-deck.yaml`

```yaml
title: Executive Overview
description: Revenue grew 22% QoQ driven by Alpha product adoption in East and South regions.
theme: editorial
slides:
  - layout: cover
    eyebrow: "2025 · Q1 Review"
    title: "Executive Overview"
    claim: "Revenue grew 22% QoQ driven by strong Enterprise product adoption."

  - layout: title-only
    title: "01 · Performance Highlights"

  - layout: metrics-chart
    eyebrow: "01 · PERFORMANCE HIGHLIGHTS"
    title: "Revenue Growth Accelerated While Margins Held"
    metrics:
      - label: Total Revenue
        format: "$,.0f"
        data:
          transform:
            - type: aggregate
              measures:
                - field: revenue
                  op: sum
                  as: v
      - label: Total Units
        format: ",.0f"
        data:
          transform:
            - type: aggregate
              measures:
                - field: units
                  op: sum
                  as: v
      - label: Gross Margin
        format: "%"
        data:
          transform:
            - type: aggregate
              measures:
                - field: profit
                  op: sum
                  as: total_profit
            - type: aggregate
              measures:
                - field: revenue
                  op: sum
                  as: total_revenue
      - label: Avg Deal Size
        format: "$,.0f"
        data:
          transform:
            - type: aggregate
              measures:
                - field: revenue
                  op: sum
                  as: total_revenue
            - type: aggregate
              measures:
                - field: units
                  op: sum
                  as: total_units
    charts:
      - type: area
        title: Monthly Revenue
        data:
          transform:
            - type: derive-month
              field: date
              as: month
            - type: aggregate
              groupBy: [month]
              measures:
                - field: revenue
                  op: sum
                  as: total
            - type: sort
              field: month
              order: asc
        encoding:
          x: { field: month }
          y: { field: total }

  - layout: text-points
    eyebrow: "02 · KEY INSIGHTS"
    title: "Revenue Drivers"
    claim: "Three trends shaped the quarter: Enterprise expansion, regional balance, and product mix."
    bullets:
      - "Enterprise segment (Alpha + Gamma) contributed 68% of total revenue across all regions."
      - "East region grew 29% QoQ, the fastest among all four regions."
      - "Product Alpha leads with 42% revenue share, up from 40% in January."
    callout: "Recommendation: Expand Alpha capacity in North region to capture untapped demand."

  - layout: title-only
    title: "02 · Revenue Breakdown"

  - layout: text-chart
    eyebrow: "03 · PRODUCT MIX"
    title: "Product Revenue Is Concentrated in Alpha"
    annotation: "Alpha is the top revenue product across every region."
    bullets:
      - "Alpha: 42% share, driven by Enterprise accounts."
      - "Beta: 31% share, strongest in East and South."
      - "Gamma: 27% share, growth opportunity in West."
    charts:
      - type: pie
        title: Revenue by Product
        data:
          transform:
            - type: aggregate
              groupBy: [product]
              measures:
                - field: revenue
                  op: sum
                  as: total
            - type: sort
              field: total
              order: desc
        encoding:
          label: { field: product }
          value: { field: total }

  - layout: chart-full
    eyebrow: "04 · REGIONAL"
    title: "Revenue by Region"
    charts:
      - type: bar
        title: Revenue by Region
        data:
          transform:
            - type: aggregate
              groupBy: [region]
              measures:
                - field: revenue
                  op: sum
                  as: total
            - type: sort
              field: total
              order: desc
        encoding:
          x: { field: region }
          y: { field: total }
          color: { field: region }

  - layout: ending
    title: "Focus on North region growth"
    claim: "Enterprise product expansion in North is the highest-ROI opportunity for Q2."
```

### 4. Create `examples/campaign-data.csv` (32 rows)

```
week,channel,impressions,clicks,conversions,spend
2025-W01,Social,52000,2100,85,3400
2025-W01,Search,38000,1850,72,2900
2025-W01,Email,15000,980,45,1200
2025-W01,Display,28000,620,18,2100
2025-W02,Social,58000,2400,98,3600
2025-W02,Search,42000,2100,84,3100
2025-W02,Email,17000,1050,50,1250
2025-W02,Display,31000,680,22,2200
2025-W03,Social,65000,2750,112,3800
2025-W03,Search,46000,2300,92,3200
2025-W03,Email,19000,1120,55,1300
2025-W03,Display,35000,750,26,2300
2025-W04,Social,72000,3100,128,4000
2025-W04,Search,51000,2500,101,3400
2025-W04,Email,21000,1200,60,1400
2025-W04,Display,38000,820,30,2400
2025-W05,Social,68000,2900,118,3900
2025-W05,Search,48000,2400,95,3300
2025-W05,Email,20000,1150,57,1350
2025-W05,Display,36000,790,28,2350
2025-W06,Social,76000,3300,135,4200
2025-W06,Search,54000,2650,108,3500
2025-W06,Email,23000,1280,65,1450
2025-W06,Display,40000,860,33,2500
2025-W07,Social,81000,3550,148,4400
2025-W07,Search,58000,2800,115,3600
2025-W07,Email,25000,1350,70,1500
2025-W07,Display,43000,910,36,2600
2025-W08,Social,88000,3900,162,4600
2025-W08,Search,62000,3000,125,3800
2025-W08,Email,27000,1420,75,1550
2025-W08,Display,46000,960,40,2700
```

**Schema**: 8 weeks × 4 channels = 32 rows. Social > Search > Display > Email in impressions and spend. CTR: Social ~4%, Search ~5%, Email ~5.5%, Display ~2.2%.

### 5. Create `examples/campaign-report-deck.yaml`

```yaml
title: Campaign Performance Report
theme: dark
slides:
  - layout: cover
    eyebrow: "2025 · Q1 Campaigns"
    title: "Campaign Performance"
    claim: "Social and Search channels drove 74% of conversions with improving efficiency."

  - layout: metrics-chart
    eyebrow: "01 · CAMPAIGN SNAPSHOT"
    title: "Scale Improved While Efficiency Stayed Strong"
    metrics:
      - label: Total Impressions
        format: ".0s"
        data:
          transform:
            - type: aggregate
              measures:
                - field: impressions
                  op: sum
                  as: v
      - label: Avg CTR
        format: "%"
        data:
          transform:
            - type: aggregate
              measures:
                - field: clicks
                  op: sum
                  as: total_clicks
            - type: aggregate
              measures:
                - field: impressions
                  op: sum
                  as: total_impressions
      - label: CPA
        format: "$,.0f"
        data:
          transform:
            - type: aggregate
              measures:
                - field: spend
                  op: sum
                  as: total_spend
            - type: aggregate
              measures:
                - field: conversions
                  op: sum
                  as: total_conversions
    charts:
      - type: line
        title: Weekly Clicks
        data:
          transform:
            - type: aggregate
              groupBy: [week]
              measures:
                - field: clicks
                  op: sum
                  as: total
            - type: sort
              field: week
              order: asc
        encoding:
          x: { field: week }
          y: { field: total }

  - layout: text-chart
    eyebrow: "02 · CHANNEL EFFICIENCY"
    title: "Social Scales While Email Converts"
    annotation: "Social drives the most volume; Email has the best conversion rate per impression."
    bullets:
      - "Social: 41% of conversions, CPA trending down over the campaign."
      - "Search: consistent volume with stable CPA."
      - "Display: lowest CTR at 2.2%, but useful for top-of-funnel reach."
    charts:
      - type: scatter
        title: Spend vs Conversions
        data:
          transform:
            - type: aggregate
              groupBy: [channel]
              measures:
                - field: spend
                  op: sum
                  as: total_spend
                - field: conversions
                  op: sum
                  as: total_conversions
        encoding:
          x: { field: total_spend }
          y: { field: total_conversions }

  - layout: title-only
    title: "03 · Channel Performance"

  - layout: chart-full
    eyebrow: "04 · DISTRIBUTION"
    title: "Impression Distribution"
    charts:
      - type: histogram
        title: Impression Distribution
        data:
          transform:
            - type: filter
              field: impressions
              op: ">"
              value: 0
        encoding:
          x: { field: impressions }

  - layout: table-full
    eyebrow: "05 · TOP CAMPAIGNS"
    title: "Top Campaigns by Conversions"
    charts:
      - type: table
        title: Top Campaigns
        data:
          transform:
            - type: sort
              field: conversions
              order: desc
            - type: limit
              value: 10
        encoding:
          x: { field: channel }
          y: { field: conversions }

  - layout: ending
    title: "Scale Social, protect Search, test Email retargeting"
    claim: "Increase Social budget 15% and test Display retargeting in Q2."
```

**Note**: The `filter` transform on histogram uses `op: ">"` which is the string format used in the chart-catalog. If the data-transform module expects a different filter format, adjust accordingly. The histogram may also need an explicit `bin` field — if so, use `encoding: { x: { field: "impressions", bin: true } }` instead of the filter approach.

### 6. Add smoke tests to `deck.test.ts`

In `describe('deck example smoke tests')`, add two entries to the `examples` array:

```ts
{ input: 'packages/miao-viz-cli/examples/executive-overview.csv',
  spec: 'packages/miao-viz-cli/examples/executive-overview-deck.yaml', slides: 8 },
{ input: 'packages/miao-viz-cli/examples/campaign-data.csv',
  spec: 'packages/miao-viz-cli/examples/campaign-report-deck.yaml', slides: 7 }
```

The test already parameterizes `--theme editorial` for all examples. For campaign-report (dark theme), the spec's `theme: dark` will be overridden by the test's `--theme editorial`. This is fine for smoke testing — the dark theme rendering is tested via the unit tests already added in "deck theme integration" block.

### 7. Verify

```bash
npm run test:run
npm run check:size
npm run miao-viz -- deck \
  --input packages/miao-viz-cli/examples/executive-overview.csv \
  --spec packages/miao-viz-cli/examples/executive-overview-deck.yaml \
  --theme editorial \
  --output /tmp/executive-overview.html

npm run miao-viz -- deck \
  --input packages/miao-viz-cli/examples/campaign-data.csv \
  --spec packages/miao-viz-cli/examples/campaign-report-deck.yaml \
  --theme dark \
  --output /tmp/campaign-report.html
```

## What Each Example Covers

| Feature | executive-overview | campaign-report |
|---------|:-:|:-:|
| `title-only` layout | ✓ | ✓ |
| `text-points` layout | ✓ | |
| `text-chart` + pie | ✓ | |
| `text-chart` + scatter | | ✓ |
| `area` chart | ✓ | |
| `histogram` chart | | ✓ |
| `pie` chart | ✓ | |
| `description` field | ✓ | |
| `dark` theme | | ✓ |
| SI prefix `.0s` format | | ✓ |
| Larger dataset (30+ rows) | ✓ | ✓ |
| All 9 chart types covered | bar, line, area, pie (4) | line, scatter, histogram, table (4) |
