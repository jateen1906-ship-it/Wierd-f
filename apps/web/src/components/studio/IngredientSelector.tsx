'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Trash2,
  Sparkles,
  Search,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { apiClient, type IngredientItem } from '@/lib/api-client';
import { MEASUREMENT_UNITS, type IngredientFormData } from '@/lib/experiment-schemas';

interface IngredientSelectorProps {
  ingredients: IngredientFormData[];
  onChange: (ingredients: IngredientFormData[]) => void;
  errors?: Record<number, Record<string, string>>;
}

export function IngredientSelector({
  ingredients,
  onChange,
  errors = {},
}: IngredientSelectorProps) {
  // Autocomplete state
  const [activeSearchIndex, setActiveSearchIndex] = useState<number | null>(null);
  const [searchResults, setSearchResults] = useState<IngredientItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleAddIngredient = () => {
    onChange([
      ...ingredients,
      {
        name: '',
        quantity: 1,
        unit: 'piece',
        preparation: '',
        canonicalId: '',
        isOptional: false,
        isCustomAddition: true,
      },
    ]);
  };

  const handleRemoveIngredient = (index: number) => {
    const updated = ingredients.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleUpdateField = <K extends keyof IngredientFormData>(
    index: number,
    field: K,
    value: IngredientFormData[K],
  ) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const handleNameChange = (index: number, value: string) => {
    const updated = [...ingredients];
    updated[index] = {
      ...updated[index],
      name: value,
      // If user types freely without selecting canonical, mark as custom addition and clear canonicalId
      canonicalId: '',
      isCustomAddition: true,
    };
    onChange(updated);

    setActiveSearchIndex(index);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!value.trim() || value.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await apiClient.ingredients.list(value.trim(), 8);
        setSearchResults(res.items || []);
      } catch (err) {
        // Silently fail autocomplete search to not block typing
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);
  };

  const handleSelectCanonical = (index: number, item: IngredientItem) => {
    const updated = [...ingredients];
    updated[index] = {
      ...updated[index],
      name: item.name,
      canonicalId: item.id,
      isCustomAddition: false,
    };
    onChange(updated);
    setActiveSearchIndex(null);
    setSearchResults([]);
  };

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.canonical-search-container')) {
        setActiveSearchIndex(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-sm font-semibold text-white">
            Ingredients <span className="text-wierd-flame">*</span>
          </label>
          <p className="text-xs text-wierd-silver/70">
            Search Wierd&apos;s canonical pantry for instant matching or type your own hostel hack
            ingredients.
          </p>
        </div>
        <button
          type="button"
          onClick={handleAddIngredient}
          id="btn-add-ingredient"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-wierd-flame/15 text-wierd-flame border border-wierd-flame/30 hover:bg-wierd-flame hover:text-white transition-all shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Ingredient
        </button>
      </div>

      {ingredients.length === 0 ? (
        <div className="p-6 border border-dashed border-wierd-slate rounded-xl text-center bg-wierd-dark/40">
          <p className="text-sm text-wierd-silver/70 mb-2">No ingredients added yet.</p>
          <button
            type="button"
            onClick={handleAddIngredient}
            className="text-xs font-semibold text-wierd-flame hover:underline"
          >
            + Add your first ingredient (e.g. 1 packet 2-Minute Maggi)
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {ingredients.map((ing, idx) => {
            const rowErrors = errors[idx] || {};
            const isCanonical = Boolean(ing.canonicalId);

            return (
              <div
                key={ing.id || `ing-${idx}`}
                className="p-3.5 bg-wierd-card/60 border border-wierd-slate/70 hover:border-wierd-slate rounded-xl transition-all space-y-3"
              >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                  {/* Ingredient Name with Live Autocomplete */}
                  <div className="md:col-span-5 relative canonical-search-container">
                    <label className="block text-xs font-medium text-wierd-silver/80 mb-1">
                      Ingredient Name
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={ing.name}
                        onChange={(e) => handleNameChange(idx, e.target.value)}
                        onFocus={() => {
                          if (ing.name.length >= 2) {
                            setActiveSearchIndex(idx);
                          }
                        }}
                        placeholder="e.g. Maggi noodles, Cheese slice..."
                        id={`ingredient-name-${idx}`}
                        className={`w-full bg-wierd-dark/80 border text-sm text-white rounded-lg px-3 py-2 pr-8 focus:outline-none transition-colors ${
                          rowErrors.name
                            ? 'border-red-500/80 focus:border-red-500'
                            : 'border-wierd-slate focus:border-wierd-flame'
                        }`}
                      />
                      <div className="absolute right-2.5 top-2.5 text-wierd-silver/50">
                        {isSearching && activeSearchIndex === idx ? (
                          <div className="w-4 h-4 border-2 border-wierd-flame border-t-transparent rounded-full animate-spin" />
                        ) : isCanonical ? (
                          <span title="Matched to canonical pantry" className="inline-flex">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          </span>
                        ) : (
                          <Search className="w-4 h-4" />
                        )}
                      </div>
                    </div>

                    {/* Autocomplete Dropdown */}
                    {activeSearchIndex === idx && searchResults.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-wierd-dark border border-wierd-slate rounded-xl shadow-2xl z-50 overflow-hidden divide-y divide-wierd-slate/40 max-h-56 overflow-y-auto">
                        <div className="px-3 py-1.5 bg-wierd-surface/50 text-[10px] font-semibold text-wierd-silver/60 uppercase tracking-wider">
                          Canonical Pantry Matches
                        </div>
                        {searchResults.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleSelectCanonical(idx, item)}
                            className="w-full text-left px-3 py-2 hover:bg-wierd-flame/15 transition-colors flex items-center justify-between group"
                          >
                            <div>
                              <div className="text-xs font-medium text-white group-hover:text-wierd-flame">
                                {item.name}
                              </div>
                              <div className="text-[10px] text-wierd-silver/60 capitalize">
                                {item.category.replace('_', ' ')}
                                {item.isCommonAllergen && ' • Allergen'}
                              </div>
                            </div>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-wierd-flame/10 text-wierd-flame border border-wierd-flame/20">
                              Canonical
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    {rowErrors.name && (
                      <p className="mt-1 text-xs text-red-400">{rowErrors.name}</p>
                    )}
                  </div>

                  {/* Quantity */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-wierd-silver/80 mb-1">
                      Qty
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0.1"
                      value={ing.quantity || ''}
                      onChange={(e) =>
                        handleUpdateField(idx, 'quantity', parseFloat(e.target.value) || 0)
                      }
                      id={`ingredient-qty-${idx}`}
                      className={`w-full bg-wierd-dark/80 border text-sm text-white rounded-lg px-3 py-2 focus:outline-none transition-colors ${
                        rowErrors.quantity
                          ? 'border-red-500/80 focus:border-red-500'
                          : 'border-wierd-slate focus:border-wierd-flame'
                      }`}
                    />
                    {rowErrors.quantity && (
                      <p className="mt-1 text-xs text-red-400">{rowErrors.quantity}</p>
                    )}
                  </div>

                  {/* Unit */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-wierd-silver/80 mb-1">
                      Unit
                    </label>
                    <select
                      value={ing.unit}
                      onChange={(e) => handleUpdateField(idx, 'unit', e.target.value)}
                      id={`ingredient-unit-${idx}`}
                      className="w-full bg-wierd-dark/80 border border-wierd-slate text-sm text-white rounded-lg px-2.5 py-2 focus:outline-none focus:border-wierd-flame transition-colors capitalize"
                    >
                      {MEASUREMENT_UNITS.map((unit) => (
                        <option key={unit} value={unit}>
                          {unit}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Preparation Notes */}
                  <div className="md:col-span-3">
                    <label className="block text-xs font-medium text-wierd-silver/80 mb-1">
                      Prep Notes{' '}
                      <span className="text-[10px] text-wierd-silver/50">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={ing.preparation || ''}
                      onChange={(e) => handleUpdateField(idx, 'preparation', e.target.value)}
                      placeholder="e.g. crushed, chopped"
                      id={`ingredient-prep-${idx}`}
                      className="w-full bg-wierd-dark/80 border border-wierd-slate text-sm text-white rounded-lg px-3 py-2 focus:outline-none focus:border-wierd-flame transition-colors"
                    />
                  </div>
                </div>

                {/* Footer Controls: Optional flag & Remove */}
                <div className="flex items-center justify-between pt-1 border-t border-wierd-slate/30 text-xs text-wierd-silver/70">
                  <div className="flex items-center gap-4">
                    <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={Boolean(ing.isOptional)}
                        onChange={(e) => handleUpdateField(idx, 'isOptional', e.target.checked)}
                        className="rounded border-wierd-slate bg-wierd-dark text-wierd-flame focus:ring-0 focus:ring-offset-0"
                      />
                      <span>Optional garnish / topping</span>
                    </label>

                    {isCanonical ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                        <CheckCircle2 className="w-3 h-3" /> Canonical match
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] text-wierd-amber font-medium">
                        <Sparkles className="w-3 h-3" /> Custom ingredient
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveIngredient(idx)}
                    id={`btn-remove-ingredient-${idx}`}
                    className="inline-flex items-center gap-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2 py-1 rounded transition-colors"
                    title="Remove ingredient"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline text-xs">Remove</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
