// Content-shaped placeholder shown while a page loads (reserves space, avoids layout jump).
export default function PageSkeleton() {
  return (
    <div className="p-8" aria-busy="true" aria-label="Loading">
      <div className="bz-skeleton mb-2 h-8 w-56" />
      <div className="bz-skeleton mb-8 h-4 w-80 max-w-full" />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map(i => <div key={i} className="bz-skeleton h-24" />)}
      </div>
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
        {[0, 1, 2, 3, 4].map(i => <div key={i} className="bz-skeleton h-10" />)}
      </div>
    </div>
  );
}
