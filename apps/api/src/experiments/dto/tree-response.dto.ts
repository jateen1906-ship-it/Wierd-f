import type { SafeCreator } from './experiment-response.dto';

/**
 * Node within the Living Food Graph tree hierarchy
 */
export interface ExperimentTreeNode {
  id: string;
  title: string;
  creator: SafeCreator;
  parentId: string | null;
  rootId: string | null;
  branchDepth: number;
  createdAt: string;
  remixCount: number;
  cookCount: number;
  voteCount: number;
  resultCount: number;
  children: ExperimentTreeNode[];
}

/**
 * Living Food Graph Tree Response
 */
export interface ExperimentTreeResponse {
  rootId: string;
  targetExperimentId: string;
  totalNodes: number;
  tree: ExperimentTreeNode;
  nodes: Omit<ExperimentTreeNode, 'children'>[];
}
