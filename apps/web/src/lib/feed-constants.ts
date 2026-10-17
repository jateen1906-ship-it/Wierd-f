import type { ExperimentSortMode } from './api-client';

export type FeedSortMode = ExperimentSortMode;
export type BranchFilterMode = 'all' | 'roots' | 'remixes';

export interface FeedSortOptionDef {
  id: FeedSortMode;
  label: string;
  iconName: 'flame' | 'clock' | 'git-branch' | 'chef-hat' | 'thumbs-up';
  description: string;
}

export const FEED_SORT_OPTIONS: FeedSortOptionDef[] = [
  {
    id: 'trending',
    label: 'Trending',
    iconName: 'flame',
    description: 'Most active & viral hostel recipes',
  },
  {
    id: 'recent',
    label: 'Newest',
    iconName: 'clock',
    description: 'Freshly concocted experiments',
  },
  {
    id: 'remixes',
    label: 'Most Remixed',
    iconName: 'git-branch',
    description: 'Deepest evolution branches',
  },
  {
    id: 'cooks',
    label: 'Most Cooked',
    iconName: 'chef-hat',
    description: 'Real-world kitchen tested',
  },
  {
    id: 'votes',
    label: 'Top Voted',
    iconName: 'thumbs-up',
    description: 'Campus crowd favorites',
  },
];

export interface BranchOptionDef {
  id: BranchFilterMode;
  label: string;
  icon: string;
}

export const BRANCH_OPTIONS: BranchOptionDef[] = [
  { id: 'all', label: 'All Concoctions', icon: '🍲' },
  { id: 'roots', label: 'Root Originals', icon: '🌱' },
  { id: 'remixes', label: 'Remixes Only', icon: '🧬' },
];

export interface DifficultyOptionDef {
  id: string;
  label: string;
}

export const DIFFICULTY_OPTIONS: DifficultyOptionDef[] = [
  { id: 'all', label: 'All' },
  { id: 'easy', label: '⚡ Easy' },
  { id: 'medium', label: '🔥 Medium' },
  { id: 'hard', label: '🌶️ Hard' },
];
