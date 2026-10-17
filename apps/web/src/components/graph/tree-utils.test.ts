import {
  groupNodesByGeneration,
  flattenTree,
  findNodeInTree,
  calculateTreeLayout,
} from './tree-utils';
import type { ExperimentTreeNode } from '@/lib/api-client';

describe('Living Food Graph Layout & Tree Utilities', () => {
  const mockTree: ExperimentTreeNode = {
    id: 'root-1',
    title: 'Original Hostel Maggi',
    creator: {
      id: 'user-1',
      username: 'pioneer',
      displayName: 'Hostel Pioneer',
      avatarUrl: null,
      skillLevel: 'intermediate',
    },
    parentId: null,
    rootId: null,
    branchDepth: 0,
    createdAt: '2026-10-17T10:00:00Z',
    remixCount: 2,
    cookCount: 15,
    voteCount: 32,
    resultCount: 8,
    children: [
      {
        id: 'remix-1',
        title: 'Butter Garlic Maggi',
        creator: {
          id: 'user-2',
          username: 'chef1',
          displayName: 'Chef One',
          avatarUrl: null,
          skillLevel: 'advanced',
        },
        parentId: 'root-1',
        rootId: 'root-1',
        branchDepth: 1,
        createdAt: '2026-10-17T11:00:00Z',
        remixCount: 1,
        cookCount: 5,
        voteCount: 12,
        resultCount: 2,
        children: [
          {
            id: 'remix-1-1',
            title: 'Kettle Steamed Spicy Maggi',
            creator: {
              id: 'user-3',
              username: 'chef2',
              displayName: 'Chef Two',
              avatarUrl: null,
              skillLevel: 'beginner',
            },
            parentId: 'remix-1',
            rootId: 'root-1',
            branchDepth: 2,
            createdAt: '2026-10-17T12:00:00Z',
            remixCount: 0,
            cookCount: 2,
            voteCount: 4,
            resultCount: 1,
            children: [],
          },
        ],
      },
      {
        id: 'remix-2',
        title: 'Cheese Corn Maggi',
        creator: {
          id: 'user-4',
          username: 'chef3',
          displayName: 'Chef Three',
          avatarUrl: null,
          skillLevel: 'intermediate',
        },
        parentId: 'root-1',
        rootId: 'root-1',
        branchDepth: 1,
        createdAt: '2026-10-17T11:30:00Z',
        remixCount: 0,
        cookCount: 4,
        voteCount: 9,
        resultCount: 3,
        children: [],
      },
    ],
  };

  describe('groupNodesByGeneration', () => {
    it('should group tree nodes accurately by branch depth', () => {
      const generations = groupNodesByGeneration(mockTree);
      expect(generations.size).toBe(3);

      const gen0 = generations.get(0);
      expect(gen0).toBeDefined();
      expect(gen0?.length).toBe(1);
      expect(gen0?.[0].id).toBe('root-1');

      const gen1 = generations.get(1);
      expect(gen1?.length).toBe(2);
      expect(gen1?.map((n) => n.id)).toEqual(['remix-1', 'remix-2']);

      const gen2 = generations.get(2);
      expect(gen2?.length).toBe(1);
      expect(gen2?.[0].id).toBe('remix-1-1');
    });
  });

  describe('flattenTree', () => {
    it('should recursively flatten entire tree into list of 4 nodes', () => {
      const flat = flattenTree(mockTree);
      expect(flat.length).toBe(4);
      expect(flat.map((n) => n.id)).toEqual(['root-1', 'remix-1', 'remix-1-1', 'remix-2']);
    });
  });

  describe('findNodeInTree', () => {
    it('should find root node by ID', () => {
      const found = findNodeInTree(mockTree, 'root-1');
      expect(found).not.toBeNull();
      expect(found?.title).toBe('Original Hostel Maggi');
    });

    it('should find deeply nested descendant node by ID', () => {
      const found = findNodeInTree(mockTree, 'remix-1-1');
      expect(found).not.toBeNull();
      expect(found?.title).toBe('Kettle Steamed Spicy Maggi');
      expect(found?.branchDepth).toBe(2);
    });

    it('should return null when node ID does not exist in family', () => {
      const found = findNodeInTree(mockTree, 'non-existent-id');
      expect(found).toBeNull();
    });
  });

  describe('calculateTreeLayout', () => {
    it('should compute valid 2D coordinates and generation structure', () => {
      const layout = calculateTreeLayout(mockTree);
      expect(layout.nodes.length).toBe(4);
      expect(layout.generations.length).toBe(3);
      expect(layout.width).toBeGreaterThanOrEqual(800);
      expect(layout.height).toBeGreaterThanOrEqual(450);

      // Verify root node positioning
      const rootNode = layout.nodes.find((n) => n.id === 'root-1');
      expect(rootNode).toBeDefined();
      expect(rootNode?.branchDepth).toBe(0);
      expect(rootNode?.parentId).toBeNull();
      expect(rootNode?.y).toBe(90);

      // Verify generation 1 nodes are placed vertically below root
      const gen1Nodes = layout.nodes.filter((n) => n.branchDepth === 1);
      expect(gen1Nodes.length).toBe(2);
      for (const n of gen1Nodes) {
        expect(n.y).toBeGreaterThan(rootNode!.y);
      }
    });

    it('should generate curved SVG cubic bezier paths for all parent-child relationships', () => {
      const layout = calculateTreeLayout(mockTree);

      // 3 child relationships in this tree (root -> remix-1, root -> remix-2, remix-1 -> remix-1-1)
      expect(layout.edges.length).toBe(3);

      const edgeRootToRemix1 = layout.edges.find(
        (e) => e.sourceId === 'root-1' && e.targetId === 'remix-1',
      );
      expect(edgeRootToRemix1).toBeDefined();
      expect(edgeRootToRemix1?.pathD).toMatch(/^M \d+(\.\d+)? \d+(\.\d+)? C /);

      const edgeRemix1ToRemix11 = layout.edges.find(
        (e) => e.sourceId === 'remix-1' && e.targetId === 'remix-1-1',
      );
      expect(edgeRemix1ToRemix11).toBeDefined();
      expect(edgeRemix1ToRemix11?.pathD).toMatch(/^M \d+(\.\d+)? \d+(\.\d+)? C /);
    });

    it('should gracefully layout a solo root experiment with zero remixes', () => {
      const soloRoot: ExperimentTreeNode = {
        id: 'solo-root-1',
        title: 'Solo Root Recipe',
        creator: {
          id: 'u-1',
          username: 'chef',
          displayName: 'Chef',
          avatarUrl: null,
          skillLevel: 'beginner',
        },
        parentId: null,
        rootId: null,
        branchDepth: 0,
        createdAt: '2026-10-17T10:00:00Z',
        remixCount: 0,
        cookCount: 0,
        voteCount: 0,
        resultCount: 0,
        children: [],
      };

      const layout = calculateTreeLayout(soloRoot);
      expect(layout.nodes.length).toBe(1);
      expect(layout.edges.length).toBe(0);
      expect(layout.generations.length).toBe(1);
      expect(layout.generations[0].depth).toBe(0);
    });
  });
});
