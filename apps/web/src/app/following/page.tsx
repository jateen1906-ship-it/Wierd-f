'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { ExperimentCard } from '@/components/ExperimentCard';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { ErrorState } from '@/components/ErrorState';
import { useAuth } from '@/context/AuthContext';
import { apiClient, type ExperimentWithDetails, type ExperimentSortMode } from '@/lib/api-client';
import type { DifficultyLevel } from '@food-evolution/types';
import {
  Users,
  Compass,
  ArrowLeft,
  Loader2,
  RefreshCw,
  Search,
  Filter,
  LogIn,
  UserPlus,
  GitBranch,
  Sparkles,
  ChefHat,
} from 'lucide-react';

const PAGE_SIZE = 12;

type BranchFilter = 'all' | 'roots' | 'remixes';

export default function FollowingFeedPage() {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();

  const [experiments, setExperiments] = useState<ExperimentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search states
  const [sortMode, setSortMode] = useState<ExperimentSortMode>('recent');
  const [branchFilter, setBranchFilter] = useState<BranchFilter>('all');
  const [difficulty, setDifficulty] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(false);

  // Debounce search
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, 350);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [search]);

  // Fetch following feed
  const fetchFeed = useCallback(
    async (pageToLoad = 1, append = false) => {
      if (!isAuthenticated) return;

      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const rootOnlyParam =
          branchFilter === 'roots' ? true : branchFilter === 'remixes' ? false : undefined;

        const res = await apiClient.experiments.followingFeed({
          page: pageToLoad,
          limit: PAGE_SIZE,
          sort: sortMode,
          rootOnly: rootOnlyParam,
          difficulty: difficulty !== 'all' ? (difficulty as DifficultyLevel) : undefined,
          search: debouncedSearch.trim() || undefined,
        });

        const items = res.items || res.data || [];
        setExperiments((prev) => (append ? [...prev, ...items] : items));
        setCurrentPage(res.page);
        setTotalItems(res.total);
        setHasMore(res.hasMore);
      } catch (err: unknown) {
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load following feed. Please check your network connection.',
        );
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [isAuthenticated, sortMode, branchFilter, difficulty, debouncedSearch],
  );

  useEffect(() => {
    if (isAuthenticated) {
      setCurrentPage(1);
      fetchFeed(1, false);
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, fetchFeed]);

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchFeed(currentPage + 1, true);
    }
  };

  const handleResetFilters = () => {
    setSortMode('recent');
    setBranchFilter('all');
    setDifficulty('all');
    setSearch('');
  };

  const hasActiveFilters =
    sortMode !== 'recent' ||
    branchFilter !== 'all' ||
    difficulty !== 'all' ||
    debouncedSearch.trim().length > 0;

  return (
    <div className="min-h-screen bg-wierd-dark text-wierd-cream selection:bg-wierd-flame selection:text-white flex flex-col pb-20 md:pb-12">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8">
        {/* Navigation Breadcrumb & Mode Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-wierd-muted hover:text-wierd-cream transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Discover</span>
            </Link>
            <span className="text-wierd-border">•</span>
            <div className="inline-flex rounded-xl bg-wierd-surface border border-wierd-border p-1 text-xs">
              <Link
                href="/"
                className="px-3 py-1 rounded-lg text-wierd-muted hover:text-white transition-colors"
              >
                🌟 Discover
              </Link>
              <span className="px-3 py-1 rounded-lg bg-wierd-card text-white font-bold shadow-sm flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-purple-400" />
                <span>Following</span>
              </span>
            </div>
          </div>
        </div>

        {/* Guest View: Sign In Prompt if visitor is not logged in */}
        {!isAuthLoading && !isAuthenticated && (
          <div className="rounded-3xl bg-gradient-to-br from-wierd-surface via-wierd-card to-wierd-dark border border-wierd-border p-8 sm:p-12 text-center flex flex-col items-center justify-center max-w-lg mx-auto my-12 shadow-2xl relative overflow-hidden">
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-wierd-flame/10 rounded-full blur-3xl pointer-events-none" />

            <div className="w-16 h-16 rounded-2xl bg-wierd-surface border border-wierd-border flex items-center justify-center text-purple-400 mb-5 shadow-sm">
              <Users className="w-8 h-8" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
              Sign In to View Your Following Feed
            </h2>

            <p className="text-xs sm:text-sm text-wierd-muted mb-8 leading-relaxed max-w-md">
              Follow your favorite hostel concoctionists, late-night Maggi experimenters, and food
              innovators. Their newest culinary branches and proofs will stream directly to this
              personalized timeline.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-xs">
              <Link
                href="/login?redirect=/following"
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-wierd-flame to-red-600 hover:brightness-110 shadow-flame transition-all"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </Link>
              <Link
                href="/register?redirect=/following"
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-bold text-wierd-cream bg-wierd-surface hover:bg-wierd-border border border-wierd-border transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                <span>Join Mess</span>
              </Link>
            </div>
          </div>
        )}

        {/* Authenticated View */}
        {isAuthenticated && (
          <div className="space-y-6">
            {/* Header Banner */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-wierd-border/60">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400">
                    <Users className="w-5 h-5" />
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    Following Feed
                  </h1>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-wierd-surface border border-wierd-border text-wierd-subtext">
                    {totalItems} Recipes
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-wierd-muted mt-1">
                  Fresh concoctions and evolutionary branches authored by creators you follow.
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative w-full md:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-wierd-muted" />
                <input
                  type="text"
                  placeholder="Search in following..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-wierd-surface border border-wierd-border focus:border-purple-400/60 focus:outline-none rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-wierd-muted"
                />
              </div>
            </div>

            {/* Filter and Sorting Pills Row */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-wierd-card/60 p-3 rounded-2xl border border-wierd-border/80">
              <div className="flex flex-wrap items-center gap-2">
                {/* Branch Filters */}
                <div className="inline-flex rounded-xl bg-wierd-surface border border-wierd-border p-1 text-xs">
                  <button
                    onClick={() => setBranchFilter('all')}
                    className={`px-3 py-1 rounded-lg font-medium transition-all ${
                      branchFilter === 'all'
                        ? 'bg-wierd-card text-white shadow-sm font-semibold'
                        : 'text-wierd-muted hover:text-white'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setBranchFilter('roots')}
                    className={`px-3 py-1 rounded-lg font-medium transition-all ${
                      branchFilter === 'roots'
                        ? 'bg-wierd-card text-white shadow-sm font-semibold'
                        : 'text-wierd-muted hover:text-white'
                    }`}
                  >
                    🌱 Roots
                  </button>
                  <button
                    onClick={() => setBranchFilter('remixes')}
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg font-medium transition-all ${
                      branchFilter === 'remixes'
                        ? 'bg-wierd-card text-white shadow-sm font-semibold'
                        : 'text-wierd-muted hover:text-white'
                    }`}
                  >
                    <GitBranch className="w-3 h-3 text-purple-400" />
                    <span>Remixes</span>
                  </button>
                </div>

                {/* Difficulty Select */}
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="bg-wierd-surface border border-wierd-border text-xs text-wierd-cream rounded-xl px-2.5 py-1.5 outline-none cursor-pointer"
                >
                  <option value="all">All Difficulties</option>
                  <option value="easy">⚡ Easy</option>
                  <option value="medium">🔥 Medium</option>
                  <option value="hard">🌶️ Hard</option>
                </select>
              </div>

              {/* Sorting Mode */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-wierd-muted uppercase tracking-wider font-semibold">
                  Sort:
                </span>
                <select
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as ExperimentSortMode)}
                  className="bg-wierd-surface border border-wierd-border text-xs text-wierd-cream rounded-xl px-2.5 py-1.5 outline-none cursor-pointer"
                >
                  <option value="recent">Latest Created</option>
                  <option value="trending">Trending Now</option>
                  <option value="remixes">Most Remixed</option>
                  <option value="cooks">Most Cooked</option>
                  <option value="votes">Top Voted</option>
                </select>
              </div>
            </div>

            {/* Error State */}
            {error && <ErrorState message={error} onRetry={() => fetchFeed(1, false)} />}

            {/* Loading Skeleton */}
            {loading && !error && <LoadingSkeleton count={4} />}

            {/* Empty State: User follows nobody OR no recipes match filter */}
            {!loading && !error && experiments.length === 0 && (
              <div className="rounded-3xl bg-wierd-card/40 border border-wierd-border p-10 text-center flex flex-col items-center justify-center max-w-lg mx-auto my-8 space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-wierd-surface border border-wierd-border flex items-center justify-center text-purple-400">
                  <ChefHat className="w-7 h-7 opacity-80" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-white">
                    {hasActiveFilters
                      ? 'No Matching Followed Experiments'
                      : 'No Recipes in Your Following Stream'}
                  </h3>
                  <p className="text-xs text-wierd-muted leading-relaxed max-w-sm">
                    {hasActiveFilters
                      ? 'None of the creators you follow have published experiments matching your active filter criteria.'
                      : "You aren't following any creators who have published recipes yet. Explore the community feed and follow creators to populate your timeline!"}
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  {hasActiveFilters ? (
                    <button
                      onClick={handleResetFilters}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-wierd-cream bg-wierd-surface hover:bg-wierd-card border border-wierd-border transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Reset Filters</span>
                    </button>
                  ) : (
                    <Link
                      href="/"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-wierd-flame to-red-600 hover:brightness-110 shadow-flame transition-all"
                    >
                      <Compass className="w-4 h-4" />
                      <span>Explore Community Discover Feed</span>
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* Experiments Grid */}
            {!loading && !error && experiments.length > 0 && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-5">
                  {experiments.map((experiment) => (
                    <ExperimentCard key={experiment.id} experiment={experiment} />
                  ))}
                </div>

                {/* Load More Pagination */}
                {hasMore && (
                  <div className="flex justify-center pt-4">
                    <button
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-bold text-wierd-cream bg-wierd-surface hover:bg-wierd-card border border-wierd-border hover:border-purple-400/50 transition-all shadow-md disabled:opacity-50"
                    >
                      {loadingMore ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                          <span>Fetching more followed concoctions...</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 text-purple-400" />
                          <span>
                            Load More Experiments ({experiments.length} of {totalItems})
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
