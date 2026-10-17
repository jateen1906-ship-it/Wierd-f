'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  GitBranch,
  Flame,
  Clock,
  IndianRupee,
  AlertTriangle,
  ArrowLeft,
  Loader2,
  CheckCircle,
  GitCommit,
} from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { IngredientSelector } from '@/components/studio/IngredientSelector';
import { StepBuilder } from '@/components/studio/StepBuilder';
import { TransformationBuilder } from '@/components/studio/TransformationBuilder';
import { ParentRecipeBanner } from '@/components/studio/ParentRecipeBanner';
import {
  apiClient,
  ApiError,
  type ExperimentWithDetails,
  type LineageNode,
} from '@/lib/api-client';
import {
  remixExperimentFormSchema,
  type IngredientFormData,
  type PreparationStepFormData,
  type TransformationFormData,
} from '@/lib/experiment-schemas';

export default function RemixStudioPage() {
  return (
    <ProtectedRoute>
      <RemixStudioForm />
    </ProtectedRoute>
  );
}

function RemixStudioForm() {
  const router = useRouter();
  const params = useParams();
  const parentId = typeof params?.id === 'string' ? params.id : '';

  // Parent experiment and lineage state
  const [parent, setParent] = useState<ExperimentWithDetails | null>(null);
  const [lineageChain, setLineageChain] = useState<LineageNode[]>([]);
  const [isLoadingParent, setIsLoadingParent] = useState(true);
  const [parentLoadError, setParentLoadError] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'chaos'>('medium');
  const [estimatedTimeMinutes, setEstimatedTimeMinutes] = useState<number>(15);
  const [costMin, setCostMin] = useState<number>(30);
  const [costMax, setCostMax] = useState<number>(60);
  const [heroMediaUrl, setHeroMediaUrl] = useState('');

  const [transformations, setTransformations] = useState<TransformationFormData[]>([
    {
      type: 'ingredient_substituted',
      description: '',
      previousValue: '',
      newValue: '',
    },
  ]);

  const [ingredients, setIngredients] = useState<IngredientFormData[]>([]);
  const [steps, setSteps] = useState<PreparationStepFormData[]>([]);

  // Validation & Submission State
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [ingredientErrors, setIngredientErrors] = useState<Record<number, Record<string, string>>>(
    {},
  );
  const [stepErrors, setStepErrors] = useState<Record<number, Record<string, string>>>({});
  const [transformationErrors, setTransformationErrors] = useState<
    Record<number, Record<string, string>>
  >({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successId, setSuccessId] = useState<string | null>(null);

  // Fetch Parent Recipe and Lineage
  useEffect(() => {
    if (!parentId) return;

    let isMounted = true;
    setIsLoadingParent(true);
    setParentLoadError(null);

    Promise.allSettled([
      apiClient.experiments.get(parentId),
      apiClient.experiments.lineage(parentId),
    ]).then(([parentRes, lineageRes]) => {
      if (!isMounted) return;

      if (parentRes.status === 'fulfilled') {
        const p = parentRes.value;
        setParent(p);

        // Prefill form values from parent
        setTitle(`[Remix] ${p.title}`.slice(0, 120));
        setDescription(p.description || '');
        if (p.difficulty) {
          setDifficulty(p.difficulty as 'easy' | 'medium' | 'hard' | 'chaos');
        }
        if (p.estimatedTimeMinutes) {
          setEstimatedTimeMinutes(p.estimatedTimeMinutes);
        }
        if (p.estimatedCost && typeof p.estimatedCost === 'object') {
          const cost = p.estimatedCost as { min?: number; max?: number };
          if (typeof cost.min === 'number') setCostMin(cost.min);
          if (typeof cost.max === 'number') setCostMax(cost.max);
        }

        // Prefill ingredients
        if (Array.isArray(p.ingredients) && p.ingredients.length > 0) {
          setIngredients(
            p.ingredients.map((ing) => ({
              id: ing.id,
              name: ing.name,
              quantity: ing.quantity,
              unit: ing.unit,
              preparation: ing.preparation || '',
              canonicalId: ing.canonicalId || '',
              isOptional: Boolean(ing.isOptional),
              isCustomAddition: Boolean(ing.isCustomAddition),
            })),
          );
        } else {
          setIngredients([
            {
              name: '',
              quantity: 1,
              unit: 'packet',
              preparation: '',
              canonicalId: '',
              isOptional: false,
              isCustomAddition: true,
            },
          ]);
        }

        // Prefill steps
        if (Array.isArray(p.steps) && p.steps.length > 0) {
          setSteps(
            p.steps.map((s: any, idx: number) => ({
              stepNumber: s.stepNumber || idx + 1,
              instruction: s.instruction || '',
              durationMinutes: s.durationMinutes,
              safetyTip: s.safetyTip || '',
              isCritical: Boolean(s.isCritical),
            })),
          );
        } else {
          setSteps([
            {
              stepNumber: 1,
              instruction: '',
              durationMinutes: 5,
              safetyTip: '',
              isCritical: false,
            },
          ]);
        }
      } else {
        setParentLoadError('Could not load parent experiment. Please check the ID.');
      }

      if (lineageRes.status === 'fulfilled') {
        setLineageChain(lineageRes.value.chain || []);
      }

      setIsLoadingParent(false);
    });

    return () => {
      isMounted = false;
    };
  }, [parentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    setFieldErrors({});
    setIngredientErrors({});
    setStepErrors({});
    setTransformationErrors({});

    const formDataToValidate = {
      title,
      description,
      difficulty,
      estimatedTimeMinutes,
      estimatedCost: {
        min: costMin,
        max: costMax,
        currency: 'INR' as const,
      },
      transformations,
      ingredients,
      steps,
      heroMediaUrl: heroMediaUrl || undefined,
    };

    const validation = remixExperimentFormSchema.safeParse(formDataToValidate);

    if (!validation.success) {
      const flatErrors: Record<string, string> = {};
      const ingErrors: Record<number, Record<string, string>> = {};
      const stErrors: Record<number, Record<string, string>> = {};
      const trErrors: Record<number, Record<string, string>> = {};

      for (const issue of validation.error.issues) {
        const path = issue.path;
        if (path[0] === 'ingredients' && typeof path[1] === 'number') {
          const idx = path[1];
          const field = String(path[2] || 'name');
          if (!ingErrors[idx]) ingErrors[idx] = {};
          ingErrors[idx][field] = issue.message;
        } else if (path[0] === 'steps' && typeof path[1] === 'number') {
          const idx = path[1];
          const field = String(path[2] || 'instruction');
          if (!stErrors[idx]) stErrors[idx] = {};
          stErrors[idx][field] = issue.message;
        } else if (path[0] === 'transformations' && typeof path[1] === 'number') {
          const idx = path[1];
          const field = String(path[2] || 'description');
          if (!trErrors[idx]) trErrors[idx] = {};
          trErrors[idx][field] = issue.message;
        } else if (path[0] === 'transformations') {
          flatErrors['transformations'] = issue.message;
        } else if (path[0] === 'estimatedCost') {
          flatErrors['estimatedCost'] = issue.message;
        } else {
          flatErrors[String(path[0])] = issue.message;
        }
      }

      setFieldErrors(flatErrors);
      setIngredientErrors(ingErrors);
      setStepErrors(stErrors);
      setTransformationErrors(trErrors);
      setApiError('Please fix the errors highlighted below.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        difficulty,
        estimatedTimeMinutes: Number(estimatedTimeMinutes),
        estimatedCost: {
          min: Number(costMin),
          max: Number(costMax),
          currency: 'INR',
        },
        transformations: transformations.map((t) => ({
          type: t.type,
          description: t.description.trim(),
          previousValue: t.previousValue?.trim() || undefined,
          newValue: t.newValue?.trim() || undefined,
        })),
        ingredients: ingredients.map((ing) => ({
          name: ing.name.trim(),
          quantity: Number(ing.quantity),
          unit: ing.unit.trim(),
          preparation: ing.preparation?.trim() || undefined,
          canonicalId: ing.canonicalId ? ing.canonicalId : undefined,
          isOptional: Boolean(ing.isOptional),
          isCustomAddition: !ing.canonicalId,
        })),
        steps: steps.map((s, idx) => ({
          stepNumber: idx + 1,
          instruction: s.instruction.trim(),
          durationMinutes: s.durationMinutes ? Number(s.durationMinutes) : undefined,
          safetyTip: s.safetyTip?.trim() || undefined,
          isCritical: Boolean(s.isCritical),
        })),
        heroMedia: heroMediaUrl?.trim()
          ? {
              url: heroMediaUrl.trim(),
              type: 'image' as const,
            }
          : undefined,
      };

      const remixed = await apiClient.experiments.remix(parentId, payload);
      setSuccessId(remixed.id);

      setTimeout(() => {
        router.push(`/experiments/${remixed.id}`);
      }, 700);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setApiError(err.message || 'Failed to remix experiment. Please try again.');
      } else if (err instanceof Error) {
        setApiError(err.message);
      } else {
        setApiError('An unexpected network error occurred.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingParent) {
    return (
      <div className="min-h-screen bg-wierd-dark flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 text-wierd-flame animate-spin mx-auto" />
          <h2 className="text-lg font-semibold text-white">
            Connecting to Food Evolution Graph...
          </h2>
          <p className="text-xs text-wierd-silver/70">
            Fetching parent recipe DNA and ancestry chain
          </p>
        </div>
      </div>
    );
  }

  if (parentLoadError || !parent) {
    return (
      <div className="min-h-screen bg-wierd-dark flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-wierd-card border border-red-500/30 rounded-2xl p-6 text-center space-y-4">
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto" />
          <h2 className="text-lg font-bold text-white">Parent Recipe Not Found</h2>
          <p className="text-xs text-wierd-silver">
            {parentLoadError ||
              'The recipe you are trying to remix does not exist or has been removed.'}
          </p>
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

  return (
    <div className="min-h-screen bg-wierd-dark text-white py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href={`/experiments/${parent.id}`}
            className="inline-flex items-center gap-2 text-xs font-medium text-wierd-silver hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Cancel & Return to Parent
          </Link>

          <span className="text-xs px-2.5 py-1 rounded-full bg-wierd-flame/15 border border-wierd-flame/30 text-wierd-flame font-medium">
            Remix Studio • Generation {(parent.branchDepth ?? 0) + 1}
          </span>
        </div>

        {/* Parent Recipe DNA Banner */}
        <ParentRecipeBanner parent={parent} lineageChain={lineageChain} />

        {/* Header */}
        <div className="border-b border-wierd-slate pb-4">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <GitBranch className="w-7 h-7 text-wierd-flame" />
            Remix Studio
          </h1>
          <p className="mt-1 text-sm text-wierd-silver">
            Evolve this recipe into a new branch. Modify ingredients, tweak spice levels, adjust
            cooking gear for your hostel room, and document the mutations.
          </p>
        </div>

        {/* Global Error Banner */}
        {apiError && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3 text-red-400 text-sm">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Remix Error</p>
              <p className="text-xs mt-0.5">{apiError}</p>
            </div>
          </div>
        )}

        {/* Success Banner */}
        {successId && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 text-emerald-400 text-sm">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-semibold">Remix Branched Successfully!</p>
              <p className="text-xs mt-0.5">Redirecting to your new evolved experiment...</p>
            </div>
          </div>
        )}

        {/* Main Remix Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Section 1: Remix Transformations (Mutations) */}
          <div className="bg-wierd-surface/50 border border-wierd-flame/40 rounded-2xl p-5 sm:p-6 space-y-4 shadow-lg shadow-wierd-flame/5">
            <TransformationBuilder
              transformations={transformations}
              onChange={setTransformations}
              errors={transformationErrors}
            />
            {fieldErrors.transformations && (
              <p className="text-xs text-red-400">{fieldErrors.transformations}</p>
            )}
          </div>

          {/* Section 2: Basic Remix Profile */}
          <div className="bg-wierd-surface/50 border border-wierd-slate rounded-2xl p-5 sm:p-6 space-y-5">
            <h2 className="text-base font-semibold text-white flex items-center gap-2 border-b border-wierd-slate/60 pb-2">
              <Flame className="w-4 h-4 text-wierd-flame" />
              Remix Details
            </h2>

            {/* Title */}
            <div>
              <label
                htmlFor="remix-title"
                className="block text-xs font-semibold text-wierd-silver uppercase tracking-wider mb-1"
              >
                Remix Title <span className="text-wierd-flame">*</span>
              </label>
              <input
                type="text"
                id="remix-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Give your variation an iconic name"
                maxLength={120}
                className={`w-full bg-wierd-dark border text-sm text-white rounded-xl px-4 py-2.5 focus:outline-none transition-colors ${
                  fieldErrors.title
                    ? 'border-red-500 focus:border-red-500'
                    : 'border-wierd-slate focus:border-wierd-flame'
                }`}
              />
              <div className="flex justify-between items-center mt-1 text-xs">
                {fieldErrors.title ? (
                  <span className="text-red-400">{fieldErrors.title}</span>
                ) : (
                  <span className="text-wierd-silver/50">
                    Describe your specific angle or twist
                  </span>
                )}
                <span className="text-wierd-silver/40">{title.length}/120</span>
              </div>
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="remix-desc"
                className="block text-xs font-semibold text-wierd-silver uppercase tracking-wider mb-1"
              >
                Why this variation? <span className="text-wierd-flame">*</span>
              </label>
              <textarea
                id="remix-desc"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explain what problem your remix solves (e.g. No stove in hostel, so adapted for an electric kettle with extra garlic chili oil)..."
                maxLength={2000}
                className={`w-full bg-wierd-dark border text-sm text-white rounded-xl p-3 focus:outline-none transition-colors ${
                  fieldErrors.description
                    ? 'border-red-500 focus:border-red-500'
                    : 'border-wierd-slate focus:border-wierd-flame'
                }`}
              />
              <div className="flex justify-between items-center mt-1 text-xs">
                {fieldErrors.description ? (
                  <span className="text-red-400">{fieldErrors.description}</span>
                ) : (
                  <span className="text-wierd-silver/50">Minimum 5 characters</span>
                )}
                <span className="text-wierd-silver/40">{description.length}/2000</span>
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <label
                  htmlFor="remix-difficulty"
                  className="block text-xs font-semibold text-wierd-silver uppercase tracking-wider mb-1"
                >
                  Difficulty
                </label>
                <select
                  id="remix-difficulty"
                  value={difficulty}
                  onChange={(e) =>
                    setDifficulty(e.target.value as 'easy' | 'medium' | 'hard' | 'chaos')
                  }
                  className="w-full bg-wierd-dark border border-wierd-slate text-sm text-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-wierd-flame capitalize"
                >
                  <option value="easy">Easy (Zero cooking skills)</option>
                  <option value="medium">Medium (Basic heat & timing)</option>
                  <option value="hard">Hard (Multi-step timing)</option>
                  <option value="chaos">Chaos (Hostel extreme experiment)</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="remix-time"
                  className="block text-xs font-semibold text-wierd-silver uppercase tracking-wider mb-1 flex items-center gap-1"
                >
                  <Clock className="w-3.5 h-3.5" />
                  Prep Time (Mins)
                </label>
                <input
                  type="number"
                  id="remix-time"
                  min="1"
                  max="360"
                  value={estimatedTimeMinutes}
                  onChange={(e) => setEstimatedTimeMinutes(parseInt(e.target.value, 10) || 1)}
                  className={`w-full bg-wierd-dark border text-sm text-white rounded-xl px-3 py-2.5 focus:outline-none transition-colors ${
                    fieldErrors.estimatedTimeMinutes
                      ? 'border-red-500 focus:border-red-500'
                      : 'border-wierd-slate focus:border-wierd-flame'
                  }`}
                />
                {fieldErrors.estimatedTimeMinutes && (
                  <span className="text-xs text-red-400 mt-1 block">
                    {fieldErrors.estimatedTimeMinutes}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-wierd-silver uppercase tracking-wider mb-1 flex items-center gap-1">
                  <IndianRupee className="w-3.5 h-3.5" />
                  Cost (₹ INR)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    placeholder="Min ₹"
                    value={costMin}
                    onChange={(e) => setCostMin(parseInt(e.target.value, 10) || 0)}
                    id="cost-min"
                    className="w-1/2 bg-wierd-dark border border-wierd-slate text-sm text-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-wierd-flame"
                  />
                  <span className="text-wierd-silver/60 text-xs">to</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="Max ₹"
                    value={costMax}
                    onChange={(e) => setCostMax(parseInt(e.target.value, 10) || 0)}
                    id="cost-max"
                    className="w-1/2 bg-wierd-dark border border-wierd-slate text-sm text-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-wierd-flame"
                  />
                </div>
                {fieldErrors.estimatedCost && (
                  <span className="text-xs text-red-400 mt-1 block">
                    {fieldErrors.estimatedCost}
                  </span>
                )}
              </div>
            </div>

            {/* Optional Photo URL */}
            <div>
              <label
                htmlFor="remix-photo"
                className="block text-xs font-semibold text-wierd-silver uppercase tracking-wider mb-1"
              >
                Hero Photo URL <span className="text-wierd-silver/50 font-normal">(optional)</span>
              </label>
              <input
                type="url"
                id="remix-photo"
                value={heroMediaUrl}
                onChange={(e) => setHeroMediaUrl(e.target.value)}
                placeholder="https://images.unsplash.com/photo-..."
                className={`w-full bg-wierd-dark border text-sm text-white rounded-xl px-4 py-2.5 focus:outline-none transition-colors ${
                  fieldErrors.heroMediaUrl
                    ? 'border-red-500 focus:border-red-500'
                    : 'border-wierd-slate focus:border-wierd-flame'
                }`}
              />
            </div>
          </div>

          {/* Section 3: Ingredients */}
          <div className="bg-wierd-surface/50 border border-wierd-slate rounded-2xl p-5 sm:p-6 space-y-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2 border-b border-wierd-slate/60 pb-2">
              <Flame className="w-4 h-4 text-wierd-flame" />
              Adjusted Ingredients
            </h2>
            {fieldErrors.ingredients && (
              <p className="text-xs text-red-400">{fieldErrors.ingredients}</p>
            )}
            <IngredientSelector
              ingredients={ingredients}
              onChange={setIngredients}
              errors={ingredientErrors}
            />
          </div>

          {/* Section 4: Preparation Steps */}
          <div className="bg-wierd-surface/50 border border-wierd-slate rounded-2xl p-5 sm:p-6 space-y-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2 border-b border-wierd-slate/60 pb-2">
              <Clock className="w-4 h-4 text-wierd-flame" />
              Adjusted Preparation Steps
            </h2>
            {fieldErrors.steps && <p className="text-xs text-red-400">{fieldErrors.steps}</p>}
            <StepBuilder steps={steps} onChange={setSteps} errors={stepErrors} />
          </div>

          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-wierd-slate">
            <Link
              href={`/experiments/${parent.id}`}
              className="text-xs text-wierd-silver hover:text-white transition-colors"
            >
              Cancel and return to parent recipe
            </Link>

            <button
              type="submit"
              disabled={isSubmitting}
              id="btn-publish-remix"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-wierd-flame to-red-600 hover:from-red-600 hover:to-wierd-flame text-white font-bold text-sm shadow-lg shadow-wierd-flame/20 hover:shadow-wierd-flame/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Branching into Food Graph...</span>
                </>
              ) : (
                <>
                  <GitBranch className="w-4 h-4" />
                  <span>Publish Remix Branch</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
