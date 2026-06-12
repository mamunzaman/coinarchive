import { Bell, CheckCircle2, FilePenLine, Info, TriangleAlert, XCircle } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type {
  ContributorNotification,
  ContributorNotificationSeverity,
} from '../../lib/notifications'
import { Card } from '../ui/Card'

type DashboardNotificationCenterProps = {
  notifications: ContributorNotification[]
  readIds: Set<string>
  isLoading?: boolean
  onMarkRead: (id: string) => void
  onMarkAllRead: () => void
}

type DashboardNotificationBellProps = {
  notifications: ContributorNotification[]
  readIds: Set<string>
  onMarkRead: (id: string) => void
  onMarkAllRead: () => void
}

function getSeverityClasses(severity: ContributorNotificationSeverity): string {
  switch (severity) {
    case 'success':
      return 'bg-primary/10 text-primary ring-primary/20'
    case 'warning':
      return 'bg-amber-50 text-amber-700 ring-amber-200'
    case 'danger':
      return 'bg-red-50 text-red-700 ring-red-200'
    case 'info':
    default:
      return 'bg-slate-100 text-slate-600 ring-slate-200'
  }
}

function NotificationIcon({ notification }: { notification: ContributorNotification }) {
  const className = 'h-4 w-4'

  if (notification.severity === 'success') {
    return <CheckCircle2 className={className} aria-hidden />
  }

  if (notification.severity === 'danger') {
    return <XCircle className={className} aria-hidden />
  }

  if (notification.severity === 'warning') {
    return <TriangleAlert className={className} aria-hidden />
  }

  if (notification.type === 'draft') {
    return <FilePenLine className={className} aria-hidden />
  }

  return <Info className={className} aria-hidden />
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => !element.hasAttribute('disabled') && element.tabIndex !== -1)
}

type PopoverPosition = {
  top: number
  left: number
  width: number
}

function computePopoverPosition(button: HTMLElement): PopoverPosition {
  const rect = button.getBoundingClientRect()
  const viewportWidth = window.innerWidth
  const width = Math.min(400, viewportWidth - 32)
  let left = rect.right - width

  if (left < 16) {
    left = 16
  }

  const maxLeft = viewportWidth - width - 16
  if (left > maxLeft) {
    left = Math.max(16, maxLeft)
  }

  return {
    top: rect.bottom + 12,
    left,
    width,
  }
}

