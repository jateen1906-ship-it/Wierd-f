'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ThumbsUp,
  ThumbsDown,
  Flame,
  Loader2,
  LogIn,
  X,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { apiClient, ApiError, type VoteChoice, type ExperimentVoteSummary } from '@/lib/api-client';

interface VoteButtonsProps {
  experimentId: string;
  initialSummary?: Partial<ExperimentVoteSummary>;
  variant?: 'compact' | 'detailed';
  returnUrl?: string;
  className?: string;
  onVoteChange?: (summary: ExperimentVoteSummary) => void;
  lazySummary?: boolean;
}

export function VoteButtons({
  experimentId,
  initialSummary,
  variant = 'compact',
  returnUrl,
  className = '',
  onVoteChange,
  lazySummary = false,
}: VoteButtonsProps) {
  const { isAuthenticated, user } = useAuth();

  const [summary, setSummary] = useState<ExperimentVoteSummary>({
    experimentId,
    wouldTryCount: initialSummary?.wouldTryCount ?? 0,
    passCount: initialSummary?.passCount ?? 0,
    totalVotes: initialSummary?.totalVotes ?? 0,
    userVote: initialSummary?.userVote,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [hasFetchedLazy, setHasFetchedLazy] = useState(false);

  // Sync initialSummary if it updates externally
  useEffect(() => {
    if (initialSummary) {
      setSummary((prev) => ({
        ...prev,
        ...initialSummary,
        experimentId,
      }));
    }
  }, [initialSummary, experimentId]);

  // Fetch summary from backend unless lazySummary is enabled (prevents N+1 feed queries)
  useEffect(() => {
    if (lazySummary) return;

    let isMounted = true;
    apiClient.votes
      .getSummary(experimentId)
      .then((data) => {
        if (isMounted) {
          setSummary(data);
          onVoteChange?.(data);
        }
      })
      .catch(() => {
        // Silently keep initial state on background fetch error
      });

    return () => {
      isMounted = false;
    };
  }, [experimentId, isAuthenticated, lazySummary]);

  const handleLazyFetch = () => {
    if (lazySummary && !hasFetchedLazy && isAuthenticated) {
      setHasFetchedLazy(true);
      apiClient.votes
        .getSummary(experimentId)
        .then((data) => {
          setSummary(data);
          onVoteChange?.(data);
        })
        .catch(() => {});
    }
  };

  const handleVoteClick = async (choice: VoteChoice) => {
    setError(null);

    // 1. Unauthenticated check: prompt to sign in and remember destination
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      if (summary.userVote === choice) {
        // User clicked active vote -> REMOVE vote
        await apiClient.votes.remove(experimentId);
      } else {
        // User clicked new vote or is changing vote -> CAST vote
        await apiClient.votes.cast(experimentId, choice);
      }

      // Fetch accurate server response (strictly no fabricated counts)
      const updatedSummary = await apiClient.votes.getSummary(experimentId);
      setSummary(updatedSummary);
      onVoteChange?.(updatedSummary);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message || 'Failed to update vote.');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred while voting.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const loginRedirectPath = `/login?redirect=${encodeURIComponent(
    returnUrl ||
      (typeof window !== 'undefined' ? window.location.pathname : `/experiments/${experimentId}`),
  )}`;

  // Calculate percentages for detailed view
  const wouldTryPct =
    summary.totalVotes > 0 ? Math.round((summary.wouldTryCount / summary.totalVotes) * 100) : 0;

  /* ========================================================================= */
  /* COMPACT VARIANT (Used on Feed Cards & Small Spaces)                       */
  /* ========================================================================= */
  if (variant === 'compact') {
    return (
      <div
        className={`relative inline-flex items-center gap-1.5 ${className}`}
        onMouseEnter={handleLazyFetch}
      >
        {/* Would Try Button */}
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => handleVoteClick('would_try')}
          id={`btn-vote-would-try-${experimentId}`}
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-all ${
            summary.userVote === 'would_try'
              ? 'bg-wierd-flame text-white shadow-flame ring-1 ring-wierd-flame/50'
              : 'bg-wierd-surface/80 hover:bg-wierd-flame/15 text-wierd-silver hover:text-wierd-flame border border-wierd-border/80'
          } ${isSubmitting ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}
          title={
            summary.userVote === 'would_try'
              ? 'You voted Would Try (Click to remove)'
              : 'Vote Would Try'
          }
        >
          {isSubmitting && summary.userVote === 'would_try' ? (
            <Loader2 className="w-3 h-3 animate-spin text-white" />
          ) : (
            <ThumbsUp className="w-3 h-3" />
          )}
          <span>{summary.wouldTryCount}</span>
        </button>

        {/* Pass Button */}
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => handleVoteClick('pass')}
          id={`btn-vote-pass-${experimentId}`}
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-all ${
            summary.userVote === 'pass'
              ? 'bg-slate-700 text-rose-300 border border-rose-500/40 ring-1 ring-rose-500/30'
              : 'bg-wierd-surface/80 hover:bg-slate-800 text-wierd-silver/70 hover:text-white border border-wierd-border/80'
          } ${isSubmitting ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}
          title={summary.userVote === 'pass' ? 'You voted Pass (Click to remove)' : 'Vote Pass'}
        >
          {isSubmitting && summary.userVote === 'pass' ? (
            <Loader2 className="w-3 h-3 animate-spin text-rose-300" />
          ) : (
            <ThumbsDown className="w-3 h-3" />
          )}
          <span>{summary.passCount}</span>
        </button>

        {/* Auth prompt modal / popover */}
        {showAuthModal && (
          <div className="absolute bottom-full left-0 mb-2 w-60 z-50 bg-wierd-dark border border-wierd-slate rounded-xl p-3 shadow-2xl space-y-2">
            <div className="flex items-start justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-wierd-flame" />
                Sign in to vote
              </span>
              <button
                type="button"
                onClick={() => setShowAuthModal(false)}
                className="text-wierd-silver/60 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[11px] text-wierd-silver/80 leading-snug">
              Cast your vote to shape the hostel food hierarchy!
            </p>
            <Link
              href={loginRedirectPath}
              className="inline-flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg bg-gradient-to-r from-wierd-flame to-red-600 hover:from-red-600 hover:to-wierd-flame text-white text-xs font-bold transition-all shadow-sm"
            >
              <LogIn className="w-3 h-3" />
              <span>Sign In to Vote</span>
            </Link>
          </div>
        )}
      </div>
    );
  }

  /* ========================================================================= */
  /* DETAILED VARIANT (Used on Experiment Detail Page Hero)                    */
  /* ========================================================================= */
  return (
    <div
      className={`p-4 rounded-2xl bg-wierd-surface/40 border border-wierd-slate/80 space-y-3 ${className}`}
    >
      {/* Header with aggregate verdict */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="p-1 rounded-lg bg-wierd-flame/15 text-wierd-flame">
            <Flame className="w-4 h-4" />
          </span>
          <div>
            <span className="text-xs font-bold text-white block">Community Verdict</span>
            <span className="text-[11px] text-wierd-silver/70">
              {summary.totalVotes === 0
                ? 'No votes cast yet. Be the first!'
                : `${wouldTryPct}% Would Try (${summary.totalVotes} total votes)`}
            </span>
          </div>
        </div>

        {summary.userVote && (
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-wierd-flame/15 text-wierd-flame border border-wierd-flame/30 font-medium">
            Your vote: {summary.userVote === 'would_try' ? 'Would Try' : 'Pass'} (Click to undo)
          </span>
        )}
      </div>

      {/* Visual Verdict Percentage Bar */}
      {summary.totalVotes > 0 && (
        <div className="space-y-1">
          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex">
            <div
              style={{ width: `${wouldTryPct}%` }}
              className="bg-gradient-to-r from-wierd-flame to-wierd-amber transition-all duration-300"
            />
            <div
              style={{ width: `${100 - wouldTryPct}%` }}
              className="bg-slate-700 transition-all duration-300"
            />
          </div>
          <div className="flex justify-between text-[10px] text-wierd-silver/60 px-0.5 font-medium">
            <span>{summary.wouldTryCount} Would Try</span>
            <span>{summary.passCount} Pass</span>
          </div>
        </div>
      )}

      {/* Error alert */}
      {error && (
        <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => handleVoteClick('would_try')}
          id={`btn-vote-would-try-detail-${experimentId}`}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs transition-all ${
            summary.userVote === 'would_try'
              ? 'bg-wierd-flame text-white shadow-flame ring-2 ring-wierd-flame/40'
              : 'bg-wierd-card hover:bg-wierd-flame/15 text-white border border-wierd-slate hover:border-wierd-flame/60'
          } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-[0.98]'}`}
        >
          {isSubmitting && summary.userVote === 'would_try' ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <ThumbsUp className="w-3.5 h-3.5 text-wierd-amber" />
          )}
          <span>Would Try ({summary.wouldTryCount})</span>
        </button>

        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => handleVoteClick('pass')}
          id={`btn-vote-pass-detail-${experimentId}`}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs transition-all ${
            summary.userVote === 'pass'
              ? 'bg-slate-700 text-rose-300 border border-rose-500/50 ring-2 ring-rose-500/30'
              : 'bg-wierd-card hover:bg-slate-800 text-wierd-silver hover:text-white border border-wierd-slate hover:border-wierd-slate/80'
          } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-[0.98]'}`}
        >
          {isSubmitting && summary.userVote === 'pass' ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <ThumbsDown className="w-3.5 h-3.5 text-wierd-silver/60" />
          )}
          <span>Pass ({summary.passCount})</span>
        </button>
      </div>

      {/* Unauthenticated modal prompt */}
      {showAuthModal && (
        <div className="p-3 rounded-xl bg-wierd-dark border border-wierd-flame/40 text-xs space-y-2 mt-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-wierd-flame" />
              Sign in to record your vote
            </span>
            <button
              type="button"
              onClick={() => setShowAuthModal(false)}
              className="text-wierd-silver/60 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[11px] text-wierd-silver/80">
            Join the mess to cast votes and see how recipes evolve across campus.
          </p>
          <div className="flex items-center gap-2 pt-1">
            <Link
              href={loginRedirectPath}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-wierd-flame text-white text-xs font-bold hover:bg-red-600 transition-colors"
            >
              <LogIn className="w-3 h-3" />
              <span>Sign In</span>
            </Link>
            <button
              type="button"
              onClick={() => setShowAuthModal(false)}
              className="px-3 py-1.5 rounded-lg bg-wierd-slate/40 text-wierd-silver text-xs hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
