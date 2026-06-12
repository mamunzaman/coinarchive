import { Link, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from './LanguageSwitcher'

export function AuthLayout() {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b border-border/80 bg-surface px-4 py-5 sm:px-6">
        <div className="mx-auto flex max-w-md items-center justify-between gap-4">
          <Link to="/login" className="inline-flex min-w-0 flex-1 flex-col text-center sm:text-left">
            <span className="font-serif text-xl font-semibold tracking-tight text-navy">
              {t('common.appName')}
            </span>
            <span className="section-label">{t('auth.contributorLabel')}</span>
          </Link>
          <LanguageSwitcher />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10 sm:px-6">
        <Outlet />
      </main>
    </div>
  )
}
