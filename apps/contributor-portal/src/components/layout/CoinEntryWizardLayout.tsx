import { Outlet } from 'react-router-dom'
import { GuardedLink } from '../../contexts/UnsavedChangesContext'

export function CoinEntryWizardLayout() {
  return (
    <div className="flex min-h-svh flex-col bg-page">
      <header className="sticky top-0 z-50 border-b border-border/70 bg-surface">
        <div className="mx-auto flex h-12 max-w-[1440px] items-center justify-between gap-3 px-4 sm:h-14 sm:gap-4 sm:px-6">
          <GuardedLink to="/dashboard" className="flex min-w-0 items-center gap-2 sm:gap-2.5">
            <span className="truncate font-serif text-base font-semibold tracking-tight text-navy sm:text-lg">
              CoinArchive
            </span>
            <span className="section-label shrink-0 rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px]">
              Archival Entry
            </span>
          </GuardedLink>
          <GuardedLink
            to="/dashboard"
            className="shrink-0 rounded-lg border border-border bg-white px-3 py-1.5 text-sm font-semibold text-navy transition-colors hover:border-navy/15 hover:bg-muted sm:py-2"
          >
            Exit to dashboard
          </GuardedLink>
        </div>
      </header>
      <main className="w-full min-w-0 flex-1 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  )
}
