'use client';

import React from 'react';
import Link from 'next/link';
import type { UserReactionItem } from '@/lib/api-client';
import { REACTION_CONFIG, OUTCOME_TAGS } from '@/lib/cooking-result-schemas';
import { Sparkles, ExternalLink, Calendar, Loader2 } from 'lucide-react';

interface UserReactionsListProps {
  reactions: UserReactionItem[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  total: number;
  onLoadMore: () => void;
  onRefresh: () => void;
}

export function UserReactionsList({
  reactions,
  loading,
  loadingMore,
  hasMore,
  total,
  onLoadMore,
}: UserReactionsListProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className="h-20 rounded-2xl bg-wierd-card/60 border border-wierd-border/60 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (reactions.length === 0) {
    return (
      <div className="p-8 text-center rounded-3xl bg-wierd-surface/40 border border-wierd-border/60 space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center mx-auto">
          <Sparkles className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-white">No reactions given yet</h3>
        <p className="text-xs text-wierd-muted max-w-sm mx-auto">
          React to cooking outcomes and proofs shared by your wing-mates across campus!
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-wierd-flame to-wierd-amber shadow-flame hover:scale-[1.02] transition-transform"
        >
          <span>Explore Concoctions</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {reactions.map((item) => {
          const config = REACTION_CONFIG[item.type] || {
            type: item.type,
            label: item.type,
            emoji: '👍',
          };
          const outcome = item.result
            ? OUTCOME_TAGS.find((o) => o.tag === item.result?.outcomeTag)
            : null;
          const reactDate = new Date(item.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });

          return (
            <div
              key={item.id}
              className="p-4 rounded-2xl bg-wierd-card/90 border border-wierd-border hover:border-purple-400/40 transition-colors flex items-center justify-between gap-3 shadow-card"
            >
              <div className="flex items-center gap-3">
                {/* Reaction Emoji Badge */}
                <div className="w-10 h-10 rounded-xl bg-wierd-surface border border-wierd-border flex items-center justify-center text-xl shrink-0">
                  {config.emoji}
                </div>

                {/* Details */}
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-purple-300">
                      Reacted with {config.label}
                    </span>
                    <span className="text-[10px] text-wierd-muted flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{reactDate}</span>
                    </span>
                  </div>

                  {/* Outcome Tag or caption */}
                  <div className="flex items-center gap-2 text-xs">
                    {outcome && (
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${outcome.badgeClass} border`}
                      >
                        <span>{outcome.label}</span>
                      </span>
                    )}

                    {item.result?.caption && (
                      <span className="text-wierd-silver/80 line-clamp-1 italic text-[11px]">
                        &ldquo;{item.result.caption}&rdquo;
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Link CTA to experiment */}
              {item.result?.experimentId && (
                <Link
                  href={`/experiments/${item.result.experimentId}#cooking-results`}
                  className="p-2 rounded-xl text-wierd-muted hover:text-white hover:bg-wierd-surface transition-colors shrink-0"
                  title="View Proof on Experiment Page"
                >
                  <ExternalLink className="w-4 h-4" />
                </Link>
              )}
            </div>
          );
        })}
      </div>

      {/* Pagination Load More */}
      {hasMore && (
        <div className="text-center pt-2">
          <button
            type="button"
            disabled={loadingMore}
            onClick={onLoadMore}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-wierd-card border border-wierd-border hover:border-purple-400/50 text-white transition-all disabled:opacity-50"
          >
            {loadingMore ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
                <span>Loading more reactions...</span>
              </>
            ) : (
              <span>
                Load More Reactions ({reactions.length} of {total})
              </span>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
