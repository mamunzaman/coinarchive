import {
  AlertCircle,
  Check,
  ChevronDown,
  RefreshCw,
  Search,
  Shield,
  ShieldOff,
  UserCheck,
  UserX,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  ApiError,
  approveContributor,
  setContributorRole,
  type ContributorRole,
} from '../lib/api'
import {
  approveAdminContributor,
  formatAdminEndpointError,
  getAdminContributors,
  rejectAdminContributor,
  setAdminContributorRole,
  type AdminContributorListItem,
} from '../lib/adminApi'
import { useAuth } from '../hooks/useAuth'

// ── Types ────────────────────────────────────────────────────────────────────

type StatusFilter = 'all' | 'pending' | 'approved' | 'admin' | 'rejected'

type ConfirmAction =
  | { type: 'approve'; user: AdminContributorListItem }
  | { type: 'reject'; user: AdminContributorListItem }
  | { type: 'promote'; user: AdminContributorListItem }
  | { type: 'demote'; user: AdminContributorListItem }

// ── Helpers ──────────────────────────────────────────────────────────────────

function isPendingContributorStatus(status: string | undefined): boolean {
  return status === 'pending' || status === 'pending_approval'
}

function getUserDisplayName(user: AdminContributorListItem): string {
  return user.display_name?.trim() || user.email?.trim() || `User #${user.id}`
}

function getUserInitial(user: AdminContributorListItem): string {
  const name = getUserDisplayName(user)
  return name.charAt(0).toUpperCase()
}

function getStatusLabel(user: AdminContributorListItem): string {
  if (user.role === 'admin') return 'Admin'
  switch (user.status) {
    case 'pending':
      return 'Pending'
    case 'pending_approval':
      return 'Pending approval'
    case 'approved':
      return 'Approved'
    case 'rejected':
      return 'Rejected'
    default:
      return user.status ?? 'Unknown'
  }
}

function StatusPill({ user }: { user: AdminContributorListItem }) {
  const isAdmin = user.role === 'admin'
  const status = user.status

  const cls = isAdmin
    ? 'bg-purple-50 text-purple-700 ring-1 ring-purple-200'
    : status === 'approved'
      ? 'bg-teal-50 text-teal-700 ring-1 ring-teal-200'
      : isPendingContributorStatus(status)
        ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
        : status === 'rejected'
          ? 'bg-red-50 text-red-600 ring-1 ring-red-200'
          : 'bg-slate-100 text-slate-600'

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${cls}`}>
      {getStatusLabel(user)}
    </span>
  )
}

function UserAvatar({ user }: { user: AdminContributorListItem }) {
  const isAdmin = user.role === 'admin'
  return (
    <div
      className={[
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white',
        isAdmin ? 'bg-purple-500' : 'bg-teal-500',
      ].join(' ')}
    >
      {getUserInitial(user)}
    </div>
  )
}

// ── Confirmation dialog ───────────────────────────────────────────────────────

function ConfirmDialog({
  action,
  isProcessing,
  error,
  onConfirm,
  onCancel,
}: {
  action: ConfirmAction
  isProcessing: boolean
  error: string | null
  onConfirm: () => void
  onCancel: () => void
}) {
  const name = getUserDisplayName(action.user)

  const config = {
    approve: {
      title: 'Approve contributor',
      body: `Allow ${name} to sign in and submit coins.`,
      confirmLabel: 'Approve',
      confirmClass: 'bg-teal-500 hover:bg-teal-600 text-white',
    },
    reject: {
      title: 'Reject contributor',
      body: `Block ${name} from accessing the platform. This can be undone later by approving them.`,
      confirmLabel: 'Reject',
      confirmClass: 'bg-red-500 hover:bg-red-600 text-white',
    },
    promote: {
      title: 'Promote to admin',
      body: `Give ${name} full admin access. They must sign in again for this to take effect.`,
      confirmLabel: 'Promote to admin',
      confirmClass: 'bg-purple-600 hover:bg-purple-700 text-white',
    },
    demote: {
      title: 'Demote to contributor',
      body: `Remove admin access from ${name}. They must sign in again for this to take effect.`,
      confirmLabel: 'Demote',
      confirmClass: 'bg-amber-500 hover:bg-amber-600 text-white',
    },
  }[action.type]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm rounded-2xl border border-[rgba(15,23,42,0.08)] bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.2)]">
        <h2 className="font-serif text-lg font-semibold text-slate-800">{config.title}</h2>
        <p className="mt-2 text-sm text-slate-500">{config.body}</p>

        {error ? (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
            {error}
          </div>
        ) : null}

        <div className="mt-5 flex gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isProcessing}
            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold shadow-sm transition-colors disabled:opacity-50 ${config.confirmClass}`}
          >
            {isProcessing ? 'Processing…' : config.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Overview stat cards ───────────────────────────────────────────────────────

function StatCard({
  label,
  count,
  color,
  active,
  onClick,
}: {
  label: string
  count: number
  color: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex-1 rounded-2xl border p-4 text-left transition-all',
        active
          ? 'border-teal-300 bg-teal-50 shadow-[0_0_0_2px_rgba(20,184,166,0.2)]'
          : 'border-[rgba(15,23,42,0.08)] bg-white hover:border-slate-200 hover:shadow-sm',
      ].join(' ')}
    >
      <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">{label}</p>
      <p className={`mt-1.5 font-serif text-3xl font-semibold ${color}`}>{count}</p>
    </button>
  )
}

