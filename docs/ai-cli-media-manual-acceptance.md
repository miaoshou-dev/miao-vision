# Miao Vision AI Media Acceptance Matrix

Use this sheet for release-candidate acceptance. Save no credentials or raw data. For each run, record the user input, `promptMode`, argument array with the prompt redacted when sensitive, exit status, and delivered relative paths.

## Offline Acceptance

These cases are covered by `skills/miao-vision/scripts/ai-media-runtime.test.mjs` with temporary directories and a fake `ai` executable:

| Case | Expected |
|---|---|
| Professional prompt | Exact prompt value reaches the argument array |
| Short image request | Only permitted defaults are appended by the Skill |
| Image/video success | Valid signature, one delivery, local manifest |
| Partial/all failure | Only valid files delivered; stable failure otherwise |
| Timeout/invalid JSON | Structured retry-safe failure |
| Missing ai-cli/Key, Node 20, missing model | Distinct error codes |
| Reference count/path/MIME | Rejected before remote execution |
| Output escape/symlink/empty/bad signature | Rejected as invalid delivery |
| No confirmation | No subprocess and no output directory |
| Shell metacharacters | Preserved as one argument; no shell execution |

## Human Release Gate

- [ ] Professional image prompt is passed verbatim.
- [ ] Short image request receives only permitted defaults.
- [ ] Verified report yields a one-story trend explanation image.
- [ ] Reference-image consent and cancellation behave as displayed.
- [ ] Standard video produces 8-second, 720p, 16:9 output.
- [ ] High-quality video changes only the configured model tier.
- [ ] A text-free reference image can drive video.
- [ ] A chart/table/text screenshot is not uploaded; text-to-video is used instead.
- [ ] Missing ai-cli, Node 20, missing Key, insufficient balance, provider failure, and cancellation preserve existing artifacts.
- [ ] Report, poster, deck, article, and spec validation never perform media checks.

Run only one paid image and one paid 8-second standard video. Before either run, set a Gateway budget cap, leave automatic recharge disabled, show live catalog pricing and upload scope, and obtain explicit confirmation. Paid smoke tests cannot be inferred from repository test execution and must be recorded here by the release operator.
