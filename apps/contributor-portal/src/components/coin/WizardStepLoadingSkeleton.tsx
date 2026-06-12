export function WizardStepLoadingSkeleton() {
  return (
    <div
      className="flex min-h-[12rem] flex-col gap-3 rounded-xl border border-border/40 bg-muted/20 p-4"
      role="status"
      aria-live="polite"
    >
      <div className="h-4 w-40 animate-pulse rounded-full bg-muted" />
      <div className="h-3 w-full animate-pulse rounded-full bg-muted/80" />
      <div className="h-3 w-5/6 animate-pulse rounded-full bg-muted/80" />
      <div className="mt-2 h-24 animate-pulse rounded-lg bg-muted/60" />
      <span className="sr-only">Loading form step…</span>
    </div>
  )
}

export function WizardFieldLoadingSkeleton() {
  return (
    <div className="h-24 animate-pulse rounded-xl bg-muted/40" aria-hidden />
  )
}
