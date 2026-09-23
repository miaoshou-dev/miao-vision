# Local Review Viewer

Use this reference when the user asks to monitor, review, or inspect a Miao
Vision generation run. The Viewer is a read-only local surface for workflow
stages, evidence coverage, issues, revision history, and artifact preview.
Its loopback URL is not a public sharing URL.

The current Codex plugin registers the skill only. It does not configure the
Viewer MCP server or open the Viewer automatically. Start the connection
explicitly when the host supports it, then open the returned local URL in the
host's embedded browser. Do not describe the Viewer as active until it starts.

- `miao-viz review serve` starts only the local Viewer and returns its URL.
- `miao-viz review mcp` starts the Viewer and exposes the MCP tools
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
