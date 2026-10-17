'use client';

import React, { useState } from 'react';
import {
  Flame,
  Clock,
  GitBranch,
  ChefHat,
  ThumbsUp,
  X,
  Search,
  Check,
  ChevronDown,
} from 'lucide-react';
import {
  FEED_SORT_OPTIONS,
  BRANCH_OPTIONS,
  DIFFICULTY_OPTIONS,
  type FeedSortMode,
  type BranchFilterMode,
} from '@/lib/feed-constants';

export { FEED_SORT_OPTIONS, BRANCH_OPTIONS, DIFFICULTY_OPTIONS };
export type { FeedSortMode, BranchFilterMode };

export interface CanonicalIngredientOption {
  id: string;
  name: string;
  category?: string;
}

export interface FeedFiltersProps {
  sortMode?: FeedSortMode;
  onSelectSortMode?: (mode: FeedSortMode) => void;
  branchFilter?: BranchFilterMode;
  onSelectBranchFilter?: (branch: BranchFilterMode) => void;
  difficulty?: string;
  onSelectDifficulty?: (diff: string) => void;
  selectedIngredientId?: string | null;
  onSelectIngredient?: (ingredientId: string | null) => void;
  availableIngredients?: CanonicalIngredientOption[];
  isIngredientsLoading?: boolean;
  search?: string;
  onSearchChange?: (val: string) => void;
  onResetFilters?: () => void;
  activeFiltersCount?: number;
  // Backwards compatibility
  selectedTag?: string;
  onSelectTag?: (tagId: string) => void;
}

function renderSortIcon(iconName: string) {
  switch (iconName) {
    case 'flame':
      return <Flame className="w-3.5 h-3.5 text-wierd-flame" />;
    case 'clock':
      return <Clock className="w-3.5 h-3.5 text-sky-400" />;
    case 'git-branch':
      return <GitBranch className="w-3.5 h-3.5 text-purple-400" />;
    case 'chef-hat':
      return <ChefHat className="w-3.5 h-3.5 text-amber-400" />;
    case 'thumbs-up':
      return <ThumbsUp className="w-3.5 h-3.5 text-emerald-400" />;
    default:
      return null;
  }
}

