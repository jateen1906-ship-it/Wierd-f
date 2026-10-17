'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  GitBranch,
  Sparkles,
  ChefHat,
  ThumbsUp,
  Flame,
  ArrowRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Layers,
  Network,
  ExternalLink,
  Loader2,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import {
  apiClient,
  ApiError,
  type ExperimentTreeResponse,
  type ExperimentTreeNode,
} from '@/lib/api-client';
import { calculateTreeLayout, type GraphLayoutNode, type GraphLayoutResult } from './tree-utils';

interface LivingFoodGraphProps {
  experimentId: string;
  onSelectNode?: (nodeId: string) => void;
  className?: string;
}

export function LivingFoodGraph({
  experimentId,
  onSelectNode,
  className = '',
}: LivingFoodGraphProps) {
  const router = useRouter();

  const [treeData, setTreeData] = useState<ExperimentTreeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Interaction State
  const [selectedNodeId, setSelectedNodeId] = useState<string>(experimentId);
  const [viewMode, setViewMode] = useState<'tree' | 'generations'>('tree');
  const [zoomScale, setZoomScale] = useState<number>(1);

  const containerRef = useRef<HTMLDivElement>(null);

  const fetchTree = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient.experiments.tree(experimentId);
      setTreeData(data);
      // Select target experiment initially
      setSelectedNodeId(data.targetExperimentId || experimentId);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message || 'Failed to retrieve Living Food Graph.');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected network error occurred.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (experimentId) {
      fetchTree();
    }
  }, [experimentId]);

  // Compute Layout
  const layout: GraphLayoutResult | null = useMemo(() => {
    if (!treeData?.tree) return null;
    return calculateTreeLayout(treeData.tree);
  }, [treeData]);

  // Find currently selected node
  const selectedNode: GraphLayoutNode | null = useMemo(() => {
    if (!layout?.nodes || !selectedNodeId) return null;
    return layout.nodes.find((n) => n.id === selectedNodeId) || layout.nodes[0] || null;
  }, [layout, selectedNodeId]);

  const handleNodeClick = (node: GraphLayoutNode) => {
    setSelectedNodeId(node.id);
    onSelectNode?.(node.id);
  };

  const handleZoom = (delta: number) => {
    setZoomScale((prev) => {
      const next = Math.round((prev + delta) * 10) / 10;
      return Math.min(1.8, Math.max(0.5, next));
    });
  };

  const handleResetZoom = () => {
    setZoomScale(1);
    if (containerRef.current) {
      containerRef.current.scrollTo({ left: 0, top: 0, behavior: 'smooth' });
    }
  };

  // Loading State
  if (isLoading) {
    return (
      <div className={`p-8 bg-wierd-card border border-wierd-slate rounded-2xl ${className}`}>
        <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
          <div className="relative">
            <Loader2 className="w-10 h-10 text-wierd-flame animate-spin" />
            <GitBranch className="w-4 h-4 text-wierd-amber absolute inset-0 m-auto" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Traversing Living Food Graph</h3>
            <p className="text-xs text-wierd-silver/70 mt-1 max-w-sm">
              Tracing ancestor branches, genetic mutations, and recipe evolution trees...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Error State
  if (error || !treeData) {
    return (
      <div className={`p-8 bg-wierd-card border border-red-500/30 rounded-2xl ${className}`}>
        <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
          <AlertTriangle className="w-10 h-10 text-red-400" />
          <h3 className="text-base font-bold text-white">Food Graph Unavailable</h3>
          <p className="text-xs text-wierd-silver/80 max-w-md">{error}</p>
          <button
            type="button"
            onClick={fetchTree}
            className="mt-2 px-4 py-2 text-xs font-semibold rounded-xl bg-wierd-slate/40 hover:bg-wierd-slate text-white border border-wierd-slate transition-colors"
          >
            Retry Loading Tree
          </button>
        </div>
      </div>
    );
  }

  const isSoloRoot = treeData.totalNodes <= 1;

  return (
    <div
      className={`bg-wierd-card border border-wierd-slate rounded-2xl overflow-hidden shadow-xl ${className}`}
    >
      {/* Header Bar */}
      <div className="p-4 sm:p-5 border-b border-wierd-slate/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-wierd-surface/40">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-wierd-flame/15 text-wierd-flame border border-wierd-flame/30">
              <GitBranch className="w-4 h-4" />
            </span>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Living Food Graph
            </h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-wierd-dark border border-wierd-slate text-wierd-silver">
              {treeData.totalNodes} {treeData.totalNodes === 1 ? 'Node' : 'Evolution Nodes'}
            </span>
          </div>
          <p className="text-xs text-wierd-silver/70 mt-1">
            Explore how this recipe evolved across hostel messes, kettle hacks, and taste mutations.
          </p>
        </div>

        {/* View Mode & Zoom Controls */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-wierd-dark border border-wierd-slate rounded-xl p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('tree')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-colors ${
                viewMode === 'tree'
                  ? 'bg-wierd-flame text-white'
                  : 'text-wierd-silver hover:text-white'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tree Flow</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('generations')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-colors ${
                viewMode === 'generations'
                  ? 'bg-wierd-flame text-white'
                  : 'text-wierd-silver hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Generations</span>
            </button>
          </div>

          {/* Zoom controls for tree view */}
          {viewMode === 'tree' && (
            <div className="flex items-center bg-wierd-dark border border-wierd-slate rounded-xl p-0.5 text-xs text-wierd-silver">
              <button
                type="button"
                onClick={() => handleZoom(-0.15)}
                className="p-1.5 hover:text-white hover:bg-wierd-slate/40 rounded-lg transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="px-1 text-[11px] font-mono text-wierd-silver/80">
                {Math.round(zoomScale * 100)}%
              </span>
              <button
                type="button"
                onClick={() => handleZoom(0.15)}
                className="p-1.5 hover:text-white hover:bg-wierd-slate/40 rounded-lg transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleResetZoom}
                className="p-1.5 hover:text-white hover:bg-wierd-slate/40 rounded-lg transition-colors ml-0.5 border-l border-wierd-slate/50"
                title="Reset Zoom"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Solo Root Empty Remixes State */}
      {isSoloRoot ? (
        <div className="p-8 sm:p-12 text-center space-y-4 bg-wierd-dark/40">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Sparkles className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-lg font-bold text-white">Root Experiment (Generation 0)</h3>
            <p className="text-xs text-wierd-silver/80 leading-relaxed">
              This is the original progenitor recipe! No hostel cooks have branched or remixed it
              yet. Be the first pioneer to evolve this into Generation 1.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href={`/experiments/${experimentId}/remix`}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-wierd-flame to-red-600 hover:from-red-600 hover:to-wierd-flame text-white font-bold text-xs shadow-lg shadow-wierd-flame/20 transition-all"
            >
              <GitBranch className="w-4 h-4" />
              <span>Remix & Seed Generation 1</span>
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Main Visualization Viewport */}
          {viewMode === 'tree' && layout && (
            <div
              ref={containerRef}
              className="relative w-full overflow-x-auto overflow-y-auto bg-wierd-dark/70 min-h-[420px] max-h-[560px] p-4 select-none scrollbar-thin scrollbar-thumb-wierd-slate scrollbar-track-transparent"
            >
              <div
                style={{
                  width: `${layout.width * zoomScale}px`,
                  height: `${layout.height * zoomScale}px`,
                  position: 'relative',
                  transformOrigin: '0 0',
                }}
              >
                {/* SVG Connecting Edges */}
                <svg
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                  }}
                  viewBox={`0 0 ${layout.width} ${layout.height}`}
                >
                  <defs>
                    <linearGradient id="edge-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#ff4d2e" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.6" />
                    </linearGradient>
                    <marker
                      id="arrow"
                      viewBox="0 0 10 10"
                      refX="6"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1 L 10 5 L 0 9 z" fill="#ff4d2e" />
                    </marker>
                  </defs>

                  {layout.edges.map((edge) => (
                    <g key={edge.id}>
                      {/* Edge Outer Glow */}
                      <path
                        d={edge.pathD}
                        fill="none"
                        stroke="#ff4d2e"
                        strokeWidth="4"
                        strokeOpacity="0.2"
                        strokeLinecap="round"
                      />
                      {/* Edge Main Line */}
                      <path
                        d={edge.pathD}
                        fill="none"
                        stroke="url(#edge-gradient)"
                        strokeWidth="2"
                        strokeDasharray="4 2"
                        strokeLinecap="round"
                        markerEnd="url(#arrow)"
                      />
                    </g>
                  ))}
                </svg>

                {/* HTML Interactive Node Cards */}
                {layout.nodes.map((node) => {
                  const isCurrent = node.id === treeData.targetExperimentId;
                  const isSelected = node.id === selectedNodeId;
                  const isRoot = node.branchDepth === 0 || !node.parentId;

                  return (
                    <div
                      key={node.id}
                      onClick={() => handleNodeClick(node)}
                      style={{
                        position: 'absolute',
                        left: `${node.x * zoomScale}px`,
                        top: `${node.y * zoomScale}px`,
                        width: `${node.width * zoomScale}px`,
                        transformOrigin: '0 0',
                      }}
                      className={`cursor-pointer rounded-2xl p-3.5 transition-all duration-200 border ${
                        isSelected
                          ? 'bg-wierd-card border-wierd-flame shadow-lg shadow-wierd-flame/20 ring-2 ring-wierd-flame/40 scale-[1.02]'
                          : isCurrent
                            ? 'bg-wierd-surface/90 border-wierd-amber/70 hover:border-wierd-amber'
                            : 'bg-wierd-card/85 border-wierd-slate/80 hover:border-wierd-slate hover:bg-wierd-card'
                      }`}
                    >
                      {/* Generation & Current Badge */}
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isRoot
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-wierd-flame/15 text-wierd-flame border border-wierd-flame/30'
                          }`}
                        >
                          {isRoot ? (
                            <Sparkles className="w-2.5 h-2.5" />
                          ) : (
                            <GitBranch className="w-2.5 h-2.5" />
                          )}
                          {isRoot ? 'Root Node' : `Gen ${node.branchDepth}`}
                        </span>

                        {isCurrent && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-wierd-amber/20 text-wierd-amber border border-wierd-amber/40">
                            Viewing
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h4 className="text-xs font-bold text-white line-clamp-2 leading-snug group-hover:text-wierd-flame">
                        {node.title}
                      </h4>

                      {/* Creator */}
                      <div className="flex items-center gap-1.5 mt-2 text-[11px] text-wierd-silver/70">
                        <ChefHat className="w-3 h-3 text-wierd-amber flex-shrink-0" />
                        <span className="truncate">
                          {node.creator?.displayName || node.creator?.username || 'Hostel Cook'}
                        </span>
                      </div>

                      {/* Stats footer */}
                      <div className="flex items-center justify-between pt-2 mt-2 border-t border-wierd-slate/40 text-[10px] text-wierd-silver/60">
                        <span className="flex items-center gap-1" title="Remixes">
                          <GitBranch className="w-2.5 h-2.5 text-wierd-flame" />
                          {node.remixCount ?? 0}
                        </span>
                        <span className="flex items-center gap-1" title="Community Votes">
                          <ThumbsUp className="w-2.5 h-2.5 text-wierd-amber" />
                          {node.voteCount ?? 0}
                        </span>
                        <span className="flex items-center gap-1" title="Cooking Proofs">
                          <Flame className="w-2.5 h-2.5 text-red-400" />
                          {node.resultCount ?? 0}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Mode 2: Generation Breakdown List View (Mobile-Friendly) */}
          {viewMode === 'generations' && layout && (
            <div className="p-4 sm:p-6 space-y-6 bg-wierd-dark/60 max-h-[560px] overflow-y-auto divide-y divide-wierd-slate/40">
              {layout.generations.map(({ depth, nodes }) => (
                <div key={depth} className="pt-4 first:pt-0 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-wierd-silver">
                      <span className="w-2 h-2 rounded-full bg-wierd-flame" />
                      {depth === 0
                        ? 'Generation 0 (Root Progenitor)'
                        : `Generation ${depth} Branches`}
                    </span>
                    <span className="text-[11px] text-wierd-silver/60">
                      {nodes.length} {nodes.length === 1 ? 'recipe' : 'recipes'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {nodes.map((node) => {
                      const isCurrent = node.id === treeData.targetExperimentId;
                      const isSelected = node.id === selectedNodeId;

                      return (
                        <div
                          key={node.id}
                          onClick={() => handleNodeClick(node)}
                          className={`p-3 rounded-xl border cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-wierd-card border-wierd-flame ring-1 ring-wierd-flame'
                              : isCurrent
                                ? 'bg-wierd-surface border-wierd-amber/60'
                                : 'bg-wierd-card/70 border-wierd-slate hover:border-wierd-slate/80'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-semibold text-wierd-silver/60">
                              {depth === 0 ? 'Root' : `Gen ${depth}`}
                            </span>
                            {isCurrent && (
                              <span className="text-[9px] px-1 rounded bg-wierd-amber/20 text-wierd-amber font-bold">
                                Current
                              </span>
                            )}
                          </div>
                          <h4 className="text-xs font-bold text-white line-clamp-1">
                            {node.title}
                          </h4>
                          <div className="flex items-center justify-between mt-2 pt-1 border-t border-wierd-slate/30 text-[10px] text-wierd-silver/60">
                            <span>{node.creator?.displayName || node.creator?.username}</span>
                            <span>{node.remixCount ?? 0} remixes</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Selected Node Inspector Footer */}
          {selectedNode && (
            <div className="p-4 sm:p-5 border-t border-wierd-slate bg-wierd-surface/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-wierd-flame/20 text-wierd-flame border border-wierd-flame/30">
                    {selectedNode.branchDepth === 0
                      ? 'Original Root'
                      : `Gen ${selectedNode.branchDepth} Remix`}
                  </span>
                  <span className="text-xs text-wierd-silver/60">
                    Created by{' '}
                    <strong className="text-white">
                      {selectedNode.creator?.displayName || selectedNode.creator?.username}
                    </strong>
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-bold text-white">{selectedNode.title}</h3>
                <div className="flex items-center gap-4 text-xs text-wierd-silver/70 pt-0.5">
                  <span className="flex items-center gap-1">
                    <GitBranch className="w-3 h-3 text-wierd-flame" />
                    <strong>{selectedNode.remixCount ?? 0}</strong> remixes
                  </span>
                  <span className="flex items-center gap-1">
                    <ThumbsUp className="w-3 h-3 text-wierd-amber" />
                    <strong>{selectedNode.voteCount ?? 0}</strong> votes
                  </span>
                  <span className="flex items-center gap-1">
                    <Flame className="w-3 h-3 text-red-400" />
                    <strong>{selectedNode.resultCount ?? 0}</strong> cooks
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 self-start md:self-center">
                <Link
                  href={`/experiments/${selectedNode.id}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-wierd-slate/40 hover:bg-wierd-slate text-white text-xs font-semibold border border-wierd-slate transition-colors"
                >
                  <span>View Details</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>

                <Link
                  href={`/experiments/${selectedNode.id}/remix`}
                  id={`btn-graph-remix-${selectedNode.id}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-wierd-flame to-red-600 hover:from-red-600 hover:to-wierd-flame text-white text-xs font-bold shadow-md shadow-wierd-flame/20 transition-all cursor-pointer"
                >
                  <GitBranch className="w-3.5 h-3.5" />
                  <span>Remix Node</span>
                </Link>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
