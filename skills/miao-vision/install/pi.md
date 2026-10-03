# Pi

Install the Miao Vision Pi package:

```bash
pi install npm:@miao-vision/pi
```

Start Pi in the working directory, then invoke `/skill:miao-vision`. Use
`/miao-viewer` when you want to monitor a run, compare versions, request a
scoped revision, or export a selected version.

The package checks for the CLI version pinned by `cli-compatibility.json`. It
does not download or upgrade the CLI without approval. The Review Viewer binds
only to `127.0.0.1`; its URL is not a public sharing URL.
