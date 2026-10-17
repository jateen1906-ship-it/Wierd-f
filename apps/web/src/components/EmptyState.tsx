'use client';

import React from 'react';
import { Sparkles, PlusCircle } from 'lucide-react';

interface EmptyStateProps {
  filterTag?: string;
  onResetFilters?: () => void;
  onCreateClick?: () => void;
}

export function EmptyState({ filterTag, onResetFilters, onCreateClick }: EmptyStateProps) {
  return (
    <div className="rounded-3xl bg-wierd-card/50 border border-dashed border-wierd-border/80 p-10 text-center flex flex-col items-center justify-center max-w-xl mx-auto my-8">
      {/* Icon Graphic */}
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-wierd-surface to-wierd-card border border-wierd-border flex items-center justify-center text-3xl mb-4 shadow-card">
        🍲
      </div>

      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-wierd-amber/15 text-wierd-amber border border-wierd-amber/30 mb-3">
        <Sparkles className="w-3.5 h-3.5" />
        <span>Hostel Kitchen Is Quiet</span>
      </div>

      <h3 className="text-xl font-extrabold text-white mb-2">
        {filterTag && filterTag !== 'all'
          ? `No recipes found in "${filterTag}"`
          : 'No wild concoctions logged yet!'}
      </h3>

      <p className="text-xs text-wierd-muted max-w-md mb-6 leading-relaxed">
        {filterTag && filterTag !== 'all'
          ? 'Try relaxing your filter criteria or be the first hostel chef to pioneer this flavor branch.'
          : 'Did someone boil Oreos in Masala Chai or fuse Maggi with Peanut Butter? The living food graph is ready for your first creation.'}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {filterTag && filterTag !== 'all' && onResetFilters && (
          <button
            onClick={onResetFilters}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-wierd-subtext bg-wierd-surface border border-wierd-border hover:border-wierd-flame/40 transition-colors"
          >
            Show All Experiments
          </button>
        )}

        <button
          onClick={onCreateClick}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-wierd-flame to-wierd-amber shadow-flame hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Cook First Recipe</span>
        </button>
      </div>
    </div>
  );
}
