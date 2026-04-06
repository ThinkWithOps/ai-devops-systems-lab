import Link from 'next/link';

const featuredDishes = [
  {
    name: 'Bistecca alla Fiorentina',
    description: '28-day aged T-bone steak grilled over charcoal, with rosemary potatoes',
    price: '48.00',
    category: 'Mains',
    emoji: '🥩',
  },
  {
    name: 'Risotto ai Funghi Porcini',
    description: 'Creamy Arborio rice with wild porcini mushrooms and aged Parmesan',
    price: '24.00',
    category: 'Mains',
    emoji: '🍚',
  },
  {
    name: 'Tiramisù della Casa',
    description: 'Classic house tiramisù with savoiardi, mascarpone, and Marsala wine',
    price: '9.00',
    category: 'Desserts',
    emoji: '🍮',
  },
];

const stats = [
  { label: 'Established', value: 'Est. 1987', emoji: '🏛️' },
  { label: 'Guest Rating', value: '4.8★ Rating', emoji: '⭐' },
  { label: 'Menu Items', value: '200+ Dishes', emoji: '📖' },
];

export default function HomePage() {
  return (
    <div className="bg-stone-950">
      {/* ─── Hero Section ─────────────────────────────────────────────── */}
      <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-950/80 via-stone-950 to-red-950/40 z-0" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-900/20 via-transparent to-transparent z-0" />

        {/* Decorative elements */}
        <div className="absolute top-20 left-10 text-8xl opacity-10 select-none">🍷</div>
        <div className="absolute bottom-20 right-10 text-8xl opacity-10 select-none">🫒</div>
        <div className="absolute top-40 right-20 text-6xl opacity-10 select-none">🍝</div>

        {/* Hero content */}
        <div className="relative z-10 text-center px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
          <div className="inline-block mb-4">
            <span className="text-6xl">🍝</span>
          </div>
          <h1 className="font-serif text-6xl sm:text-7xl lg:text-8xl font-bold text-amber-400 mb-4 tracking-tight">
            Bella Roma
          </h1>
          <p className="text-xl sm:text-2xl text-amber-200/80 font-light mb-2 italic">
            Authentic Italian Cuisine
          </p>
          <p className="text-stone-400 mb-10 text-base sm:text-lg max-w-2xl mx-auto">
            Experience the finest flavours of Italy in an intimate setting. From handmade pastas
            to aged Florentine steaks — every dish tells a story.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/menu"
              className="btn-primary text-base px-8 py-3 text-center"
            >
              View Our Menu
            </Link>
            <Link
              href="/reserve"
              className="btn-secondary text-base px-8 py-3 text-center"
            >
              Reserve a Table
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Stats Bar ────────────────────────────────────────────────── */}
      <section className="border-y border-stone-800 bg-stone-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-3 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl mb-1">{stat.emoji}</div>
                <div className="text-amber-300 font-bold text-lg sm:text-xl">{stat.value}</div>
                <div className="text-stone-500 text-xs sm:text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Featured Dishes ──────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="font-serif text-4xl font-bold text-amber-400 mb-3">
            Chef&apos;s Signature Dishes
          </h2>
          <p className="text-stone-400 text-lg">
            Crafted with seasonal ingredients sourced from Italian family farms
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {featuredDishes.map((dish) => (
            <div
              key={dish.name}
              className="card hover:border-amber-700 transition-all duration-300 group cursor-default"
            >
              {/* Dish header */}
              <div className="flex justify-between items-start mb-4">
                <span className="text-4xl">{dish.emoji}</span>
                <span className="badge-yellow text-xs">{dish.category}</span>
              </div>

              <h3 className="font-serif text-lg font-bold text-amber-300 mb-2 group-hover:text-amber-200 transition-colors">
                {dish.name}
              </h3>
              <p className="text-stone-400 text-sm mb-4 leading-relaxed">
                {dish.description}
              </p>

              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-amber-400">
                  £{dish.price}
                </span>
                <Link href="/order" className="btn-secondary text-xs px-3 py-1.5">
                  Order Now →
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <Link href="/menu" className="btn-primary text-base px-10 py-3">
            Explore Full Menu
          </Link>
        </div>
      </section>

      {/* ─── About / Ambiance Section ─────────────────────────────────── */}
      <section className="bg-stone-900/30 border-t border-stone-800 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="font-serif text-3xl font-bold text-amber-400 mb-4">
                A Taste of Rome in Every Bite
              </h2>
              <p className="text-stone-300 mb-4 leading-relaxed">
                Since 1987, Bella Roma has been welcoming guests to a world of authentic Italian
                flavours. Our chefs bring generations of culinary tradition to every plate,
                using recipes passed down from Italian famiglia kitchens.
              </p>
              <p className="text-stone-400 leading-relaxed">
                From our handmade tagliatelle to our 28-day aged Fiorentina steak, every dish is
                prepared with the finest seasonal ingredients and the utmost care.
              </p>
              <div className="mt-6 flex gap-4">
                <Link href="/reserve" className="btn-primary">
                  Reserve Tonight
                </Link>
                <Link href="/order" className="btn-secondary">
                  Order Online
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { emoji: '🥂', label: 'Curated Wine List', desc: '200+ Italian labels' },
                { emoji: '👨‍🍳', label: 'Master Chefs', desc: 'Trained in Bologna & Naples' },
                { emoji: '🌿', label: 'Seasonal Menu', desc: 'Farm-fresh ingredients' },
                { emoji: '🕯️', label: 'Private Dining', desc: 'Events & celebrations' },
              ].map((item) => (
                <div key={item.label} className="card-dark text-center p-4">
                  <div className="text-3xl mb-2">{item.emoji}</div>
                  <div className="text-amber-300 font-semibold text-sm">{item.label}</div>
                  <div className="text-stone-500 text-xs mt-1">{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── AI DevOps Demo Banner ────────────────────────────────────── */}
      <section className="bg-amber-950/30 border-t border-amber-900/50 py-4">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-amber-700 text-xs">
            🤖 <strong>AI DevOps Demo Environment</strong> — Visit{' '}
            <Link href="/operator" className="text-amber-500 hover:text-amber-400 underline">
              Operator Dashboard
            </Link>{' '}
            to inject failures and observe AI incident detection in action.
          </p>
        </div>
      </section>
    </div>
  );
}
