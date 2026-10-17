'use client';

import React from 'react';
import Link from 'next/link';
import {
  Flame,
  PlusCircle,
  Search,
  Utensils,
  GitFork,
  BookOpen,
  LogIn,
  LogOut,
  User as UserIcon,
  Users,
  Activity,
} from 'lucide-react';
import { LiveStatusBadge } from './LiveStatusBadge';
import { useAuth } from '@/context/AuthContext';
import { NotificationBell } from './notifications/NotificationBell';

interface NavbarProps {
  onOpenIngredients?: () => void;
  onSearchChange?: (term: string) => void;
  searchValue?: string;
}

export function Navbar({ onOpenIngredients, onSearchChange, searchValue = '' }: NavbarProps) {
  const { user, isAuthenticated, logout, isLoading } = useAuth();

  return (
    <>
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 w-full glass-nav px-4 lg:px-8 py-3 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Brand Identity */}
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-wierd-flame to-wierd-amber flex items-center justify-center shadow-flame group-hover:scale-105 transition-transform">
              <Flame className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-wierd-cream to-wierd-flame bg-clip-text text-transparent">
                  WIERD.
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-wierd-flame/20 text-wierd-flame border border-wierd-flame/30">
                  Hostel Lab
                </span>
              </div>
              <p className="text-[11px] text-wierd-muted hidden sm:block">
                Social Food Evolution Platform
              </p>
            </div>
          </Link>

          {/* Search bar input */}
          <div className="hidden md:flex flex-1 max-w-md items-center relative">
            <Search className="w-4 h-4 absolute left-3.5 text-wierd-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Search wild recipes (e.g. Maggi, Espresso Ramen, Kimchi)..."
              value={searchValue}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="w-full bg-wierd-surface/80 border border-wierd-border focus:border-wierd-flame/70 focus:outline-none focus:ring-1 focus:ring-wierd-flame/50 rounded-xl pl-10 pr-4 py-2 text-sm text-wierd-cream placeholder-wierd-muted/70 transition-all"
            />
          </div>

          {/* Action Tools */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <LiveStatusBadge />

            {/* Community Activity Feed Link */}
            <Link
              href="/activity"
              id="nav-activity-feed-link"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-wierd-surface border border-wierd-border hover:border-wierd-flame/50 hover:text-wierd-flame transition-colors"
              title="View Live Community Activity Stream"
            >
              <Activity className="w-3.5 h-3.5 text-wierd-flame" />
              <span>Activity</span>
            </Link>

            {/* Following Feed Link */}
            <Link
              href="/following"
              id="nav-following-feed-link"
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-wierd-surface border border-wierd-border hover:border-purple-400/50 hover:text-purple-300 transition-colors"
              title="View Experiments from Creators You Follow"
            >
              <Users className="w-3.5 h-3.5 text-purple-400" />
              <span>Following</span>
            </Link>

            {/* In-App Notifications Bell */}
            <NotificationBell />

            {/* Ingredients Drawer Trigger */}
            {onOpenIngredients && (
              <button
                onClick={onOpenIngredients}
                className="hidden lg:inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-wierd-surface border border-wierd-border hover:border-wierd-amber/50 hover:text-wierd-amber transition-colors"
                title="Browse 21 Canonical Seeded Ingredients"
              >
                <BookOpen className="w-3.5 h-3.5 text-wierd-amber" />
                <span>Pantry Catalog</span>
              </button>
            )}

            {/* User Authentication Identity / Actions */}
            {!isLoading && (
              <>
                {isAuthenticated && user ? (
                  <div className="flex items-center gap-2">
                    {/* User Profile Link */}
                    <Link
                      href="/profile"
                      id="nav-user-profile-link"
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-wierd-surface hover:bg-wierd-card border border-wierd-border hover:border-wierd-flame/40 text-xs transition-all group"
                      title="View My Profile & Kitchen Activity"
                    >
                      <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-wierd-flame to-wierd-amber text-white font-bold flex items-center justify-center text-[11px] shadow-sm group-hover:scale-105 transition-transform">
                        {(user.displayName || user.username || 'C')[0]?.toUpperCase()}
                      </div>
                      <div className="hidden sm:block text-left">
                        <div className="font-semibold text-white group-hover:text-wierd-flame leading-none transition-colors">
                          {user.displayName || user.username}
                        </div>
                        <div className="text-[10px] text-wierd-muted capitalize">
                          {user.skillLevel?.replace('_', ' ') || 'Hostel Chef'}
                        </div>
                      </div>
                    </Link>

                    {/* Sign Out Button */}
                    <button
                      onClick={logout}
                      className="p-2 rounded-xl text-wierd-muted hover:text-rose-400 hover:bg-wierd-surface border border-transparent hover:border-rose-500/30 transition-all"
                      title="Sign Out"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <Link
                      href="/login"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-wierd-subtext hover:text-white bg-wierd-surface/80 hover:bg-wierd-surface border border-wierd-border transition-all"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>Sign In</span>
                    </Link>

                    <Link
                      href="/register"
                      className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-wierd-flame to-wierd-amber shadow-flame hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                      <span>Join Mess</span>
                    </Link>
                  </div>
                )}
              </>
            )}

            {/* Create Concoction CTA */}
            <Link
              href="/experiments/create"
              id="nav-btn-create-experiment"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-wierd-flame to-wierd-masala hover:opacity-95 shadow-flame hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Cook / Remix</span>
              <span className="sm:hidden">Create</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 glass-nav border-t border-wierd-border/80 px-4 py-2 flex items-center justify-around">
        <Link
          href="/"
          className="flex flex-col items-center gap-1 text-wierd-flame text-[10px] font-semibold"
        >
          <Utensils className="w-5 h-5" />
          <span>Feed</span>
        </Link>

        <Link
          href="/following"
          className="flex flex-col items-center gap-1 text-wierd-muted hover:text-purple-300 text-[10px] font-semibold"
        >
          <Users className="w-5 h-5 text-purple-400" />
          <span>Following</span>
        </Link>

        {onOpenIngredients && (
          <button
            onClick={onOpenIngredients}
            className="flex flex-col items-center gap-1 text-wierd-muted hover:text-wierd-cream text-[10px] font-semibold"
          >
            <BookOpen className="w-5 h-5" />
            <span>Pantry</span>
          </button>
        )}

        <Link
          href="/experiments/create"
          className="flex flex-col items-center gap-1 text-wierd-amber hover:text-wierd-flame text-[10px] font-semibold"
        >
          <PlusCircle className="w-5 h-5" />
          <span>Cook</span>
        </Link>

        <Link
          href="/?rootOnly=true"
          className="flex flex-col items-center gap-1 text-wierd-muted hover:text-wierd-cream text-[10px] font-semibold"
        >
          <GitFork className="w-5 h-5" />
          <span>Trees</span>
        </Link>

        {isAuthenticated ? (
          <>
            <Link
              href="/profile"
              id="mobile-nav-profile-link"
              className="flex flex-col items-center gap-1 text-wierd-muted hover:text-wierd-cream text-[10px] font-semibold"
            >
              <UserIcon className="w-5 h-5" />
              <span>Profile</span>
            </Link>
            <button
              onClick={logout}
              className="flex flex-col items-center gap-1 text-wierd-muted hover:text-rose-400 text-[10px] font-semibold"
            >
              <LogOut className="w-5 h-5" />
              <span>Sign Out</span>
            </button>
          </>
        ) : (
          <Link
            href="/login"
            className="flex flex-col items-center gap-1 text-wierd-muted hover:text-wierd-flame text-[10px] font-semibold"
          >
            <UserIcon className="w-5 h-5" />
            <span>Sign In</span>
          </Link>
        )}
      </nav>
    </>
  );
}
