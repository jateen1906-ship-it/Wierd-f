'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import type { Experiment } from '@food-evolution/types';
import type { ExperimentWithDetails, CookingResultResponse } from '@/lib/api-client';
import { apiClient } from '@/lib/api-client';
import { DIFFICULTY_THEMES, formatCostRange, type Difficulty } from '@/lib/tokens';
import { OUTCOME_TAGS } from '@/lib/cooking-result-schemas';
import {
  Clock,
  IndianRupee,
  GitBranch,
  Flame,
  ChefHat,
  Eye,
  X,
  ExternalLink,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { VoteButtons } from '@/components/votes/VoteButtons';

interface ExperimentCardProps {
  experiment: ExperimentWithDetails | Experiment;
  onRemix?: (id: string) => void;
  onVote?: (id: string) => void;
}

function extractHeroMediaUrl(media: unknown): string | null {
  if (!media) return null;
  if (typeof media === 'string') return media;
  if (typeof media === 'object' && media !== null && 'url' in media) {
    const url = (media as { url: unknown }).url;
    return typeof url === 'string' && url.trim().length > 0 ? url.trim() : null;
  }
  return null;
}

export function ExperimentCard({ experiment, onRemix }: ExperimentCardProps) {
  const [proofPreview, setProofPreview] = useState<CookingResultResponse | null>(null);
  const [isProofLoading, setIsProofLoading] = useState(false);
  const [showProofModal, setShowProofModal] = useState(false);
  const [proofError, setProofError] = useState<string | null>(null);

  const diffKey = (experiment.difficulty || 'medium') as Difficulty;
  const theme = DIFFICULTY_THEMES[diffKey] || DIFFICULTY_THEMES.medium;
  const isRoot = !experiment.parentId;
  const heroUrl = extractHeroMediaUrl(experiment.heroMedia);

  const creator = (experiment as ExperimentWithDetails).creator;
  const creatorName = creator?.displayName || creator?.username || 'Hostel Chef';
  const creatorInitial = creatorName[0]?.toUpperCase() || 'C';

  // On-demand fetch of the latest cooking result to strictly avoid N+1 requests
  const handleOpenProofPreview = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setShowProofModal(true);
    if (proofPreview) return; // already loaded

    setIsProofLoading(true);
    setProofError(null);
    try {
      const res = await apiClient.cookingResults.listByExperiment(experiment.id, 1, 1);
      if (res.items && res.items.length > 0) {
        setProofPreview(res.items[0]);
      } else {
        setProofError('No cooking proofs uploaded yet.');
      }
    } catch {
      setProofError('Unable to load latest cooking proof.');
    } finally {
      setIsProofLoading(false);
    }
  };

  const outcomeMeta = proofPreview
    ? OUTCOME_TAGS.find((o) => o.tag === proofPreview.outcomeTag)
    : null;

  return (
    <article className="group relative rounded-2xl bg-wierd-card/90 border border-wierd-border p-5 flex flex-col justify-between glow-on-hover shadow-card transition-all">
      {/* Background radial accent glow */}
      <div className="absolute inset-0 bg-card-glow rounded-2xl pointer-events-none opacity-40 group-hover:opacity-100 transition-opacity" />

      <div className="relative z-10 flex flex-col gap-3">
        {/* Optional Hero Media Thumbnail Banner */}
        {heroUrl && (
          <div className="relative w-full h-36 rounded-xl overflow-hidden border border-wierd-border/70 mb-1 group-hover:border-wierd-flame/40 transition-colors">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroUrl}
              alt={experiment.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              onError={(e) => {
                // Hide banner gracefully if image link is broken
                (e.target as HTMLElement).parentElement?.classList.add('hidden');
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-wierd-card via-transparent to-transparent opacity-80" />
            <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-[10px] text-white">
              <Sparkles className="w-3 h-3 text-wierd-amber" />
              <span>Original Presentation</span>
            </div>
          </div>
        )}

        {/* Top Badges & Meta Row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {/* Difficulty Badge */}
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${theme.badgeClass}`}
            >
              <span>{theme.icon}</span>
              <span>{theme.label}</span>
            </span>

            {/* Lineage Node Badge */}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-wierd-surface border border-wierd-border text-wierd-subtext">
              <GitBranch className="w-3 h-3 text-purple-400" />
              <span>{isRoot ? '🌱 Root Node' : `🧬 Gen ${experiment.branchDepth || 1}`}</span>
            </span>
          </div>

          {/* Time Badge */}
          <span className="inline-flex items-center gap-1 text-[11px] text-wierd-muted font-medium shrink-0">
            <Clock className="w-3.5 h-3.5 text-wierd-muted" />
            <span>{experiment.estimatedTimeMinutes}m</span>
          </span>
        </div>

        {/* Title & Creator */}
        <div>
          <Link href={`/experiments/${experiment.id}`} className="block">
            <h3 className="text-lg font-bold text-white group-hover:text-wierd-flame transition-colors leading-snug mb-1">
              {experiment.title}
            </h3>
          </Link>

          {/* Creator Attribution */}
          <div className="flex items-center gap-1.5 text-[11px] text-wierd-muted">
            {creator?.username ? (
              <Link
                href={`/users/${creator.username}`}
                className="inline-flex items-center gap-1.5 group/creator hover:text-white transition-colors"
                title={`View @${creator.username}'s public profile`}
              >
                {creator.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={creator.avatarUrl}
                    alt={creatorName}
                    className="w-4 h-4 rounded-full object-cover border border-wierd-border/80 group-hover/creator:border-wierd-flame transition-colors"
                  />
                ) : (
                  <span className="w-4 h-4 rounded-full bg-gradient-to-tr from-wierd-flame to-wierd-amber text-white font-bold flex items-center justify-center text-[9px] group-hover/creator:scale-105 transition-transform">
                    {creatorInitial}
                  </span>
                )}
                <span>By</span>
                <span className="text-wierd-cream font-medium group-hover/creator:text-wierd-flame group-hover/creator:underline underline-offset-2 transition-colors">
                  @{creator.username}
                </span>
              </Link>
            ) : (
              <>
                <span className="w-4 h-4 rounded-full bg-gradient-to-tr from-wierd-flame to-wierd-amber text-white font-bold flex items-center justify-center text-[9px]">
                  {creatorInitial}
                </span>
                <span>By</span>
                <span className="text-wierd-cream font-medium">{creatorName}</span>
              </>
            )}
            {creator?.skillLevel && (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-wierd-surface border border-wierd-border/80 text-wierd-silver capitalize">
                {creator.skillLevel.replace('_', ' ')}
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-wierd-muted leading-relaxed line-clamp-2">
          {experiment.description}
        </p>

        {/* Key Concoction Ingredients */}
        {experiment.ingredients && experiment.ingredients.length > 0 && (
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-wierd-muted/80 mb-1.5 flex items-center gap-1">
              <ChefHat className="w-3 h-3 text-wierd-amber" />
              <span>Key Ingredients</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {experiment.ingredients.slice(0, 4).map((ing, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded-md text-[11px] bg-wierd-surface border border-wierd-border/80 text-wierd-subtext"
                >
                  {ing.name} ({ing.quantity} {ing.unit})
                </span>
              ))}
              {experiment.ingredients.length > 4 && (
                <span className="px-1.5 py-0.5 text-[10px] text-wierd-muted">
                  +{experiment.ingredients.length - 4} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Verified Cook Proof Preview Link (Avoids N+1 eager requests) */}
        {((experiment.resultCount ?? 0) > 0 || (experiment.cookCount ?? 0) > 0) && (
          <div className="flex items-center justify-between p-2 rounded-xl bg-wierd-surface/50 border border-wierd-border/70 text-xs">
            <div className="flex items-center gap-1.5 text-wierd-cream">
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              <span className="font-semibold">{experiment.resultCount ?? 0} Proofs</span>
              <span className="text-wierd-muted text-[11px]">
                ({experiment.cookCount ?? 0} cooks)
              </span>
            </div>

            <button
              type="button"
              onClick={handleOpenProofPreview}
              className="inline-flex items-center gap-1 text-[11px] text-wierd-amber hover:text-amber-300 font-medium transition-colors"
            >
              <Eye className="w-3 h-3" />
              <span>Peek Latest</span>
            </button>
          </div>
        )}
      </div>

      {/* Footer Metrics & Actions */}
      <div className="relative z-10 pt-3 mt-3 border-t border-wierd-border/60 flex items-center justify-between gap-3 text-xs">
        {/* Estimated INR Cost */}
        <div
          className="flex items-center gap-1 font-semibold text-wierd-amber"
          title="Estimated Hostel Cost"
        >
          <IndianRupee className="w-3.5 h-3.5" />
          <span>{formatCostRange(experiment.estimatedCost)}</span>
        </div>

        {/* Social Counters & Action Buttons */}
        <div className="flex items-center gap-2 text-wierd-muted">
          {/* Voting with lazySummary=true to strictly avoid N+1 requests on initial feed render */}
          <VoteButtons
            experimentId={experiment.id}
            initialSummary={{ totalVotes: experiment.voteCount ?? 0 }}
            variant="compact"
            lazySummary={true}
          />

          {/* Remix Action Button */}
          {onRemix ? (
            <button
              onClick={() => onRemix(experiment.id)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-wierd-cream bg-wierd-surface hover:bg-wierd-card border border-wierd-border hover:border-purple-400/50 hover:text-purple-300 transition-all"
            >
              <GitBranch className="w-3 h-3 text-purple-400" />
              <span>Remix ({experiment.remixCount ?? 0})</span>
            </button>
          ) : (
            <Link
              href={`/experiments/${experiment.id}/remix`}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-wierd-cream bg-wierd-surface hover:bg-wierd-card border border-wierd-border hover:border-purple-400/50 hover:text-purple-300 transition-all"
            >
              <GitBranch className="w-3 h-3 text-purple-400" />
              <span>Remix ({experiment.remixCount ?? 0})</span>
            </Link>
          )}
        </div>
      </div>

      {/* On-Demand Proof Preview Modal (Loaded only when clicked) */}
      {showProofModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setShowProofModal(false)}
        >
          <div
            className="relative w-full max-w-sm rounded-2xl bg-wierd-dark border border-wierd-border p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-wierd-border/60">
              <div className="flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-500" />
                <h4 className="font-bold text-white text-sm">Verified Kitchen Proof</h4>
              </div>
              <button
                onClick={() => setShowProofModal(false)}
                className="text-wierd-muted hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isProofLoading && (
              <div className="py-8 text-center text-xs text-wierd-muted animate-pulse">
                Fetching latest kitchen outcome...
              </div>
            )}

            {!isProofLoading && proofError && (
              <div className="py-6 text-center text-xs text-rose-400">{proofError}</div>
            )}

            {!isProofLoading && proofPreview && (
              <div className="space-y-3">
                {/* Proof Media Preview */}
                {proofPreview.media && proofPreview.media.length > 0 && (
                  <div className="w-full h-44 rounded-xl overflow-hidden border border-wierd-border bg-black">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={proofPreview.media[0].url}
                      alt="Cook proof"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Outcome badge & Cook info */}
                <div className="flex items-center justify-between text-xs">
                  {outcomeMeta && (
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${outcomeMeta.badgeClass} border`}
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>{outcomeMeta.label}</span>
                    </span>
                  )}

                  <span className="text-wierd-muted text-[11px]">
                    By @
                    {proofPreview.user?.displayName || proofPreview.user?.username || 'Hostel Cook'}
                  </span>
                </div>

                {/* Caption / Note */}
                {proofPreview.caption && (
                  <p className="text-xs text-wierd-silver italic bg-wierd-surface/60 p-2.5 rounded-xl border border-wierd-border/60">
                    &ldquo;{proofPreview.caption}&rdquo;
                  </p>
                )}

                {/* Modifications Made */}
                {proofPreview.modificationsMade && (
                  <p className="text-[11px] text-wierd-muted">
                    <span className="font-semibold text-wierd-amber">Modifications: </span>
                    {proofPreview.modificationsMade}
                  </p>
                )}

                {/* Would make again */}
                <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>
                    {proofPreview.wouldMakeAgain
                      ? 'Author would make this again!'
                      : 'Author would tweak before trying again.'}
                  </span>
                </div>
              </div>
            )}

            {/* Link to Full Experiment Proofs */}
            <div className="pt-2 border-t border-wierd-border/60 flex items-center justify-between text-xs">
              <Link
                href={`/experiments/${experiment.id}#cooking-results`}
                className="inline-flex items-center gap-1 text-wierd-flame hover:underline font-semibold"
                onClick={() => setShowProofModal(false)}
              >
                <span>View all {experiment.resultCount ?? 0} proofs</span>
                <ExternalLink className="w-3 h-3" />
              </Link>

              <button
                type="button"
                onClick={() => setShowProofModal(false)}
                className="px-3 py-1 rounded-lg bg-wierd-surface text-wierd-silver hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
