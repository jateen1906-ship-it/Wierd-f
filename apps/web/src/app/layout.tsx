import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'WIERD | Social Food Evolution Platform',
  description:
    'A living food graph turning late-night hostel kettle experiments, crazy canteen mashups, and flavor science into reproducible food evolution.',
  keywords: [
    'hostel cooking',
    'food evolution',
    'living food graph',
    'food remix',
    'college recipes',
    'kettle recipes',
    'wierd food',
  ],
};

import { AuthProvider } from '@/context/AuthContext';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-wierd-dark text-wierd-cream min-h-screen flex flex-col selection:bg-wierd-flame selection:text-white">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
