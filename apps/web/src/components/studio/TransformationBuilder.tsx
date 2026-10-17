'use client';

import React from 'react';
import { Plus, Trash2, GitCommit, Sparkles } from 'lucide-react';
import { TRANSFORMATION_OPTIONS, type TransformationFormData } from '@/lib/experiment-schemas';

interface TransformationBuilderProps {
  transformations: TransformationFormData[];
  onChange: (transformations: TransformationFormData[]) => void;
  errors?: Record<number, Record<string, string>>;
}

export function TransformationBuilder({
  transformations,
  onChange,
  errors = {},
}: TransformationBuilderProps) {
  const handleAddTransformation = (
    type: TransformationFormData['type'] = 'ingredient_substituted',
  ) => {
    onChange([
      ...transformations,
      {
        type,
        description: '',
        previousValue: '',
        newValue: '',
      },
    ]);
  };

  const handleRemoveTransformation = (index: number) => {
    const updated = transformations.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleUpdateField = <K extends keyof TransformationFormData>(
    index: number,
    field: K,
    value: TransformationFormData[K],
  ) => {
    const updated = [...transformations];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-sm font-semibold text-white flex items-center gap-1.5">
            <GitCommit className="w-4 h-4 text-wierd-flame" />
            Remix Transformations (Mutations) <span className="text-wierd-flame">*</span>
          </label>
          <p className="text-xs text-wierd-silver/70">
            Tell the food evolution graph what you altered from the parent recipe. At least 1
            mutation is required.
          </p>
        </div>
        <button
          type="button"
          onClick={() => handleAddTransformation()}
          id="btn-add-transformation"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-wierd-flame/15 text-wierd-flame border border-wierd-flame/30 hover:bg-wierd-flame hover:text-white transition-all shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Mutation
        </button>
      </div>

      {transformations.length === 0 ? (
        <div className="p-6 border border-dashed border-wierd-flame/40 rounded-xl text-center bg-wierd-flame/5">
          <GitCommit className="w-6 h-6 text-wierd-flame mx-auto mb-2 opacity-80" />
          <p className="text-sm font-medium text-white mb-1">No transformations recorded yet</p>
          <p className="text-xs text-wierd-silver/70 mb-3 max-w-md mx-auto">
            A remix cannot be created without at least one recorded transformation diff.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => handleAddTransformation('ingredient_substituted')}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-wierd-dark border border-wierd-slate hover:border-wierd-flame text-wierd-silver hover:text-white transition-colors"
            >
              + Substituted an ingredient
            </button>
            <button
              type="button"
              onClick={() => handleAddTransformation('ingredient_added')}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-wierd-dark border border-wierd-slate hover:border-wierd-flame text-wierd-silver hover:text-white transition-colors"
            >
              + Added custom ingredient
            </button>
            <button
              type="button"
              onClick={() => handleAddTransformation('cooking_method_changed')}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-wierd-dark border border-wierd-slate hover:border-wierd-flame text-wierd-silver hover:text-white transition-colors"
            >
              + Changed cooking method
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {transformations.map((trans, idx) => {
            const rowErrors = errors[idx] || {};

            return (
              <div
                key={`trans-${idx}`}
                className="p-3.5 bg-wierd-card/60 border border-wierd-slate/80 hover:border-wierd-flame/50 rounded-xl transition-all space-y-3"
              >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                  {/* Type Selector */}
                  <div className="md:col-span-4">
                    <label className="block text-xs font-medium text-wierd-silver/80 mb-1">
                      Mutation Type
                    </label>
                    <select
                      value={trans.type}
                      onChange={(e) =>
                        handleUpdateField(
                          idx,
                          'type',
                          e.target.value as TransformationFormData['type'],
                        )
                      }
                      id={`trans-type-${idx}`}
                      className="w-full bg-wierd-dark/80 border border-wierd-slate text-xs text-white rounded-lg px-2.5 py-2 focus:outline-none focus:border-wierd-flame transition-colors"
                    >
                      {TRANSFORMATION_OPTIONS.map((opt) => (
                        <option key={opt.type} value={opt.type}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Description */}
                  <div className="md:col-span-8">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-medium text-wierd-silver/80">
                        Description <span className="text-wierd-flame">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => handleRemoveTransformation(idx)}
                        id={`btn-remove-trans-${idx}`}
                        className="text-red-400 hover:text-red-300 p-0.5 rounded text-xs inline-flex items-center gap-1"
                        title="Remove transformation"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      value={trans.description}
                      onChange={(e) => handleUpdateField(idx, 'description', e.target.value)}
                      placeholder="e.g. Swapped boiled water with amul spiced buttermilk for tangy broth"
                      id={`trans-desc-${idx}`}
                      className={`w-full bg-wierd-dark/80 border text-xs text-white rounded-lg px-3 py-2 focus:outline-none transition-colors ${
                        rowErrors.description
                          ? 'border-red-500/80 focus:border-red-500'
                          : 'border-wierd-slate focus:border-wierd-flame'
                      }`}
                    />
                    {rowErrors.description && (
                      <p className="mt-1 text-xs text-red-400">{rowErrors.description}</p>
                    )}
                  </div>
                </div>

                {/* Diff Comparison: Previous vs New */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-wierd-slate/30 text-xs">
                  <div>
                    <label className="block text-[11px] font-medium text-wierd-silver/60 mb-1">
                      Previous Value{' '}
                      <span className="text-[10px] text-wierd-silver/40">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={trans.previousValue || ''}
                      onChange={(e) => handleUpdateField(idx, 'previousValue', e.target.value)}
                      placeholder="e.g. Plain tap water"
                      id={`trans-prev-${idx}`}
                      className="w-full bg-wierd-dark/60 border border-wierd-slate/60 text-xs text-wierd-silver rounded px-2.5 py-1.5 focus:outline-none focus:border-wierd-flame"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-wierd-silver/60 mb-1">
                      New Value <span className="text-[10px] text-wierd-silver/40">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={trans.newValue || ''}
                      onChange={(e) => handleUpdateField(idx, 'newValue', e.target.value)}
                      placeholder="e.g. Chilled Chaas / Buttermilk"
                      id={`trans-new-${idx}`}
                      className="w-full bg-wierd-dark/60 border border-wierd-slate/60 text-xs text-wierd-flame rounded px-2.5 py-1.5 focus:outline-none focus:border-wierd-flame"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
