'use client';

import React from 'react';
import Link from 'next/link';
import { GitBranch, ChefHat, ExternalLink, ArrowRight } from 'lucide-react';
import type { ExperimentWithDetails, LineageNode } from '@/lib/api-client';

interface ParentRecipeBannerProps {
  parent: ExperimentWithDetails;
  lineageChain?: LineageNode[];
}

export function ParentRecipeBanner({ parent, lineageChain = [] }: ParentRecipeBannerProps) {
  const creatorName = parent.creator?.displayName || parent.creator?.username || 'Hostel Chef';
  const branchDepth = parent.branchDepth ?? 0;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-wierd-card via-wierd-surface to-wierd-card border border-wierd-flame/30 p-5 shadow-lg">
      <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 w-32 h-32 bg-wierd-flame/10 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-wierd-flame/20 text-wierd-flame border border-wierd-flame/40">
              <GitBranch className="w-3.5 h-3.5" />
              Remixing from Generation {branchDepth}
            </span>
            <span className="text-xs text-wierd-silver/60">
              ID: <span className="font-mono text-wierd-silver/80">{parent.id.slice(0, 8)}...</span>
            </span>
          </div>

          <h2 className="text-lg md:text-xl font-bold text-white tracking-tight">{parent.title}</h2>

          <div className="flex items-center gap-3 text-xs text-wierd-silver/70">
            <span className="flex items-center gap-1.5">
              <ChefHat className="w-3.5 h-3.5 text-wierd-amber" />
              Created by <span className="text-white font-medium">{creatorName}</span>
            </span>
            <span>•</span>
            <span>{parent.ingredients?.length || 0} ingredients</span>
            <span>•</span>
            <span className="capitalize">{parent.difficulty} difficulty</span>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-center">
          <Link
            href={`/experiments/${parent.id}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-wierd-slate/40 text-wierd-silver hover:text-white border border-wierd-slate hover:border-wierd-flame/40 transition-colors"
          >
            <span>View Parent</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Ancestor Lineage Path preview */}
      {lineageChain.length > 1 && (
        <div className="mt-4 pt-3 border-t border-wierd-slate/40">
          <div className="text-[11px] font-medium text-wierd-silver/60 mb-1.5 flex items-center gap-1">
            <span>Evolution Lineage:</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {lineageChain.map((node, index) => {
              const isCurrentParent = node.id === parent.id;
              return (
                <React.Fragment key={node.id}>
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] ${
                      isCurrentParent
                        ? 'bg-wierd-flame/20 text-wierd-flame font-semibold border border-wierd-flame/30'
                        : 'bg-wierd-dark/60 text-wierd-silver border border-wierd-slate/50'
                    }`}
                  >
                    Gen {node.branchDepth}: {node.title}
                  </span>
                  {index < lineageChain.length - 1 && (
                    <ArrowRight className="w-3 h-3 text-wierd-silver/40" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
