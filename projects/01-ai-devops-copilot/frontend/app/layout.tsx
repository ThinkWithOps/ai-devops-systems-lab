import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import LiveLogStrip from '@/components/layout/LiveLogStrip';

export const metadata: Metadata = {
  title: 'AI DevOps Copilot',
  description: 'Conversational AI for DevOps engineers — diagnose delivery and infrastructure problems',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 antialiased">
        <div className="flex flex-col h-screen overflow-hidden">
          {/* Top header */}
          <Header />

          {/* Main content area: sidebar + page */}
          <div className="flex flex-1 overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto bg-slate-950 pb-8">
              {children}
            </main>
          </div>

          {/* Bottom live log strip */}
          <LiveLogStrip />
        </div>
      </body>
    </html>
  );
}
