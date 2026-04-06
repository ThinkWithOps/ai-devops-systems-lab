import type { Metadata } from 'next'
import './globals.css'
import { Navbar } from '@/components/Navbar'

export const metadata: Metadata = {
  title: 'ShopFlow — Modern Ecommerce',
  description: 'A professional ecommerce platform built with Next.js and FastAPI',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0f0f0f] text-white min-h-screen">
        <Navbar />
        <main className="min-h-[calc(100vh-64px)]">
          {children}
        </main>
        <footer className="border-t border-[#2e2e2e] py-8 mt-16">
          <div className="max-w-7xl mx-auto px-4 text-center text-gray-500 text-sm">
            <p>ShopFlow Demo App — Built for AI GitHub Repo Explainer</p>
            <p className="mt-1 text-xs text-gray-600">
              Operator Dashboard: <a href="/operator" className="text-indigo-400 hover:text-indigo-300">/operator</a>
            </p>
          </div>
        </footer>
      </body>
    </html>
  )
}