// ── Row action buttons ────────────────────────────────────────────────────────

function RowActions({
  user,
  actionUserId,
  onAction,
}: {
  user: AdminContributorListItem
  actionUserId: number | null
  onAction: (action: ConfirmAction) => void
}) {
  const busy = actionUserId === user.id
  const isPending = isPendingContributorStatus(user.status)
  const isApproved = user.status === 'approved' && user.role !== 'admin'
  const isAdmin = user.role === 'admin'
  const isRejected = user.status === 'rejected'

  const btnBase = 'inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-[11px] font-semibold transition-colors disabled:opacity-40'

  return (
    <div className="flex flex-wrap items-center gap-1">
      {(isPending || isRejected) ? (
        <button
          type="button"
          title="Approve"
          disabled={busy}
          onClick={() => onAction({ type: 'approve', user })}
          className={`${btnBase} bg-teal-500 text-white hover:bg-teal-600`}
        >
          <Check className="h-3 w-3" aria-hidden /> Approve
        </button>
      ) : null}

      {isApproved ? (
        <button
          type="button"
          title="Promote to admin"
          disabled={busy}
          onClick={() => onAction({ type: 'promote', user })}
          className={`${btnBase} bg-purple-100 text-purple-700 hover:bg-purple-200`}
        >
          <Shield className="h-3 w-3" aria-hidden /> Promote
        </button>
      ) : null}

      {isAdmin ? (
        <button
          type="button"
          title="Demote to contributor"
          disabled={busy}
          onClick={() => onAction({ type: 'demote', user })}
          className={`${btnBase} bg-amber-100 text-amber-700 hover:bg-amber-200`}
        >
          <ShieldOff className="h-3 w-3" aria-hidden /> Demote
        </button>
      ) : null}

      {(isPending || isApproved) ? (
        <button
          type="button"
          title="Reject"
          disabled={busy}
          onClick={() => onAction({ type: 'reject', user })}
          className={`${btnBase} border border-red-100 bg-red-50 text-red-500 hover:bg-red-100`}
        >
          <X className="h-3 w-3" aria-hidden /> Reject
        </button>
      ) : null}

      {busy ? (
        <span className="text-[11px] text-slate-400">Processing…</span>
      ) : null}
    </div>
  )
}

// ── Mobile card ───────────────────────────────────────────────────────────────

