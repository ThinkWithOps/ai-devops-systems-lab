import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Bella Roma Restaurant',
  description: 'Authentic Italian Cuisine — Fine dining in the heart of the city',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-stone-950 text-amber-100 min-h-screen">
        {/* ─── Header / Navigation ─────────────────────────────────────── */}
        <header className="bg-stone-950 border-b border-stone-800 sticky top-0 z-50 backdrop-blur-sm bg-stone-950/95">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <Link href="/" className="flex items-center gap-2 group">
                <span className="text-2xl">🍝</span>
                <div>
                  <div className="font-serif text-xl font-bold text-amber-400 group-hover:text-amber-300 transition-colors">
                    Bella Roma
                  </div>
                  <div className="text-xs text-stone-500 -mt-0.5 hidden sm:block">
                    Est. 1987
                  </div>
                </div>
              </Link>

              {/* Navigation Links */}
              <nav className="flex items-center gap-1">
                <Link
                  href="/menu"
                  className="px-3 py-2 text-sm text-stone-300 hover:text-amber-300 hover:bg-stone-800 rounded-lg transition-all duration-150"
                >
                  Menu
                </Link>
                <Link
                  href="/reserve"
                  className="px-3 py-2 text-sm text-stone-300 hover:text-amber-300 hover:bg-stone-800 rounded-lg transition-all duration-150"
                >
                  Reserve
                </Link>
                <Link
                  href="/order"
                  className="px-3 py-2 text-sm text-stone-300 hover:text-amber-300 hover:bg-stone-800 rounded-lg transition-all duration-150"
                >
                  Order
                </Link>
                <Link
                  href="/operator"
                  className="ml-2 px-3 py-2 text-sm font-medium text-amber-900 bg-amber-400 hover:bg-amber-300 rounded-lg transition-all duration-150"
                >
                  Operator
                </Link>
              </nav>
            </div>
          </div>
        </header>

        {/* ─── Main Content ─────────────────────────────────────────────── */}
        <main className="min-h-[calc(100vh-64px)]">
          {children}
        </main>

        {/* ─── Footer ───────────────────────────────────────────────────── */}
        <footer className="border-t border-stone-800 py-8 mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p className="text-stone-500 text-sm">
              &copy; 2024 Bella Roma Restaurant. AI DevOps Demo Application.
            </p>
            <p className="text-stone-600 text-xs mt-1">
              Powered by the AI DevOps Copilot platform &mdash; for observability and incident management demos.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
