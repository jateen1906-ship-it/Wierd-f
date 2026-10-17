'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Frontend error caught by boundary:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center mb-4">
        <AlertTriangle className="w-8 h-8 animate-bounce" />
      </div>
      <h1 className="text-2xl font-black text-white mb-2">Something Went Wierd</h1>
      <p className="text-xs text-rose-300 max-w-sm mb-6 leading-relaxed">
        {error.message ||
          'An unexpected client error occurred while rendering the concoction interface.'}
      </p>
      <button
        onClick={() => reset()}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-900/40 transition-all"
      >
        <RefreshCw className="w-4 h-4" />
        <span>Try Again</span>
      </button>
    </div>
  );
}
