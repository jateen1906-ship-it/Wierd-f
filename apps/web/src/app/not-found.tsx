import Link from 'next/link';
import { Flame } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-wierd-flame/15 text-wierd-flame border border-wierd-flame/30 flex items-center justify-center text-2xl mb-4">
        <Flame className="w-8 h-8" />
      </div>
      <h1 className="text-3xl font-black text-white mb-2">404 - Concoction Lost</h1>
      <p className="text-xs text-wierd-muted max-w-sm mb-6">
        This recipe branch doesn&apos;t exist in the living food graph or has dissolved into the
        mess kitchen void.
      </p>
      <Link
        href="/"
        className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-wierd-flame to-wierd-amber shadow-flame hover:scale-[1.02] transition-transform"
      >
        Return to Feed
      </Link>
    </div>
  );
}
