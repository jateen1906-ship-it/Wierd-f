'use client';

import React, { useEffect, useState } from 'react';
import { X, Search, AlertCircle, Sparkles, BookOpen } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import type { CanonicalIngredient } from '@food-evolution/types';

interface IngredientsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function IngredientsDrawer({ isOpen, onClose }: IngredientsDrawerProps) {
  const [ingredients, setIngredients] = useState<CanonicalIngredient[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiClient.ingredients.list(search || undefined);
        if (mounted) {
          setIngredients((res.items as unknown as CanonicalIngredient[]) || []);
        }
      } catch (err: unknown) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load canonical ingredients');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    const timer = setTimeout(load, search ? 300 : 0);
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [isOpen, search]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <aside className="relative z-10 w-full max-w-md bg-wierd-dark border-l border-wierd-border p-6 flex flex-col h-full shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-wierd-border/80 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-wierd-amber/15 text-wierd-amber flex items-center justify-center border border-wierd-amber/30">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Canonical Pantry Catalog</h2>
              <p className="text-[11px] text-wierd-muted">Live Seeded Database Ingredients</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-wierd-muted hover:text-white hover:bg-wierd-surface transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="w-4 h-4 absolute left-3 top-3 text-wierd-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Search ingredients (e.g. Maggi, Paneer, Kimchi)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-wierd-surface border border-wierd-border focus:border-wierd-amber/70 focus:outline-none rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-wierd-muted transition-all"
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {loading && (
            <div className="space-y-2 py-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-wierd-card/60 animate-pulse" />
              ))}
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!loading && !error && ingredients.length === 0 && (
            <div className="text-center py-10 text-wierd-muted text-xs">
              No matching canonical ingredients found in database.
            </div>
          )}

          {!loading &&
            !error &&
            ingredients.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-xl bg-wierd-card/80 border border-wierd-border hover:border-wierd-amber/40 transition-all flex flex-col gap-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">{item.name}</span>
                  <div className="flex items-center gap-1.5">
                    {item.isCommonAllergen && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-400 border border-rose-500/20 font-medium">
                        Allergen
                      </span>
                    )}
                    <span className="text-[10px] px-2 py-0.5 rounded bg-wierd-surface text-wierd-subtext border border-wierd-border capitalize">
                      {item.category?.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                {item.commonSubstitutions && item.commonSubstitutions.length > 0 && (
                  <p className="text-[11px] text-wierd-muted">
                    <span className="text-wierd-amber/80 font-medium">Substitutes: </span>
                    {item.commonSubstitutions.join(', ')}
                  </p>
                )}
              </div>
            ))}
        </div>

        {/* Footer info */}
        <div className="pt-3 border-t border-wierd-border/60 text-[11px] text-wierd-muted flex items-center justify-between">
          <span>Catalog size: {ingredients.length} items</span>
          <span className="flex items-center gap-1 text-emerald-400 font-medium">
            <Sparkles className="w-3 h-3" />
            <span>PostgreSQL Verified</span>
          </span>
        </div>
      </aside>
    </div>
  );
}
