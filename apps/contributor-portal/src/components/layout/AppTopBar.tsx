import { useTranslation } from 'react-i18next'
import { AppUserMenu } from './AppUserMenu'
import { LanguageSwitcher } from './LanguageSwitcher'

type AppTopBarProps = {
  title: string
  onMenuToggle: () => void
}

export function AppTopBar({ title, onMenuToggle }: AppTopBarProps) {
  const { t } = useTranslation()

  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border/80 bg-surface/95 px-4 backdrop-blur-sm sm:h-16 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenuToggle}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-white text-navy transition-colors hover:bg-page md:hidden"
          aria-label={t('common.openNav')}
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75Zm0 5.5a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Zm0 5.5a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z"
              clipRule="evenodd"
            />
          </svg>
        </button>
        <div className="min-w-0">
          <p className="section-label hidden sm:inline">{t('common.contributorWorkspace')}</p>
          <h1 className="truncate font-serif text-lg font-semibold text-navy sm:text-xl">{title}</h1>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <LanguageSwitcher />
        <AppUserMenu />
      </div>
    </header>
  )
}
