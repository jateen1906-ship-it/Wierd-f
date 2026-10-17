'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Sparkles,
  Flame,
  Clock,
  IndianRupee,
  AlertTriangle,
  ArrowLeft,
  Loader2,
  CheckCircle,
} from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { IngredientSelector } from '@/components/studio/IngredientSelector';
import { StepBuilder } from '@/components/studio/StepBuilder';
import { apiClient, ApiError } from '@/lib/api-client';
import {
  createExperimentFormSchema,
  type CreateExperimentFormData,
  type IngredientFormData,
  type PreparationStepFormData,
} from '@/lib/experiment-schemas';

export default function CreateExperimentPage() {
  return (
    <ProtectedRoute>
      <CreateExperimentForm />
    </ProtectedRoute>
  );
}

function CreateExperimentForm() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'chaos'>('medium');
  const [estimatedTimeMinutes, setEstimatedTimeMinutes] = useState<number>(15);
  const [costMin, setCostMin] = useState<number>(30);
  const [costMax, setCostMax] = useState<number>(60);
  const [heroMediaUrl, setHeroMediaUrl] = useState('');

  const [ingredients, setIngredients] = useState<IngredientFormData[]>([
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

  const [steps, setSteps] = useState<PreparationStepFormData[]>([
    {
      stepNumber: 1,
      instruction: '',
      durationMinutes: 5,
      safetyTip: '',
      isCritical: false,
    },
  ]);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [ingredientErrors, setIngredientErrors] = useState<Record<number, Record<string, string>>>(
    {},
  );
  const [stepErrors, setStepErrors] = useState<Record<number, Record<string, string>>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successId, setSuccessId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    setFieldErrors({});
    setIngredientErrors({});
    setStepErrors({});

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
      ingredients,
      steps,
      heroMediaUrl: heroMediaUrl || undefined,
    };

    const validation = createExperimentFormSchema.safeParse(formDataToValidate);

    if (!validation.success) {
      const flatErrors: Record<string, string> = {};
      const ingErrors: Record<number, Record<string, string>> = {};
      const stErrors: Record<number, Record<string, string>> = {};

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
        } else if (path[0] === 'estimatedCost') {
          flatErrors['estimatedCost'] = issue.message;
        } else {
          flatErrors[String(path[0])] = issue.message;
        }
      }

      setFieldErrors(flatErrors);
      setIngredientErrors(ingErrors);
      setStepErrors(stErrors);
      setApiError('Please fix the errors highlighted below.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Map to backend CreateExperimentInput format
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

      const created = await apiClient.experiments.create(payload);
      setSuccessId(created.id);

      // Brief delay to allow user to see success state, then redirect to experiment detail
      setTimeout(() => {
        router.push(`/experiments/${created.id}`);
      }, 700);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setApiError(err.message || 'Failed to create experiment. Please try again.');
      } else if (err instanceof Error) {
        setApiError(err.message);
      } else {
        setApiError('An unexpected network error occurred.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-wierd-dark text-white py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-medium text-wierd-silver hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Experiments Feed
          </Link>

          <span className="text-xs px-2.5 py-1 rounded-full bg-wierd-card border border-wierd-slate text-wierd-silver">
            Hostel Kitchen Lab • New Root Recipe
          </span>
        </div>

        {/* Page Title Header */}
        <div className="border-b border-wierd-slate pb-5">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-wierd-flame" />
            Create Root Food Experiment
          </h1>
          <p className="mt-1 text-sm text-wierd-silver">
            Document your original hostel concoction, midnight breakthrough, or experimental combo
            to seed the Food Evolution Graph.
          </p>
        </div>

        {/* Global Error Banner */}
        {apiError && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3 text-red-400 text-sm">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Creation Error</p>
              <p className="text-xs mt-0.5">{apiError}</p>
            </div>
          </div>
        )}

        {/* Success Banner */}
        {successId && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 text-emerald-400 text-sm">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-semibold">Experiment Seeded Successfully!</p>
              <p className="text-xs mt-0.5">Redirecting to your experiment lab view...</p>
            </div>
          </div>
        )}

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Section 1: Basic Information */}
          <div className="bg-wierd-surface/50 border border-wierd-slate rounded-2xl p-5 sm:p-6 space-y-5">
            <h2 className="text-base font-semibold text-white flex items-center gap-2 border-b border-wierd-slate/60 pb-2">
              <Flame className="w-4 h-4 text-wierd-flame" />
              1. Basic Experiment Profile
            </h2>

            {/* Title */}
            <div>
              <label
                htmlFor="experiment-title"
                className="block text-xs font-semibold text-wierd-silver uppercase tracking-wider mb-1"
              >
                Recipe Title <span className="text-wierd-flame">*</span>
              </label>
              <input
                type="text"
                id="experiment-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Electric Kettle Butter Schezwan Maggi"
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
                    Min 3 characters, punchy and descriptive
                  </span>
                )}
                <span className="text-wierd-silver/40">{title.length}/120</span>
              </div>
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="experiment-desc"
                className="block text-xs font-semibold text-wierd-silver uppercase tracking-wider mb-1"
              >
                Origin Story & Taste Profile <span className="text-wierd-flame">*</span>
              </label>
              <textarea
                id="experiment-desc"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Why does this exist? What exam night inspired it, and what does it taste like? (e.g. Rich, buttery broth cut through with tangy garlic chilli sauce)..."
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

            {/* Quick Metrics: Difficulty, Cooking Time, Estimated Cost */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              {/* Difficulty */}
              <div>
                <label
                  htmlFor="experiment-difficulty"
                  className="block text-xs font-semibold text-wierd-silver uppercase tracking-wider mb-1"
                >
                  Difficulty
                </label>
                <select
                  id="experiment-difficulty"
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

              {/* Cooking Time in Minutes */}
              <div>
                <label
                  htmlFor="experiment-time"
                  className="block text-xs font-semibold text-wierd-silver uppercase tracking-wider mb-1 flex items-center gap-1"
                >
                  <Clock className="w-3.5 h-3.5" />
                  Prep Time (Mins) <span className="text-wierd-flame">*</span>
                </label>
                <input
                  type="number"
                  id="experiment-time"
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

              {/* Cost Range in INR */}
              <div>
                <label className="block text-xs font-semibold text-wierd-silver uppercase tracking-wider mb-1 flex items-center gap-1">
                  <IndianRupee className="w-3.5 h-3.5" />
                  Estimated Cost (₹ INR) <span className="text-wierd-flame">*</span>
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
                htmlFor="experiment-photo"
                className="block text-xs font-semibold text-wierd-silver uppercase tracking-wider mb-1"
              >
                Hero Photo URL <span className="text-wierd-silver/50 font-normal">(optional)</span>
              </label>
              <input
                type="url"
                id="experiment-photo"
                value={heroMediaUrl}
                onChange={(e) => setHeroMediaUrl(e.target.value)}
                placeholder="https://images.unsplash.com/photo-..."
                className={`w-full bg-wierd-dark border text-sm text-white rounded-xl px-4 py-2.5 focus:outline-none transition-colors ${
                  fieldErrors.heroMediaUrl
                    ? 'border-red-500 focus:border-red-500'
                    : 'border-wierd-slate focus:border-wierd-flame'
                }`}
              />
              {fieldErrors.heroMediaUrl && (
                <span className="text-xs text-red-400 mt-1 block">{fieldErrors.heroMediaUrl}</span>
              )}
            </div>
          </div>

          {/* Section 2: Ingredient Selector with Canonical Search */}
          <div className="bg-wierd-surface/50 border border-wierd-slate rounded-2xl p-5 sm:p-6 space-y-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2 border-b border-wierd-slate/60 pb-2">
              <Sparkles className="w-4 h-4 text-wierd-flame" />
              2. Experiment Ingredients
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

          {/* Section 3: Preparation Steps */}
          <div className="bg-wierd-surface/50 border border-wierd-slate rounded-2xl p-5 sm:p-6 space-y-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2 border-b border-wierd-slate/60 pb-2">
              <Clock className="w-4 h-4 text-wierd-flame" />
              3. Preparation Steps
            </h2>
            {fieldErrors.steps && <p className="text-xs text-red-400">{fieldErrors.steps}</p>}
            <StepBuilder steps={steps} onChange={setSteps} errors={stepErrors} />
          </div>

          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-wierd-slate">
            <Link href="/" className="text-xs text-wierd-silver hover:text-white transition-colors">
              Cancel and return to feed
            </Link>

            <button
              type="submit"
              disabled={isSubmitting}
              id="btn-publish-experiment"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-wierd-flame to-red-600 hover:from-red-600 hover:to-wierd-flame text-white font-bold text-sm shadow-lg shadow-wierd-flame/20 hover:shadow-wierd-flame/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Publishing to Food Graph...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Publish Experiment</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
