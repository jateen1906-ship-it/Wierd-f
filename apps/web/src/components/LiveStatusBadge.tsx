'use client';

import React, { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';

export function LiveStatusBadge() {
  const [status, setStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [pingTime, setPingTime] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      const start = performance.now();
      try {
        const res = await apiClient.checkHealth();
        if (mounted) {
          if (res.status === 'ok') {
            setStatus('connected');
            setPingTime(Math.round(performance.now() - start));
          } else {
            setStatus('disconnected');
          }
        }
      } catch {
        if (mounted) {
          setStatus('disconnected');
        }
      }
    };

    check();
    const interval = setInterval(check, 15000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div
      className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border glass-panel transition-all"
      title={
        status === 'connected'
          ? `Connected to NestJS API (${pingTime}ms)`
          : status === 'checking'
            ? 'Pinging API...'
            : 'Backend Disconnected'
      }
    >
      <span className="relative flex h-2 w-2">
        {status === 'connected' && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        )}
        <span
          className={`relative inline-flex rounded-full h-2 w-2 ${
            status === 'connected'
              ? 'bg-emerald-500'
              : status === 'checking'
                ? 'bg-amber-400 animate-pulse'
                : 'bg-rose-500'
          }`}
        ></span>
      </span>
      <span className="text-wierd-subtext hidden sm:inline">
        {status === 'connected'
          ? `Backend Live ${pingTime ? `(${pingTime}ms)` : ''}`
          : status === 'checking'
            ? 'Checking API...'
            : 'API Offline'}
      </span>
      <span className="text-wierd-subtext sm:hidden">
        {status === 'connected' ? 'Live' : 'Offline'}
      </span>
    </div>
  );
}
