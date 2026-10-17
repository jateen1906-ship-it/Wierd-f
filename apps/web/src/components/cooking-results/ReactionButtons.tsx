'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Loader2, LogIn, X, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  apiClient,
  ApiError,
  type ResultReactionType,
  type CookingResultReactionSummary,
} from '@/lib/api-client';
import { REACTION_CONFIG } from '@/lib/cooking-result-schemas';

interface ReactionButtonsProps {
  resultId: string;
  initialSummary?: Partial<CookingResultReactionSummary>;
  returnUrl?: string;
  className?: string;
}

const REACTION_TYPES: ResultReactionType[] = ['fire', 'respect', 'laugh', 'mind_blown', 'yuck'];

export function ReactionButtons({
  resultId,
  initialSummary,
  returnUrl,
  className = '',
}: ReactionButtonsProps) {
  const { isAuthenticated } = useAuth();

  const [summary, setSummary] = useState<CookingResultReactionSummary>({
    resultId,
    fireCount: initialSummary?.fireCount ?? 0,
    yuckCount: initialSummary?.yuckCount ?? 0,
    respectCount: initialSummary?.respectCount ?? 0,
    laughCount: initialSummary?.laughCount ?? 0,
    mindBlownCount: initialSummary?.mindBlownCount ?? 0,
    totalReactions: initialSummary?.totalReactions ?? 0,
    likesCount: initialSummary?.likesCount ?? 0,
    userReaction: initialSummary?.userReaction,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Sync initial summary if updated
  useEffect(() => {
    if (initialSummary) {
      setSummary((prev) => ({
        ...prev,
        ...initialSummary,
        resultId,
      }));
    }
  }, [initialSummary, resultId]);

  // Fetch fresh reaction summary from server to get accurate userReaction
  useEffect(() => {
    let isMounted = true;
    apiClient.reactions
      .getSummary(resultId)
      .then((data) => {
        if (isMounted) setSummary(data);
      })
      .catch(() => {
        // Silently preserve initial values on background fetch error
      });

    return () => {
      isMounted = false;
    };
  }, [resultId, isAuthenticated]);

  const handleReactionClick = async (type: ResultReactionType) => {
    setError(null);

    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      if (summary.userReaction === type) {
        // User clicked their active reaction -> REMOVE
        await apiClient.reactions.remove(resultId);
      } else {
        // User clicked new or changed reaction -> CAST
        await apiClient.reactions.cast(resultId, type);
      }

      // Re-fetch exact counts from server (no fabricated client state)
      const updated = await apiClient.reactions.getSummary(resultId);
      setSummary(updated);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message || 'Failed to update reaction.');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred while reacting.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const loginRedirectPath = `/login?redirect=${encodeURIComponent(
    returnUrl || (typeof window !== 'undefined' ? window.location.pathname : `/`),
  )}`;

  return (
    <div className={`relative space-y-2 ${className}`}>
      {/* Reaction Chips */}
      <div className="flex flex-wrap items-center gap-1.5">
        {REACTION_TYPES.map((type) => {
          const config = REACTION_CONFIG[type];
          const count = summary[config.countKey] ?? 0;
          const isActive = summary.userReaction === type;

          return (
            <button
              key={type}
              type="button"
              disabled={isSubmitting}
              onClick={() => handleReactionClick(type)}
              id={`btn-react-${type}-${resultId}`}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold transition-all border ${
                isActive
                  ? `${config.activeColor} ring-1`
                  : 'bg-wierd-dark/60 hover:bg-wierd-surface text-wierd-silver border-wierd-slate/80 hover:text-white'
              } ${isSubmitting ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}
              title={
                isActive
                  ? `You reacted with ${config.label} (Click to remove)`
                  : `React with ${config.label}`
              }
            >
              <span>{config.emoji}</span>
              <span className="text-[11px] font-mono">{count}</span>
            </button>
          );
        })}

        {/* Total Reactions indicator (correctly labeled as total community reactions, not likes) */}
        {summary.totalReactions > 0 && (
          <span className="text-[11px] text-wierd-silver/60 ml-1">
            ({summary.totalReactions} {summary.totalReactions === 1 ? 'reaction' : 'reactions'})
          </span>
        )}
      </div>

      {/* Error feedback */}
      {error && (
        <div className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-[11px] flex items-center gap-1">
          <AlertCircle className="w-3 h-3 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Sign-in prompt popover */}
      {showAuthModal && (
        <div className="absolute bottom-full left-0 mb-2 w-64 z-50 bg-wierd-dark border border-wierd-slate rounded-xl p-3 shadow-2xl space-y-2">
          <div className="flex items-start justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-1">
              <span>🔥</span>
              Sign in to React
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
            React to proof photos and let cooks know if their creation was fire or total chaos.
          </p>
          <Link
            href={loginRedirectPath}
            className="inline-flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg bg-gradient-to-r from-wierd-flame to-red-600 hover:from-red-600 hover:to-wierd-flame text-white text-xs font-bold transition-all shadow-sm"
          >
            <LogIn className="w-3 h-3" />
            <span>Sign In to React</span>
          </Link>
        </div>
      )}
    </div>
  );
}
