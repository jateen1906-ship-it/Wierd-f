'use client';

import React from 'react';
import type { SafeUser, UserProfileResponse } from '@/lib/api-client';
import {
  ChefHat,
  Calendar,
  Mail,
  Flame,
  GitBranch,
  ThumbsUp,
  Sparkles,
  ShieldCheck,
  Utensils,
} from 'lucide-react';

interface ProfileHeaderProps {
  user: UserProfileResponse | SafeUser;
  stats?: {
    experimentsCount: number;
    cookingResultsCount: number;
    votesCount: number;
    reactionsCount: number;
  };
}

export function ProfileHeader({ user, stats }: ProfileHeaderProps) {
  const name = user.displayName || user.username || 'Hostel Cook';
  const initial = name[0]?.toUpperCase() || 'C';
  const skillLabel = user.skillLevel?.replace(/_/g, ' ') || 'Hostel Chef';

  // Preferences from UserProfileResponse if present
  const preferences = (user as UserProfileResponse).preferences;

  // Format joined date
  const joinedDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      })
    : null;

  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-wierd-surface via-wierd-card to-wierd-dark border border-wierd-border p-6 sm:p-8 shadow-2xl">
      {/* Background ambient lighting */}
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-wierd-flame/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-wierd-amber/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        {/* Left: Avatar & Profile Info */}
        <div className="flex items-start sm:items-center gap-4 sm:gap-5">
          {/* Avatar Container */}
          <div className="relative shrink-0">
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatarUrl}
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

          {/* User Details */}
          <div className="space-y-1.5">
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
              <span className="text-wierd-cream font-medium">@{user.username}</span>
              {user.email && (
                <>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1 text-[11px] text-wierd-silver/70">
                    <Mail className="w-3 h-3" />
                    <span>{user.email}</span>
                  </span>
                </>
              )}
            </p>

            {user.bio && (
              <p className="text-xs text-wierd-silver/90 max-w-xl leading-relaxed pt-1">
                {user.bio}
              </p>
            )}

            {/* Meta Row: Member since & Preferences */}
            <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-wierd-muted">
              {joinedDate && (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-wierd-muted" />
                  <span>Joined {joinedDate}</span>
                </span>
              )}

              {preferences?.spiceTolerance && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-wierd-surface border border-wierd-border text-amber-300 capitalize">
                  <span>🌶️ Spice: {preferences.spiceTolerance}</span>
                </span>
              )}

              {preferences?.budgetPreference && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-wierd-surface border border-wierd-border text-emerald-400 capitalize">
                  <span>🪙 {preferences.budgetPreference} Budget</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Quick Activity Summary Cards */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-2 gap-2.5 w-full md:w-auto shrink-0 pt-4 md:pt-0 border-t md:border-t-0 border-wierd-border/60">
            {/* Experiments */}
            <div className="p-3 rounded-2xl bg-wierd-surface/80 border border-wierd-border/80 text-center min-w-[90px]">
              <div className="flex items-center justify-center gap-1 text-wierd-amber mb-0.5">
                <Utensils className="w-3.5 h-3.5" />
                <span className="text-lg font-black text-white">{stats.experimentsCount}</span>
              </div>
              <span className="text-[10px] uppercase font-bold text-wierd-muted tracking-wider block">
                Recipes
              </span>
            </div>

            {/* Cooking Proofs */}
            <div className="p-3 rounded-2xl bg-wierd-surface/80 border border-wierd-border/80 text-center min-w-[90px]">
              <div className="flex items-center justify-center gap-1 text-amber-500 mb-0.5">
                <Flame className="w-3.5 h-3.5" />
                <span className="text-lg font-black text-white">{stats.cookingResultsCount}</span>
              </div>
              <span className="text-[10px] uppercase font-bold text-wierd-muted tracking-wider block">
                Proofs
              </span>
            </div>

            {/* Votes */}
            <div className="p-3 rounded-2xl bg-wierd-surface/80 border border-wierd-border/80 text-center min-w-[90px]">
              <div className="flex items-center justify-center gap-1 text-sky-400 mb-0.5">
                <ThumbsUp className="w-3.5 h-3.5" />
                <span className="text-lg font-black text-white">{stats.votesCount}</span>
              </div>
              <span className="text-[10px] uppercase font-bold text-wierd-muted tracking-wider block">
                Votes
              </span>
            </div>

            {/* Reactions */}
            <div className="p-3 rounded-2xl bg-wierd-surface/80 border border-wierd-border/80 text-center min-w-[90px]">
              <div className="flex items-center justify-center gap-1 text-purple-400 mb-0.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span className="text-lg font-black text-white">{stats.reactionsCount}</span>
              </div>
              <span className="text-[10px] uppercase font-bold text-wierd-muted tracking-wider block">
                Reactions
              </span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
