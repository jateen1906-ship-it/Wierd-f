'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Flame,
  Star,
  Sparkles,
  Camera,
  ThumbsUp,
  ThumbsDown,
  Loader2,
  AlertCircle,
  CheckCircle,
  X,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  apiClient,
  ApiError,
  type CookingOutcomeTag,
  type CookingResultResponse,
} from '@/lib/api-client';
import {
  OUTCOME_TAGS,
  cookingResultFormSchema,
  type CookingResultFormData,
} from '@/lib/cooking-result-schemas';

interface CookingResultFormProps {
  experimentId: string;
  experimentTitle: string;
  onSuccess: (result: CookingResultResponse) => void;
  onCancel?: () => void;
  className?: string;
}

export function CookingResultForm({
  experimentId,
  experimentTitle,
  onSuccess,
  onCancel,
  className = '',
}: CookingResultFormProps) {
  const { isAuthenticated } = useAuth();

  const [mediaUrl, setMediaUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [notes, setNotes] = useState('');
  const [outcomeTag, setOutcomeTag] = useState<CookingOutcomeTag>('perfection');
  const [tasteRating, setTasteRating] = useState<number>(4);
  const [textureRating, setTextureRating] = useState<number | undefined>(4);
  const [wouldMakeAgain, setWouldMakeAgain] = useState<boolean>(true);
  const [modificationsMade, setModificationsMade] = useState('');

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Quick preset sample images for hostel cooks testing proofs
  const sampleProofUrls = [
    'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1552611052-33e04de081de?w=800&auto=format&fit=crop&q=80',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    setFieldErrors({});

    const formDataToValidate = {
      mediaUrl,
      caption: caption || undefined,
      notes: notes || undefined,
      outcomeTag,
      tasteRating,
      textureRating,
      wouldMakeAgain,
      modificationsMade: modificationsMade || undefined,
    };

    const validation = cookingResultFormSchema.safeParse(formDataToValidate);

    if (!validation.success) {
      const errors: Record<string, string> = {};
      validation.error.issues.forEach((issue) => {
        const path = String(issue.path[0] || 'root');
        errors[path] = issue.message;
      });
      setFieldErrors(errors);
      setApiError('Please correct the highlighted fields.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        experimentId,
        media: [
          {
            id: `proof-${Date.now()}`,
            url: mediaUrl.trim(),
            type: 'image' as const,
          },
        ],
        caption: caption.trim() || undefined,
        notes: notes.trim() || undefined,
        outcomeTag,
        tasteRating,
        textureRating: textureRating !== undefined ? textureRating : undefined,
        wouldMakeAgain,
        modificationsMade: modificationsMade.trim() || undefined,
      };

      const created = await apiClient.cookingResults.create(payload);
      setIsSuccess(true);
      setTimeout(() => {
        onSuccess(created);
      }, 600);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setApiError(err.message || 'Failed to submit cooking proof.');
      } else if (err instanceof Error) {
        setApiError(err.message);
      } else {
        setApiError('An unexpected network error occurred.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div
        className={`p-6 bg-wierd-card border border-wierd-slate rounded-2xl text-center space-y-3 ${className}`}
      >
        <Flame className="w-8 h-8 text-wierd-flame mx-auto" />
        <h3 className="text-base font-bold text-white">Sign In to Post Cooking Proof</h3>
        <p className="text-xs text-wierd-silver/70 max-w-sm mx-auto">
          Share your real-world result, post photo proof, and give your raw verdict to the
          community.
        </p>
        <Link
          href={`/login?redirect=${encodeURIComponent(`/experiments/${experimentId}`)}`}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-wierd-flame to-red-600 text-white font-bold text-xs shadow-md transition-all"
        >
          <span>Sign In to Post Proof</span>
        </Link>
      </div>
    );
  }

  return (
    <div
      className={`bg-wierd-card border border-wierd-flame/40 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-wierd-slate pb-3">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <Flame className="w-5 h-5 text-wierd-flame" />
            Post Cooking Proof: {experimentTitle}
          </h3>
          <p className="text-xs text-wierd-silver/70 mt-0.5">
            Submit your real cooking verdict, kitchen tweaks, and proof photo.
          </p>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-wierd-silver/60 hover:text-white p-1 rounded-lg hover:bg-wierd-slate/40 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Global Error Banner */}
      {apiError && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{apiError}</span>
        </div>
      )}

      {/* Success Banner */}
      {isSuccess && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>Cooking proof published to the Food Graph! Updating proofs...</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Photo URL Input with Live Preview */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-wierd-silver uppercase tracking-wider">
            Proof Photo URL <span className="text-wierd-flame">*</span>
          </label>
          <div className="relative">
            <input
              type="url"
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
              placeholder="https://images.unsplash.com/photo-..."
              id="proof-media-url"
              className={`w-full bg-wierd-dark border text-xs text-white rounded-xl px-3.5 py-2.5 focus:outline-none transition-colors ${
                fieldErrors.mediaUrl
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-wierd-slate focus:border-wierd-flame'
              }`}
            />
          </div>
          {fieldErrors.mediaUrl ? (
            <p className="text-xs text-red-400">{fieldErrors.mediaUrl}</p>
          ) : (
            <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-wierd-silver/60">
              <span>Quick sample URLs:</span>
              {sampleProofUrls.map((url, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setMediaUrl(url)}
                  className="text-wierd-flame hover:underline"
                >
                  Proof #{idx + 1}
                </button>
              ))}
            </div>
          )}

          {/* Photo Preview if URL provided */}
          {mediaUrl && (
            <div className="mt-2 w-full max-w-xs h-36 rounded-xl overflow-hidden border border-wierd-slate bg-wierd-dark">
              <img
                src={mediaUrl}
                alt="Proof Preview"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
          )}
        </div>

        {/* Outcome Tag Selector */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-wierd-silver uppercase tracking-wider">
            Cooking Outcome Verdict <span className="text-wierd-flame">*</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {OUTCOME_TAGS.map((item) => {
              const isSelected = outcomeTag === item.tag;
              return (
                <button
                  key={item.tag}
                  type="button"
                  onClick={() => setOutcomeTag(item.tag)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'bg-wierd-surface border-wierd-flame ring-1 ring-wierd-flame shadow-md'
                      : 'bg-wierd-dark/60 border-wierd-slate/80 hover:border-wierd-slate text-wierd-silver hover:text-white'
                  }`}
                >
                  <div className="text-xs font-bold text-white capitalize">{item.label}</div>
                  <div className="text-[10px] text-wierd-silver/60 mt-0.5 line-clamp-1">
                    {item.description}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Taste & Texture Ratings */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* Taste Rating */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-wierd-silver uppercase tracking-wider">
              Taste Rating (1-5 Stars) <span className="text-wierd-flame">*</span>
            </label>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setTasteRating(star)}
                  className="p-1 text-wierd-silver hover:scale-110 transition-transform"
                >
                  <Star
                    className={`w-6 h-6 ${
                      star <= tasteRating
                        ? 'text-wierd-amber fill-wierd-amber'
                        : 'text-wierd-slate/60'
                    }`}
                  />
                </button>
              ))}
              <span className="text-xs font-bold text-white ml-2">{tasteRating}/5</span>
            </div>
            {fieldErrors.tasteRating && (
              <p className="text-xs text-red-400">{fieldErrors.tasteRating}</p>
            )}
          </div>

          {/* Texture Rating */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-wierd-silver uppercase tracking-wider">
              Texture Rating{' '}
              <span className="text-[10px] text-wierd-silver/50 font-normal">(optional)</span>
            </label>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setTextureRating(star)}
                  className="p-1 text-wierd-silver hover:scale-110 transition-transform"
                >
                  <Star
                    className={`w-6 h-6 ${
                      textureRating && star <= textureRating
                        ? 'text-teal-400 fill-teal-400'
                        : 'text-wierd-slate/60'
                    }`}
                  />
                </button>
              ))}
              <span className="text-xs font-bold text-white ml-2">
                {textureRating ? `${textureRating}/5` : 'Not set'}
              </span>
            </div>
          </div>
        </div>

        {/* Would Make Again Toggle */}
        <div className="space-y-1 pt-1">
          <label className="block text-xs font-semibold text-wierd-silver uppercase tracking-wider">
            Would You Cook This Again? <span className="text-wierd-flame">*</span>
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setWouldMakeAgain(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                wouldMakeAgain
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-md ring-1 ring-emerald-500/30'
                  : 'bg-wierd-dark border-wierd-slate text-wierd-silver hover:text-white'
              }`}
            >
              <ThumbsUp className="w-4 h-4" />
              <span>Yes, definitely!</span>
            </button>
            <button
              type="button"
              onClick={() => setWouldMakeAgain(false)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                !wouldMakeAgain
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-md ring-1 ring-rose-500/30'
                  : 'bg-wierd-dark border-wierd-slate text-wierd-silver hover:text-white'
              }`}
            >
              <ThumbsDown className="w-4 h-4" />
              <span>One-time experiment only</span>
            </button>
          </div>
        </div>

        {/* Caption */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-wierd-silver uppercase tracking-wider">
            Headline / Caption{' '}
            <span className="text-[10px] text-wierd-silver/50 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="e.g. Cooked inside room 302 kettle during finals week"
            maxLength={500}
            className="w-full bg-wierd-dark border border-wierd-slate text-xs text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-wierd-flame"
          />
        </div>

        {/* Modifications Made */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-wierd-silver uppercase tracking-wider">
            Hostel Hacks / Tweaks Made{' '}
            <span className="text-[10px] text-wierd-silver/50 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={modificationsMade}
            onChange={(e) => setModificationsMade(e.target.value)}
            placeholder="e.g. Swapped butter for ghee, added extra chili flakes"
            maxLength={500}
            className="w-full bg-wierd-dark border border-wierd-slate text-xs text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-wierd-flame"
          />
        </div>

        {/* Detailed Notes */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-wierd-silver uppercase tracking-wider">
            Detailed Cooking Notes{' '}
            <span className="text-[10px] text-wierd-silver/50 font-normal">(optional)</span>
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Share your practical tips, heating tricks, or how to avoid burning the kettle base..."
            maxLength={2000}
            className="w-full bg-wierd-dark border border-wierd-slate text-xs text-white rounded-xl p-3 focus:outline-none focus:border-wierd-flame"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-wierd-slate">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-xl text-xs text-wierd-silver hover:text-white transition-colors"
            >
              Cancel
            </button>
          )}

          <button
            type="submit"
            disabled={isSubmitting || isSuccess}
            id="btn-submit-cooking-proof"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-wierd-flame to-red-600 hover:from-red-600 hover:to-wierd-flame text-white font-bold text-xs shadow-lg shadow-wierd-flame/20 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Posting Proof...</span>
              </>
            ) : (
              <>
                <Camera className="w-4 h-4" />
                <span>Publish Cooking Proof</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
