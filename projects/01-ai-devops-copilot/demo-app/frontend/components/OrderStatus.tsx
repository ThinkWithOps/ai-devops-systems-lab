interface OrderStatusProps {
  status: string;
}

const STEPS = [
  { key: 'pending', label: 'Pending', icon: '🕐', description: 'Order received' },
  { key: 'preparing', label: 'Preparing', icon: '👨‍🍳', description: 'In the kitchen' },
  { key: 'ready', label: 'Ready', icon: '✅', description: 'Ready to serve' },
  { key: 'served', label: 'Served', icon: '🍽️', description: 'Enjoy your meal!' },
];

const STATUS_ORDER = ['pending', 'preparing', 'ready', 'served'];

export default function OrderStatus({ status }: OrderStatusProps) {
  const currentIndex = STATUS_ORDER.indexOf(status);
  const isCancelled = status === 'cancelled';

  if (isCancelled) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 bg-red-950/30 border border-red-800 rounded-lg">
        <span className="text-2xl">❌</span>
        <div>
          <div className="text-red-300 font-bold">Order Cancelled</div>
          <div className="text-red-500 text-xs">This order has been cancelled</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Step indicators */}
      <div className="flex items-start justify-between relative">
        {/* Connecting line */}
        <div className="absolute top-5 left-5 right-5 h-0.5 bg-stone-700 z-0">
          <div
            className="h-full bg-amber-500 transition-all duration-500"
            style={{
              width: currentIndex >= 0
                ? `${(currentIndex / (STEPS.length - 1)) * 100}%`
                : '0%',
            }}
          />
        </div>

        {STEPS.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isPending = index > currentIndex;

          return (
            <div key={step.key} className="flex flex-col items-center gap-2 z-10 flex-1">
              {/* Circle */}
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 transition-all ${
                  isCompleted
                    ? 'bg-amber-600 border-amber-500 text-white'
                    : isCurrent
                    ? 'bg-amber-950 border-amber-400 text-amber-300 ring-2 ring-amber-400/30'
                    : 'bg-stone-800 border-stone-600 text-stone-500'
                }`}
              >
                {isCompleted ? '✓' : step.icon}
              </div>

              {/* Label */}
              <div className="text-center">
                <div
                  className={`text-xs font-semibold ${
                    isCurrent
                      ? 'text-amber-300'
                      : isCompleted
                      ? 'text-amber-600'
                      : 'text-stone-500'
                  }`}
                >
                  {step.label}
                </div>
                {isCurrent && (
                  <div className="text-stone-500 text-xs mt-0.5 hidden sm:block">
                    {step.description}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Current status description */}
      <div className="mt-4 text-center">
        <span className="text-amber-400 font-medium capitalize">{status}</span>
        {currentIndex >= 0 && (
          <span className="text-stone-500 text-sm ml-2">
            — {STEPS[currentIndex]?.description}
          </span>
        )}
      </div>
    </div>
  );
}
