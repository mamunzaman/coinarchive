import type {
  AdminQueueReviewFilter,
  AdminQueueStatusFilter,
  AdminQueueSummaryCounts,
} from '../../lib/adminQueueFilters'

type AdminQueueFilterCardsProps = {
  summary: AdminQueueSummaryCounts
  activeFilter: AdminQueueStatusFilter
  activeReviewFilter: AdminQueueReviewFilter
  onFilterChange: (filter: AdminQueueStatusFilter) => void
  onReviewFilterChange: (filter: AdminQueueReviewFilter) => void
}

const SUMMARY_ITEMS: Array<{
  key: keyof AdminQueueSummaryCounts
  label: string
  tone: 'navy' | 'amber' | 'red' | 'emerald'
  statusFilter?: AdminQueueStatusFilter
  reviewFilter?: AdminQueueReviewFilter
}> = [
  { key: 'pendingReview', label: 'Pending Review', tone: 'amber', reviewFilter: 'pending' },
  {
    key: 'revisionRequested',
    label: 'Revision Requested',
    tone: 'amber',
    reviewFilter: 'needs_revision',
  },
  { key: 'approvedToday', label: 'Approved Today', tone: 'emerald', reviewFilter: 'approved_today' },
  { key: 'highDuplicateRisk', label: 'High Duplicate Risk', tone: 'red', reviewFilter: 'exact_duplicates' },
  { key: 'missingImages', label: 'Missing Images', tone: 'red', reviewFilter: 'missing_images' },
  { key: 'incompleteData', label: 'Incomplete Data', tone: 'navy', reviewFilter: 'incomplete_data' },
]

export function AdminQueueFilterCards({
  summary,
  activeFilter,
  activeReviewFilter,
  onFilterChange,
  onReviewFilterChange,
}: AdminQueueFilterCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
      {SUMMARY_ITEMS.map((item) => {
        const isActive =
          (item.statusFilter && activeFilter === item.statusFilter && activeReviewFilter === 'all') ||
          (item.reviewFilter && activeReviewFilter === item.reviewFilter)
        const toneClass =
          item.tone === 'red'
            ? isActive
              ? 'border-red-300 bg-red-50 ring-1 ring-red-200'
              : 'border-red-200/80 bg-red-50/70 hover:border-red-300 hover:bg-red-50'
            : item.tone === 'amber'
              ? isActive
                ? 'border-amber-300 bg-amber-50 ring-1 ring-amber-200'
                : 'border-amber-200/80 bg-amber-50/60 hover:border-amber-300 hover:bg-amber-50'
              : item.tone === 'emerald'
                ? isActive
                  ? 'border-emerald-300 bg-emerald-50 ring-1 ring-emerald-200'
                  : 'border-emerald-200/80 bg-emerald-50/60 hover:border-emerald-300 hover:bg-emerald-50'
                : isActive
                  ? 'border-primary/40 bg-primary/5 ring-1 ring-primary/15'
                  : 'border-border/70 bg-white/90 hover:border-primary/25 hover:bg-page/60'

        return (
          <button
            key={item.key}
            type="button"
            onClick={() => {
              if (item.reviewFilter) {
                onFilterChange('all')
                onReviewFilterChange(item.reviewFilter)
                return
              }
              if (item.statusFilter) {
                onReviewFilterChange('all')
                onFilterChange(item.statusFilter)
              }
            }}
            className={[
              'rounded-2xl border px-3 py-3 text-left transition-colors sm:px-4 sm:py-3.5',
              toneClass,
            ].join(' ')}
            aria-pressed={isActive}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-navy-muted sm:text-[11px]">
              {item.label}
            </p>
            <p className="mt-1 font-serif text-xl font-semibold text-navy sm:text-2xl">
              {summary[item.key]}
            </p>
          </button>
        )
      })}
    </div>
  )
}
