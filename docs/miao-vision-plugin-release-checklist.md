# Miao Vision Plugin Release Checklist

Use this checklist for a `skill-v*` release. The GitHub workflow builds the
native CLI, validates version metadata, tests global CLI resolution, and packs
both the primary plugin bundle and the temporary standalone Skill channel.

## Automated gate

```bash
npm run validate:plugin
npm run test:skill-runtime
npm run test:run
npm run build:cli
npm run check:size
npm run pack:plugin
npm run pack:skill
```

Inspect `dist/plugins/miao-vision-plugin.zip` and confirm it contains both
plugin manifests, the one source Skill, compatibility metadata, install
scripts, documentation, and LICENSE. It must not contain `node_modules`, a
`bin/` directory, or native CLI assets.

## Host acceptance

Run each host against the same unpacked bundle and record the host and plugin
versions in the release notes.

### Codex

- Install or load the bundle through the Codex plugin surface.
- Confirm the Miao Vision Skill is discoverable.
- Generate an HTML report and browser deck from local fixtures.
- Confirm the resolved executable is the global `miao-viz` on PATH.

### Claude Code

```bash
claude plugin validate .
claude plugin marketplace add ./ --scope local
claude plugin install miao-vision@miao-vision
```

- Generate the same report and deck.
- Upgrade and uninstall the plugin; confirm the global CLI remains usable.

### OpenClaw

```bash
openclaw plugins install ./dist/plugins/miao-vision-plugin.zip
openclaw plugins enable miao-vision
openclaw gateway restart
openclaw plugins inspect miao-vision --runtime --json
```

- Confirm the compatible Codex bundle exposes `skills/miao-vision`.
- Generate the same report and deck.
- Confirm offline reuse of the already-installed global CLI.

Do not describe a host as verified in the release notes when its acceptance
check fails. A failure in one host does not invalidate already-passed hosts.

## Removal and rollback

Plugin uninstall must not remove `~/.miao-vision` or generated artifacts.
Rollback by reinstalling the previous plugin release; its compatibility file
will reject an unsupported global CLI and request the matching version.

## Export regression gate

Install the Pi tarball in an isolated prefix and start from a directory without
package.json or node_modules. Reuse host Playwright, then test the shared
`~/.miao-vision/playwright` fallback. Confirm setup cancellation and errors do
not change business-project dependencies. Generate a verified report and
export PNG/PDF through Viewer; check readable Chinese text and page layout.
Repeat with npm and compiled native CLI. Include existing deck PPTX export.
Publish the fixed npm CLI before distributing bundles that recommend it.
