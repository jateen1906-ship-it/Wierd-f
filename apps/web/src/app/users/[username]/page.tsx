'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { PublicCreatorHeader } from '@/components/profile/PublicCreatorHeader';
import { ExperimentCard } from '@/components/ExperimentCard';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { ErrorState } from '@/components/ErrorState';
import {
  apiClient,
  ApiError,
  type PublicUserProfileResponse,
  type ExperimentWithDetails,
  type ExperimentSortMode,
} from '@/lib/api-client';
import {
  ChefHat,
  Compass,
  ArrowLeft,
  Loader2,
  RefreshCw,
  GitBranch,
  Flame,
  Clock,
  Sparkles,
} from 'lucide-react';

const PAGE_SIZE = 12;

type FilterMode = 'all' | 'roots' | 'remixes';

export default function PublicCreatorProfilePage() {
  const params = useParams();
  const rawUsername = typeof params?.username === 'string' ? params.username : '';
  const username = decodeURIComponent(rawUsername);

  const [profile, setProfile] = useState<PublicUserProfileResponse | null>(null);
  const [experiments, setExperiments] = useState<ExperimentWithDetails[]>([]);
  const [totalExperiments, setTotalExperiments] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [sortMode, setSortMode] = useState<ExperimentSortMode>('recent');

  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isLoadingExperiments, setIsLoadingExperiments] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [profileNotFound, setProfileNotFound] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch Public Profile
  const fetchProfile = useCallback(async () => {
    if (!username) return;
    setIsLoadingProfile(true);
    setProfileNotFound(false);
    setErrorMessage(null);

    try {
      const data = await apiClient.users.getPublicProfile(username);
      setProfile(data);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.statusCode === 404) {
        setProfileNotFound(true);
      } else if (
        typeof err === 'object' &&
        err !== null &&
        'statusCode' in err &&
        (err as { statusCode: number }).statusCode === 404
      ) {
        setProfileNotFound(true);
      } else {
        setErrorMessage(err instanceof Error ? err.message : 'Unable to load creator profile.');
      }
    } finally {
      setIsLoadingProfile(false);
    }
  }, [username]);

  // Fetch Experiments
  const fetchExperiments = useCallback(
    async (pageToLoad = 1, append = false) => {
      if (!username) return;
      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoadingExperiments(true);
      }

      try {
        const rootOnlyParam =
          filterMode === 'roots' ? true : filterMode === 'remixes' ? false : undefined;

        const res = await apiClient.experiments.list({
          creatorUsername: username,
          page: pageToLoad,
          limit: PAGE_SIZE,
          sort: sortMode,
          rootOnly: rootOnlyParam,
        });

        const items = res.items || res.data || [];
        setExperiments((prev) => (append ? [...prev, ...items] : items));
        setCurrentPage(res.page);
        setTotalExperiments(res.total);
        setHasMore(res.hasMore);
      } catch (err) {
        // If profile exists but fetching experiments errored
        if (!append) {
          setErrorMessage(
            err instanceof Error ? err.message : 'Failed to load experiments for this creator.',
          );
        }
      } finally {
        setIsLoadingExperiments(false);
        setIsLoadingMore(false);
      }
    },
    [username, filterMode, sortMode],
  );

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (profile) {
      fetchExperiments(1, false);
    }
  }, [profile, fetchExperiments]);

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore) {
      fetchExperiments(currentPage + 1, true);
    }
  };

  const handleFollowChange = (isFollowing: boolean, newFollowersCount: number) => {
    setProfile((prev) =>
      prev
        ? {
            ...prev,
            isFollowing,
            stats: {
              ...prev.stats,
              followersCount: newFollowersCount,
            },
          }
        : prev,
    );
  };

  return (
    <div className="min-h-screen bg-wierd-dark text-wierd-cream selection:bg-wierd-flame selection:text-white">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8">
        {/* Breadcrumb / Back Link */}
        <div className="flex items-center justify-between text-xs text-wierd-muted">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 hover:text-wierd-cream transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Discover</span>
          </Link>
          <span className="text-[11px] uppercase tracking-wider text-wierd-subtext">
            Public Creator Profile
          </span>
        </div>

        {/* 404 Profile Not Found State */}
        {profileNotFound && (
          <div className="rounded-3xl bg-wierd-card/70 border border-wierd-border p-10 text-center flex flex-col items-center justify-center max-w-lg mx-auto my-12 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-wierd-surface border border-wierd-border flex items-center justify-center text-wierd-amber mb-4">
              <ChefHat className="w-8 h-8 opacity-80" />
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight mb-2">
              Concoctionist Not Found
            </h2>
            <p className="text-sm text-wierd-muted mb-6 leading-relaxed">
              We couldn&apos;t find a creator with the handle{' '}
              <span className="text-wierd-flame font-semibold">@{username}</span>. They may have
              changed their username or the recipe notebook does not exist.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-wierd-flame to-red-600 hover:brightness-110 transition-all shadow-flame"
            >
              <Compass className="w-4 h-4" />
              <span>Explore Discover Feed</span>
            </Link>
          </div>
        )}

        {/* Generic Error State */}
        {!profileNotFound && errorMessage && (
          <ErrorState
            message={errorMessage}
            onRetry={() => {
              fetchProfile();
              if (profile) fetchExperiments(1, false);
            }}
          />
        )}

        {/* Loading Skeleton */}
        {isLoadingProfile && !profileNotFound && !errorMessage && (
          <div className="space-y-6">
            <div className="h-44 rounded-3xl bg-wierd-card/50 border border-wierd-border animate-pulse" />
            <LoadingSkeleton count={4} />
          </div>
        )}

        {/* Profile Content when successfully loaded */}
        {!isLoadingProfile && !profileNotFound && profile && (
          <div className="space-y-8">
            {/* Sanitized Public Header with Follow System */}
            <PublicCreatorHeader profile={profile} onFollowChange={handleFollowChange} />

            {/* Experiments Section Header & Filters */}
            <section className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-wierd-border/60 pb-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                    <span>Published Experiments</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-wierd-surface border border-wierd-border text-wierd-muted">
                      {totalExperiments}
                    </span>
                  </h2>
                  <p className="text-xs text-wierd-muted mt-0.5">
                    Original formulas, hostel concoctions, and living remix branches created by @
                    {profile.username}
                  </p>
                </div>

                {/* Filter and Sort Controls */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Filter Pills */}
                  <div className="inline-flex rounded-xl bg-wierd-surface border border-wierd-border p-1 text-xs">
                    <button
                      onClick={() => setFilterMode('all')}
                      className={`px-3 py-1 rounded-lg font-medium transition-all ${
                        filterMode === 'all'
                          ? 'bg-wierd-card text-white shadow-sm font-semibold'
                          : 'text-wierd-muted hover:text-white'
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setFilterMode('roots')}
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg font-medium transition-all ${
                        filterMode === 'roots'
                          ? 'bg-wierd-card text-white shadow-sm font-semibold'
                          : 'text-wierd-muted hover:text-white'
                      }`}
                    >
                      <span>🌱 Roots</span>
                    </button>
                    <button
                      onClick={() => setFilterMode('remixes')}
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg font-medium transition-all ${
                        filterMode === 'remixes'
                          ? 'bg-wierd-card text-white shadow-sm font-semibold'
                          : 'text-wierd-muted hover:text-white'
                      }`}
                    >
                      <GitBranch className="w-3 h-3 text-purple-400" />
                      <span>Remixes</span>
                    </button>
                  </div>

                  {/* Sort Selector */}
                  <div className="inline-flex rounded-xl bg-wierd-surface border border-wierd-border p-1 text-xs">
                    <select
                      value={sortMode}
                      onChange={(e) => setSortMode(e.target.value as ExperimentSortMode)}
                      className="bg-transparent text-xs text-wierd-cream px-2 py-0.5 outline-none cursor-pointer"
                    >
                      <option value="recent" className="bg-wierd-dark text-white">
                        Latest
                      </option>
                      <option value="trending" className="bg-wierd-dark text-white">
                        Trending
                      </option>
                      <option value="remixes" className="bg-wierd-dark text-white">
                        Most Remixed
                      </option>
                      <option value="cooks" className="bg-wierd-dark text-white">
                        Most Cooked
                      </option>
                      <option value="votes" className="bg-wierd-dark text-white">
                        Top Voted
                      </option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Experiments Stream */}
              {isLoadingExperiments ? (
                <LoadingSkeleton count={4} />
              ) : experiments.length === 0 ? (
                <div className="rounded-3xl bg-wierd-card/40 border border-wierd-border/80 p-10 text-center flex flex-col items-center justify-center max-w-md mx-auto my-8">
                  <div className="w-12 h-12 rounded-2xl bg-wierd-surface border border-wierd-border flex items-center justify-center text-wierd-muted mb-3">
                    <ChefHat className="w-6 h-6 opacity-60" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-1">
                    No experiments published yet
                  </h3>
                  <p className="text-xs text-wierd-muted mb-4 max-w-xs leading-relaxed">
                    {filterMode === 'roots'
                      ? `@${profile.username} hasn't published any root experiments yet.`
                      : filterMode === 'remixes'
                        ? `@${profile.username} hasn't evolved any remix branches yet.`
                        : `@${profile.username} hasn't shared any public food experiments yet.`}
                  </p>
                  <Link
                    href="/"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-wierd-cream bg-wierd-surface hover:bg-wierd-border border border-wierd-border transition-colors"
                  >
                    <Compass className="w-3.5 h-3.5 text-wierd-amber" />
                    <span>Discover other concoctions</span>
                  </Link>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Grid of Experiment Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-5">
                    {experiments.map((experiment) => (
                      <ExperimentCard
                        key={experiment.id}
                        experiment={{
                          ...experiment,
                          // Ensure creator data defaults to the current profile if missing
                          creator: experiment.creator || {
                            id: profile.id,
                            username: profile.username,
                            displayName: profile.displayName,
                            avatarUrl: profile.avatarUrl,
                            skillLevel: profile.skillLevel,
                          },
                        }}
                      />
                    ))}
                  </div>

                  {/* Load More Pagination */}
                  {hasMore && (
                    <div className="flex justify-center pt-4">
                      <button
                        onClick={handleLoadMore}
                        disabled={isLoadingMore}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-bold text-wierd-cream bg-wierd-surface hover:bg-wierd-card border border-wierd-border hover:border-wierd-flame/50 transition-all shadow-md disabled:opacity-50"
                      >
                        {isLoadingMore ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-wierd-flame" />
                            <span>Fetching more recipes...</span>
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 text-wierd-amber" />
                            <span>
                              Load More Experiments ({experiments.length} of {totalExperiments})
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
