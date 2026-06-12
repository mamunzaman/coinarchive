import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth'
import { RoleBadge } from '../ui/RoleBadge'

const menuLinkClass =
  'block rounded-lg px-3 py-2 text-sm font-medium text-navy-muted transition-colors hover:bg-navy/5 hover:text-navy'

type AppUserMenuProps = {
  compact?: boolean
}

export function AppUserMenu({ compact = false }: AppUserMenuProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const menuRef = useRef<HTMLDivElement>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const role = user?.role === 'admin' ? 'admin' : 'contributor'

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleLogout() {
    setMenuOpen(false)
    await logout()
    navigate('/login', { replace: true })
  }

  if (!user) {
    return null
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setMenuOpen((open) => !open)}
        className={[
          'flex items-center gap-2 rounded-xl border border-border bg-white text-left transition-colors hover:border-navy/15 hover:bg-page',
          compact ? 'px-2 py-1.5' : 'px-3 py-2',
        ].join(' ')}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        aria-label={t('nav.accountMenu')}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
          {user.display_name.charAt(0).toUpperCase()}
        </span>
        {!compact ? (
          <span className="hidden min-w-0 sm:block">
            <span className="flex items-center gap-2">
              <span className="max-w-[8rem] truncate text-sm font-medium text-navy">
                {user.display_name}
              </span>
              <RoleBadge role={role} />
            </span>
          </span>
        ) : null}
        <span className="text-navy-muted" aria-hidden="true">
          ▾
        </span>
      </button>

      {menuOpen ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-border/80 bg-surface p-2 shadow-[var(--shadow-card)]"
        >
          <div className="mb-2 border-b border-border/60 px-3 pb-3">
            <p className="truncate text-sm font-medium text-navy">{user.display_name}</p>
            <p className="truncate text-xs text-navy-muted">{user.email}</p>
            <div className="mt-2">
              <RoleBadge role={role} />
            </div>
          </div>
          <Link
            to="/profile"
            role="menuitem"
            className={menuLinkClass}
            onClick={() => setMenuOpen(false)}
          >
            Profile
          </Link>
          <button
            type="button"
            role="menuitem"
            className={`${menuLinkClass} w-full text-left text-red-600 hover:bg-red-50 hover:text-red-700`}
            onClick={() => void handleLogout()}
          >
            Logout
          </button>
        </div>
      ) : null}
    </div>
  )
}
