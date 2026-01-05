/**
 * HierarchyTree Layout Tests
 *
 * Unit tests for tree layout calculation functions.
 */

import { describe, it, expect } from 'vitest'
import {
  countNodes,
  getMaxDepth,
  getSubtreeWidth,
  calculateTreeLayout,
  generateConnectionPath,
  flattenTree,
  findNodeById
} from './layout'
import type { TreeNode, NodeLayout } from './types'

// Test fixtures
const simpleTree: TreeNode = {
  id: 'root',
  label: 'Root',
  children: [
    { id: 'child1', label: 'Child 1' },
    { id: 'child2', label: 'Child 2' }
  ]
}

const deepTree: TreeNode = {
  id: 'root',
  label: 'Root',
  children: [
    {
      id: 'a',
      label: 'A',
      children: [
        {
          id: 'a1',
          label: 'A1',
          children: [{ id: 'a1a', label: 'A1A' }]
        }
      ]
    }
  ]
}

const wideTree: TreeNode = {
  id: 'root',
  label: 'Root',
  children: [
    { id: 'c1', label: 'C1' },
    { id: 'c2', label: 'C2' },
    { id: 'c3', label: 'C3' },
    { id: 'c4', label: 'C4' },
    { id: 'c5', label: 'C5' }
  ]
}

const orgChart: TreeNode = {
  id: 'ceo',
  label: 'CEO',
  children: [
    {
      id: 'cto',
      label: 'CTO',
      children: [
        { id: 'dev1', label: 'Dev 1' },
        { id: 'dev2', label: 'Dev 2' }
      ]
    },
    {
      id: 'cfo',
      label: 'CFO',
      children: [{ id: 'acc1', label: 'Accountant' }]
    }
  ]
}

describe('countNodes', () => {
  it('should count single node', () => {
    expect(countNodes({ id: '1', label: 'Single' })).toBe(1)
  })

  it('should count simple tree', () => {
    expect(countNodes(simpleTree)).toBe(3)
  })

  it('should count deep tree', () => {
    expect(countNodes(deepTree)).toBe(4)
  })

  it('should count wide tree', () => {
    expect(countNodes(wideTree)).toBe(6)
  })

  it('should count org chart correctly', () => {
    expect(countNodes(orgChart)).toBe(6)
  })

  it('should handle empty children array', () => {
    const node: TreeNode = { id: '1', label: 'A', children: [] }
    expect(countNodes(node)).toBe(1)
  })
})

describe('getMaxDepth', () => {
  it('should return 0 for single node', () => {
    expect(getMaxDepth({ id: '1', label: 'Single' })).toBe(0)
  })

  it('should return 1 for simple tree', () => {
    expect(getMaxDepth(simpleTree)).toBe(1)
  })

  it('should return 3 for deep tree', () => {
    expect(getMaxDepth(deepTree)).toBe(3)
  })

  it('should return 1 for wide tree', () => {
    expect(getMaxDepth(wideTree)).toBe(1)
  })

  it('should return 2 for org chart', () => {
    expect(getMaxDepth(orgChart)).toBe(2)
  })
})

describe('getSubtreeWidth', () => {
  it('should return 1 for leaf node', () => {
    expect(getSubtreeWidth({ id: '1', label: 'Leaf' })).toBe(1)
  })

  it('should return 2 for simple tree', () => {
    expect(getSubtreeWidth(simpleTree)).toBe(2)
  })

  it('should return 1 for deep tree (single leaf path)', () => {
    expect(getSubtreeWidth(deepTree)).toBe(1)
  })

  it('should return 5 for wide tree', () => {
    expect(getSubtreeWidth(wideTree)).toBe(5)
  })

  it('should return 3 for org chart (3 leaf nodes)', () => {
    expect(getSubtreeWidth(orgChart)).toBe(3)
  })
})

describe('flattenTree', () => {
  it('should flatten single node', () => {
    const node: TreeNode = { id: '1', label: 'Single' }
    expect(flattenTree(node)).toEqual([node])
  })

  it('should flatten simple tree in pre-order', () => {
    const result = flattenTree(simpleTree)
    expect(result.map((n) => n.id)).toEqual(['root', 'child1', 'child2'])
  })

  it('should flatten deep tree in pre-order', () => {
    const result = flattenTree(deepTree)
    expect(result.map((n) => n.id)).toEqual(['root', 'a', 'a1', 'a1a'])
  })

  it('should flatten org chart correctly', () => {
    const result = flattenTree(orgChart)
    expect(result.length).toBe(6)
    expect(result[0].id).toBe('ceo')
  })
})

describe('findNodeById', () => {
  it('should find root node', () => {
    const found = findNodeById(simpleTree, 'root')
    expect(found?.label).toBe('Root')
  })

  it('should find child node', () => {
    const found = findNodeById(simpleTree, 'child2')
    expect(found?.label).toBe('Child 2')
  })

  it('should find deep node', () => {
    const found = findNodeById(deepTree, 'a1a')
    expect(found?.label).toBe('A1A')
  })

  it('should return undefined for non-existent id', () => {
    const found = findNodeById(simpleTree, 'nonexistent')
    expect(found).toBeUndefined()
  })

  it('should find node in org chart', () => {
    const found = findNodeById(orgChart, 'dev2')
    expect(found?.label).toBe('Dev 2')
  })
})

