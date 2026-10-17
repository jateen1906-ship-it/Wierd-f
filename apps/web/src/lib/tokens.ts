/**
 * Visual Design Tokens & Presets
 * Geared towards modern Indian college students and hostelers (late-night canteen vibe, bold street-food energy)
 */

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface DifficultyConfig {
  label: string;
  badgeClass: string;
  icon: string;
}

export const DIFFICULTY_THEMES: Record<Difficulty, DifficultyConfig> = {
  easy: {
    label: 'Hostel Quickie (Easy)',
    badgeClass: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
    icon: '⚡',
  },
  medium: {
    label: 'Kettle Pro (Medium)',
    badgeClass: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
    icon: '🔥',
  },
  hard: {
    label: 'Maniac Masterpiece (Hard)',
    badgeClass: 'bg-rose-500/15 text-rose-400 border border-rose-500/30',
    icon: '🌶️',
  },
};

export const HOSTEL_TAGS = [
  { id: 'all', label: 'All Experiments', icon: '🍲' },
  { id: 'trending', label: 'Trending', icon: '🔥' },
  { id: 'hostel-hack', label: 'Hostel Hacks', icon: '⚡' },
  { id: 'under-50', label: 'Under ₹50', icon: '🪙' },
  { id: '3am-cravings', label: '3 AM Cravings', icon: '🌙' },
  { id: 'remix-trees', label: 'Remix Trees', icon: '🧬' },
] as const;

export function formatIndianCurrency(amount?: number | null): string {
  if (amount === undefined || amount === null) return '₹--';
  return `₹${amount}`;
}

export function formatCostRange(
  cost?: { min: number; max: number; currency: string } | null,
): string {
  if (!cost) return 'Budget Friendly';
  const symbol = cost.currency === 'INR' ? '₹' : `${cost.currency} `;
  if (cost.min === cost.max) {
    return `${symbol}${cost.min}`;
  }
  return `${symbol}${cost.min} - ${symbol}${cost.max}`;
}
