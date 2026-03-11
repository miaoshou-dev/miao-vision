/**
 * UISpec Streaming Generator
 *
 * Converts InfographicOutput to a stream of UITreePatch objects, enabling
 * sections to be rendered progressively as they are produced by the AI.
 *
 * Patch sequence for an N-section infographic:
 *   init → addElement(layout) → setRoot →
 *   (for each section) addElement(section) → appendChild(layout, section) →
 *   setData({ ... }) → complete
 *
 * @module core/ai/agents/infographic/ui-spec-stream
 */

import type { UITreePatch } from '@core/viz/patches'
import type { InfographicOutput } from './types'
import { buildSectionElement, buildLayoutElement } from './ui-spec-converter'

/**
 * Stream InfographicOutput as an async generator of UITreePatch objects.
 *
 * Sections are emitted one at a time, allowing the renderer to show
 * each section immediately without waiting for the full output.
 *
 * @param output  - Complete InfographicOutput from the three-phase agent
 * @param delayMs - Optional artificial delay between sections (for demos)
 *
 * @example
 * for await (const patch of streamUITreePatches(output)) {
 *   tree = applyPatch(tree, patch)
 * }
 */
export async function* streamUITreePatches(
  output: InfographicOutput,
  delayMs = 0
): AsyncGenerator<UITreePatch> {
  const layoutKey = 'infographic-layout'

  // 1. Initialize empty tree
  yield { op: 'init' }

  // 2. Add the layout root element (no children yet)
  yield {
    op: 'addElement',
    element: buildLayoutElement(output),
  }

  // 3. Set root
  yield { op: 'setRoot', key: layoutKey }

  // 4. Add each section progressively
  for (const section of output.sections) {
    const sectionEl = buildSectionElement(
      section,
      output.theme,
      output.palette,
      output.layout.maxWidth
    )

    // Add the element to the elements map
    yield { op: 'addElement', element: sectionEl }

    // Wire it into the layout's children
    yield { op: 'appendChild', parentKey: layoutKey, childKey: sectionEl.key }

    // Optional delay for progressive rendering effect
    if (delayMs > 0) {
      await new Promise((r) => setTimeout(r, delayMs))
    }
  }

  // 5. Attach tree-level data if present
  if (output.metadata) {
    yield {
      op: 'setData',
      data: {
        metadata: output.metadata,
        sourceSummary: output.sourceSummary,
      },
    }
  }

  // 6. Complete
  yield { op: 'complete' }
}

/**
 * Collect all patches from the stream into an array.
 * Useful for testing or when streaming is not needed.
 */
export async function collectPatches(
  output: InfographicOutput
): Promise<UITreePatch[]> {
  const patches: UITreePatch[] = []
  for await (const patch of streamUITreePatches(output)) {
    patches.push(patch)
  }
  return patches
}
