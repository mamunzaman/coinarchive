import { AlertCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getSubmissionRevisionInfo } from '../../lib/submissionRevisionNotes'
import type { CoinSubmission, CoinSubmissionDetail } from '../../lib/api'

type SubmissionRevisionNotesProps = {
  submission: CoinSubmission | CoinSubmissionDetail
  compact?: boolean
}

export function SubmissionRevisionNotes({
  submission,
  compact = false,
}: SubmissionRevisionNotesProps) {
  const { t } = useTranslation()
  const { needsRevision, notes } = getSubmissionRevisionInfo(submission)

  if (!needsRevision) {
    return null
  }

  return (
    <div
      role="status"
      className={[
        'rounded-xl border border-red-200 bg-red-50 text-sm text-red-900',
        compact ? 'px-3 py-3' : 'px-4 py-4',
      ].join(' ')}
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden />
        <div className="min-w-0 space-y-2">
          <p className="font-semibold">{t('detail.needsRevision')}</p>
          <p className="text-sm text-red-800/90">{t('detail.revisionRequested')}</p>
          {notes.length > 0 ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-red-800/80">
                {t('detail.adminNotes')}
              </p>
              <ul className="mt-1.5 list-disc space-y-1 pl-4 text-sm">
                {notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm">
              {t('detail.revisionFallback')}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
