import { z } from 'zod';
import type { CookingOutcomeTag, ResultReactionType } from './api-client';

export const OUTCOME_TAGS: {
  tag: CookingOutcomeTag;
  label: string;
  badgeClass: string;
  description: string;
}[] = [
  {
    tag: 'perfection',
    label: 'Culinary Perfection',
    badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    description: 'Turned out exactly as intended, pure gold',
  },
  {
    tag: 'unexpectedly_worked',
    label: 'Unexpectedly Worked',
    badgeClass: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
    description: 'Looked suspicious but tasted shockingly good',
  },
  {
    tag: 'flavor_bomb',
    label: 'Flavor Bomb',
    badgeClass: 'bg-wierd-flame/15 text-wierd-flame border-wierd-flame/30',
    description: 'Intense spices, sauce explosion, high impact',
  },
  {
    tag: 'hostel_survival',
    label: 'Hostel Survival',
    badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    description: '3 AM exam fuel cooked in an electric kettle',
  },
  {
    tag: 'needs_remix',
    label: 'Needs A Remix',
    badgeClass: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    description: 'Good concept, but someone needs to branch and fix it',
  },
  {
    tag: 'texture_disaster',
    label: 'Texture Disaster',
    badgeClass: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
    description: 'Too soggy, rubbery, or chalky',
  },
  {
    tag: 'burned_it',
    label: 'Burned To A Crisp',
    badgeClass: 'bg-red-500/15 text-red-400 border-red-500/30',
    description: 'Left kettle boiling unattended for 5 minutes',
  },
  {
    tag: 'total_chaos',
    label: 'Total Chaos',
    badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    description: 'Defies the laws of culinary thermodynamics',
  },
];

export const REACTION_CONFIG: Record<
  ResultReactionType,
  {
    emoji: string;
    label: string;
    countKey: 'fireCount' | 'yuckCount' | 'respectCount' | 'laughCount' | 'mindBlownCount';
    activeColor: string;
  }
> = {
  fire: {
    emoji: '🔥',
    label: 'Fire',
    countKey: 'fireCount',
    activeColor: 'bg-orange-500/20 text-orange-400 border-orange-500/50 ring-orange-500/30',
  },
  yuck: {
    emoji: '🤢',
    label: 'Yuck',
    countKey: 'yuckCount',
    activeColor: 'bg-emerald-950/50 text-emerald-300 border-emerald-500/50 ring-emerald-500/30',
  },
  respect: {
    emoji: '🫡',
    label: 'Respect',
    countKey: 'respectCount',
    activeColor: 'bg-blue-950/50 text-blue-300 border-blue-500/50 ring-blue-500/30',
  },
  laugh: {
    emoji: '😂',
    label: 'LMAO',
    countKey: 'laughCount',
    activeColor: 'bg-yellow-950/50 text-yellow-300 border-yellow-500/50 ring-yellow-500/30',
  },
  mind_blown: {
    emoji: '🤯',
    label: 'Mind Blown',
    countKey: 'mindBlownCount',
    activeColor: 'bg-purple-950/50 text-purple-300 border-purple-500/50 ring-purple-500/30',
  },
};

export const cookingResultFormSchema = z.object({
  mediaUrl: z
    .string()
    .trim()
    .min(1, 'Proof photo/video URL is required')
    .url('Proof must be a valid HTTP or HTTPS URL')
    .refine((u) => /^https?:\/\//i.test(u), 'Proof URL must start with http:// or https://'),
  caption: z.string().trim().max(500, 'Caption cannot exceed 500 characters').optional(),
  notes: z.string().trim().max(2000, 'Notes cannot exceed 2000 characters').optional(),
  outcomeTag: z.enum([
    'perfection',
    'unexpectedly_worked',
    'burned_it',
    'texture_disaster',
    'flavor_bomb',
    'hostel_survival',
    'needs_remix',
    'total_chaos',
  ]),
  tasteRating: z.coerce
    .number({ invalid_type_error: 'Taste rating must be a number' })
    .int('Rating must be an integer')
    .min(1, 'Rating must be at least 1 star')
    .max(5, 'Rating cannot exceed 5 stars'),
  textureRating: z.coerce
    .number({ invalid_type_error: 'Texture rating must be a number' })
    .int('Rating must be an integer')
    .min(1, 'Rating must be at least 1 star')
    .max(5, 'Rating cannot exceed 5 stars')
    .optional(),
  wouldMakeAgain: z.boolean(),
  modificationsMade: z
    .string()
    .trim()
    .max(500, 'Modifications notes cannot exceed 500 characters')
    .optional(),
});

export type CookingResultFormData = z.infer<typeof cookingResultFormSchema>;
