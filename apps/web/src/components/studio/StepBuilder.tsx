'use client';

import React from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, Clock, ShieldAlert, AlertCircle } from 'lucide-react';
import type { PreparationStepFormData } from '@/lib/experiment-schemas';

interface StepBuilderProps {
  steps: PreparationStepFormData[];
  onChange: (steps: PreparationStepFormData[]) => void;
  errors?: Record<number, Record<string, string>>;
}

export function StepBuilder({ steps, onChange, errors = {} }: StepBuilderProps) {
  const handleAddStep = () => {
    const nextStepNumber = steps.length + 1;
    onChange([
      ...steps,
      {
        stepNumber: nextStepNumber,
        instruction: '',
        durationMinutes: undefined,
        safetyTip: '',
        isCritical: false,
      },
    ]);
  };

  const handleRemoveStep = (index: number) => {
    const updated = steps
      .filter((_, i) => i !== index)
      .map((step, idx) => ({
        ...step,
        stepNumber: idx + 1,
      }));
    onChange(updated);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...steps];
    const temp = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = temp;
    // Renumber sequential steps
    const renumbered = updated.map((step, idx) => ({
      ...step,
      stepNumber: idx + 1,
    }));
    onChange(renumbered);
  };

  const handleMoveDown = (index: number) => {
    if (index === steps.length - 1) return;
    const updated = [...steps];
    const temp = updated[index + 1];
    updated[index + 1] = updated[index];
    updated[index] = temp;
    // Renumber sequential steps
    const renumbered = updated.map((step, idx) => ({
      ...step,
      stepNumber: idx + 1,
    }));
    onChange(renumbered);
  };

  const handleUpdateField = <K extends keyof PreparationStepFormData>(
    index: number,
    field: K,
    value: PreparationStepFormData[K],
  ) => {
    const updated = [...steps];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-sm font-semibold text-white">
            Preparation Steps <span className="text-wierd-flame">*</span>
          </label>
          <p className="text-xs text-wierd-silver/70">
            Detail how to cook this step-by-step. Reorder with the arrows as your culinary logic
            evolves.
          </p>
        </div>
        <button
          type="button"
          onClick={handleAddStep}
          id="btn-add-step"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-wierd-flame/15 text-wierd-flame border border-wierd-flame/30 hover:bg-wierd-flame hover:text-white transition-all shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Step
        </button>
      </div>

      {steps.length === 0 ? (
        <div className="p-6 border border-dashed border-wierd-slate rounded-xl text-center bg-wierd-dark/40">
          <p className="text-sm text-wierd-silver/70 mb-2">No steps recorded yet.</p>
          <button
            type="button"
            onClick={handleAddStep}
            className="text-xs font-semibold text-wierd-flame hover:underline"
          >
            + Add your first step (e.g. Boil 200ml water in electric kettle)
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {steps.map((step, idx) => {
            const rowErrors = errors[idx] || {};

            return (
              <div
                key={`step-${step.stepNumber}-${idx}`}
                className="p-4 bg-wierd-card/60 border border-wierd-slate/70 hover:border-wierd-slate rounded-xl transition-all space-y-3"
              >
                {/* Header with step number badge and reorder buttons */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-wierd-flame/20 text-wierd-flame font-bold text-xs border border-wierd-flame/30">
                      {step.stepNumber}
                    </span>
                    <span className="text-xs font-semibold text-white">Step {step.stepNumber}</span>
                    {step.isCritical && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3" /> Critical Step
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleMoveUp(idx)}
                      disabled={idx === 0}
                      id={`btn-move-up-step-${idx}`}
                      className="p-1 rounded text-wierd-silver/60 hover:text-white hover:bg-wierd-slate/50 disabled:opacity-20 disabled:hover:bg-transparent"
                      title="Move step up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveDown(idx)}
                      disabled={idx === steps.length - 1}
                      id={`btn-move-down-step-${idx}`}
                      className="p-1 rounded text-wierd-silver/60 hover:text-white hover:bg-wierd-slate/50 disabled:opacity-20 disabled:hover:bg-transparent"
                      title="Move step down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveStep(idx)}
                      id={`btn-remove-step-${idx}`}
                      className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-red-500/10 ml-1 transition-colors"
                      title="Delete step"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Instruction Textarea */}
                <div>
                  <textarea
                    rows={2}
                    value={step.instruction}
                    onChange={(e) => handleUpdateField(idx, 'instruction', e.target.value)}
                    placeholder="Describe what to do (e.g. Break noodles into halves and drop into bubbling water)..."
                    id={`step-instruction-${idx}`}
                    className={`w-full bg-wierd-dark/80 border text-sm text-white rounded-lg p-2.5 focus:outline-none transition-colors ${
                      rowErrors.instruction
                        ? 'border-red-500/80 focus:border-red-500'
                        : 'border-wierd-slate focus:border-wierd-flame'
                    }`}
                  />
                  {rowErrors.instruction && (
                    <p className="mt-1 text-xs text-red-400">{rowErrors.instruction}</p>
                  )}
                </div>

                {/* Extra Options: Duration, Safety tip, Critical checkbox */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center pt-1 border-t border-wierd-slate/30 text-xs">
                  {/* Duration */}
                  <div className="md:col-span-4 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-wierd-silver/50" />
                    <input
                      type="number"
                      min="0"
                      max="360"
                      value={step.durationMinutes ?? ''}
                      onChange={(e) => {
                        const val =
                          e.target.value === '' ? undefined : parseInt(e.target.value, 10);
                        handleUpdateField(
                          idx,
                          'durationMinutes',
                          isNaN(val as number) ? undefined : val,
                        );
                      }}
                      placeholder="Minutes"
                      id={`step-duration-${idx}`}
                      className="w-24 bg-wierd-dark/80 border border-wierd-slate text-xs text-white rounded px-2 py-1 focus:outline-none focus:border-wierd-flame"
                    />
                    <span className="text-wierd-silver/50 text-[11px]">duration</span>
                  </div>

                  {/* Safety Tip */}
                  <div className="md:col-span-5">
                    <input
                      type="text"
                      value={step.safetyTip || ''}
                      onChange={(e) => handleUpdateField(idx, 'safetyTip', e.target.value)}
                      placeholder="Safety tip (e.g. don't touch coil)"
                      id={`step-safety-${idx}`}
                      className="w-full bg-wierd-dark/80 border border-wierd-slate text-xs text-white rounded px-2.5 py-1 focus:outline-none focus:border-wierd-flame"
                    />
                  </div>

                  {/* Critical Step toggle */}
                  <div className="md:col-span-3 flex justify-start md:justify-end">
                    <label className="inline-flex items-center gap-1.5 cursor-pointer select-none text-wierd-silver/70 hover:text-white">
                      <input
                        type="checkbox"
                        checked={Boolean(step.isCritical)}
                        onChange={(e) => handleUpdateField(idx, 'isCritical', e.target.checked)}
                        className="rounded border-wierd-slate bg-wierd-dark text-wierd-flame focus:ring-0 focus:ring-offset-0"
                      />
                      <span className="text-[11px]">Crucial timing</span>
                    </label>
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
