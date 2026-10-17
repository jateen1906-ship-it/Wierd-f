'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Check,
  CheckCheck,
  Sparkles,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  ChefHat,
} from 'lucide-react';
import { apiClient, NotificationItem } from '@/lib/api-client';
import { useAuth } from '@/context/AuthContext';

export function NotificationBell() {
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await apiClient.notifications.unreadCount();
      setUnreadCount(res.unreadCount);
    } catch {
      // Silently catch background poll failures
    }
  }, [isAuthenticated]);

  // Fetch notifications list
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.notifications.list(1, 20);
      setNotifications(res.items);
      // Synchronize unread count from results
      const unreadInList = res.items.filter((item) => !item.isRead).length;
      if (unreadInList !== unreadCount && res.items.length <= 20) {
        setUnreadCount(unreadInList);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, unreadCount]);

  // Initial fetch and conservative periodic polling (60s)
  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      setNotifications([]);
      return;
    }

    fetchUnreadCount();

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchUnreadCount();
      }
    }, 60000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchUnreadCount();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated, fetchUnreadCount]);

  // Fetch items when dropdown opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  // Click outside and Escape key handler
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Mark a single notification as read
  const handleMarkAsRead = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await apiClient.notifications.markAsRead(id);
      setNotifications((prev) =>
        prev.map((item) => (item.id === id ? { ...item, isRead: true } : item)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // Fail silently or keep state
    }
  };

  // Mark all notifications as read
  const handleMarkAllAsRead = async () => {
    if (isMarkingAll || unreadCount === 0) return;
    setIsMarkingAll(true);
    try {
      await apiClient.notifications.markAllAsRead();
      setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
      setUnreadCount(0);
    } catch {
      // Error handling
    } finally {
      setIsMarkingAll(false);
    }
  };

  // Click notification to navigate
  const handleNotificationClick = async (item: NotificationItem) => {
    if (!item.isRead) {
      try {
        await apiClient.notifications.markAsRead(item.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)),
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {
        // Continue navigation regardless
      }
    }
    setIsOpen(false);
    router.push(`/experiments/${item.experiment.id}`);
  };

  // Helper for human-friendly time
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
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="relative" ref={containerRef}>
      {/* Bell Button */}
      <button
        id="nav-notification-bell-btn"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`relative p-2 rounded-xl border transition-all ${
          isOpen
            ? 'bg-wierd-flame/15 text-wierd-flame border-wierd-flame/40'
            : 'bg-wierd-surface hover:bg-wierd-card text-wierd-muted hover:text-wierd-cream border-wierd-border hover:border-wierd-flame/40'
        }`}
        title="Creator Activity Notifications"
        aria-label="Notifications"
        aria-expanded={isOpen}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span
            id="nav-notification-badge"
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-gradient-to-r from-wierd-flame to-rose-500 text-white text-[10px] font-black flex items-center justify-center shadow-md animate-pulse ring-2 ring-black"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          id="nav-notification-dropdown"
          className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-wierd-card border border-wierd-border/80 shadow-2xl backdrop-blur-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-wierd-border/60 flex items-center justify-between bg-wierd-surface/50">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-wierd-cream">Activity & Alerts</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-wierd-flame/20 text-wierd-flame border border-wierd-flame/30 text-[10px] font-bold">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                id="btn-mark-all-notifications-read"
                onClick={handleMarkAllAsRead}
                disabled={isMarkingAll}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-wierd-muted hover:text-wierd-amber transition-colors disabled:opacity-50"
                title="Mark all notifications as read"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Body */}
          <div className="max-h-96 overflow-y-auto divide-y divide-wierd-border/40">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-start gap-3 animate-pulse">
                    <div className="w-8 h-8 rounded-lg bg-wierd-surface shrink-0" />
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-3 bg-wierd-surface rounded w-3/4" />
                      <div className="h-2.5 bg-wierd-surface/60 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="p-6 text-center">
                <AlertCircle className="w-6 h-6 text-rose-400 mx-auto mb-2" />
                <p className="text-xs text-rose-300 mb-3">{error}</p>
                <button
                  onClick={fetchNotifications}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-wierd-surface border border-wierd-border hover:border-wierd-flame/40 text-wierd-cream transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Retry</span>
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-10 h-10 rounded-xl bg-wierd-surface/80 border border-wierd-border flex items-center justify-center mx-auto mb-3 text-wierd-muted">
                  <ChefHat className="w-5 h-5 text-wierd-flame/70" />
                </div>
                <p className="text-xs font-semibold text-wierd-cream mb-1">No notifications yet</p>
                <p className="text-[11px] text-wierd-muted max-w-[240px] mx-auto">
                  When creators you follow publish new recipes or remixes, you&apos;ll see them
                  right here!
                </p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  id={`notification-item-${item.id}`}
                  onClick={() => handleNotificationClick(item)}
                  className={`p-3.5 flex items-start gap-3 cursor-pointer transition-colors group relative ${
                    item.isRead
                      ? 'hover:bg-wierd-surface/40'
                      : 'bg-wierd-flame/5 hover:bg-wierd-flame/10'
                  }`}
                >
                  {/* Actor Avatar / Icon */}
                  <div className="relative shrink-0 mt-0.5">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-wierd-flame to-wierd-amber text-white font-bold flex items-center justify-center text-xs shadow-sm">
                      {(item.actor?.displayName || item.actor?.username || 'C')[0]?.toUpperCase()}
                    </div>
                    {!item.isRead && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-wierd-flame ring-2 ring-wierd-card" />
                    )}
                  </div>

                  {/* Notification Content */}
                  <div className="flex-1 min-w-0 pr-6">
                    <div className="text-xs text-wierd-cream leading-snug line-clamp-2">
                      <span className="font-semibold text-white">
                        {item.actor?.displayName || item.actor?.username}
                      </span>{' '}
                      <span className="text-wierd-muted">
                        {item.message.includes('remixed')
                          ? 'remixed a new recipe:'
                          : 'cooked up a new experiment:'}
                      </span>{' '}
                      <span className="font-semibold text-wierd-amber group-hover:text-wierd-flame transition-colors">
                        &ldquo;{item.experiment?.title}&rdquo;
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-1.5 text-[10px] text-wierd-muted">
                      <span>{formatTime(item.createdAt)}</span>
                      {item.experiment?.difficulty && (
                        <>
                          <span>•</span>
                          <span className="capitalize">
                            {item.experiment.difficulty.toLowerCase()}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Mark single as read button */}
                  {!item.isRead && (
                    <button
                      onClick={(e) => handleMarkAsRead(e, item.id)}
                      className="absolute right-3 top-3.5 p-1 rounded-md text-wierd-muted hover:text-wierd-cream hover:bg-wierd-surface opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Mark as read"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer Link */}
          <div className="px-4 py-2.5 border-t border-wierd-border/60 bg-wierd-surface/40 flex items-center justify-between text-xs">
            <Link
              href="/following"
              onClick={() => setIsOpen(false)}
              className="text-[11px] font-medium text-purple-400 hover:text-purple-300 inline-flex items-center gap-1 transition-colors"
            >
              <span>Explore Following Feed</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
