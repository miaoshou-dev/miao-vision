# Local Review Viewer

Use this reference when the user asks to monitor, review, or inspect a Miao
Vision generation run. The Viewer manages local deliverables, compares
versions, and prepares targeted revision requests. It also shows evidence
coverage, issues, and artifact previews.
Its loopback URL is not a public sharing URL.

The current Codex plugin registers the skill only. It does not configure the
Viewer MCP server or open the Viewer automatically. Start the connection
explicitly when the host supports it, then open the returned local URL in the
host's embedded browser. Do not describe the Viewer as active until it starts.

The Pi package includes an Extension that manages this MCP connection. In Pi,
use `/miao-viewer` to start or reconnect to the Viewer, `/miao-viewer status`
to inspect it, and `/miao-viewer stop` to stop it. Pi users do not configure the
Viewer MCP server separately. The command returns a loopback URL and does not
open an external browser automatically.

- `miao-viz review serve` starts only the local Viewer at
  `http://127.0.0.1:43179/` and returns its URL. Use `--port <n>` to override
  the fixed default, or `--port 0` to choose an available port.
- `miao-viz review mcp` starts the Viewer on the same fixed port and exposes the MCP tools
  `open_miao_vision_viewer` and `run_miao_viz` through stdio. This requires a
  separately configured MCP connection in the host.
- `open_miao_vision_viewer` returns the URL; it does not open a Codex browser
  panel by itself. `run_miao_viz` launches a report, deck, or article workflow
  and tracks it in the Viewer.
- For a CLI workflow started separately, pass `--review-url` and
  `--review-run-id` to publish progress to an already running Viewer. Pass
  `--review-parent-run-id` when revising an earlier run. These flags do not
  start a Viewer.

The Viewer may expose only the selected artifact root through its loopback
server. Keep source data local and continue the CLI workflow if the Viewer
stops or is unavailable. Deliver the primary artifact even if review events
could not be published.

The version view compares any two runs in the same revision family. Review
history survives a Viewer process restart in a local cache. For reports, the
edit view maps titles, charts, and insights to Spec paths. Decks map each slide,
title, claim, and chart to `slides[n]` paths. Posters map semantic title,
subtitle, chart, and footer areas to their ReportSpec paths. Reviewers can select
multiple targets and one registered theme, enter one request, then inspect a
RevisionPlan listing the proposed changes, preserved content, validations, and
risks. Confirmation alone never changes a file.

After confirmation, an Agent reads the revision with
`get_miao_vision_revision` and submits an allowlisted `PatchSet` through
`apply_miao_vision_revision`. The local service rejects unknown paths, arbitrary
files, unregistered themes, and protected data, evidence, provenance, and
encoding paths. A successful application writes a versioned child Spec and
artifact linked to its parent run. The Viewer is not a PPT, canvas, drag-drop,
or direct Spec editor.

Choose an artifact in the sidebar, select a version, and use **Export version**
to download its rendered artifact:
reports support PDF and PNG; decks support PDF and image-based PPTX; posters
support PNG. Each PPTX slide is a full-slide image, so its individual text and
charts are not editable in PowerPoint. Export reuses the selected version's
HTML and does not rerun data analysis or queries. A report with the poster
layout is recognized as a poster even though its run kind is `report`.

## Export environment

Use the same global CLI path as ordinary generation; check with
`node scripts/check-miao-viz.mjs --viewer --print-path`. Pi users run
`/miao-viewer setup` and confirm installation when prompted. Other hosts run
`node scripts/setup-export.mjs --host <host>` to check, then add `--install`
only after approval. Pass its returned `root` as `MIAO_VIZ_PLAYWRIGHT_ROOT`
when launching the Viewer. Missing dependencies do not prevent HTML preview.
The export menu reports setup requirements. Export errors retain their specific
code and repair action; export requests never install dependencies.
