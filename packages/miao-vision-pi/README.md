# Miao Vision for Pi

Use Miao Vision from Pi to create evidence-backed local reports, posters, decks,
and infographics. The package includes the `miao-vision` skill and a thin Pi
extension that manages the local Review Viewer.

```bash
pi install npm:@miao-vision/pi
```

In Pi, use `/skill:miao-vision` for artifact workflows and `/miao-viewer` to
start or reconnect to the local Review Viewer. Source data remains local during
ordinary report, poster, deck, article, and validation workflows.

The extension does not download the CLI automatically. If the compatible
`miao-viz` version is missing, it returns the pinned installation guidance from
the bundled skill.
