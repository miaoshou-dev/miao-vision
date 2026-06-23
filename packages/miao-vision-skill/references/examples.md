# Miao Vision Examples

## Monthly Sales Trend

```yaml
title: Monthly Sales Trend
charts:
  - type: line
    title: Monthly Sales
    data:
      transform:
        - type: derive-month
          field: order_date
          as: order_month
        - type: aggregate
          groupBy: [order_month]
          measures:
            - field: sales
              op: sum
              as: total_sales
        - type: sort
          field: order_month
          order: asc
    encoding:
      x:
        field: order_month
      y:
        field: total_sales
```

## Sales by Region

```yaml
title: Sales by Region
charts:
  - type: bar
    title: Sales by Region
    data:
      transform:
        - type: aggregate
          groupBy: [region]
          measures:
            - field: sales
              op: sum
              as: total_sales
        - type: sort
          field: total_sales
          order: desc
    encoding:
      x:
        field: region
      y:
        field: total_sales
```

## KPI

```yaml
title: Revenue KPI
charts:
  - type: bigvalue
    title: Total Sales
    data:
      transform:
        - type: aggregate
          measures:
            - field: sales
              op: sum
              as: total_sales
    encoding:
      value:
        field: total_sales
```

## Presentation Deck: Sales Executive Briefing

Use this shape when the user asks for slides, a presentation, a deck, PPT-like output, 演示文稿, or a concise executive briefing.

```yaml
title: Sales Executive Briefing
description: Four-slide browser-presentable deck generated from sales data.
theme: editorial
slides:
  - layout: cover
    eyebrow: Q4 Revenue Review
    title: Enterprise Momentum Is Driving Sales Growth
    claim: Revenue is growing, but performance is concentrated in a small number of regions and categories.

  - layout: metrics-chart
    eyebrow: Executive Snapshot
    title: Sales Are Up, With Orders Concentrated In Key Regions
    claim: Total revenue and order volume create the headline, while the region ranking shows where momentum is concentrated.
    metrics:
      - label: Total Sales
        format: "$,.0f"
        data:
          transform:
            - type: aggregate
              measures:
                - field: sales
                  op: sum
                  as: total_sales
      - label: Total Orders
        format: ",.0f"
        data:
          transform:
            - type: aggregate
              measures:
                - field: orders
                  op: sum
                  as: total_orders
    charts:
      - type: bar
        title: Sales by Region
        data:
          transform:
            - type: aggregate
              groupBy: [region]
              measures:
                - field: sales
                  op: sum
                  as: total_sales
            - type: sort
              field: total_sales
              order: desc
        encoding:
          x:
            field: region
          y:
            field: total_sales
    annotation: "Use the top region as the first discussion point; it likely explains most of the portfolio movement."

  - layout: text-chart
    eyebrow: Trend Evidence
    title: The Growth Story Depends On Sustained Monthly Momentum
    claim: Monthly sales should be read as the operating signal behind the headline KPI.
    bullets:
      - "Focus the conversation on whether the latest month extends or reverses the trend."
      - "Use gaps or sudden jumps as prompts for follow-up investigation."
      - "Compare the trend slide with regional ranking before making resource allocation decisions."
    charts:
      - type: line
        title: Monthly Sales Trend
        data:
          transform:
            - type: derive-month
              field: order_date
              as: order_month
            - type: aggregate
              groupBy: [order_month]
              measures:
                - field: sales
                  op: sum
                  as: total_sales
            - type: sort
              field: order_month
              order: asc
        encoding:
          x:
            field: order_month
          y:
            field: total_sales
    annotation: "If the latest month dips, lead the discussion with retention and pipeline quality instead of total sales."

  - layout: ending
    eyebrow: Recommendation
    title: Double Down Where Revenue And Order Momentum Overlap
    claim: Prioritize the region/category combinations that show both revenue scale and repeatable order volume.
    bullets:
      - "Protect the strongest region with targeted retention and account expansion."
      - "Investigate weaker regions before adding new acquisition spend."
      - "Use next month's trend as the checkpoint for whether the strategy is working."
    callout: "Decision ask: approve a focused growth plan for the top-performing region and category pair."
```