function UserCard({
  user,
  actionUserId,
  onAction,
}: {
  user: AdminContributorListItem
  actionUserId: number | null
  onAction: (action: ConfirmAction) => void
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-[rgba(15,23,42,0.08)] bg-white shadow-[0_2px_8px_rgba(15,23,42,0.06)]">
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-3.5 py-2.5">
        <StatusPill user={user} />
        <p className="text-[11px] text-slate-400">#{user.id}</p>
      </div>
      <div className="p-3.5">
        <div className="flex items-center gap-2.5">
          <UserAvatar user={user} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-800">
              {getUserDisplayName(user)}
            </p>
            {user.email && user.display_name ? (
              <p className="truncate text-[11px] text-slate-400">{user.email}</p>
            ) : null}
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-slate-400">
          {user.email_verified !== undefined ? (
            <span className={user.email_verified ? 'text-teal-600' : 'text-amber-600'}>
              {user.email_verified ? '✓ Verified' : '⚠ Unverified'}
            </span>
          ) : null}
          {user.registered_date ? (
            <span>Joined {new Date(user.registered_date).toLocaleDateString()}</span>
          ) : null}
          {user.submission_count !== undefined ? (
            <span>{user.submission_count} submission{user.submission_count === 1 ? '' : 's'}</span>
          ) : null}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <RowActions user={user} actionUserId={actionUserId} onAction={onAction} />
        </div>
      </div>
    </article>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function AdminApprovePage() {
  const { token } = useAuth()
  const [users, setUsers] = useState<AdminContributorListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [actionUserId, setActionUserId] = useState<number | null>(null)
  const [showFallbackForm, setShowFallbackForm] = useState(false)
  const [fallbackId, setFallbackId] = useState('')
  const [fallbackRole, setFallbackRole] = useState<ContributorRole>('contributor')
  const [fallbackMessage, setFallbackMessage] = useState<string | null>(null)
  const [fallbackError, setFallbackError] = useState<string | null>(null)
  const [isFallbackSubmitting, setIsFallbackSubmitting] = useState(false)
  const [showListFallback, setShowListFallback] = useState(false)

  async function loadUsers(opts?: { refresh?: boolean }) {
    if (!token) {
      setError('Your session has expired. Please sign in again.')
      setIsLoading(false)
      return
    }

    if (opts?.refresh) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }
    setError(null)
    setNotice(null)

    try {
      const result = await getAdminContributors(token)
      setUsers(result.contributors)

      if (result.meta.usedDevFallback) {
        setNotice('Contributor list API (/admin/contributors) is not available yet. Using manual ID forms below.')
        setShowListFallback(true)
      } else {
        setShowListFallback(false)
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(formatAdminEndpointError('/admin/contributors', err))
      } else {
        setError('Unable to load contributors. Check your connection.')
      }
      setShowListFallback(true)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => { void loadUsers() }, [token])

  // ── Stats ──
  const stats = useMemo(() => ({
    pending: users.filter((u) => isPendingContributorStatus(u.status)).length,
    approved: users.filter((u) => u.status === 'approved' && u.role !== 'admin').length,
    admins: users.filter((u) => u.role === 'admin').length,
    rejected: users.filter((u) => u.status === 'rejected').length,
  }), [users])

  // ── Filtered list ──
  const filtered = useMemo(() => {
    return users.filter((user) => {
      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'admin') {
          if (user.role !== 'admin') return false
        } else if (statusFilter === 'approved') {
          if (user.status !== 'approved' || user.role === 'admin') return false
        } else if (statusFilter === 'pending') {
          if (!isPendingContributorStatus(user.status)) return false
        } else {
          if (user.status !== statusFilter) return false
        }
      }

      // Search
      const q = query.trim().toLowerCase()
      if (q) {
        const name = (user.display_name ?? '').toLowerCase()
        const email = (user.email ?? '').toLowerCase()
        const idStr = String(user.id)
        if (!name.includes(q) && !email.includes(q) && !idStr.includes(q)) return false
      }

      return true
    })
  }, [users, statusFilter, query])

  const hasActiveFilter = query.trim() !== '' || statusFilter !== 'all'

  // ── Action execution ──
  async function executeAction(action: ConfirmAction) {
    if (!token) {
      setConfirmError('Your session has expired.')
      return
    }

    setIsProcessing(true)
    setConfirmError(null)

    try {
      const userId = action.user.id
      const name = getUserDisplayName(action.user)

      if (action.type === 'approve') {
        await approveAdminContributor(userId, token)
        setActionMessage(`${name} has been approved.`)
      } else if (action.type === 'reject') {
        await rejectAdminContributor(userId, token)
        setActionMessage(`${name} has been rejected.`)
      } else if (action.type === 'promote') {
        await setAdminContributorRole(userId, 'admin', token)
        setActionMessage(`${name} is now an admin.`)
      } else if (action.type === 'demote') {
        await setAdminContributorRole(userId, 'contributor', token)
        setActionMessage(`${name} is now a contributor.`)
      }

      setConfirmAction(null)
      setActionUserId(userId)
      await loadUsers({ refresh: true })
    } catch (err) {
      setConfirmError(
        err instanceof ApiError ? err.message : 'Action failed. Please try again.',
      )
    } finally {
      setIsProcessing(false)
      setActionUserId(null)
    }
  }

  // ── Fallback form (manual ID) ──
  async function handleFallbackApprove() {
    const id = Number.parseInt(fallbackId.trim(), 10)
    if (!fallbackId.trim() || Number.isNaN(id) || id < 1) {
      setFallbackError('Enter a valid contributor ID.')
      return
    }

    setIsFallbackSubmitting(true)
    setFallbackError(null)
    setFallbackMessage(null)

    try {
      await approveContributor(id)
      setFallbackMessage(`Contributor #${id} approved.`)
      setFallbackId('')
    } catch (err) {
      setFallbackError(err instanceof ApiError ? err.message : 'Approval failed.')
    } finally {
      setIsFallbackSubmitting(false)
    }
  }

  async function handleFallbackSetRole() {
    const id = Number.parseInt(fallbackId.trim(), 10)
    if (!fallbackId.trim() || Number.isNaN(id) || id < 1) {
      setFallbackError('Enter a valid contributor ID.')
      return
    }

    setIsFallbackSubmitting(true)
    setFallbackError(null)
    setFallbackMessage(null)

    try {
      await setContributorRole(id, fallbackRole)
      setFallbackMessage(`Contributor #${id} is now ${fallbackRole === 'admin' ? 'an admin' : 'a contributor'}.`)
      setFallbackId('')
    } catch (err) {
      setFallbackError(err instanceof ApiError ? err.message : 'Role update failed.')
    } finally {
      setIsFallbackSubmitting(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-5 pb-12">

      {/* ── Page header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-[rgba(15,23,42,0.08)] bg-white px-5 py-4 shadow-[0_2px_8px_rgba(15,23,42,0.06)] sm:px-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-teal-500">
            Administration
          </p>
          <h1 className="mt-1 font-serif text-2xl font-semibold text-slate-800 sm:text-3xl">
            User management
          </h1>
          <p className="mt-1.5 text-sm text-slate-400">
            Approve accounts, assign roles, and manage contributor access.
          </p>
        </div>
        <button
          type="button"
          disabled={isLoading || isRefreshing}
          onClick={() => void loadUsers({ refresh: true })}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={['h-4 w-4', isRefreshing ? 'animate-spin' : ''].filter(Boolean).join(' ')} aria-hidden />
          {isRefreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* Feedback messages */}
      {notice ? (
        <div role="status" className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {notice}
        </div>
      ) : null}
      {actionMessage ? (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {actionMessage}
        </div>
      ) : null}

      {/* ── Loading ── */}
      {isLoading ? (
        <div className="flex flex-col items-center gap-3 py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-200 border-t-teal-500" />
          <p className="text-sm text-slate-400">Loading contributors…</p>
        </div>
      ) : null}

      {/* ── Error ── */}
      {!isLoading && error ? (
        <div className="rounded-2xl border border-[rgba(15,23,42,0.08)] bg-white p-6 shadow-sm">
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
          <button
            type="button"
            onClick={() => void loadUsers()}
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            Try again
          </button>
        </div>
      ) : null}

      {/* ── Stats overview ── */}
      {!isLoading && !error && users.length > 0 ? (
        <div className="flex flex-wrap gap-3">
          <StatCard
            label="Pending"
            count={stats.pending}
            color="text-amber-500"
            active={statusFilter === 'pending'}
            onClick={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')}
          />
          <StatCard
            label="Approved"
            count={stats.approved}
            color="text-teal-500"
            active={statusFilter === 'approved'}
            onClick={() => setStatusFilter(statusFilter === 'approved' ? 'all' : 'approved')}
          />
          <StatCard
            label="Admin"
            count={stats.admins}
            color="text-purple-500"
            active={statusFilter === 'admin'}
            onClick={() => setStatusFilter(statusFilter === 'admin' ? 'all' : 'admin')}
          />
          <StatCard
            label="Rejected"
            count={stats.rejected}
            color="text-red-500"
            active={statusFilter === 'rejected'}
            onClick={() => setStatusFilter(statusFilter === 'rejected' ? 'all' : 'rejected')}
          />
        </div>
      ) : null}

      {/* ── Search + filter toolbar ── */}
      {!isLoading && !error && users.length > 0 ? (
        <div className="rounded-2xl border border-[rgba(15,23,42,0.08)] bg-white px-4 py-3.5 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
          <div className="flex flex-wrap gap-2.5">
            {/* Search */}
            <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 focus-within:border-teal-300 focus-within:ring-1 focus-within:ring-teal-200">
              <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, email, or ID…"
                className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
              />
            </label>

            {/* Status filter */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="appearance-none rounded-xl border border-slate-200 bg-slate-50 py-2 pl-3 pr-8 text-sm font-medium text-slate-700 focus:border-teal-300 focus:outline-none focus:ring-1 focus:ring-teal-200"
              >
                <option value="all">All users</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="admin">Admin</option>
                <option value="rejected">Rejected</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden />
            </div>

            {hasActiveFilter ? (
              <button
                type="button"
                onClick={() => { setQuery(''); setStatusFilter('all') }}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] font-medium text-slate-500 transition-colors hover:bg-slate-100"
              >
                <X className="h-3 w-3" aria-hidden />
                Reset
              </button>
            ) : null}
          </div>

          <p className="mt-2.5 text-[11px] text-slate-400">
            {hasActiveFilter
              ? `Showing ${filtered.length} of ${users.length} user${users.length === 1 ? '' : 's'}`
              : `${users.length} user${users.length === 1 ? '' : 's'}`}
          </p>
        </div>
      ) : null}

      {/* ── Desktop table ── */}
      {!isLoading && !error && users.length > 0 ? (
        <>
          {/* Table — md+ */}
          <div className="hidden overflow-hidden rounded-[28px] border border-[rgba(15,23,42,0.08)] bg-white shadow-[0_4px_20px_rgba(15,23,42,0.08)] md:block">
            {filtered.length === 0 ? (
              <div className="px-6 py-14 text-center">
                <p className="text-sm text-slate-400">No users match this filter.</p>
              </div>
            ) : (
              <table className="w-full table-fixed text-left text-sm">
                <colgroup>
                  <col />
                  <col className="w-[120px]" />
                  <col className="w-[80px]" />
                  <col className="w-[110px]" />
                  <col className="w-[200px]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-[rgba(15,23,42,0.06)] bg-[#F9FAFB]">
                    <th className="py-2.5 pl-5 pr-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                      User
                    </th>
                    <th className="py-2.5 pr-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Status
                    </th>
                    <th className="py-2.5 pr-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Verified
                    </th>
                    <th className="py-2.5 pr-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Registered
                    </th>
                    <th className="py-2.5 pr-5 text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(15,23,42,0.05)]">
                  {filtered.map((user) => (
                    <tr
                      key={user.id}
                      className={[
                        'transition-colors',
                        actionUserId === user.id ? 'bg-teal-50/40' : 'hover:bg-slate-50/70',
                      ].join(' ')}
                    >
                      <td className="py-3 pl-5 pr-3 align-middle">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <UserAvatar user={user} />
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-semibold text-slate-800">
                              {getUserDisplayName(user)}
                            </p>
                            {user.email && user.display_name ? (
                              <p className="truncate text-[11px] text-slate-400">{user.email}</p>
                            ) : (
                              <p className="text-[11px] text-slate-400">#{user.id}</p>
                            )}
                            {user.submission_count !== undefined ? (
                              <p className="text-[10px] text-slate-400">
                                {user.submission_count} submission{user.submission_count === 1 ? '' : 's'}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-3 align-middle">
                        <StatusPill user={user} />
                      </td>
                      <td className="py-3 pr-3 align-middle">
                        {user.email_verified !== undefined ? (
                          <span className={user.email_verified ? 'text-teal-600' : 'text-amber-500'}>
                            {user.email_verified ? (
                              <UserCheck className="h-4 w-4" aria-label="Verified" />
                            ) : (
                              <UserX className="h-4 w-4" aria-label="Unverified" />
                            )}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="py-3 pr-3 align-middle text-[11px] text-slate-400">
                        {user.registered_date
                          ? new Date(user.registered_date).toLocaleDateString()
                          : '—'}
                      </td>
                      <td className="py-3 pr-5 align-middle">
                        <div className="flex flex-wrap items-center justify-end gap-1">
                          <RowActions
                            user={user}
                            actionUserId={actionUserId}
                            onAction={(action) => {
                              setConfirmError(null)
                              setConfirmAction(action)
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Mobile cards */}
          <div className="space-y-2.5 md:hidden">
            {filtered.length === 0 ? (
              <div className="rounded-2xl border border-[rgba(15,23,42,0.08)] bg-white px-5 py-10 text-center">
                <p className="text-sm text-slate-400">No users match this filter.</p>
              </div>
            ) : (
              filtered.map((user) => (
                <UserCard
                  key={user.id}
                  user={user}
                  actionUserId={actionUserId}
                  onAction={(action) => {
                    setConfirmError(null)
                    setConfirmAction(action)
                  }}
                />
              ))
            )}
          </div>
        </>
      ) : null}

      {/* ── Empty state (API returned empty list and not a fallback) ── */}
      {!isLoading && !error && users.length === 0 && !showListFallback ? (
        <div className="rounded-2xl border border-[rgba(15,23,42,0.08)] bg-white px-6 py-14 text-center shadow-sm">
          <p className="text-sm font-medium text-slate-500">No contributors registered yet.</p>
          <p className="mt-1 text-xs text-slate-400">New registrations will appear here.</p>
        </div>
      ) : null}

      {/* ── Fallback: manual ID forms (shown when list endpoint is 404) ── */}
      {showListFallback ? (
        <div className="overflow-hidden rounded-2xl border border-[rgba(15,23,42,0.08)] bg-white shadow-[0_2px_8px_rgba(15,23,42,0.06)]">
          <button
            type="button"
            className="flex w-full items-center justify-between px-5 py-4"
            onClick={() => setShowFallbackForm((prev) => !prev)}
          >
            <div className="text-left">
              <p className="text-sm font-semibold text-slate-700">Manual ID actions</p>
              <p className="mt-0.5 text-[11px] text-slate-400">
                Use contributor ID to approve or set role manually.
              </p>
            </div>
            <ChevronDown
              className={['h-4 w-4 text-slate-400 transition-transform', showFallbackForm ? 'rotate-180' : ''].join(' ')}
              aria-hidden
            />
          </button>

          {showFallbackForm ? (
            <div className="border-t border-slate-100 px-5 pb-5 pt-4">
              {fallbackMessage ? (
                <div role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
                  {fallbackMessage}
                </div>
              ) : null}
              {fallbackError ? (
                <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                  {fallbackError}
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                    Contributor ID
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={fallbackId}
                    onChange={(e) => { setFallbackId(e.target.value); setFallbackError(null); setFallbackMessage(null) }}
                    placeholder="e.g. 14"
                    disabled={isFallbackSubmitting}
                    className="field-control w-full"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                    New role
                  </label>
                  <select
                    value={fallbackRole}
                    onChange={(e) => setFallbackRole(e.target.value as ContributorRole)}
                    disabled={isFallbackSubmitting}
                    className="field-control w-full"
                  >
                    <option value="contributor">Contributor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={isFallbackSubmitting}
                  onClick={() => void handleFallbackApprove()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-600 disabled:opacity-50"
                >
                  <Check className="h-4 w-4" aria-hidden />
                  Approve contributor
                </button>
                <button
                  type="button"
                  disabled={isFallbackSubmitting}
                  onClick={() => void handleFallbackSetRole()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50"
                >
                  Update role
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* ── Confirmation dialog ── */}
      {confirmAction ? (
        <ConfirmDialog
          action={confirmAction}
          isProcessing={isProcessing}
          error={confirmError}
          onConfirm={() => void executeAction(confirmAction)}
          onCancel={() => { if (!isProcessing) setConfirmAction(null) }}
        />
      ) : null}
    </div>
  )
}
