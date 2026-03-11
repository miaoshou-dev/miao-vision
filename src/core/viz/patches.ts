/**
 * UITree Patch System
 *
 * Defines incremental patch operations for streaming UITree construction.
 * Patches are designed to be small, self-contained JSON objects that can
 * be emitted line-by-line (JSONL) as the AI generates content.
 *
 * Patch flow for streaming infographic generation:
 *   init → addElement(root) → setRoot → addElement(s1) → appendChild(root,s1) → ...
 *
 * @module core/viz/patches
 */

import type { UITree, UIElement } from '@/types/ui-tree'

// ============================================================================
// Patch type definitions
// ============================================================================

/** Initialize a new (empty) UITree */
export interface PatchInit {
  op: 'init'
  version?: '1.0'
}

/** Set the root element key */
export interface PatchSetRoot {
  op: 'setRoot'
  key: string
}

/** Add or replace an element in `elements` */
export interface PatchAddElement {
  op: 'addElement'
  element: UIElement
}

/** Add a child key to a parent element's children array */
export interface PatchAppendChild {
  op: 'appendChild'
  parentKey: string
  childKey: string
}

/** Merge/replace props on an existing element */
export interface PatchUpdateProps {
  op: 'updateProps'
  key: string
  /** Props are merged (shallow) into the existing props */
  props: Record<string, unknown>
}

/** Set (merge) tree-level data context */
export interface PatchSetData {
  op: 'setData'
  data: Record<string, unknown>
}

/** Signal that the stream is complete */
export interface PatchComplete {
  op: 'complete'
}

/** Union of all patch types */
export type UITreePatch =
  | PatchInit
  | PatchSetRoot
  | PatchAddElement
  | PatchAppendChild
  | PatchUpdateProps
  | PatchSetData
  | PatchComplete

// ============================================================================
// Empty tree factory
// ============================================================================

/** Create the baseline empty UITree used by `init` patch */
export function emptyUITree(): UITree {
  return {
    version: '1.0',
    root: '',
    elements: {},
  }
}

// ============================================================================
// applyPatch
// ============================================================================

/**
 * Apply a single UITreePatch to a UITree, returning a new (immutable) tree.
 *
 * All operations are pure — the original tree is never mutated.
 *
 * @param tree   - Current UITree state
 * @param patch  - Patch to apply
 * @returns Updated UITree
 */
export function applyPatch(tree: UITree, patch: UITreePatch): UITree {
  switch (patch.op) {
    case 'init':
      return emptyUITree()

    case 'setRoot':
      return { ...tree, root: patch.key }

    case 'addElement':
      return {
        ...tree,
        elements: { ...tree.elements, [patch.element.key]: patch.element },
      }

    case 'appendChild': {
      const parent = tree.elements[patch.parentKey]
      if (!parent) {
        console.warn(`[UITreePatch] appendChild: parent "${patch.parentKey}" not found`)
        return tree
      }
      const children = parent.children ?? []
      if (children.includes(patch.childKey)) return tree
      return {
        ...tree,
        elements: {
          ...tree.elements,
          [patch.parentKey]: {
            ...parent,
            children: [...children, patch.childKey],
          },
        },
      }
    }

    case 'updateProps': {
      const el = tree.elements[patch.key]
      if (!el) {
        console.warn(`[UITreePatch] updateProps: element "${patch.key}" not found`)
        return tree
      }
      return {
        ...tree,
        elements: {
          ...tree.elements,
          [patch.key]: { ...el, props: { ...el.props, ...patch.props } },
        },
      }
    }

    case 'setData':
      return { ...tree, data: { ...(tree.data ?? {}), ...patch.data } }

    case 'complete':
      return tree

    default:
      return tree
  }
}

/**
 * Apply a sequence of patches to a UITree in order.
 */
export function applyPatches(tree: UITree, patches: UITreePatch[]): UITree {
  return patches.reduce(applyPatch, tree)
}

// ============================================================================
// JSONL encoding / decoding
// ============================================================================

/**
 * Serialize a UITreePatch to a JSONL line (JSON + newline).
 */
export function patchToJsonl(patch: UITreePatch): string {
  return JSON.stringify(patch) + '\n'
}

/**
 * Parse a single JSONL line into a UITreePatch.
 * Returns null if the line is blank or unparseable.
 */
export function parsePatchLine(line: string): UITreePatch | null {
  const trimmed = line.trim()
  if (!trimmed) return null
  try {
    return JSON.parse(trimmed) as UITreePatch
  } catch {
    console.warn('[UITreePatch] Failed to parse JSONL line:', line)
    return null
  }
}
