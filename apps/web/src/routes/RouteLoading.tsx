export function RouteLoading() {
  return (
    <div
      className="flex min-h-[280px] items-center justify-center px-4 py-10"
      role="status"
      aria-live="polite"
    >
      <div className="rounded-3xl border border-rs-peach bg-white/85 px-6 py-4 text-center shadow-sm">
        <span
          className="inline-flex h-9 w-9 animate-pulse rounded-full bg-rs-gold-bg"
          aria-hidden="true"
        />
        <p className="mt-3 text-sm font-extrabold text-rs-ink">Loading...</p>
      </div>
    </div>
  );
}
