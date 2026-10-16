import type { SafeCreator } from './experiment-response.dto';

/**
 * Individual node representation in the lineage path
 */
export interface LineageNode {
  id: string;
  title: string;
  creator: SafeCreator;
  parentId: string | null;
  rootId: string | null;
  branchDepth: number;
  createdAt: string;
  remixCount: number;
}

/**
 * Complete Ancestor Lineage Response
 * Returns ordered ancestors from the target experiment up to the root experiment.
 */
export interface LineageResponse {
  experimentId: string;
  ancestors: LineageNode[];
  chain: LineageNode[];
  chainLength: number;
}