export function FeedFilters({
  sortMode = 'trending',
  onSelectSortMode,
  branchFilter = 'all',
  onSelectBranchFilter,
  difficulty = 'all',
  onSelectDifficulty,
  selectedIngredientId = null,
  onSelectIngredient,
  availableIngredients = [],
  isIngredientsLoading = false,
  search = '',
  onSearchChange,
  onResetFilters,
  activeFiltersCount = 0,
  selectedTag,
  onSelectTag,
}: FeedFiltersProps) {
  const [isIngredientMenuOpen, setIsIngredientMenuOpen] = useState(false);
  const [ingredientSearch, setIngredientSearch] = useState('');

  // Find currently selected ingredient name
  const selectedIngredient = availableIngredients.find((i) => i.id === selectedIngredientId);

  // Filter available ingredients for the dropdown
  const filteredIngredients = availableIngredients.filter((ing) =>
    ing.name.toLowerCase().includes(ingredientSearch.toLowerCase().trim()),
  );

  return (
    <div className="flex flex-col gap-4 pb-3 border-b border-wierd-border/70">
      {/* Mobile Search Bar (Only shown on small screens; desktop is in Navbar) */}
      {onSearchChange && (
        <div className="md:hidden flex items-center relative w-full">
          <Search className="w-4 h-4 absolute left-3.5 text-wierd-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Search recipes, ingredients, styles..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-wierd-surface border border-wierd-border focus:border-wierd-flame/70 focus:outline-none focus:ring-1 focus:ring-wierd-flame/50 rounded-xl pl-10 pr-9 py-2 text-xs text-wierd-cream placeholder-wierd-muted/70 transition-all"
          />
          {search && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 text-wierd-muted hover:text-white p-0.5"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Row 1: Primary Feed Modes / Sort Tabs */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 scrollbar-none">
        <div className="flex items-center gap-1.5 p-1 bg-wierd-surface/80 rounded-2xl border border-wierd-border/80">
          {FEED_SORT_OPTIONS.map((mode) => {
            const isActive = sortMode === mode.id;
            return (
              <button
                key={mode.id}
                id={`feed-sort-tab-${mode.id}`}
                onClick={() => {
                  onSelectSortMode?.(mode.id);
                  if (onSelectTag && mode.id === 'trending') {
                    onSelectTag('trending');
                  }
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-wierd-flame to-wierd-amber text-white shadow-flame font-bold'
                    : 'text-wierd-muted hover:text-wierd-cream hover:bg-wierd-card/60'
                }`}
                title={mode.description}
              >
                <span>{renderSortIcon(mode.iconName)}</span>
                <span>{mode.label}</span>
              </button>
            );
          })}
        </div>

        {/* Reset all filters button if filters are active */}
        {activeFiltersCount > 0 && onResetFilters && (
          <button
            onClick={onResetFilters}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-all shrink-0"
          >
            <X className="w-3.5 h-3.5" />
            <span>Reset Filters ({activeFiltersCount})</span>
          </button>
        )}
      </div>

      {/* Row 2: Secondary Filter Controls (Branch Type, Difficulty, Ingredient) */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left side: Branch Types & Difficulty */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Branch Type Filter */}
          {onSelectBranchFilter && (
            <div className="inline-flex items-center gap-1 p-0.5 bg-wierd-card rounded-xl border border-wierd-border/80">
              {BRANCH_OPTIONS.map((branch) => {
                const isSelected = branchFilter === branch.id;
                return (
                  <button
                    key={branch.id}
                    id={`filter-branch-${branch.id}`}
                    onClick={() => onSelectBranchFilter(branch.id)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                      isSelected
                        ? 'bg-wierd-surface text-white border border-wierd-border shadow-sm font-semibold'
                        : 'text-wierd-muted hover:text-wierd-cream'
                    }`}
                  >
                    <span>{branch.icon}</span>
                    <span>{branch.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Difficulty Filter */}
          {onSelectDifficulty && (
            <div className="inline-flex items-center gap-1.5">
              <span className="text-[11px] font-medium text-wierd-muted hidden sm:inline">
                Difficulty:
              </span>
              <div className="inline-flex items-center gap-0.5 p-0.5 bg-wierd-card rounded-xl border border-wierd-border/80">
                {DIFFICULTY_OPTIONS.map((diff) => {
                  const isSelected = difficulty === diff.id;
                  return (
                    <button
                      key={diff.id}
                      id={`filter-diff-${diff.id}`}
                      onClick={() => onSelectDifficulty(diff.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium capitalize transition-all ${
                        isSelected
                          ? 'bg-wierd-flame/15 text-wierd-flame border border-wierd-flame/30 font-semibold'
                          : 'text-wierd-muted hover:text-wierd-cream'
                      }`}
                    >
                      {diff.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right side: Canonical Ingredient Filter Dropdown */}
        {onSelectIngredient && (
          <div className="relative">
            <button
              type="button"
              id="btn-filter-ingredient"
              onClick={() => setIsIngredientMenuOpen((prev) => !prev)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                selectedIngredientId
                  ? 'bg-wierd-amber/15 text-wierd-amber border-wierd-amber/40 shadow-sm font-semibold'
                  : 'bg-wierd-card text-wierd-subtext border-wierd-border hover:border-wierd-border/90'
              }`}
            >
              <ChefHat className="w-3.5 h-3.5 text-wierd-amber" />
              <span>{selectedIngredient ? selectedIngredient.name : 'Filter by Ingredient'}</span>
              <ChevronDown className="w-3.5 h-3.5 text-wierd-muted" />
            </button>

            {/* Dropdown Menu */}
            {isIngredientMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 z-50 rounded-2xl bg-wierd-dark border border-wierd-border p-3 shadow-2xl flex flex-col gap-2">
                <div className="flex items-center justify-between pb-1 border-b border-wierd-border/60">
                  <span className="text-[11px] font-bold text-white uppercase tracking-wider">
                    Pantry Ingredient
                  </span>
                  {selectedIngredientId && (
                    <button
                      onClick={() => {
                        onSelectIngredient(null);
                        setIsIngredientMenuOpen(false);
                      }}
                      className="text-[11px] text-rose-400 hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Quick search input */}
                <input
                  type="text"
                  placeholder="Search ingredient (e.g. Maggi, Butter)..."
                  value={ingredientSearch}
                  onChange={(e) => setIngredientSearch(e.target.value)}
                  className="w-full bg-wierd-surface border border-wierd-border rounded-lg px-2.5 py-1 text-xs text-white placeholder-wierd-muted focus:outline-none focus:border-wierd-amber"
                  autoFocus
                />

                {/* Ingredient options list */}
                <div className="max-h-48 overflow-y-auto space-y-1 scrollbar-thin">
                  {isIngredientsLoading ? (
                    <div className="p-2 text-center text-xs text-wierd-muted">
                      Loading pantry catalog...
                    </div>
                  ) : filteredIngredients.length === 0 ? (
                    <div className="p-2 text-center text-xs text-wierd-muted">
                      No matching ingredients found.
                    </div>
                  ) : (
                    filteredIngredients.map((ing) => {
                      const isChosen = ing.id === selectedIngredientId;
                      return (
                        <button
                          key={ing.id}
                          onClick={() => {
                            onSelectIngredient(isChosen ? null : ing.id);
                            setIsIngredientMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-left transition-colors ${
                            isChosen
                              ? 'bg-wierd-amber/20 text-wierd-amber font-semibold'
                              : 'text-wierd-cream hover:bg-wierd-surface'
                          }`}
                        >
                          <span>{ing.name}</span>
                          {isChosen && <Check className="w-3.5 h-3.5 text-wierd-amber" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
