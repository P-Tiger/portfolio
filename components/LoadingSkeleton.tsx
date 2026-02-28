'use client';

export function SkeletonCard() {
  return (
    <div className="animate-fade-in bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <div className="h-3 bg-zinc-800 rounded w-24 mb-2 animate-pulse" />
      <div className="h-6 bg-zinc-800 rounded w-32 animate-pulse" />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-zinc-800">
      <div className="h-10 w-10 bg-zinc-800 rounded animate-pulse" />
      <div className="flex-1">
        <div className="h-4 bg-zinc-800 rounded w-32 mb-2 animate-pulse" />
        <div className="h-3 bg-zinc-800 rounded w-24 animate-pulse" />
      </div>
      <div className="h-6 bg-zinc-800 rounded w-28 animate-pulse" />
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
      <div className="h-4 bg-zinc-800 rounded w-32 mb-4 animate-pulse" />
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="h-8 bg-zinc-800 rounded flex-1 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function OverviewTabSkeleton() {
  return (
    <div className="tab-content space-y-6">
      {/* Portfolio Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </div>

      {/* Category Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonChart />
        <SkeletonChart />
      </div>

      {/* Asset Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-zinc-800">
          <div className="h-4 bg-zinc-800 rounded w-32 animate-pulse" />
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    </div>
  );
}

export function CategoryTabSkeleton() {
  return (
    <div className="tab-content space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </div>

      {/* Chart */}
      <SkeletonChart />

      {/* Asset Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-zinc-800">
          <div className="h-4 bg-zinc-800 rounded w-32 animate-pulse" />
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    </div>
  );
}
