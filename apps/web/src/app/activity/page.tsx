'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import {
  Activity,
  Flame,
  GitBranch,
  Utensils,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  Star,
  CheckCircle2,
  ChefHat,
  Sparkles,
} from 'lucide-react';
import {
  apiClient,
  type ActivityItem,
  type ActivityEventType,
  type PaginatedActivityResponse,
} from '@/lib/api-client';

const PAGE_SIZE = 15;

type FilterType = 'all' | 'root_experiment' | 'remix' | 'cooking_result';

export default function ActivityFeedPage() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(false);

  const fetchActivity = useCallback(async (pageToLoad: number, filterToUse: FilterType) => {
    setLoading(true);
    setError(null);
    try {
      const res: PaginatedActivityResponse = await apiClient.activity.feed({
        page: pageToLoad,
        limit: PAGE_SIZE,
        type: filterToUse,
      });

      setItems(res.items);
      setCurrentPage(res.page);
      setTotalPages(res.totalPages);
      setTotalItems(res.total);
      setHasMore(res.hasMore);
    } catch (err: any) {
      setError(err?.message || 'Failed to load community activity stream.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivity(currentPage, activeFilter);
  }, [fetchActivity, currentPage, activeFilter]);

  const handleFilterChange = (filter: FilterType) => {
    setActiveFilter(filter);
    setCurrentPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const formatTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      });
    } catch {
      return '';
    }
  };

  const formatOutcomeTag = (tag: string) => {
    return tag.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  };

  return (
    <div className="min-h-screen bg-wierd-dark text-wierd-cream selection:bg-wierd-flame/30">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header Hero Section */}
        <div className="mb-8 border-b border-wierd-border/80 pb-6">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="p-2 rounded-xl bg-wierd-flame/15 border border-wierd-flame/30 text-wierd-flame shadow-flame">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-wierd-cream to-wierd-flame bg-clip-text text-transparent">
              Community Activity Stream
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-wierd-muted max-w-2xl">
            Live pulse of the Hostel Lab: explore newly created recipes, branching remixes, and
            real-world cooking proof outcomes from cooks across the network.
          </p>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 mt-6">
            <button
              id="filter-all-activity"
              onClick={() => handleFilterChange('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeFilter === 'all'
                  ? 'bg-wierd-flame text-white shadow-flame'
                  : 'bg-wierd-surface hover:bg-wierd-card text-wierd-muted hover:text-white border border-wierd-border'
              }`}
            >
              All Events
            </button>

            <button
              id="filter-roots-activity"
              onClick={() => handleFilterChange('root_experiment')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeFilter === 'root_experiment'
                  ? 'bg-wierd-amber text-black font-bold shadow-md'
                  : 'bg-wierd-surface hover:bg-wierd-card text-wierd-muted hover:text-wierd-amber border border-wierd-border'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Root Experiments</span>
            </button>

            <button
              id="filter-remixes-activity"
              onClick={() => handleFilterChange('remix')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeFilter === 'remix'
                  ? 'bg-purple-600 text-white font-bold shadow-md'
                  : 'bg-wierd-surface hover:bg-wierd-card text-wierd-muted hover:text-purple-300 border border-wierd-border'
              }`}
            >
              <GitBranch className="w-3.5 h-3.5" />
              <span>Remixes</span>
            </button>

            <button
              id="filter-cooks-activity"
              onClick={() => handleFilterChange('cooking_result')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeFilter === 'cooking_result'
                  ? 'bg-emerald-600 text-white font-bold shadow-md'
                  : 'bg-wierd-surface hover:bg-wierd-card text-wierd-muted hover:text-emerald-300 border border-wierd-border'
              }`}
            >
              <Utensils className="w-3.5 h-3.5" />
              <span>Cooking Proofs</span>
            </button>

            {totalItems > 0 && (
              <span className="ml-auto text-[11px] text-wierd-muted hidden sm:inline">
                {totalItems} total event{totalItems === 1 ? '' : 's'}
              </span>
            )}
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-wierd-card border border-wierd-border/80 animate-pulse space-y-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-wierd-surface shrink-0" />
                  <div className="space-y-2 flex-1">
                    <div className="h-3.5 bg-wierd-surface rounded w-1/3" />
                    <div className="h-2.5 bg-wierd-surface/60 rounded w-1/4" />
                  </div>
                </div>
                <div className="h-12 bg-wierd-surface/50 rounded-xl" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-8 rounded-2xl bg-wierd-card border border-rose-500/30 text-center">
            <AlertCircle className="w-8 h-8 text-rose-400 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-white mb-1">Unable to Load Activity</h3>
            <p className="text-xs text-rose-300 max-w-md mx-auto mb-4">{error}</p>
            <button
              onClick={() => fetchActivity(currentPage, activeFilter)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-wierd-surface border border-wierd-border hover:border-wierd-flame/40 text-white transition-all shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Try Again</span>
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 rounded-2xl bg-wierd-card border border-wierd-border/80 text-center">
            <div className="w-12 h-12 rounded-2xl bg-wierd-surface/80 border border-wierd-border flex items-center justify-center mx-auto mb-4 text-wierd-flame">
              <ChefHat className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">No activity recorded yet</h3>
            <p className="text-xs text-wierd-muted max-w-sm mx-auto mb-6">
              Be the pioneer who kicks off this culinary timeline. Cook up a wild hostel experiment
              or remix an existing concoction!
            </p>
            <Link
              href="/experiments/create"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-wierd-flame to-wierd-masala shadow-flame hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>Create First Experiment</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => {
              const isRemix = item.type === 'remix';
              const isCook = item.type === 'cooking_result';

              return (
                <article
                  key={item.id}
                  id={`activity-item-${item.id}`}
                  className="p-5 rounded-2xl bg-wierd-card border border-wierd-border/80 hover:border-wierd-border transition-all duration-200 group"
                >
                  {/* Event Header: Actor, Event Badge, Timestamp */}
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      {/* Actor Avatar */}
                      <Link
                        href={`/users/${item.actor.username}`}
                        className="w-9 h-9 rounded-xl bg-gradient-to-tr from-wierd-flame to-wierd-amber text-white font-bold flex items-center justify-center text-xs shadow-sm hover:scale-105 transition-transform shrink-0"
                        title={`View @${item.actor.username}'s Profile`}
                      >
                        {(item.actor.displayName || item.actor.username || 'C')[0]?.toUpperCase()}
                      </Link>

                      {/* Actor Name & Skill */}
                      <div>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/users/${item.actor.username}`}
                            className="text-xs sm:text-sm font-bold text-white hover:text-wierd-flame transition-colors"
                          >
                            {item.actor.displayName || item.actor.username}
                          </Link>
                          <span className="text-[10px] text-wierd-muted">
                            @{item.actor.username}
                          </span>
                        </div>
                        <span className="text-[10px] text-wierd-muted capitalize">
                          {item.actor.skillLevel?.replace('_', ' ') || 'Hostel Chef'}
                        </span>
                      </div>
                    </div>

                    {/* Event Type Badge & Timestamp */}
                    <div className="flex items-center gap-2">
                      {isRemix ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 text-[10px] font-semibold">
                          <GitBranch className="w-3 h-3 text-purple-400" />
                          <span>Remix Branch</span>
                        </span>
                      ) : isCook ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[10px] font-semibold">
                          <Utensils className="w-3 h-3 text-emerald-400" />
                          <span>Cooking Trial</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-wierd-flame/10 text-wierd-flame border border-wierd-flame/20 text-[10px] font-semibold">
                          <Flame className="w-3 h-3" />
                          <span>Root Recipe</span>
                        </span>
                      )}

                      <span className="text-[11px] text-wierd-muted whitespace-nowrap">
                        {formatTime(item.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Narrative Sentence */}
                  <p className="text-xs sm:text-sm text-wierd-cream mb-3.5 leading-relaxed">
                    {item.message}
                  </p>

                  {/* Target Experiment Card Snippet */}
                  <Link
                    href={`/experiments/${item.experiment.id}`}
                    id={`activity-link-${item.id}`}
                    className="block p-3.5 rounded-xl bg-wierd-surface/70 hover:bg-wierd-surface border border-wierd-border/60 hover:border-wierd-flame/40 transition-all group/card"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-semibold text-white group-hover/card:text-wierd-flame transition-colors truncate">
                            {item.experiment.title}
                          </span>
                          {item.experiment.difficulty && (
                            <span className="px-1.5 py-0.5 rounded bg-wierd-surface text-[10px] font-medium text-wierd-muted capitalize shrink-0 border border-wierd-border/60">
                              {item.experiment.difficulty}
                            </span>
                          )}
                        </div>

                        {/* Remix details if present */}
                        {isRemix && item.experiment.parentTitle && (
                          <div className="text-[11px] text-wierd-muted mt-0.5 truncate">
                            Evolved from:{' '}
                            <span className="text-purple-300 font-medium">
                              &ldquo;{item.experiment.parentTitle}&rdquo;
                            </span>{' '}
                            (Branch Depth {item.experiment.branchDepth ?? 1})
                          </div>
                        )}

                        {/* Cooking Result snippet if present */}
                        {isCook && item.cookingResult && (
                          <div className="mt-2 flex flex-wrap items-center gap-2.5 text-[11px]">
                            {/* Outcome Tag */}
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 text-[10px] font-semibold border border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>{formatOutcomeTag(item.cookingResult.outcomeTag)}</span>
                            </span>

                            {/* Taste Rating */}
                            <span className="inline-flex items-center gap-1 text-wierd-amber font-semibold text-[10px]">
                              <Star className="w-3 h-3 fill-wierd-amber text-wierd-amber" />
                              <span>Taste {item.cookingResult.tasteRating}/5</span>
                            </span>

                            {/* Would Make Again */}
                            {item.cookingResult.wouldMakeAgain && (
                              <span className="text-wierd-muted text-[10px]">
                                • Would cook again
                              </span>
                            )}

                            {/* Caption quote if provided */}
                            {item.cookingResult.caption && (
                              <p className="w-full text-wierd-muted italic text-[11px] mt-1 line-clamp-2">
                                &ldquo;{item.cookingResult.caption}&rdquo;
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      <ExternalLink className="w-4 h-4 text-wierd-muted group-hover/card:text-wierd-flame transition-colors shrink-0" />
                    </div>
                  </Link>
                </article>
              );
            })}
          </div>
        )}

        {/* Pagination Bar */}
        {!loading && totalPages > 1 && (
          <nav
            aria-label="Activity Feed Pagination"
            className="mt-8 pt-6 border-t border-wierd-border/80 flex items-center justify-between gap-4"
          >
            <button
              id="btn-activity-prev-page"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-wierd-surface border border-wierd-border hover:border-wierd-flame/40 text-white disabled:opacity-40 disabled:pointer-events-none transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <span className="text-xs text-wierd-muted">
              Page <span className="font-bold text-white">{currentPage}</span> of{' '}
              <span className="font-bold text-white">{totalPages}</span>
            </span>

            <button
              id="btn-activity-next-page"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={!hasMore || currentPage >= totalPages}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-wierd-surface border border-wierd-border hover:border-wierd-flame/40 text-white disabled:opacity-40 disabled:pointer-events-none transition-all"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </nav>
        )}
      </main>
    </div>
  );
}
