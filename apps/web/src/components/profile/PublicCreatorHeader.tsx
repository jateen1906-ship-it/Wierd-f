'use client';

import React from 'react';
import type { PublicUserProfileResponse } from '@/lib/api-client';
import { FollowButton } from './FollowButton';
import { ChefHat, Calendar, Flame, GitBranch, Utensils, Sparkles, Users } from 'lucide-react';

interface PublicCreatorHeaderProps {
  profile: PublicUserProfileResponse;
  onFollowChange?: (isFollowing: boolean, newFollowersCount: number) => void;
}

export function PublicCreatorHeader({ profile, onFollowChange }: PublicCreatorHeaderProps) {
  const name = profile.displayName || profile.username || 'Hostel Cook';
  const initial = name[0]?.toUpperCase() || 'C';
  const skillLabel = profile.skillLevel?.replace(/_/g, ' ') || 'Hostel Chef';

  const joinedDate = profile.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      })
    : null;

  const stats = profile.stats || {
    experimentsCount: 0,
    cookingResultsCount: 0,
    remixesCount: 0,
    followersCount: 0,
    followingCount: 0,
  };

  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-wierd-surface via-wierd-card to-wierd-dark border border-wierd-border p-6 sm:p-8 shadow-2xl">
      {/* Ambient background lighting */}
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-wierd-flame/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-wierd-amber/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        {/* Left: Avatar & Identity */}
        <div className="flex items-start sm:items-center gap-4 sm:gap-5">
          {/* Avatar Container */}
          <div className="relative shrink-0">
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatarUrl}
                alt={name}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-wierd-flame/50 shadow-flame"
              />
            ) : (
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-tr from-wierd-flame via-red-600 to-wierd-amber flex items-center justify-center text-white text-3xl sm:text-4xl font-black shadow-flame border-2 border-white/10">
                {initial}
              </div>
            )}
            <div
              className="absolute -bottom-2 -right-2 p-1.5 rounded-xl bg-wierd-dark border border-wierd-border text-wierd-amber shadow-sm"
              title="Verified Hostel Concoctionist"
            >
              <ChefHat className="w-4 h-4" />
            </div>
          </div>

          {/* Details */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {name}
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-wierd-flame/15 text-wierd-flame border border-wierd-flame/30 capitalize">
                <Sparkles className="w-3 h-3" />
                <span>{skillLabel}</span>
              </span>
            </div>

            <p className="text-xs sm:text-sm text-wierd-muted flex items-center gap-2">
              <span className="text-wierd-cream font-medium">@{profile.username}</span>
            </p>

            {profile.bio && (
              <p className="text-xs text-wierd-silver/90 max-w-xl leading-relaxed">{profile.bio}</p>
            )}

            {/* Member since joined date & Follow Button row */}
            <div className="flex flex-wrap items-center gap-4 pt-1">
              <FollowButton
                username={profile.username}
                initialIsFollowing={profile.isFollowing}
                initialFollowersCount={stats.followersCount}
                onFollowChange={onFollowChange}
              />

              {joinedDate && (
                <div className="flex items-center gap-1 text-[11px] text-wierd-muted">
                  <Calendar className="w-3.5 h-3.5 text-wierd-muted" />
                  <span>Creator since {joinedDate}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Public Contribution & Follower Counters */}
        <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-5 gap-2 w-full lg:w-auto shrink-0 pt-4 lg:pt-0 border-t lg:border-t-0 border-wierd-border/60">
          {/* Followers */}
          <div className="p-2.5 sm:p-3 rounded-2xl bg-wierd-surface/80 border border-wierd-border/80 text-center min-w-[75px] sm:min-w-[80px]">
            <div className="flex items-center justify-center gap-1 text-emerald-400 mb-0.5">
              <Users className="w-3.5 h-3.5" />
              <span className="text-base sm:text-lg font-black text-white">
                {stats.followersCount ?? 0}
              </span>
            </div>
            <span className="text-[9px] uppercase font-bold text-wierd-muted tracking-wider block">
              Followers
            </span>
          </div>

          {/* Following */}
          <div className="p-2.5 sm:p-3 rounded-2xl bg-wierd-surface/80 border border-wierd-border/80 text-center min-w-[75px] sm:min-w-[80px]">
            <div className="flex items-center justify-center gap-1 text-sky-400 mb-0.5">
              <Users className="w-3.5 h-3.5" />
              <span className="text-base sm:text-lg font-black text-white">
                {stats.followingCount ?? 0}
              </span>
            </div>
            <span className="text-[9px] uppercase font-bold text-wierd-muted tracking-wider block">
              Following
            </span>
          </div>

          {/* Recipes */}
          <div className="p-2.5 sm:p-3 rounded-2xl bg-wierd-surface/80 border border-wierd-border/80 text-center min-w-[75px] sm:min-w-[80px]">
            <div className="flex items-center justify-center gap-1 text-wierd-amber mb-0.5">
              <Utensils className="w-3.5 h-3.5" />
              <span className="text-base sm:text-lg font-black text-white">
                {stats.experimentsCount}
              </span>
            </div>
            <span className="text-[9px] uppercase font-bold text-wierd-muted tracking-wider block">
              Recipes
            </span>
          </div>

          {/* Proofs */}
          <div className="p-2.5 sm:p-3 rounded-2xl bg-wierd-surface/80 border border-wierd-border/80 text-center min-w-[75px] sm:min-w-[80px]">
            <div className="flex items-center justify-center gap-1 text-amber-500 mb-0.5">
              <Flame className="w-3.5 h-3.5" />
              <span className="text-base sm:text-lg font-black text-white">
                {stats.cookingResultsCount}
              </span>
            </div>
            <span className="text-[9px] uppercase font-bold text-wierd-muted tracking-wider block">
              Proofs
            </span>
          </div>

          {/* Remixes */}
          <div className="p-2.5 sm:p-3 rounded-2xl bg-wierd-surface/80 border border-wierd-border/80 text-center min-w-[75px] sm:min-w-[80px]">
            <div className="flex items-center justify-center gap-1 text-purple-400 mb-0.5">
              <GitBranch className="w-3.5 h-3.5" />
              <span className="text-base sm:text-lg font-black text-white">
                {stats.remixesCount}
              </span>
            </div>
            <span className="text-[9px] uppercase font-bold text-wierd-muted tracking-wider block">
              Remixes
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
