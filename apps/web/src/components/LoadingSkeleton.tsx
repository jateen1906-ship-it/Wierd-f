'use client';

import React from 'react';

export function LoadingSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl bg-wierd-card/60 border border-wierd-border/80 p-5 animate-pulse"
        >
          {/* Header Badges */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-2">
              <div className="w-24 h-5 rounded-full bg-wierd-surface" />
              <div className="w-16 h-5 rounded-full bg-wierd-surface" />
            </div>
            <div className="w-10 h-4 rounded bg-wierd-surface" />
          </div>

          {/* Title */}
          <div className="w-3/4 h-6 rounded-lg bg-wierd-surface mb-3" />

          {/* Description lines */}
          <div className="w-full h-3.5 rounded bg-wierd-surface mb-2" />
          <div className="w-4/5 h-3.5 rounded bg-wierd-surface mb-4" />

          {/* Tags */}
          <div className="flex gap-2 mb-6">
            <div className="w-16 h-5 rounded-md bg-wierd-surface" />
            <div className="w-20 h-5 rounded-md bg-wierd-surface" />
            <div className="w-14 h-5 rounded-md bg-wierd-surface" />
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center pt-3 border-t border-wierd-border/40">
            <div className="w-20 h-4 rounded bg-wierd-surface" />
            <div className="flex gap-3">
              <div className="w-8 h-4 rounded bg-wierd-surface" />
              <div className="w-8 h-4 rounded bg-wierd-surface" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
