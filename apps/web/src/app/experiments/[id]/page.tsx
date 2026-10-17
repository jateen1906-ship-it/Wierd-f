'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Sparkles,
  GitBranch,
  Clock,
  IndianRupee,
  ChefHat,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
  Flame,
} from 'lucide-react';
import { apiClient, type ExperimentWithDetails, type LineageNode } from '@/lib/api-client';
import { LivingFoodGraph } from '@/components/graph/LivingFoodGraph';
import { VoteButtons } from '@/components/votes/VoteButtons';
import { CookingResultsSection } from '@/components/cooking-results/CookingResultsSection';

export default function ExperimentDetailPage() {
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : '';

  const [experiment, setExperiment] = useState<ExperimentWithDetails | null>(null);
  const [lineageChain, setLineageChain] = useState<LineageNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    Promise.allSettled([apiClient.experiments.get(id), apiClient.experiments.lineage(id)]).then(
      ([expRes, linRes]) => {
        if (!isMounted) return;

        if (expRes.status === 'fulfilled') {
          setExperiment(expRes.value);
        } else {
          setError('Experiment not found or failed to load.');
        }

        if (linRes.status === 'fulfilled') {
          setLineageChain(linRes.value.chain || []);
        }

        setIsLoading(false);
      },
    );

    return () => {
      isMounted = false;
    };
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-wierd-dark flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 text-wierd-flame animate-spin mx-auto" />
          <h2 className="text-lg font-semibold text-white">Loading Experiment Lab...</h2>
          <p className="text-xs text-wierd-silver/70">Connecting to Food Evolution Graph</p>
        </div>
      </div>
    );
  }

  if (error || !experiment) {
    return (
      <div className="min-h-screen bg-wierd-dark flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-wierd-card border border-red-500/30 rounded-2xl p-6 text-center space-y-4">
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto" />
          <h2 className="text-lg font-bold text-white">Experiment Not Found</h2>
          <p className="text-xs text-wierd-silver">{error || 'This recipe could not be found.'}</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-wierd-slate/40 text-white text-xs font-semibold hover:bg-wierd-slate transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Feed
          </Link>
        </div>
      </div>
    );
  }

  const creatorName =
    experiment.creator?.displayName || experiment.creator?.username || 'Hostel Cook';
  const branchDepth = experiment.branchDepth ?? 0;
  const isRemix = Boolean(experiment.parentId) || branchDepth > 0;
  const cost = experiment.estimatedCost as
    { min?: number; max?: number; currency?: string } | undefined;

  // Safe cast for steps
  const stepsList = Array.isArray(experiment.steps) ? experiment.steps : [];
  // Safe cast for transformations
  const transformationsList = Array.isArray(experiment.transformations)
    ? (experiment.transformations as Array<{
        type: string;
        description: string;
        previousValue?: string;
        newValue?: string;
      }>)
    : [];

  return (
    <div className="min-h-screen bg-wierd-dark text-white py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation Breadcrumb & Action */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-medium text-wierd-silver hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Feed
          </Link>

          <Link
            href={`/experiments/${experiment.id}/remix`}
            id="btn-remix-this-experiment"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-wierd-flame to-red-600 hover:from-red-600 hover:to-wierd-flame text-white font-bold text-xs shadow-lg shadow-wierd-flame/20 transition-all cursor-pointer"
          >
            <GitBranch className="w-3.5 h-3.5" />
            Remix this Recipe
          </Link>
        </div>

        {/* Hero Card */}
        <div className="bg-wierd-card border border-wierd-slate rounded-2xl p-6 sm:p-8 space-y-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-wierd-flame/5 rounded-full blur-3xl pointer-events-none" />

          {/* Badges & Depth */}
          <div className="flex flex-wrap items-center gap-2.5">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                isRemix
                  ? 'bg-wierd-flame/20 text-wierd-flame border border-wierd-flame/40'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
              }`}
            >
              {isRemix ? (
                <GitBranch className="w-3.5 h-3.5" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              {isRemix ? `Generation ${branchDepth} Remix` : 'Root Experiment'}
            </span>

            <span className="text-xs px-2.5 py-1 rounded-full bg-wierd-surface border border-wierd-slate capitalize text-wierd-silver">
              {experiment.difficulty} difficulty
            </span>

            {experiment.estimatedTimeMinutes && (
              <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-wierd-surface border border-wierd-slate text-wierd-silver">
                <Clock className="w-3 h-3" />
                {experiment.estimatedTimeMinutes} mins
              </span>
            )}

            {cost && typeof cost.min === 'number' && (
              <span className="inline-flex items-center gap-0.5 text-xs px-2.5 py-1 rounded-full bg-wierd-surface border border-wierd-slate text-wierd-silver">
                <IndianRupee className="w-3 h-3" />
                {cost.min} - {cost.max} INR
              </span>
            )}
          </div>

          {/* Title & Creator */}
          <div>
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              {experiment.title}
            </h1>
            <div className="flex items-center gap-2 mt-2 text-xs text-wierd-silver">
              <span className="flex items-center gap-1.5 font-medium text-white">
                <ChefHat className="w-4 h-4 text-wierd-amber" />
                {experiment.creator?.username ? (
                  <Link
                    href={`/users/${experiment.creator.username}`}
                    className="hover:text-wierd-flame transition-colors underline-offset-2 hover:underline"
                    title={`View @${experiment.creator.username}'s public profile`}
                  >
                    {creatorName}
                  </Link>
                ) : (
                  creatorName
                )}
              </span>
              <span>•</span>
              <span>{new Date(experiment.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm sm:text-base text-wierd-silver leading-relaxed max-w-3xl">
            {experiment.description}
          </p>

          {/* Interactive Community Voting Verdict */}
          <div className="pt-2 max-w-lg">
            <VoteButtons
              experimentId={experiment.id}
              initialSummary={{ totalVotes: experiment.voteCount ?? 0 }}
              variant="detailed"
              returnUrl={`/experiments/${experiment.id}`}
            />
          </div>

          {/* Lineage Path Chain */}
          {lineageChain.length > 1 && (
            <div className="pt-4 border-t border-wierd-slate/60">
              <div className="text-xs font-semibold text-wierd-silver mb-2">
                Food Evolution Ancestry
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                {lineageChain.map((node, index) => {
                  const isCurrent = node.id === experiment.id;
                  return (
                    <React.Fragment key={node.id}>
                      {isCurrent ? (
                        <span className="px-2.5 py-1 rounded-lg bg-wierd-flame/20 text-wierd-flame font-bold border border-wierd-flame/40 text-xs">
                          Gen {node.branchDepth}: {node.title} (Current)
                        </span>
                      ) : (
                        <Link
                          href={`/experiments/${node.id}`}
                          className="px-2.5 py-1 rounded-lg bg-wierd-surface hover:bg-wierd-slate/40 text-wierd-silver hover:text-white border border-wierd-slate transition-colors text-xs"
                        >
                          Gen {node.branchDepth}: {node.title}
                        </Link>
                      )}
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

        {/* Transformations Section (if remix) */}
        {transformationsList.length > 0 && (
          <div className="bg-wierd-card border border-wierd-flame/30 rounded-2xl p-6 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-wierd-slate pb-2">
              <GitBranch className="w-4 h-4 text-wierd-flame" />
              Remix Mutations from Parent ({transformationsList.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {transformationsList.map((t, idx) => (
                <div
                  key={idx}
                  className="p-3.5 bg-wierd-surface/70 border border-wierd-slate rounded-xl space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-wierd-flame capitalize">
                      {t.type.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-white font-medium">{t.description}</p>
                  {(t.previousValue || t.newValue) && (
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-wierd-slate/40 text-[11px]">
                      {t.previousValue && (
                        <div>
                          <span className="text-wierd-silver/50 block">Original:</span>
                          <span className="text-wierd-silver line-through">{t.previousValue}</span>
                        </div>
                      )}
                      {t.newValue && (
                        <div>
                          <span className="text-wierd-flame/80 block">Mutation:</span>
                          <span className="text-wierd-amber font-medium">{t.newValue}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Interactive Living Food Graph Tree Visualizer */}
        <LivingFoodGraph experimentId={experiment.id} />

        {/* Ingredients & Steps Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Ingredients Column */}
          <div className="lg:col-span-5 bg-wierd-card border border-wierd-slate rounded-2xl p-6 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center justify-between border-b border-wierd-slate pb-2">
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-wierd-flame" />
                Ingredients
              </span>
              <span className="text-xs font-normal text-wierd-silver">
                {experiment.ingredients?.length || 0} items
              </span>
            </h2>

            <div className="space-y-2.5">
              {experiment.ingredients?.map((ing) => (
                <div
                  key={ing.id}
                  className="flex items-start justify-between p-2.5 rounded-xl bg-wierd-surface/50 border border-wierd-slate/60 text-xs"
                >
                  <div>
                    <span className="font-medium text-white">{ing.name}</span>
                    {ing.preparation && (
                      <span className="text-wierd-silver/60 block text-[11px]">
                        ({ing.preparation})
                      </span>
                    )}
                    {ing.isOptional && (
                      <span className="text-[10px] text-wierd-amber block">Optional</span>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <span className="font-semibold text-wierd-silver">
                      {ing.quantity} {ing.unit}
                    </span>
                    {ing.canonicalId && (
                      <span className="flex items-center justify-end gap-1 text-[10px] text-emerald-400 mt-0.5">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Canonical
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Preparation Steps Column */}
          <div className="lg:col-span-7 bg-wierd-card border border-wierd-slate rounded-2xl p-6 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center justify-between border-b border-wierd-slate pb-2">
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-wierd-flame" />
                Preparation Instructions
              </span>
              <span className="text-xs font-normal text-wierd-silver">
                {stepsList.length} steps
              </span>
            </h2>

            <div className="space-y-3">
              {stepsList.map((step: any, idx: number) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-wierd-surface/50 border border-wierd-slate/60 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-wierd-flame/20 text-wierd-flame font-bold text-[11px] flex items-center justify-center border border-wierd-flame/30">
                        {step.stepNumber || idx + 1}
                      </span>
                      <span className="font-semibold text-white">
                        Step {step.stepNumber || idx + 1}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {step.durationMinutes && (
                        <span className="text-[11px] text-wierd-silver/70 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {step.durationMinutes}m
                        </span>
                      )}
                      {step.isCritical && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 text-[10px] border border-amber-500/30 flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3" /> Critical
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-wierd-silver leading-relaxed pl-7">{step.instruction}</p>

                  {step.safetyTip && (
                    <div className="ml-7 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{step.safetyTip}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Real-World Cooking Proofs & Community Reactions */}
        <CookingResultsSection experimentId={experiment.id} experimentTitle={experiment.title} />
      </div>
    </div>
  );
}
