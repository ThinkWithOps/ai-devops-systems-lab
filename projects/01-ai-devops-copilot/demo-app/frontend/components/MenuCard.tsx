import Link from 'next/link';

interface MenuCardProps {
  item: {
    id: number;
    name: string;
    category: string;
    description: string;
    price: number;
    prep_time_minutes: number;
    is_available: boolean;
  };
}

const CATEGORY_EMOJI: Record<string, string> = {
  Starters: '🥗',
  Mains: '🍝',
  Desserts: '🍮',
  Drinks: '🍷',
};

const CATEGORY_COLOR: Record<string, string> = {
  Starters: 'badge-green',
  Mains: 'badge-yellow',
  Desserts: 'badge-blue',
  Drinks: 'badge-red',
};

export default function MenuCard({ item }: MenuCardProps) {
  const emoji = CATEGORY_EMOJI[item.category] ?? '🍽️';
  const categoryClass = CATEGORY_COLOR[item.category] ?? 'badge-blue';

  return (
    <div
      className={`card flex flex-col hover:border-amber-700 transition-all duration-200 group ${
        !item.is_available ? 'opacity-50' : ''
      }`}
    >
      {/* Card header */}
      <div className="flex items-start justify-between mb-3">
        <span className="text-3xl" aria-hidden="true">{emoji}</span>
        <div className="flex flex-col items-end gap-1">
          <span className={categoryClass}>{item.category}</span>
          {!item.is_available && (
            <span className="text-xs text-red-400 font-medium">Unavailable</span>
          )}
        </div>
      </div>

      {/* Name */}
      <h3 className="font-serif text-base font-bold text-amber-300 group-hover:text-amber-200 transition-colors mb-1 leading-snug">
        {item.name}
      </h3>

      {/* Description */}
      <p className="text-stone-400 text-xs leading-relaxed flex-1 mb-4">
        {item.description}
      </p>

      {/* Footer: price + prep time + CTA */}
      <div className="mt-auto">
        <div className="flex items-center justify-between mb-3">
          <span className="text-2xl font-bold text-amber-400">
            £{item.price.toFixed(2)}
          </span>
          <div className="flex items-center gap-1 text-stone-500 text-xs">
            <span>⏱</span>
            <span>{item.prep_time_minutes} min</span>
          </div>
        </div>

        {item.is_available ? (
          <Link
            href="/order"
            className="block w-full text-center btn-secondary text-xs py-2"
          >
            Add to Order →
          </Link>
        ) : (
          <div className="block w-full text-center bg-stone-800 text-stone-600 text-xs py-2 rounded-lg cursor-not-allowed">
            Currently Unavailable
          </div>
        )}
      </div>
    </div>
  );
}
