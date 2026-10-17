'use client';

import React, { useState, useEffect } from 'react';
import { Flame, Plus, Loader2, AlertTriangle, Camera, RotateCcw, Sparkles } from 'lucide-react';
import {
  apiClient,
  ApiError,
  type CookingResultResponse,
  type PaginatedCookingResultsResponse,
} from '@/lib/api-client';
import { CookingResultCard } from './CookingResultCard';
import { CookingResultForm } from './CookingResultForm';

interface CookingResultsSectionProps {
  experimentId: string;
  experimentTitle: string;
  className?: string;
}

export function CookingResultsSection({
  experimentId,
  experimentTitle,
  className = '',
}: CookingResultsSectionProps) {
  const [results, setResults] = useState<CookingResultResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);

  const fetchResults = async (pageNum = 1, append = false) => {
    if (pageNum === 1) setIsLoading(true);
    else setIsLoadingMore(true);

    setError(null);

    try {
      const data = await apiClient.cookingResults.listByExperiment(experimentId, pageNum, 6);

      if (append) {
        setResults((prev) => [...prev, ...(data.items || [])]);
      } else {
        setResults(data.items || []);
      }

      setTotal(data.total || 0);
      setPage(data.page || pageNum);
      setHasMore(Boolean(data.hasMore));
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message || 'Failed to load cooking proofs.');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected network error occurred.');
      }
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    if (experimentId) {
      fetchResults(1, false);
    }
  }, [experimentId]);

  const handleProofCreated = (newResult: CookingResultResponse) => {
    // Add to list and close form
    setResults((prev) => [newResult, ...prev]);
    setTotal((prev) => prev + 1);
    setShowForm(false);
  };

  return (
    <section className={`space-y-6 ${className}`}>
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-wierd-card border border-wierd-slate">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-wierd-flame/15 text-wierd-flame border border-wierd-flame/30">
              <Flame className="w-4 h-4" />
            </span>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Real-World Cooking Proofs
            </h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-wierd-dark border border-wierd-slate text-wierd-silver">
              {total} {total === 1 ? 'Proof' : 'Proofs'}
            </span>
          </div>
          <p className="text-xs text-wierd-silver/70">
            Real hostel cooks verifying this recipe in their rooms, kettles, and pans.
          </p>
        </div>

        {/* Post Proof CTA Button */}
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            id="btn-open-cooking-proof-form"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-wierd-flame to-red-600 hover:from-red-600 hover:to-wierd-flame text-white font-bold text-xs shadow-md shadow-wierd-flame/20 transition-all cursor-pointer self-start sm:self-center"
          >
            <Camera className="w-4 h-4" />
            <span>I Cooked This (Post Proof)</span>
          </button>
        )}
      </div>

      {/* Submission Form Modal/Section */}
      {showForm && (
        <CookingResultForm
          experimentId={experimentId}
          experimentTitle={experimentTitle}
          onSuccess={handleProofCreated}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="p-8 text-center bg-wierd-card/50 border border-wierd-slate rounded-2xl space-y-3">
          <Loader2 className="w-8 h-8 text-wierd-flame animate-spin mx-auto" />
          <p className="text-xs text-wierd-silver/70">Loading cooking proofs from the mess...</p>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="p-6 text-center bg-wierd-card/50 border border-red-500/30 rounded-2xl space-y-3">
          <AlertTriangle className="w-8 h-8 text-red-400 mx-auto" />
          <p className="text-xs text-wierd-silver">{error}</p>
          <button
            type="button"
            onClick={() => fetchResults(1, false)}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-wierd-slate/40 text-white hover:bg-wierd-slate transition-colors"
          >
            Retry Loading Proofs
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && results.length === 0 && (
        <div className="p-8 sm:p-12 text-center bg-wierd-card/40 border border-dashed border-wierd-slate rounded-2xl space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-wierd-flame/10 text-wierd-flame flex items-center justify-center mx-auto border border-wierd-flame/20">
            <Camera className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm sm:text-base font-bold text-white">No Cooking Proofs Yet</h3>
            <p className="text-xs text-wierd-silver/70 max-w-sm mx-auto">
              Did you try this recipe in your hostel? Upload your photo proof, rate the taste, and
              let others know if it worked!
            </p>
          </div>
          {!showForm && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-wierd-flame hover:underline pt-2"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Be the first to post proof</span>
            </button>
          )}
        </div>
      )}

      {/* Results Grid */}
      {!isLoading && results.length > 0 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {results.map((result) => (
              <CookingResultCard
                key={result.id}
                result={result}
                experimentTitle={experimentTitle}
                returnUrl={`/experiments/${experimentId}`}
              />
            ))}
          </div>

          {/* Load More Pagination */}
          {hasMore && (
            <div className="text-center pt-2">
              <button
                type="button"
                disabled={isLoadingMore}
                onClick={() => fetchResults(page + 1, true)}
                id="btn-load-more-cooking-proofs"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-wierd-card border border-wierd-slate hover:border-wierd-flame text-white font-semibold text-xs transition-all shadow-md disabled:opacity-50"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-wierd-flame" />
                    <span>Loading more proofs...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5 text-wierd-flame" />
                    <span>Load More Cooking Proofs</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
