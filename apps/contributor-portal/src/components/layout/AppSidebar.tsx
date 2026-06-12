import {
  ClipboardList,
  FileUp,
  LayoutDashboard,
  LogOut,
  Plus,
  ShieldCheck,
  User,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useUnsavedChanges } from '../../contexts/UnsavedChangesContext'
import { useAuth } from '../../hooks/useAuth'
import { ICON_NAV } from '../ui/ActionControls'

type NavItem = {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

function NavIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center" aria-hidden="true">
      <Icon className={ICON_NAV} />
    </span>
  )
}

function useContributorNavItems(): NavItem[] {
  const { t } = useTranslation()

  return [
    { to: '/dashboard', label: t('nav.dashboard'), end: true, icon: LayoutDashboard },
    { to: '/new-coin', label: t('nav.newCoin'), icon: Plus },
    { to: '/my-submissions', label: t('nav.mySubmissions'), icon: ClipboardList },
    { to: '/profile', label: t('nav.profile'), icon: User },
  ]
}

function useAdminNavItems(): NavItem[] {
  const { t } = useTranslation()

  return [
    { to: '/admin', label: t('nav.adminDashboard'), end: true, icon: ShieldCheck },
    { to: '/admin/submissions', label: t('nav.submissions'), icon: ClipboardList },
    { to: '/admin/approve', label: t('nav.approveUsers'), end: true, icon: Users },
    { to: '/admin/import', label: t('nav.importCoins'), end: true, icon: FileUp },
  ]
}

function sidebarLinkClass(isActive: boolean) {
  return [
    'flex min-h-12 items-center gap-3 rounded-r-lg border-l-[3px] text-sm font-medium transition-colors',
    'px-3 py-3 md:justify-center lg:justify-start lg:px-4',
    isActive
      ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/10'
      : 'border-transparent text-navy-muted hover:border-primary/25 hover:bg-primary/5 hover:text-navy',
  ].join(' ')
}

type AppSidebarProps = {
  mobileOpen: boolean
  onNavigate: () => void
}

export function AppSidebar({ mobileOpen, onNavigate }: AppSidebarProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const contributorNavItems = useContributorNavItems()
  const adminNavItems = useAdminNavItems()
  const { isDirty, requestNavigation } = useUnsavedChanges()
  const role = user?.role === 'admin' ? 'admin' : 'contributor'
  const isAdmin = role === 'admin' && user?.status === 'approved'
  const homePath = isAdmin ? '/admin' : '/dashboard'

  async function handleLogout() {
    onNavigate()
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <aside
      className={[
        'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-surface transition-transform duration-200',
        'md:static md:z-auto md:w-[72px] md:translate-x-0 lg:w-64',
        mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
      ].join(' ')}
      aria-label={t('nav.mainNavigation')}
    >
      <div className="border-b border-border/60 px-4 py-6 md:px-2 lg:px-4">
        <NavLink
          to={homePath}
          onClick={(event) => {
            if (isDirty) {
              event.preventDefault()
              requestNavigation(homePath)
            }
            onNavigate()
          }}
          className="flex items-center gap-3"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-serif text-lg font-semibold text-primary">
            CE
          </span>
          <span className="min-w-0 md:hidden lg:block">
            <span className="block font-serif text-base font-semibold leading-tight text-navy">
              CoinEuropa
            </span>
            <span className="mt-0.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-navy-muted">
              {isAdmin ? t('common.adminArchive') : t('common.archive')}
            </span>
          </span>
        </NavLink>
      </div>

      <nav className="flex-1 space-y-1.5 px-2 py-5 lg:px-3">
        {isAdmin ? (
          <>
            <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-navy-muted md:hidden lg:block">
              {t('nav.administration')}
            </p>
            {adminNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                title={item.label}
                aria-label={item.label}
                onClick={(event) => {
                  if (isDirty) {
                    event.preventDefault()
                    requestNavigation(item.to)
                  }
                  onNavigate()
                }}
                className={({ isActive }) => sidebarLinkClass(isActive)}
              >
                <NavIcon icon={item.icon} />
                <span className="truncate md:hidden lg:inline">{item.label}</span>
              </NavLink>
            ))}
            <div className="my-3 border-t border-border/50 md:mx-1 lg:mx-2" />
            <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-navy-muted md:hidden lg:block">
              {t('common.contributor')}
            </p>
          </>
        ) : null}

        {contributorNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            title={item.label}
            aria-label={item.label}
            onClick={(event) => {
              if (isDirty) {
                event.preventDefault()
                requestNavigation(item.to)
              }
              onNavigate()
            }}
            className={({ isActive }) => sidebarLinkClass(isActive)}
          >
            <NavIcon icon={item.icon} />
            <span className="truncate md:hidden lg:inline">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-border/60 p-3">
        <button
          type="button"
          onClick={() => void handleLogout()}
          title={t('common.logout')}
          aria-label={t('common.logout')}
          className="flex min-h-12 w-full items-center gap-3 rounded-r-lg border-l-[3px] border-transparent px-3 py-3 text-sm font-medium text-navy-muted transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-700 md:justify-center lg:justify-start lg:px-4"
        >
          <NavIcon icon={LogOut} />
          <span className="md:hidden lg:inline">{t('common.logout')}</span>
        </button>
      </div>
    </aside>
  )
}
