'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ActivityTabs, type ActivityTabKey } from '@/components/profile/ActivityTabs';
import { UserVotesList } from '@/components/profile/UserVotesList';
import { UserReactionsList } from '@/components/profile/UserReactionsList';
import { ExperimentCard } from '@/components/ExperimentCard';
import { CookingResultCard } from '@/components/cooking-results/CookingResultCard';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { ErrorState } from '@/components/ErrorState';
import { useAuth } from '@/context/AuthContext';
import {
  apiClient,
  type ExperimentWithDetails,
  type CookingResultResponse,
  type UserVoteItem,
  type UserReactionItem,
} from '@/lib/api-client';
import { PlusCircle, Loader2, RefreshCw } from 'lucide-react';
import Link from 'next/link';

const PAGE_SIZE = 12;

function ProfileContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Tab key from URL query (?tab=...) or default to 'experiments'
  const initialTab = (searchParams.get('tab') as ActivityTabKey) || 'experiments';
  const [activeTab, setActiveTab] = useState<ActivityTabKey>(
    ['experiments', 'cooking-results', 'votes', 'reactions'].includes(initialTab)
      ? initialTab
      : 'experiments',
  );

  // Stats Counters
  const [stats, setStats] = useState({
    experimentsCount: 0,
    cookingResultsCount: 0,
    votesCount: 0,
    reactionsCount: 0,
  });

  // Tab Data States
  const [experiments, setExperiments] = useState<ExperimentWithDetails[]>([]);
  const [cookingResults, setCookingResults] = useState<CookingResultResponse[]>([]);
  const [votes, setVotes] = useState<UserVoteItem[]>([]);
  const [reactions, setReactions] = useState<UserReactionItem[]>([]);

  // Pagination States per tab
  const [pagination, setPagination] = useState<
    Record<ActivityTabKey, { page: number; total: number; hasMore: boolean }>
  >({
    experiments: { page: 1, total: 0, hasMore: false },
    'cooking-results': { page: 1, total: 0, hasMore: false },
    votes: { page: 1, total: 0, hasMore: false },
    reactions: { page: 1, total: 0, hasMore: false },
  });

  // Loading & Error States
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Update tab in URL without full reload
  const handleSelectTab = (tab: ActivityTabKey) => {
    setActiveTab(tab);
    router.replace(`/profile?tab=${tab}`, { scroll: false });
  };

  // Initial stats summary load
  const loadInitialStats = useCallback(async () => {
    try {
      const [expRes, cookRes, voteRes, reactRes] = await Promise.all([
        apiClient.users.myExperiments(1, 1).catch(() => ({ total: 0 })),
        apiClient.users.myCookingResults(1, 1).catch(() => ({ total: 0 })),
        apiClient.users.myVotes(1, 1).catch(() => ({ total: 0 })),
        apiClient.users.myReactions(1, 1).catch(() => ({ total: 0 })),
      ]);

      setStats({
        experimentsCount: expRes.total ?? 0,
        cookingResultsCount: cookRes.total ?? 0,
        votesCount: voteRes.total ?? 0,
        reactionsCount: reactRes.total ?? 0,
      });
    } catch {
      // Ignore background stats load error
    }
  }, []);

  useEffect(() => {
    loadInitialStats();
  }, [loadInitialStats]);

  // Load Tab Content
  const loadTabContent = useCallback(
    async (tab: ActivityTabKey, pageToLoad = 1, append = false) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        if (tab === 'experiments') {
          const res = await apiClient.users.myExperiments(pageToLoad, PAGE_SIZE);
          const items = res.items || res.data || [];
          setExperiments((prev) => (append ? [...prev, ...items] : items));
          setPagination((prev) => ({
            ...prev,
            experiments: { page: res.page, total: res.total, hasMore: res.hasMore },
          }));
          setStats((prev) => ({ ...prev, experimentsCount: res.total }));
        } else if (tab === 'cooking-results') {
          const res = await apiClient.users.myCookingResults(pageToLoad, PAGE_SIZE);
          setCookingResults((prev) => (append ? [...prev, ...res.items] : res.items));
          setPagination((prev) => ({
            ...prev,
            'cooking-results': { page: res.page, total: res.total, hasMore: res.hasMore },
          }));
          setStats((prev) => ({ ...prev, cookingResultsCount: res.total }));
        } else if (tab === 'votes') {
          const res = await apiClient.users.myVotes(pageToLoad, PAGE_SIZE);
          setVotes((prev) => (append ? [...prev, ...res.items] : res.items));
          setPagination((prev) => ({
            ...prev,
            votes: { page: res.page, total: res.total, hasMore: res.hasMore },
          }));
          setStats((prev) => ({ ...prev, votesCount: res.total }));
        } else if (tab === 'reactions') {
          const res = await apiClient.users.myReactions(pageToLoad, PAGE_SIZE);
          setReactions((prev) => (append ? [...prev, ...res.items] : res.items));
          setPagination((prev) => ({
            ...prev,
            reactions: { page: res.page, total: res.total, hasMore: res.hasMore },
          }));
          setStats((prev) => ({ ...prev, reactionsCount: res.total }));
        }
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : `Failed to load your ${tab.replace('-', ' ')} activity.`;
        setError(msg);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [],
  );

  // Trigger tab fetch when active tab changes
  useEffect(() => {
    loadTabContent(activeTab, 1, false);
  }, [activeTab, loadTabContent]);

  // Load More handler
  const handleLoadMore = () => {
    const currentPag = pagination[activeTab];
    if (!loadingMore && currentPag.hasMore) {
      loadTabContent(activeTab, currentPag.page + 1, true);
    }
  };

  if (!user) return null;

  const currentPag = pagination[activeTab];

  return (
    <div className="flex-1 flex flex-col pb-20 md:pb-12 min-h-screen bg-wierd-dark">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-8">
        {/* Profile Header Card */}
        <ProfileHeader user={user} stats={stats} />

        {/* Activity Section */}
        <section className="flex flex-col gap-6">
          {/* Section Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <ActivityTabs
              activeTab={activeTab}
              onSelectTab={handleSelectTab}
              counts={{
                experiments: stats.experimentsCount,
                'cooking-results': stats.cookingResultsCount,
                votes: stats.votesCount,
                reactions: stats.reactionsCount,
              }}
            />

            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <button
                type="button"
                onClick={() => loadTabContent(activeTab, 1, false)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-wierd-surface border border-wierd-border hover:border-wierd-amber text-wierd-muted hover:text-white transition-all"
                title="Refresh Activity"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Refresh</span>
              </button>

              <Link
                href="/experiments/create"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-wierd-flame to-wierd-amber shadow-flame hover:scale-[1.02] transition-transform"
              >
                <PlusCircle className="w-4 h-4" />
                <span>New Experiment</span>
              </Link>
            </div>
          </div>

          {/* Tab Content Display */}
          {error && (
            <ErrorState message={error} onRetry={() => loadTabContent(activeTab, 1, false)} />
          )}

          {!error && (
            <>
              {/* TAB 1: EXPERIMENTS */}
              {activeTab === 'experiments' && (
                <>
                  {loading && <LoadingSkeleton count={4} />}

                  {!loading && experiments.length === 0 && (
                    <div className="p-8 text-center rounded-3xl bg-wierd-surface/40 border border-wierd-border/60 space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-wierd-flame/15 border border-wierd-flame/30 text-wierd-flame flex items-center justify-center mx-auto">
                        <PlusCircle className="w-6 h-6" />
                      </div>
                      <h3 className="text-base font-bold text-white">
                        No experiments concocted yet
                      </h3>
                      <p className="text-xs text-wierd-muted max-w-sm mx-auto">
                        Turn your late-night hostel mess hacks into living food science!
                      </p>
                      <Link
                        href="/experiments/create"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-wierd-flame to-wierd-amber shadow-flame hover:scale-[1.02] transition-transform"
                      >
                        <PlusCircle className="w-4 h-4" />
                        <span>Create Your First Experiment</span>
                      </Link>
                    </div>
                  )}

                  {!loading && experiments.length > 0 && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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

                      {/* Pagination */}
                      {currentPag.hasMore && (
                        <div className="text-center pt-4">
                          <button
                            type="button"
                            disabled={loadingMore}
                            onClick={handleLoadMore}
                            className="inline-flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-bold bg-wierd-card border border-wierd-border hover:border-wierd-flame/50 text-white transition-all disabled:opacity-50"
                          >
                            {loadingMore ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin text-wierd-flame" />
                                <span>Loading more recipes...</span>
                              </>
                            ) : (
                              <span>
                                Load More Recipes ({experiments.length} of {currentPag.total})
                              </span>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* TAB 2: COOKING RESULTS / PROOFS */}
              {activeTab === 'cooking-results' && (
                <>
                  {loading && <LoadingSkeleton count={3} />}

                  {!loading && cookingResults.length === 0 && (
                    <div className="p-8 text-center rounded-3xl bg-wierd-surface/40 border border-wierd-border/60 space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center mx-auto">
                        <PlusCircle className="w-6 h-6" />
                      </div>
                      <h3 className="text-base font-bold text-white">
                        No cooking proofs posted yet
                      </h3>
                      <p className="text-xs text-wierd-muted max-w-sm mx-auto">
                        Cooked any recipe from the feed? Share your kitchen photo, ratings, and
                        outcome!
                      </p>
                      <Link
                        href="/"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-wierd-flame to-wierd-amber shadow-flame hover:scale-[1.02] transition-transform"
                      >
                        <span>Browse Experiments to Cook</span>
                      </Link>
                    </div>
                  )}

                  {!loading && cookingResults.length > 0 && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {cookingResults.map((result) => (
                          <CookingResultCard key={result.id} result={result} />
                        ))}
                      </div>

                      {/* Pagination */}
                      {currentPag.hasMore && (
                        <div className="text-center pt-4">
                          <button
                            type="button"
                            disabled={loadingMore}
                            onClick={handleLoadMore}
                            className="inline-flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-bold bg-wierd-card border border-wierd-border hover:border-amber-500/50 text-white transition-all disabled:opacity-50"
                          >
                            {loadingMore ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                                <span>Loading more proofs...</span>
                              </>
                            ) : (
                              <span>
                                Load More Proofs ({cookingResults.length} of {currentPag.total})
                              </span>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* TAB 3: VOTES */}
              {activeTab === 'votes' && (
                <UserVotesList
                  votes={votes}
                  loading={loading}
                  loadingMore={loadingMore}
                  hasMore={currentPag.hasMore}
                  total={currentPag.total}
                  onLoadMore={handleLoadMore}
                  onRefresh={() => loadTabContent('votes', 1, false)}
                />
              )}

              {/* TAB 4: REACTIONS */}
              {activeTab === 'reactions' && (
                <UserReactionsList
                  reactions={reactions}
                  loading={loading}
                  loadingMore={loadingMore}
                  hasMore={currentPag.hasMore}
                  total={currentPag.total}
                  onLoadMore={handleLoadMore}
                  onRefresh={() => loadTabContent('reactions', 1, false)}
                />
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <Suspense
        fallback={
          <div className="min-h-screen bg-wierd-dark p-8 flex items-center justify-center text-xs text-wierd-muted">
            Loading mess profile...
          </div>
        }
      >
        <ProfileContent />
      </Suspense>
    </ProtectedRoute>
  );
}
