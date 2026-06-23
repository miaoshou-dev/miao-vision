# Quick Start

## Install

```bash
npm install
```

## Inspect The Catalog

```bash
npm run miao-viz -- catalog
```

## Render A Report

```bash
npm run miao-viz -- render \
  --input packages/miao-viz-cli/examples/sales.csv \
  --spec packages/miao-viz-cli/examples/sales-dashboard.yaml \
  --theme editorial \
  --output /tmp/miao-viz-report.html
```

## Preview The Web App

```bash
npm run dev
```

Open `http://localhost:5173`.

The Web app is a preview/gallery/debug surface. The main product path is CLI plus VizSpec, not a full SQL Workspace.

## Next Steps

- [Full Getting Started Guide](./GETTING_STARTED.md)
- [Product Restructure Direction](../miao-viz-product-restructure-direction.md)
- [Backlog Disposition](../backlog-disposition.md)
- [Architecture Overview](../architecture/ARCHITECTURE_OVERVIEW.md)
