'use client';

import React from 'react';
import Link from 'next/link';
import type { UserVoteItem } from '@/lib/api-client';
import { ThumbsUp, ThumbsDown, ExternalLink, Calendar, Loader2 } from 'lucide-react';

interface UserVotesListProps {
  votes: UserVoteItem[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  total: number;
  onLoadMore: () => void;
  onRefresh: () => void;
}

export function UserVotesList({
  votes,
  loading,
  loadingMore,
  hasMore,
  total,
  onLoadMore,
}: UserVotesListProps) {
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

  if (votes.length === 0) {
    return (
      <div className="p-8 text-center rounded-3xl bg-wierd-surface/40 border border-wierd-border/60 space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-sky-500/15 border border-sky-500/30 text-sky-400 flex items-center justify-center mx-auto">
          <ThumbsUp className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-white">No votes cast yet</h3>
        <p className="text-xs text-wierd-muted max-w-sm mx-auto">
          Explore the Living Concoction Feed to cast votes on crazy late-night hostel recipes!
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-wierd-flame to-wierd-amber shadow-flame hover:scale-[1.02] transition-transform"
        >
          <span>Explore Feed</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {votes.map((vote) => {
          const isWouldTry = vote.choice === 'would_try';
          const expTitle = vote.experiment?.title || 'Food Experiment';
          const voteDate = new Date(vote.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });

          return (
            <div
              key={vote.id}
              className="p-4 rounded-2xl bg-wierd-card/90 border border-wierd-border hover:border-wierd-flame/40 transition-colors flex items-center justify-between gap-3 shadow-card"
            >
              <div className="flex items-center gap-3">
                {/* Vote Choice Badge */}
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                    isWouldTry
                      ? 'bg-wierd-flame/15 text-wierd-flame border-wierd-flame/30'
                      : 'bg-slate-700/50 text-rose-300 border-rose-500/30'
                  }`}
                >
                  {isWouldTry ? (
                    <ThumbsUp className="w-5 h-5" />
                  ) : (
                    <ThumbsDown className="w-5 h-5" />
                  )}
                </div>

                {/* Details */}
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[11px] font-bold uppercase tracking-wider ${
                        isWouldTry ? 'text-wierd-flame' : 'text-rose-400'
                      }`}
                    >
                      {isWouldTry ? 'Would Try' : 'Passed'}
                    </span>
                    <span className="text-[10px] text-wierd-muted flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{voteDate}</span>
                    </span>
                  </div>

                  <Link
                    href={`/experiments/${vote.experimentId}`}
                    className="text-sm font-bold text-white hover:text-wierd-amber transition-colors line-clamp-1 block"
                  >
                    {expTitle}
                  </Link>
                </div>
              </div>

              {/* Link CTA */}
              <Link
                href={`/experiments/${vote.experimentId}`}
                className="p-2 rounded-xl text-wierd-muted hover:text-white hover:bg-wierd-surface transition-colors shrink-0"
                title="View Experiment"
              >
                <ExternalLink className="w-4 h-4" />
              </Link>
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
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-wierd-card border border-wierd-border hover:border-wierd-flame/50 text-white transition-all disabled:opacity-50"
          >
            {loadingMore ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-wierd-flame" />
                <span>Loading more votes...</span>
              </>
            ) : (
              <span>
                Load More Votes ({votes.length} of {total})
              </span>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
