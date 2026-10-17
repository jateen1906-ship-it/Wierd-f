import type { ExperimentTreeNode } from '@/lib/api-client';

export interface GraphLayoutNode {
  id: string;
  title: string;
  creator: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    skillLevel: string;
  };
  parentId: string | null;
  rootId: string | null;
  branchDepth: number;
  createdAt: string;
  remixCount: number;
  cookCount: number;
  voteCount: number;
  resultCount: number;
  x: number;
  y: number;
  width: number;
  height: number;
  childrenIds: string[];
}

export interface GraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  pathD: string;
}

export interface GraphLayoutResult {
  nodes: GraphLayoutNode[];
  edges: GraphEdge[];
  width: number;
  height: number;
  generations: { depth: number; nodes: GraphLayoutNode[] }[];
}

const NODE_WIDTH = 220;
const NODE_HEIGHT = 110;
const HORIZONTAL_SPACING = 60;
const VERTICAL_SPACING = 90;

/**
 * Group nodes by branch depth generation
 */
export function groupNodesByGeneration(
  root: ExperimentTreeNode,
): Map<number, ExperimentTreeNode[]> {
  const generations = new Map<number, ExperimentTreeNode[]>();

  function traverse(node: ExperimentTreeNode) {
    const depth = node.branchDepth ?? 0;
    const existing = generations.get(depth) || [];
    existing.push(node);
    generations.set(depth, existing);

    if (Array.isArray(node.children)) {
      for (const child of node.children) {
        traverse(child);
      }
    }
  }

  traverse(root);
  return generations;
}

/**
 * Flatten tree into an array of nodes
 */
export function flattenTree(root: ExperimentTreeNode): ExperimentTreeNode[] {
  const flat: ExperimentTreeNode[] = [];
  function traverse(node: ExperimentTreeNode) {
    flat.push(node);
    if (Array.isArray(node.children)) {
      for (const child of node.children) {
        traverse(child);
      }
    }
  }
  traverse(root);
  return flat;
}

/**
 * Find a specific node by ID in the tree
 */
export function findNodeInTree(
  root: ExperimentTreeNode,
  targetId: string,
): ExperimentTreeNode | null {
  if (root.id === targetId) return root;
  if (Array.isArray(root.children)) {
    for (const child of root.children) {
      const match = findNodeInTree(child, targetId);
      if (match) return match;
    }
  }
  return null;
}

/**
 * Calculate responsive 2D coordinate positions for tree visualization
 */
export function calculateTreeLayout(root: ExperimentTreeNode): GraphLayoutResult {
  const generationsMap = groupNodesByGeneration(root);
  const sortedDepths = Array.from(generationsMap.keys()).sort((a, b) => a - b);

  let maxNodesInAnyGeneration = 0;
  for (const nodes of generationsMap.values()) {
    if (nodes.length > maxNodesInAnyGeneration) {
      maxNodesInAnyGeneration = nodes.length;
    }
  }

  const canvasWidth = Math.max(
    800,
    maxNodesInAnyGeneration * (NODE_WIDTH + HORIZONTAL_SPACING) + HORIZONTAL_SPACING * 2,
  );

  const layoutNodes: GraphLayoutNode[] = [];
  const nodeMap = new Map<string, GraphLayoutNode>();

  sortedDepths.forEach((depth, depthIndex) => {
    const nodesInDepth = generationsMap.get(depth) || [];
    const totalRowWidth =
      nodesInDepth.length * NODE_WIDTH + (nodesInDepth.length - 1) * HORIZONTAL_SPACING;
    const startX = Math.max(HORIZONTAL_SPACING, (canvasWidth - totalRowWidth) / 2);
    const y = VERTICAL_SPACING + depthIndex * (NODE_HEIGHT + VERTICAL_SPACING);

    nodesInDepth.forEach((node, nodeIndex) => {
      const x = startX + nodeIndex * (NODE_WIDTH + HORIZONTAL_SPACING);
      const layoutNode: GraphLayoutNode = {
        id: node.id,
        title: node.title,
        creator: node.creator,
        parentId: node.parentId,
        rootId: node.rootId,
        branchDepth: node.branchDepth,
        createdAt: node.createdAt,
        remixCount: node.remixCount,
        cookCount: node.cookCount,
        voteCount: node.voteCount,
        resultCount: node.resultCount,
        x,
        y,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        childrenIds: Array.isArray(node.children) ? node.children.map((c) => c.id) : [],
      };

      layoutNodes.push(layoutNode);
      nodeMap.set(node.id, layoutNode);
    });
  });

  // Build curved bezier edges connecting parent nodes to their child nodes
  const edges: GraphEdge[] = [];
  for (const childNode of layoutNodes) {
    if (childNode.parentId && nodeMap.has(childNode.parentId)) {
      const parentNode = nodeMap.get(childNode.parentId)!;
      const sourceX = parentNode.x + parentNode.width / 2;
      const sourceY = parentNode.y + parentNode.height;
      const targetX = childNode.x + childNode.width / 2;
      const targetY = childNode.y;

      // Vertical cubic bezier curve
      const deltaY = targetY - sourceY;
      const controlY1 = sourceY + deltaY * 0.5;
      const controlY2 = targetY - deltaY * 0.5;
      const pathD = `M ${sourceX} ${sourceY} C ${sourceX} ${controlY1}, ${targetX} ${controlY2}, ${targetX} ${targetY}`;

      edges.push({
        id: `edge-${parentNode.id}-${childNode.id}`,
        sourceId: parentNode.id,
        targetId: childNode.id,
        sourceX,
        sourceY,
        targetX,
        targetY,
        pathD,
      });
    }
  }

  const canvasHeight = Math.max(
    450,
    sortedDepths.length * (NODE_HEIGHT + VERTICAL_SPACING) + VERTICAL_SPACING,
  );

  const generations = sortedDepths.map((depth) => ({
    depth,
    nodes: generationsMap.get(depth)!.map((n) => nodeMap.get(n.id)!),
  }));

  return {
    nodes: layoutNodes,
    edges,
    width: canvasWidth,
    height: canvasHeight,
    generations,
  };
}
