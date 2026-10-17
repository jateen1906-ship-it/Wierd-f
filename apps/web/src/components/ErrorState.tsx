'use client';

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="rounded-3xl bg-rose-950/20 border border-rose-500/30 p-8 text-center flex flex-col items-center justify-center max-w-lg mx-auto my-8">
      <div className="w-12 h-12 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center mb-4">
        <AlertTriangle className="w-6 h-6 animate-bounce" />
      </div>

      <h3 className="text-lg font-bold text-white mb-2">Concoction Stream Interrupted</h3>

      <p className="text-xs text-rose-300/80 mb-6 max-w-md leading-relaxed">
        {message ||
          'Unable to communicate with the Wierd backend API server. Make sure PostgreSQL, Redis, and the NestJS API container are healthy.'}
      </p>

      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 transition-colors shadow-lg shadow-rose-900/40"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry Connection</span>
        </button>
      )}
    </div>
  );
}
