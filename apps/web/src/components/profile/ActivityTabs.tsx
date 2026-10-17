'use client';

import React from 'react';
import { Utensils, Flame, ThumbsUp, Sparkles } from 'lucide-react';

export type ActivityTabKey = 'experiments' | 'cooking-results' | 'votes' | 'reactions';

export interface TabConfig {
  key: ActivityTabKey;
  label: string;
  icon: React.ReactNode;
  count?: number;
}

interface ActivityTabsProps {
  activeTab: ActivityTabKey;
  onSelectTab: (tab: ActivityTabKey) => void;
  counts?: Partial<Record<ActivityTabKey, number>>;
}

export function ActivityTabs({ activeTab, onSelectTab, counts }: ActivityTabsProps) {
  const tabs: TabConfig[] = [
    {
      key: 'experiments',
      label: 'My Experiments',
      icon: <Utensils className="w-4 h-4 text-wierd-amber" />,
      count: counts?.experiments,
    },
    {
      key: 'cooking-results',
      label: 'Cooking Proofs',
      icon: <Flame className="w-4 h-4 text-amber-500" />,
      count: counts?.['cooking-results'],
    },
    {
      key: 'votes',
      label: 'My Votes',
      icon: <ThumbsUp className="w-4 h-4 text-sky-400" />,
      count: counts?.votes,
    },
    {
      key: 'reactions',
      label: 'Reactions Given',
      icon: <Sparkles className="w-4 h-4 text-purple-400" />,
      count: counts?.reactions,
    },
  ];

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-wierd-border/80 scrollbar-none">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            id={`tab-${tab.key}`}
            onClick={() => onSelectTab(tab.key)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
              isActive
                ? 'bg-gradient-to-r from-wierd-flame to-wierd-amber text-white shadow-flame'
                : 'bg-wierd-surface border border-wierd-border text-wierd-muted hover:text-wierd-cream hover:border-wierd-border/90'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                  isActive
                    ? 'bg-black/30 text-white'
                    : 'bg-wierd-card text-wierd-silver border border-wierd-border/60'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
