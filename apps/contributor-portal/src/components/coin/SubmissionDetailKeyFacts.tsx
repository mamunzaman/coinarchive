import type { CoinSubmissionDetail } from '../../lib/api'
import { useTranslation } from 'react-i18next'
import { formatSubmittedDate } from '../../lib/format'
import { StatusBadge } from '../ui/StatusBadge'
import { DetailFieldGrid, DetailFieldRow, DetailSectionCard } from './SubmissionDetailCard'

type SubmissionDetailKeyFactsProps = {
  submission: CoinSubmissionDetail
  showContributor?: boolean
}

export function SubmissionDetailKeyFacts({ submission, showContributor = false }: SubmissionDetailKeyFactsProps) {
  const { t } = useTranslation()
  const acf = submission.acf
  const coinCode = acf?.coin_code?.trim() ?? ''
  const uniqueCode = acf?.unique_code?.trim() ?? ''
  const contributor =
    submission.submitted_by?.email?.trim() ||
    (submission.submitted_by?.contributor_id
      ? `Contributor #${submission.submitted_by.contributor_id}`
      : '')

  return (
    <DetailSectionCard title={t('detail.submissionInfo')} subtitle={t('detail.submissionInfoSubtitle')}>
      <DetailFieldGrid>
        <DetailFieldRow label={t('detail.coinCode')} value={coinCode} valueVariant="code" />
        <DetailFieldRow label={t('detail.uniqueCode')} value={uniqueCode} valueVariant="code" />
        {showContributor ? <DetailFieldRow label={t('detail.contributor')} value={contributor} /> : null}
        <DetailFieldRow label={t('detail.submittedDateLabel')} value={formatSubmittedDate(submission.date)} />
        <DetailFieldRow
          label={t('detail.lastUpdated')}
          value={submission.modified_date ? formatSubmittedDate(submission.modified_date) : ''}
        />
        <DetailFieldRow label={t('detail.releaseDate')} value={acf?.released_date ?? ''} />
      </DetailFieldGrid>
      <div className="mt-3 flex items-center gap-2 border-t border-border/40 pt-3">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-navy-muted">
          {t('common.status')}
        </span>
        <StatusBadge status={submission.status} />
      </div>
    </DetailSectionCard>
  )
}
