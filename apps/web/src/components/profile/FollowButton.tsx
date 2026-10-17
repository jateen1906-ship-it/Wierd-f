'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api-client';
import { UserPlus, UserCheck, UserMinus, Loader2, LogIn, X, Sparkles } from 'lucide-react';

interface FollowButtonProps {
  username: string;
  initialIsFollowing?: boolean;
  initialFollowersCount?: number;
  onFollowChange?: (isFollowing: boolean, newCount: number) => void;
}

export function FollowButton({
  username,
  initialIsFollowing = false,
  initialFollowersCount = 0,
  onFollowChange,
}: FollowButtonProps) {
  const { user, isAuthenticated } = useAuth();
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [followersCount, setFollowersCount] = useState(initialFollowersCount);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state if initial prop changes
  React.useEffect(() => {
    setIsFollowing(initialIsFollowing);
  }, [initialIsFollowing]);

  React.useEffect(() => {
    setFollowersCount(initialFollowersCount);
  }, [initialFollowersCount]);

  const isSelf = Boolean(user?.username) && user?.username.toLowerCase() === username.toLowerCase();

  if (isSelf) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-wierd-surface border border-wierd-border text-wierd-subtext">
        <Sparkles className="w-3.5 h-3.5 text-wierd-amber" />
        <span>Your Profile</span>
      </span>
    );
  }

  const handleFollowToggle = async () => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (isFollowing) {
        const res = await apiClient.users.unfollow(username);
        setIsFollowing(false);
        setFollowersCount(res.followersCount);
        onFollowChange?.(false, res.followersCount);
      } else {
        const res = await apiClient.users.follow(username);
        setIsFollowing(true);
        setFollowersCount(res.followersCount);
        onFollowChange?.(true, res.followersCount);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to update follow state.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="relative inline-flex flex-col items-start">
        <button
          onClick={handleFollowToggle}
          disabled={isSubmitting}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md disabled:opacity-50 ${
            isFollowing
              ? isHovered
                ? 'bg-rose-500/15 border border-rose-500/40 text-rose-400 shadow-rose-950/20'
                : 'bg-wierd-surface border border-emerald-500/40 text-emerald-400 shadow-sm'
              : 'bg-gradient-to-r from-wierd-flame to-red-600 text-white hover:brightness-110 shadow-flame'
          }`}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Updating...</span>
            </>
          ) : isFollowing ? (
            isHovered ? (
              <>
                <UserMinus className="w-3.5 h-3.5 text-rose-400" />
                <span>Unfollow</span>
              </>
            ) : (
              <>
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Following</span>
              </>
            )
          ) : (
            <>
              <UserPlus className="w-3.5 h-3.5" />
              <span>Follow Creator</span>
            </>
          )}
        </button>

        {error && (
          <span className="absolute top-full left-0 mt-1 text-[11px] text-rose-400 whitespace-nowrap">
            {error}
          </span>
        )}
      </div>

      {/* Login Prompt Modal for Logged-Out Visitors */}
      {showLoginModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setShowLoginModal(false)}
        >
          <div
            className="relative w-full max-w-sm rounded-3xl bg-wierd-card border border-wierd-border p-6 shadow-2xl text-center space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowLoginModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-xl bg-wierd-surface text-wierd-muted hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-wierd-flame to-wierd-amber flex items-center justify-center text-white mx-auto shadow-flame">
              <UserPlus className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-white tracking-tight">Follow @{username}</h3>
              <p className="text-xs text-wierd-muted leading-relaxed">
                Log in to follow this creator, keep up with their latest food evolution branches,
                and share your own cooking proof.
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <Link
                href={`/login?redirect=/users/${encodeURIComponent(username)}`}
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-wierd-flame to-red-600 hover:brightness-110 shadow-flame transition-all"
              >
                <LogIn className="w-4 h-4" />
                <span>Log In to Follow</span>
              </Link>
              <Link
                href={`/register?redirect=/users/${encodeURIComponent(username)}`}
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-bold text-wierd-cream bg-wierd-surface hover:bg-wierd-border border border-wierd-border transition-colors"
              >
                <span>Create an Account</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
