# Install Miao Vision Plugin for OpenClaw

OpenClaw consumes the same Codex-compatible Miao Vision bundle. Miao Vision
does not require a native OpenClaw runtime plugin.

## 1. Install and enable

```bash
openclaw plugins install ./miao-vision-plugin.zip
openclaw plugins enable miao-vision
openclaw gateway restart
```

For local development, replace the ZIP with the repository path and add
`--link`.

## 2. Verify

```bash
openclaw plugins inspect miao-vision --runtime --json
```

Confirm that `skills/miao-vision` is visible. On first use, approve the
versioned CLI download when the plugin's recommended version is absent. An
older compatible CLI can still be used if you decline the update. The CLI is
installed under `~/.miao-vision/bin`, not inside the plugin.

Data remains local. Plugin uninstall does not remove the shared CLI or user
artifacts. PDF browser dependencies remain optional.