describe('generateConnectionPath', () => {
  const createMockLayout = (x: number, y: number): NodeLayout => ({
    node: { id: 'test', label: 'Test' },
    x,
    y,
    width: 100,
    height: 50,
    depth: 0,
    siblingIndex: 0,
    parent: null,
    themeColors: {
      colorPrimary: '#000',
      colorPrimaryBg: '#fff',
      colorPrimaryText: '#000',
      colorText: '#000',
      colorTextSecondary: '#666',
      colorWhite: '#fff',
      colorBg: '#fff',
      colorBgElevated: '#f0f0f0',
      isDarkMode: false
    }
  })

  it('should generate straight path', () => {
    const from = createMockLayout(100, 100)
    const to = createMockLayout(100, 200)
    const path = generateConnectionPath(from, to, 'vertical', 'straight')
    expect(path).toContain('M')
    expect(path).toContain('L')
  })

  it('should generate curved path', () => {
    const from = createMockLayout(100, 100)
    const to = createMockLayout(100, 200)
    const path = generateConnectionPath(from, to, 'vertical', 'curved')
    expect(path).toContain('M')
    expect(path).toContain('C')
  })

  it('should generate elbow path', () => {
    const from = createMockLayout(100, 100)
    const to = createMockLayout(150, 200)
    const path = generateConnectionPath(from, to, 'vertical', 'elbow')
    expect(path).toContain('M')
    expect(path.match(/L/g)?.length).toBeGreaterThanOrEqual(2)
  })

  it('should handle horizontal orientation', () => {
    const from = createMockLayout(100, 100)
    const to = createMockLayout(250, 100)
    const path = generateConnectionPath(from, to, 'horizontal', 'elbow')
    expect(path).toContain('M')
  })
})

describe('calculateTreeLayout', () => {
  const baseColors = {
    colorPrimary: '#6366f1',
    colorPrimaryBg: '#1a1a2e',
    colorPrimaryText: '#ffffff',
    colorText: '#ffffff',
    colorTextSecondary: '#a0a0b0',
    colorWhite: '#ffffff',
    colorBg: '#1a1a2e',
    colorBgElevated: '#2a2a4a',
    isDarkMode: true
  }

  it('should layout simple tree', () => {
    const layout = calculateTreeLayout(simpleTree, {
      orientation: 'vertical',
      siblingGap: 20,
      levelGap: 60,
      nodeWidth: 100,
      nodeHeight: 50,
      baseColors
    })

    expect(layout.nodes.length).toBe(3)
    expect(layout.connections.length).toBe(2)
  })

  it('should position root at depth 0', () => {
    const layout = calculateTreeLayout(simpleTree, {
      orientation: 'vertical',
      siblingGap: 20,
      levelGap: 60,
      nodeWidth: 100,
      nodeHeight: 50,
      baseColors
    })

    const root = layout.nodes.find((n) => n.node.id === 'root')
    expect(root?.depth).toBe(0)
  })

  it('should position children at depth 1', () => {
    const layout = calculateTreeLayout(simpleTree, {
      orientation: 'vertical',
      siblingGap: 20,
      levelGap: 60,
      nodeWidth: 100,
      nodeHeight: 50,
      baseColors
    })

    const child1 = layout.nodes.find((n) => n.node.id === 'child1')
    const child2 = layout.nodes.find((n) => n.node.id === 'child2')
    expect(child1?.depth).toBe(1)
    expect(child2?.depth).toBe(1)
  })

  it('should create connections between parent and children', () => {
    const layout = calculateTreeLayout(simpleTree, {
      orientation: 'vertical',
      siblingGap: 20,
      levelGap: 60,
      nodeWidth: 100,
      nodeHeight: 50,
      baseColors
    })

    const rootConnections = layout.connections.filter(
      (c) => c.from.node.id === 'root'
    )
    expect(rootConnections.length).toBe(2)
  })

  it('should calculate total dimensions', () => {
    const layout = calculateTreeLayout(simpleTree, {
      orientation: 'vertical',
      siblingGap: 20,
      levelGap: 60,
      nodeWidth: 100,
      nodeHeight: 50,
      baseColors
    })

    expect(layout.totalWidth).toBeGreaterThan(0)
    expect(layout.totalHeight).toBeGreaterThan(0)
  })

  it('should handle horizontal orientation', () => {
    const layout = calculateTreeLayout(simpleTree, {
      orientation: 'horizontal',
      siblingGap: 20,
      levelGap: 60,
      nodeWidth: 100,
      nodeHeight: 50,
      baseColors
    })

    const root = layout.nodes.find((n) => n.node.id === 'root')
    const child1 = layout.nodes.find((n) => n.node.id === 'child1')

    // In horizontal, children should be to the right of root
    expect(child1!.x).toBeGreaterThan(root!.x)
  })

  it('should assign theme colors to nodes', () => {
    const layout = calculateTreeLayout(simpleTree, {
      orientation: 'vertical',
      siblingGap: 20,
      levelGap: 60,
      nodeWidth: 100,
      nodeHeight: 50,
      baseColors
    })

    layout.nodes.forEach((node) => {
      expect(node.themeColors).toBeDefined()
      expect(node.themeColors.colorPrimary).toBeDefined()
    })
  })

  it('should handle single node tree', () => {
    const singleNode: TreeNode = { id: 'single', label: 'Single' }
    const layout = calculateTreeLayout(singleNode, {
      orientation: 'vertical',
      siblingGap: 20,
      levelGap: 60,
      nodeWidth: 100,
      nodeHeight: 50,
      baseColors
    })

    expect(layout.nodes.length).toBe(1)
    expect(layout.connections.length).toBe(0)
  })
})
