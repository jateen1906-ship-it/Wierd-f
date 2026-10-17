'use client';

import React from 'react';
import {
  ChefHat,
  Star,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  Clock,
  ThumbsUp,
  ThumbsDown,
  Wrench,
} from 'lucide-react';
import type { CookingResultResponse } from '@/lib/api-client';
import { OUTCOME_TAGS } from '@/lib/cooking-result-schemas';
import { ReactionButtons } from './ReactionButtons';

interface CookingResultCardProps {
  result: CookingResultResponse;
  experimentTitle?: string;
  returnUrl?: string;
  className?: string;
}

export function CookingResultCard({
  result,
  experimentTitle,
  returnUrl,
  className = '',
}: CookingResultCardProps) {
  const outcomeMeta = OUTCOME_TAGS.find((o) => o.tag === result.outcomeTag) || {
    tag: result.outcomeTag,
    label: result.outcomeTag.replace(/_/g, ' '),
    badgeClass: 'bg-wierd-slate/40 text-wierd-silver border-wierd-slate',
    description: '',
  };

  const cookName = result.user?.displayName || result.user?.username || 'Hostel Cook';
  const firstMedia =
    Array.isArray(result.media) && result.media[0] ? (result.media[0] as any) : null;
  const mediaUrl = firstMedia?.url || '';

  return (
    <article
      className={`bg-wierd-card/90 border border-wierd-slate/80 hover:border-wierd-slate rounded-2xl overflow-hidden shadow-lg transition-all ${className}`}
    >
      {/* Proof Photo / Media */}
      {mediaUrl && (
        <div className="relative w-full h-48 sm:h-56 bg-wierd-dark overflow-hidden border-b border-wierd-slate/60">
          <img
            src={mediaUrl}
            alt={result.caption || `Cooking proof by ${cookName}`}
            className="w-full h-full object-cover object-center"
            onError={(e) => {
              // Hide broken image gracefully
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          {/* Outcome Tag overlay */}
          <div className="absolute top-3 left-3">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border backdrop-blur-md shadow-md capitalize ${outcomeMeta.badgeClass}`}
            >
              <Sparkles className="w-3 h-3" />
              {outcomeMeta.label}
            </span>
          </div>
        </div>
      )}

      <div className="p-4 sm:p-5 space-y-3.5">
        {/* If no photo, show outcome tag here */}
        {!mediaUrl && (
          <div>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${outcomeMeta.badgeClass}`}
            >
              <Sparkles className="w-3 h-3" />
              {outcomeMeta.label}
            </span>
          </div>
        )}

        {/* Cook Details & Date */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-wierd-flame to-wierd-amber text-white font-bold flex items-center justify-center text-xs">
              {cookName[0]?.toUpperCase() || 'C'}
            </div>
            <div>
              <div className="font-semibold text-white leading-none">{cookName}</div>
              <div className="text-[10px] text-wierd-silver/60 capitalize mt-0.5">
                {result.user?.skillLevel?.replace('_', ' ') || 'Hostel Cook'}
              </div>
            </div>
          </div>

          <span className="text-[11px] text-wierd-silver/50">
            {new Date(result.createdAt).toLocaleDateString()}
          </span>
        </div>

        {/* Caption */}
        {result.caption && (
          <h4 className="text-sm font-bold text-white leading-snug">
            &ldquo;{result.caption}&rdquo;
          </h4>
        )}

        {/* Notes */}
        {result.notes && (
          <p className="text-xs text-wierd-silver/80 leading-relaxed line-clamp-3">
            {result.notes}
          </p>
        )}

        {/* Modifications Made */}
        {result.modificationsMade && (
          <div className="p-2.5 rounded-xl bg-wierd-surface/70 border border-wierd-slate/50 text-xs space-y-1">
            <span className="font-semibold text-wierd-amber text-[11px] flex items-center gap-1">
              <Wrench className="w-3 h-3" />
              Cook&apos;s Tweaks & Substitutions
            </span>
            <p className="text-wierd-silver/80 text-[11px]">{result.modificationsMade}</p>
          </div>
        )}

        {/* Rating Metrics & Would Make Again */}
        <div className="pt-2 border-t border-wierd-slate/40 flex flex-wrap items-center justify-between gap-2 text-xs">
          {/* Taste Rating */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-wierd-silver/70 font-medium">Taste:</span>
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-3.5 h-3.5 ${
                    star <= result.tasteRating
                      ? 'text-wierd-amber fill-wierd-amber'
                      : 'text-wierd-slate/60'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Texture Rating (if present) */}
          {result.textureRating && (
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-wierd-silver/70 font-medium">Texture:</span>
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-3.5 h-3.5 ${
                      star <= result.textureRating!
                        ? 'text-teal-400 fill-teal-400'
                        : 'text-wierd-slate/60'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Would Make Again */}
          <span
            className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md ${
              result.wouldMakeAgain
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'bg-rose-500/10 text-rose-400'
            }`}
          >
            {result.wouldMakeAgain ? (
              <>
                <ThumbsUp className="w-3 h-3" /> Would repeat
              </>
            ) : (
              <>
                <ThumbsDown className="w-3 h-3" /> One-time experiment
              </>
            )}
          </span>
        </div>

        {/* Community Reactions */}
        <div className="pt-3 border-t border-wierd-slate/40">
          <ReactionButtons
            resultId={result.id}
            initialSummary={{ likesCount: result.likesCount }}
            returnUrl={returnUrl}
          />
        </div>
      </div>
    </article>
  );
}
