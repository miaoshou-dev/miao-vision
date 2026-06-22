# Miao Vision Examples

## Monthly Sales Trend

User request:

```text
Read ./sales.csv and show monthly sales trend.
```

Spec:

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

Command:

```bash
npm run --silent miao-viz -- render --input ./sales.csv --spec /tmp/miao-vision/monthly-sales.yaml --output /tmp/miao-vision/monthly-sales.html
```

## Region Ranking

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

## Multi-Chart Report

```yaml
title: Sales Dashboard
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
  - type: bar
    title: Top Categories
    data:
      transform:
        - type: aggregate
          groupBy: [category]
          measures:
            - field: sales
              op: sum
              as: total_sales
        - type: sort
          field: total_sales
          order: desc
        - type: limit
          value: 10
    encoding:
      x:
        field: category
      y:
        field: total_sales
```
