'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import {
  FeedFilters,
  type FeedSortMode,
  type BranchFilterMode,
  type CanonicalIngredientOption,
} from '@/components/FeedFilters';
import { ExperimentCard } from '@/components/ExperimentCard';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { IngredientsDrawer } from '@/components/IngredientsDrawer';
import type { DifficultyLevel } from '@food-evolution/types';
import { apiClient, type ExperimentWithDetails, type ExperimentSortMode } from '@/lib/api-client';
import { Sparkles, Compass, Flame, Database, Loader2, RefreshCw, Users } from 'lucide-react';

const PAGE_SIZE = 12;

export default function HomePage() {
  const [experiments, setExperiments] = useState<ExperimentWithDetails[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Feed Filter States
  const [sortMode, setSortMode] = useState<FeedSortMode>('trending');
  const [branchFilter, setBranchFilter] = useState<BranchFilterMode>('all');
  const [difficulty, setDifficulty] = useState<string>('all');
  const [selectedIngredientId, setSelectedIngredientId] = useState<string | null>(null);
  const [search, setSearch] = useState<string>('');

  // Pagination metadata from backend
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(false);

  // Available canonical ingredients for filter dropdown
  const [canonicalIngredients, setCanonicalIngredients] = useState<CanonicalIngredientOption[]>([]);
  const [isIngredientsLoading, setIsIngredientsLoading] = useState<boolean>(false);
  const [isIngredientsOpen, setIsIngredientsOpen] = useState<boolean>(false);

  // Search debounce ref
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');

  // Debounce search input
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, 350);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [search]);

  // Load canonical ingredients once on mount for filter dropdown
  useEffect(() => {
    let isMounted = true;
    setIsIngredientsLoading(true);
    apiClient.ingredients
      .list('', 50)
      .then((res) => {
        if (isMounted && res.items) {
          setCanonicalIngredients(
            res.items.map((i) => ({
              id: i.id,
              name: i.name,
              category: i.category,
            })),
          );
        }
      })
      .catch(() => {
        // Silently tolerate if ingredients endpoint fails
      })
      .finally(() => {
        if (isMounted) setIsIngredientsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Compute active filters count
  const activeFiltersCount =
    (sortMode !== 'trending' ? 1 : 0) +
    (branchFilter !== 'all' ? 1 : 0) +
    (difficulty !== 'all' ? 1 : 0) +
    (selectedIngredientId ? 1 : 0) +
    (debouncedSearch.trim() ? 1 : 0);

  // Fetch feed items
  const fetchFeed = useCallback(
    async (pageToLoad: number, append: boolean = false) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const queryOpts: Parameters<typeof apiClient.experiments.list>[0] = {
          page: pageToLoad,
          limit: PAGE_SIZE,
          sort: sortMode,
        };

        if (branchFilter === 'roots') {
          queryOpts.rootOnly = true;
        } else if (branchFilter === 'remixes') {
          queryOpts.rootOnly = false;
        }

        if (difficulty !== 'all') {
          queryOpts.difficulty = difficulty as DifficultyLevel;
        }

        if (selectedIngredientId) {
          queryOpts.canonicalIngredientId = selectedIngredientId;
        }

        if (debouncedSearch.trim()) {
          queryOpts.search = debouncedSearch.trim();
        }

        const res = await apiClient.experiments.list(queryOpts);

        const newItems = res.items || res.data || [];
        setExperiments((prev) => (append ? [...prev, ...newItems] : newItems));
        setCurrentPage(res.page);
        setTotalItems(res.total);
        setHasMore(res.hasMore);
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : 'Failed to connect to backend experiment feed.';
        setError(msg);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [sortMode, branchFilter, difficulty, selectedIngredientId, debouncedSearch],
  );

  // Trigger fresh search/filter whenever criteria change
  useEffect(() => {
    setCurrentPage(1);
    fetchFeed(1, false);
  }, [fetchFeed]);

  // Handle Load More pagination
  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchFeed(currentPage + 1, true);
    }
  };

  // Reset all filters to default
  const handleResetFilters = () => {
    setSortMode('trending');
    setBranchFilter('all');
    setDifficulty('all');
    setSelectedIngredientId(null);
    setSearch('');
  };

  return (
    <div className="flex-1 flex flex-col pb-20 md:pb-12 min-h-screen bg-wierd-dark">
      {/* Top Navbar */}
      <Navbar
        onOpenIngredients={() => setIsIngredientsOpen(true)}
        searchValue={search}
        onSearchChange={setSearch}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-8">
        {/* Hero Section */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-wierd-surface via-wierd-card to-wierd-dark border border-wierd-border p-6 sm:p-10 shadow-2xl">
          {/* Subtle background ambient lights */}
          <div className="absolute -top-24 -right-24 w-72 h-72 bg-wierd-flame/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-wierd-amber/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl">
            {/* Pill tag */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-wierd-flame/15 text-wierd-flame border border-wierd-flame/30 mb-4">
              <Flame className="w-3.5 h-3.5" />
              <span>Hostel Mess & Late-Night Concoctions</span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-tight mb-3">
              Where Wild Food Ideas Evolve Into{' '}
              <span className="bg-gradient-to-r from-wierd-flame via-wierd-amber to-amber-200 bg-clip-text text-transparent">
                Culinary Science.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-sm sm:text-base text-wierd-subtext leading-relaxed mb-6">
              Track lineage trees of crazy 2 AM hostel kettle concoctions, remix your wing-mates’
              recipes, and verify actual kitchen outcomes.
            </p>

            {/* Quick Action Badges */}
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <button
                onClick={() => setIsIngredientsOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-wierd-card border border-wierd-border hover:border-wierd-amber/50 text-wierd-cream transition-colors"
              >
                <Database className="w-4 h-4 text-wierd-amber" />
                <span>Explore {canonicalIngredients.length || 21} Canonical Ingredients</span>
              </button>

              <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-wierd-surface text-wierd-muted border border-wierd-border/60">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Live Living Food Graph Active</span>
              </div>
            </div>
          </div>
        </section>

        {/* Discovery Feed Section */}
        <section className="flex flex-col gap-6">
          {/* Section Header & Subtitle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-wierd-flame" />
                <h2 className="text-xl font-extrabold text-white tracking-tight">
                  Living Concoction Feed
                </h2>
              </div>
              <div className="inline-flex rounded-xl bg-wierd-surface border border-wierd-border p-1 text-xs">
                <span className="px-3 py-1 rounded-lg bg-wierd-card text-white font-bold shadow-sm">
                  🌟 Discover
                </span>
                <Link
                  href="/following"
                  className="px-3 py-1 rounded-lg text-wierd-muted hover:text-white transition-colors flex items-center gap-1"
                >
                  <Users className="w-3.5 h-3.5 text-purple-400" />
                  <span>Following</span>
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-wierd-muted">
              <span>
                {loading
                  ? 'Discovering recipes...'
                  : `${experiments.length} of ${totalItems} recipes`}
              </span>
              <button
                onClick={() => fetchFeed(1, false)}
                className="p-1 rounded-lg hover:text-white hover:bg-wierd-surface transition-colors"
                title="Refresh Feed"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Upgraded Multi-Dimensional Feed Filters */}
          <FeedFilters
            sortMode={sortMode}
            onSelectSortMode={setSortMode}
            branchFilter={branchFilter}
            onSelectBranchFilter={setBranchFilter}
            difficulty={difficulty}
            onSelectDifficulty={setDifficulty}
            selectedIngredientId={selectedIngredientId}
            onSelectIngredient={setSelectedIngredientId}
            availableIngredients={canonicalIngredients}
            isIngredientsLoading={isIngredientsLoading}
            search={search}
            onSearchChange={setSearch}
            onResetFilters={handleResetFilters}
            activeFiltersCount={activeFiltersCount}
          />

          {/* Feed Content Rendering */}
          {loading && <LoadingSkeleton count={6} />}

          {!loading && error && (
            <ErrorState message={error} onRetry={() => fetchFeed(currentPage, false)} />
          )}

          {!loading && !error && experiments.length === 0 && (
            <EmptyState
              filterTag={sortMode}
              onResetFilters={handleResetFilters}
              onCreateClick={() => {
                window.location.href = '/experiments/create';
              }}
            />
          )}

          {!loading && !error && experiments.length > 0 && (
            <>
              {/* Responsive Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-5">
                {experiments.map((exp) => (
                  <ExperimentCard
                    key={exp.id}
                    experiment={exp}
                    onRemix={(id) => {
                      window.location.href = `/experiments/${id}/remix`;
                    }}
                  />
                ))}
              </div>

              {/* Pagination / Load More Footer */}
              <div className="flex flex-col items-center justify-center pt-6 pb-4 gap-2">
                {hasMore ? (
                  <button
                    type="button"
                    id="btn-load-more-experiments"
                    disabled={loadingMore}
                    onClick={handleLoadMore}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs text-white bg-wierd-card hover:bg-wierd-surface border border-wierd-border hover:border-wierd-flame/60 shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-wierd-flame" />
                        <span>Fetching next batch...</span>
                      </>
                    ) : (
                      <>
                        <span>Load More Recipes</span>
                        <span className="text-[11px] text-wierd-muted">
                          ({experiments.length} of {totalItems})
                        </span>
                      </>
                    )}
                  </button>
                ) : (
                  <div className="text-center text-xs text-wierd-muted py-2">
                    ✨ You&apos;ve reached the frontier of the living food graph!
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </main>

      {/* Slide-over Canonical Ingredients Drawer */}
      <IngredientsDrawer isOpen={isIngredientsOpen} onClose={() => setIsIngredientsOpen(false)} />
    </div>
  );
}
