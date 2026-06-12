import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getSectionTitle } from '../../lib/pageTitles'
import { AppSidebar } from './AppSidebar'
import { AppTopBar } from './AppTopBar'

export function AppLayout() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useEffect(() => {
    setMobileNavOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!mobileNavOpen) {
      return
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMobileNavOpen(false)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [mobileNavOpen])

  return (
    <div className="flex min-h-svh bg-page">
      {mobileNavOpen ? (
        <button
          type="button"
          aria-label={t('common.closeNav')}
          className="fixed inset-0 z-40 bg-text-primary/40 md:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}

      <AppSidebar
        mobileOpen={mobileNavOpen}
        onNavigate={() => setMobileNavOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopBar
          title={getSectionTitle(pathname)}
          onMenuToggle={() => setMobileNavOpen((open) => !open)}
        />
        <main className="mx-auto w-full max-w-[1280px] flex-1 px-3 py-5 sm:px-4 lg:px-5 lg:py-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
