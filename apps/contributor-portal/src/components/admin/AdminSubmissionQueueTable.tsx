import { AdminQueueActionRow } from '../ui/ActionControls'
import type { AdminSubmissionListItem } from '../../lib/adminApi'
import {
  getAdminQueueStatusCategory,
  getSubmissionUpdatedAt,
  isPendingAdminSubmission,
} from '../../lib/adminQueueFilters'
import { getSubmissionDuplicateRisk } from '../../lib/duplicateProtection'
import { formatSubmittedDate } from '../../lib/format'
import { AdminQueueCoinCell } from './AdminQueueCoinCell'
import { StatusBadge } from '../ui/StatusBadge'

type AdminSubmissionQueueTableProps = {
  submissions: AdminSubmissionListItem[]
  selectedIds?: Set<number>
  onToggleRow?: (id: number) => void
  onToggleAll?: (ids: number[]) => void
  onQuickApprove?: (submission: AdminSubmissionListItem) => void
  onQuickReject?: (submission: AdminSubmissionListItem) => void
  actionSubmissionId?: number | null
  emptyMessage?: string
  readOnly?: boolean
  variant?: 'full' | 'preview'
}

// 2px inset left border via box-shadow — works on <tr> across all browsers
function getRowAccentClass(status: string): string {
  const cat = getAdminQueueStatusCategory(status)
  switch (cat) {
    case 'pending':       return 'shadow-[inset_2px_0_0_0_#f59e0b]'
    case 'approved':      return 'shadow-[inset_2px_0_0_0_#14b8a6]'
    case 'rejected':      return 'shadow-[inset_2px_0_0_0_#f87171]'
    case 'needs_revision':return 'shadow-[inset_2px_0_0_0_#fb923c]'
    case 'draft':         return 'shadow-[inset_2px_0_0_0_#cbd5e1]'
    default:              return ''
  }
}

// Shared icon button sizing handled in ActionControls admin variants.

export function AdminSubmissionQueueTable({
  submissions,
  selectedIds = new Set(),
  onToggleRow,
  onToggleAll,
  onQuickApprove,
  onQuickReject,
  actionSubmissionId = null,
  emptyMessage = 'No submissions match this filter.',
  readOnly = false,
  variant = 'full',
}: AdminSubmissionQueueTableProps) {
  const cardClass =
    'overflow-hidden rounded-[28px] border border-[rgba(15,23,42,0.08)] bg-white shadow-[0_4px_20px_rgba(15,23,42,0.08)]'

  const containerClass =
    variant === 'preview' ? cardClass : `hidden min-[1400px]:block ${cardClass}`

  if (submissions.length === 0) {
    return (
      <div
        className={
          variant === 'preview'
            ? `${cardClass} px-6 py-14 text-center`
            : `hidden min-[1400px]:block ${cardClass} px-6 py-14 text-center`
        }
      >
        <p className="text-sm text-slate-400">{emptyMessage}</p>
      </div>
    )
  }

  const allIds = submissions.map((s) => s.id)
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id))
  const someSelected = allIds.some((id) => selectedIds.has(id))

  const showSelection = !readOnly && Boolean(onToggleRow && onToggleAll)
  const showQuickActions = !readOnly && Boolean(onQuickApprove && onQuickReject)

  return (
    <div className={containerClass}>
      <table className="w-full table-fixed text-left text-sm" aria-label="Admin submission queue">
        <colgroup>
          {showSelection ? <col className="w-10" /> : null}
          <col />
          <col className="w-[132px] xl:w-[150px]" />
          <col className="w-[220px]" />
          <col className="w-[220px]" />
        </colgroup>

        {/* ── Header ── */}
        <thead className="sticky top-0 z-10">
          <tr className="border-b border-[rgba(15,23,42,0.06)] bg-[#F9FAFB]">
            {showSelection ? (
              <th className="py-2.5 pl-4 pr-2">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => { if (el) el.indeterminate = !allSelected && someSelected }}
                  onChange={() => onToggleAll?.(allIds)}
                  aria-label="Select all submissions"
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
                />
              </th>
            ) : null}
            <th className="py-2.5 pl-4 pr-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 xl:pl-5">
              Submission
            </th>
            <th className="py-2.5 pr-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Status
            </th>
            <th className="py-2.5 pr-6 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Activity
            </th>
            <th className="py-2.5 pl-2 pr-5 text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Actions
            </th>
          </tr>
        </thead>

        {/* ── Body ── */}
        <tbody className="divide-y divide-[rgba(15,23,42,0.05)]">
          {submissions.map((submission) => {
            const detailPath = `/admin/submissions/${submission.id}`
            const isPending = isPendingAdminSubmission(submission)
            const isSelected = selectedIds.has(submission.id)
            const isRowBusy = actionSubmissionId === submission.id
            const duplicateRisk = getSubmissionDuplicateRisk(submission)

            return (
              <tr
                key={submission.id}
                className={[
                  'transition-colors',
                  getRowAccentClass(submission.status),
                  isSelected ? 'bg-teal-50/60' : 'hover:bg-slate-50/70',
                ].join(' ')}
              >
                {showSelection ? (
                  <td className="py-3 pl-4 pr-2 align-middle">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleRow?.(submission.id)}
                      aria-label={`Select ${submission.title}`}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
                    />
                  </td>
                ) : null}

                {/* Coin cell */}
                <td className="py-3 pl-4 pr-3 align-middle xl:pl-5">
                  <AdminQueueCoinCell submission={submission} detailPath={detailPath} compact />
                </td>

                {/* Status */}
                <td className="py-3 pr-3 align-middle">
                  <StatusBadge status={submission.status} />
                </td>

                {/* Activity */}
                <td className="min-w-[220px] py-3 pr-6 align-middle text-[11px] leading-snug text-slate-500">
                  <p className="whitespace-nowrap">
                    <span className="text-slate-400">Updated</span>{' '}
                    <span className="font-medium text-slate-600">
                      {formatSubmittedDate(getSubmissionUpdatedAt(submission))}
                    </span>
                  </p>
                  <p className="mt-1 whitespace-nowrap">
                    <span className="text-slate-400">Submitted</span>{' '}
                    <span className="font-medium text-slate-600">
                      {formatSubmittedDate(submission.date)}
                    </span>
                  </p>
                </td>

                {/* Actions */}
                <td className="min-w-[220px] py-3 pl-2 pr-5 align-middle">
                  <AdminQueueActionRow
                    detailPath={detailPath}
                    state={{ duplicateRisk }}
                    isPending={isPending}
                    isRowBusy={isRowBusy}
                    showQuickActions={showQuickActions}
                    onApprove={() => onQuickApprove?.(submission)}
                    onReject={() => onQuickReject?.(submission)}
                    reviewShowLabel
                    className="gap-2"
                  />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