export function DashboardNotificationCenter({
  notifications,
  readIds,
  isLoading = false,
  onMarkRead,
  onMarkAllRead,
}: DashboardNotificationCenterProps) {
  const { t } = useTranslation()
  const [showAll, setShowAll] = useState(false)
  const visibleNotifications = showAll ? notifications : notifications.slice(0, 5)
  const unreadCount = useMemo(
    () => notifications.filter((notification) => !readIds.has(notification.id)).length,
    [notifications, readIds],
  )

  return (
    <Card id="dashboard-notification-center" className="!p-4 sm:!p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Bell className="h-4 w-4" aria-hidden />
            {unreadCount > 0 ? (
              <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-600 px-1.5 py-0.5 text-center text-[10px] font-semibold leading-none text-white">
                {unreadCount}
              </span>
            ) : null}
          </span>
          <div>
            <h2 className="font-serif text-base font-semibold text-navy sm:text-lg">
              {t('notifications.centerTitle')}
            </h2>
            <p className="text-sm text-navy-muted">{t('notifications.centerSubtitle')}</p>
          </div>
        </div>

        {unreadCount > 0 ? (
          <button
            type="button"
            onClick={onMarkAllRead}
            className="inline-flex min-h-9 items-center justify-center rounded-lg border border-border bg-white px-3 text-xs font-semibold text-navy transition-colors hover:border-primary/30 hover:bg-primary/5"
          >
            {t('notifications.markAllRead')}
          </button>
        ) : null}
      </div>

      {isLoading ? (
        <div className="mt-4 space-y-2">
          {[1, 2, 3].map((row) => (
            <div key={row} className="h-14 animate-pulse rounded-xl bg-panel" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <p className="mt-4 rounded-xl border border-border/60 bg-page px-3 py-4 text-sm text-navy-muted">
          {t('notifications.empty')}
        </p>
      ) : (
        <>
          <ul className="mt-4 divide-y divide-border/60">
            {visibleNotifications.map((notification) => {
              const isRead = readIds.has(notification.id)

              return (
                <li key={notification.id} className="py-2.5">
                  <Link
                    to={notification.href}
                    onClick={() => onMarkRead(notification.id)}
                    className={[
                      'flex min-w-0 items-start gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-page',
                      isRead ? 'opacity-75' : '',
                    ].join(' ')}
                  >
                    <span
                      className={[
                        'mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1',
                        getSeverityClasses(notification.severity),
                      ].join(' ')}
                    >
                      <NotificationIcon notification={notification} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex min-w-0 items-center gap-2">
                        {!isRead ? (
                          <span className="h-2 w-2 shrink-0 rounded-full bg-primary" aria-label={t('notifications.unreadNotification')} />
                        ) : null}
                        <span className="truncate text-sm font-semibold text-navy">
                          {notification.title}
                        </span>
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-navy-muted">
                        {notification.message}
                      </span>
                    </span>
                    <span className="shrink-0 text-right text-[11px] text-navy-muted">
                      {notification.formattedDate}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>

          {notifications.length > 5 ? (
            <button
              type="button"
              onClick={() => setShowAll((current) => !current)}
              className="mt-3 text-xs font-semibold text-primary transition-colors hover:text-primary-hover"
            >
              {showAll ? t('notifications.showLatest5') : t('notifications.viewAllCount', { count: notifications.length })}
            </button>
          ) : null}
        </>
      )}
    </Card>
  )
}

export function DashboardNotificationBell({
  notifications,
  readIds,
  onMarkRead,
  onMarkAllRead,
}: DashboardNotificationBellProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [popoverPosition, setPopoverPosition] = useState<PopoverPosition | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const unreadCount = notifications.filter((notification) => !readIds.has(notification.id)).length
  const latestNotifications = notifications.slice(0, 8)

  function updatePopoverPosition() {
    if (buttonRef.current) {
      setPopoverPosition(computePopoverPosition(buttonRef.current))
    }
  }

  function closePopover() {
    setOpen(false)
    setPopoverPosition(null)
  }

  useEffect(() => {
    if (!open) {
      return
    }

    updatePopoverPosition()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closePopover()
        buttonRef.current?.focus()
        return
      }

      if (event.key === 'Tab' && dialogRef.current) {
        const focusableElements = getFocusableElements(dialogRef.current)
        const firstElement = focusableElements[0] ?? dialogRef.current
        const lastElement = focusableElements[focusableElements.length - 1] ?? dialogRef.current

        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault()
          lastElement.focus()
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault()
          firstElement.focus()
        }
      }
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node
      if (buttonRef.current?.contains(target) || dialogRef.current?.contains(target)) {
        return
      }

      closePopover()
    }

    function handleScroll() {
      closePopover()
    }

    function handleResize() {
      updatePopoverPosition()
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('scroll', handleScroll, { passive: true, capture: true })
    window.addEventListener('resize', handleResize)
    requestAnimationFrame(() => {
      const firstElement = dialogRef.current ? getFocusableElements(dialogRef.current)[0] : null
      ;(firstElement ?? dialogRef.current)?.focus()
    })

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('resize', handleResize)
    }
  }, [open])

  const popover =
    open && popoverPosition
      ? createPortal(
          <div
            ref={dialogRef}
            role="dialog"
            aria-label={t('notifications.popoverLabel')}
            tabIndex={-1}
            style={{
              position: 'fixed',
              top: popoverPosition.top,
              left: popoverPosition.left,
              width: popoverPosition.width,
              zIndex: 50,
            }}
            className="flex max-h-[500px] flex-col overflow-hidden rounded-2xl border border-border/80 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.16)] outline-none"
          >
            <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
              <div className="flex min-w-0 items-center gap-2">
                <p className="font-serif text-base font-semibold text-navy">{t('notifications.title')}</p>
                {unreadCount > 0 ? (
                  <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                    {t('notifications.unread', { count: unreadCount })}
                  </span>
                ) : null}
              </div>
              <button
                type="button"
                onClick={onMarkAllRead}
                disabled={unreadCount === 0}
                className="shrink-0 text-xs font-semibold text-primary transition hover:text-primary-hover disabled:cursor-not-allowed disabled:text-navy-muted/60"
              >
                {t('notifications.markAllRead')}
              </button>
            </div>

            <div className="min-h-0 overflow-y-auto p-2">
              {latestNotifications.length === 0 ? (
                <p className="rounded-xl bg-page px-3 py-4 text-sm text-navy-muted">
                  {t('notifications.empty')}
                </p>
              ) : (
                <ul className="divide-y divide-border/60">
                  {latestNotifications.map((notification) => {
                    const isRead = readIds.has(notification.id)

                    return (
                      <li key={notification.id} className="py-1">
                        <Link
                          to={notification.href}
                          onClick={() => {
                            onMarkRead(notification.id)
                            closePopover()
                          }}
                          className={[
                            'flex min-w-0 items-start gap-2.5 rounded-xl px-2 py-2 transition-colors hover:bg-page focus:outline-none focus:ring-2 focus:ring-primary/20',
                            isRead ? 'opacity-75' : '',
                          ].join(' ')}
                        >
                          <span
                            className={[
                              'mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-1',
                              getSeverityClasses(notification.severity),
                            ].join(' ')}
                          >
                            <NotificationIcon notification={notification} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex min-w-0 items-center gap-1.5">
                              {!isRead ? (
                                <span
                                  className="h-2 w-2 shrink-0 rounded-full bg-primary"
                                  aria-label={t('notifications.unreadNotification')}
                                />
                              ) : null}
                              <span className="truncate text-sm font-semibold text-navy">
                                {notification.title}
                              </span>
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-navy-muted">
                              {notification.message}
                            </span>
                          </span>
                          <span className="shrink-0 pt-0.5 text-right text-[11px] text-navy-muted">
                            {notification.formattedDate}
                          </span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            <div className="border-t border-border/60 px-4 py-3">
              <a
                href="#dashboard-notification-center"
                onClick={() => closePopover()}
                className="inline-flex min-h-9 w-full items-center justify-center rounded-xl bg-page px-3 text-xs font-semibold text-primary transition hover:bg-primary/10 hover:text-primary-hover focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {t('notifications.viewAll')}
              </a>
            </div>
          </div>,
          document.body,
        )
      : null

  return (
    <div className="relative flex w-full justify-end sm:w-auto">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          if (open) {
            closePopover()
            return
          }

          updatePopoverPosition()
          setOpen(true)
        }}
        className="relative inline-flex min-h-11 w-11 items-center justify-center rounded-xl border border-border bg-white text-navy transition-colors hover:border-primary/30 hover:bg-primary/5"
        aria-label={t('notifications.openLabel', {
          suffix: unreadCount > 0 ? t('notifications.unreadSuffix', { count: unreadCount }) : '',
        })}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Bell className="h-5 w-5" aria-hidden />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-600 px-1.5 py-0.5 text-center text-[10px] font-semibold leading-none text-white">
            {unreadCount}
          </span>
        ) : null}
      </button>

      {popover}
    </div>
  )
}

