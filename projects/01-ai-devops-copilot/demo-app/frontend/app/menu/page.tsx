'use client';

import { useState, useEffect } from 'react';
import { getMenu } from '@/lib/api';
import MenuCard from '@/components/MenuCard';

interface MenuItem {
  id: number;
  name: string;
  category: string;
  description: string;
  price: number;
  prep_time_minutes: number;
  is_available: boolean;
}

interface MenuData {
  categories: string[];
  items_by_category: Record<string, MenuItem[]>;
  total_items: number;
}

const CATEGORY_ORDER = ['Starters', 'Mains', 'Desserts', 'Drinks'];

export default function MenuPage() {
  const [menuData, setMenuData] = useState<MenuData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [loadTime, setLoadTime] = useState<number | null>(null);

  const fetchMenu = async () => {
    setLoading(true);
    setError(null);
    const startTime = Date.now();

    try {
      const data = await getMenu();
      setMenuData(data);
      setLoadTime(Date.now() - startTime);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load menu';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenu();
  }, []);

  // Collect all items for "All" tab
  const allItems: MenuItem[] = menuData
    ? CATEGORY_ORDER.flatMap((cat) => menuData.items_by_category[cat] ?? [])
    : [];

  const categories = ['All', ...CATEGORY_ORDER.filter((c) => menuData?.categories.includes(c))];

  const displayedItems =
    activeCategory === 'All'
      ? allItems
      : (menuData?.items_by_category[activeCategory] ?? []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="section-title text-3xl">Our Menu</h1>
        <p className="section-subtitle">
          Authentic Italian dishes prepared fresh daily
        </p>
        {loadTime !== null && (
          <p className={`text-xs mt-1 ${loadTime > 1500 ? 'text-red-400' : 'text-stone-500'}`}>
            {loadTime > 1500
              ? `⚠️ Menu loaded slowly (${loadTime}ms) — slow_menu failure may be active`
              : `Loaded in ${loadTime}ms`}
          </p>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-stone-400 text-sm">Loading menu…</p>
          <p className="text-stone-500 text-xs">
            If this takes more than 2 seconds, the slow_menu failure mode may be active.
          </p>
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="card border-red-800 bg-red-950/30 text-center py-12">
          <div className="text-4xl mb-3">⚠️</div>
          <h2 className="text-red-300 text-xl font-bold mb-2">Failed to Load Menu</h2>
          <p className="text-red-400/80 text-sm mb-4">{error}</p>
          <button onClick={fetchMenu} className="btn-primary">
            Retry
          </button>
        </div>
      )}

      {/* Menu content */}
      {!loading && !error && menuData && (
        <>
          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2 mb-8 border-b border-stone-800 pb-4">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                  activeCategory === cat
                    ? 'bg-amber-600 text-white'
                    : 'bg-stone-800 text-stone-300 hover:bg-stone-700 hover:text-amber-300'
                }`}
              >
                {cat}
                <span className="ml-1.5 text-xs opacity-60">
                  (
                  {cat === 'All'
                    ? allItems.length
                    : (menuData.items_by_category[cat]?.length ?? 0)}
                  )
                </span>
              </button>
            ))}
          </div>

          {/* Items Grid */}
          {displayedItems.length === 0 ? (
            <p className="text-stone-500 text-center py-12">
              No items available in this category.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {displayedItems.map((item) => (
                <MenuCard key={item.id} item={item} />
              ))}
            </div>
          )}

          {/* Footer info */}
          <div className="mt-10 text-center text-stone-500 text-sm">
            Showing {displayedItems.length} of {menuData.total_items} menu items
          </div>
        </>
      )}
    </div>
  );
}
