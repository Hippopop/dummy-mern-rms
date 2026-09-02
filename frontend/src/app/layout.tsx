import type { Metadata } from 'next';
import { Inter, Oswald } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/providers/auth-provider';
import { QueryProvider } from '@/providers/query-provider';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
// Condensed grotesque for titles and figures — the technical-drawing voice.
const oswald = Oswald({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-display', display: 'swap' });

export const metadata: Metadata = {
  title: 'Restaurant OS',
  description: 'Staff-facing restaurant operations',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${oswald.variable}`}>
      <body className="antialiased">
        <QueryProvider>
          <AuthProvider>{children}</AuthProvider>
        </QueryProvider>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
