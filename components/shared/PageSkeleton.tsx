/**
 * Shared streaming fallback. Rendered by each route's `loading.tsx` the moment
 * a navigation starts, so the app responds immediately instead of leaving the
 * previous page on screen while the server render finishes.
 */
export function PageSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="p-8 max-w-5xl mx-auto animate-pulse" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="flex items-center gap-3.5 mb-7">
        <div className="w-11 h-11 rounded-2xl bg-muted" />
        <div className="space-y-2">
          <div className="h-6 w-44 bg-muted rounded-lg" />
          <div className="h-3.5 w-32 bg-muted/70 rounded" />
        </div>
      </div>
      <div className="h-10 w-72 bg-muted/70 rounded-full mb-7" />
      <div className="space-y-3">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="h-24 bg-muted rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
