'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { loginFormSchema } from '@/lib/auth-schemas';
import { Flame, Mail, Lock, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || searchParams.get('returnTo') || '/';

  const { login, isAuthenticated } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already logged in, redirect
  React.useEffect(() => {
    if (isAuthenticated) {
      router.replace(redirectUrl);
    }
  }, [isAuthenticated, router, redirectUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    // Validate with Zod
    const validation = loginFormSchema.safeParse({ email, password });
    if (!validation.success) {
      const errors: Record<string, string> = {};
      validation.error.issues.forEach((issue) => {
        const path = issue.path[0];
        if (typeof path === 'string') {
          errors[path] = issue.message;
        }
      });
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    try {
      await login({
        email: validation.data.email,
        password: validation.data.password,
      });
      router.push(redirectUrl);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed. Please try again.';
      setServerError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md relative z-10 glass-panel rounded-3xl p-6 sm:p-8 border border-wierd-border shadow-2xl">
      {/* Brand Header */}
      <div className="text-center mb-6">
        <Link href="/" className="inline-flex items-center gap-2 group mb-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-wierd-flame to-wierd-amber flex items-center justify-center shadow-flame group-hover:scale-105 transition-transform">
            <Flame className="w-6 h-6 text-white animate-pulse" />
          </div>
          <span className="text-2xl font-black tracking-tight text-white">WIERD.</span>
        </Link>
        <h1 className="text-xl font-bold text-white mb-1">Enter the Mess Lab</h1>
        <p className="text-xs text-wierd-muted">
          Log in to log 2 AM concoctions, vote on experiments, and track food lineage.
        </p>
      </div>

      {/* Global Error Banner */}
      {serverError && (
        <div className="mb-5 p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{serverError}</span>
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email field */}
        <div>
          <label className="block text-xs font-semibold text-wierd-subtext mb-1.5">
            Email Address
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 absolute left-3.5 top-3 text-wierd-muted pointer-events-none" />
            <input
              type="email"
              placeholder="chef@hostel.edu"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) {
                  setFieldErrors((prev) => ({ ...prev, email: '' }));
                }
              }}
              disabled={isSubmitting}
              className={`w-full bg-wierd-surface border rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-wierd-muted/70 focus:outline-none transition-all ${
                fieldErrors.email
                  ? 'border-rose-500/80 focus:border-rose-500'
                  : 'border-wierd-border focus:border-wierd-flame/80 focus:ring-1 focus:ring-wierd-flame/40'
              }`}
            />
          </div>
          {fieldErrors.email && (
            <p className="text-[11px] text-rose-400 mt-1 pl-1">{fieldErrors.email}</p>
          )}
        </div>

        {/* Password field */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-wierd-subtext">Password</label>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 absolute left-3.5 top-3 text-wierd-muted pointer-events-none" />
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) {
                  setFieldErrors((prev) => ({ ...prev, password: '' }));
                }
              }}
              disabled={isSubmitting}
              className={`w-full bg-wierd-surface border rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-wierd-muted/70 focus:outline-none transition-all ${
                fieldErrors.password
                  ? 'border-rose-500/80 focus:border-rose-500'
                  : 'border-wierd-border focus:border-wierd-flame/80 focus:ring-1 focus:ring-wierd-flame/40'
              }`}
            />
          </div>
          {fieldErrors.password && (
            <p className="text-[11px] text-rose-400 mt-1 pl-1">{fieldErrors.password}</p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full mt-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-wierd-flame to-wierd-amber shadow-flame hover:opacity-95 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 transition-all"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Authenticating Chef...</span>
            </>
          ) : (
            <>
              <span>Sign In to Kitchen</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Footer Navigation */}
      <div className="mt-6 pt-4 border-t border-wierd-border/60 text-center">
        <p className="text-xs text-wierd-muted">
          New to the hostel food revolution?{' '}
          <Link
            href="/register"
            className="text-wierd-flame font-semibold hover:underline transition-colors"
          >
            Claim your apron (Register)
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-wierd-dark relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-wierd-flame/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-wierd-amber/10 rounded-full blur-3xl pointer-events-none" />

      <Suspense
        fallback={
          <div className="w-full max-w-md p-8 glass-panel rounded-3xl text-center text-xs text-wierd-muted">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-wierd-flame" />
            <span>Loading Mess Lab Portal...</span>
          </div>
        }
      >
        <LoginFormContent />
      </Suspense>
    </div>
  );
}
