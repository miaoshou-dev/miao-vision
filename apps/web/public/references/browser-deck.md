# Data File To Browser Deck

Use this workflow when the user asks for slides, a presentation, a PPT/PPTX-like output, a deck, 演示文稿, 汇报材料, something "for a meeting", "for executives", "for the boss", or "to present".

## Workflow

1. Run `miao-viz profile <file>` to inspect the data.
2. Read the profile JSON and decide the story arc: opening claim, key metrics, supporting chart, and closing implication.
3. Create a DeckSpec YAML using `references/vizspec.md`.
4. **Choose theme** — ask the user which theme they want (or default to `magazine` if unsure):

   | Theme | Style |
   |---|---|
   | `standard-white` | Clean blue/white card-based, default |
   | `magazine` | Serif font, warm paper texture |
   | `standard-dark` | Dark background, mono+serif |
   | `minimal` | Ultra-minimal, borderless |
   | `nyt` | New York Times — Georgia serif, hairline borders, newspaper feel |
   | `bloomberg` | Bloomberg Terminal — monospace, green-on-black, data-dense |
   | `tableau` | Tableau-style BI dashboard — orange/blue palette, clean cards, tool-like |

5. Render the deck directly with the chosen theme. Do not run `miao-viz validate`; DeckSpec uses its own schema inside the `deck` command.

```bash
miao-viz deck \
  --input /path/to/data.csv \
  --spec /tmp/miao-vision/deck.yaml \
  --theme <chosen-theme> \
  --output /tmp/miao-vision/deck.html
```

6. Return the generated HTML path to the user.

## Error Repair

If `miao-viz deck` returns `INVALID_DECK_SPEC`, read the `errors` array and fix the reported `path` first. Common fixes:

- Add `charts` to `text-chart`, `metrics-chart`, and `chart-full` slides.
- Add 1-4 `metrics` to each `metrics-chart` slide.
- Use only a `table` chart inside `table-full`.
- Split more than 4 metrics across multiple slides.

If it returns `DECK_FIELD_NOT_FOUND`, use the reported `path` and `field` to correct the chart or metric transform. Only reference input fields from the profile, or fields created earlier in the same transform chain.

## Examples

Example DeckSpecs are available in the CLI package:

- `examples/sales-deck.yaml`
- `examples/product-metrics-deck.yaml`
- `examples/finance-review-deck.yaml`
- `examples/ops-update-deck.yaml`
