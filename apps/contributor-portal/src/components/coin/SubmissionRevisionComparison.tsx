import { useTranslation } from 'react-i18next'
import type { CoinFormValues } from '../../types/coinForm'
import {
  compareCoinFormValues,
  getImageChangeLabels,
  type RevisionFieldChange,
} from '../../lib/revisionComparison'

type SubmissionRevisionComparisonProps = {
  previousValues: CoinFormValues
  currentValues: CoinFormValues
  imageChanges?: {
    obverseChanged?: boolean
    reverseChanged?: boolean
    galleryChanged?: boolean
  }
}

export function SubmissionRevisionComparison({
  previousValues,
  currentValues,
  imageChanges = {},
}: SubmissionRevisionComparisonProps) {
  const { t } = useTranslation()
  const fieldChanges = compareCoinFormValues(previousValues, currentValues)
  const imageLabels = getImageChangeLabels({
    obverseChanged: Boolean(imageChanges.obverseChanged),
    reverseChanged: Boolean(imageChanges.reverseChanged),
    galleryChanged: Boolean(imageChanges.galleryChanged),
  })

  if (fieldChanges.length === 0 && imageLabels.length === 0) {
    return (
      <section className="rounded-xl border border-border/60 bg-muted/20 px-4 py-4 text-sm text-navy-muted">
        {t('widgets.noRevisionChanges')}
      </section>
    )
  }

  return (
    <section className="rounded-2xl border border-border/40 bg-white/80 p-5 sm:p-6">
      <h2 className="font-serif text-lg font-semibold text-navy">{t('widgets.revisionComparison')}</h2>
      <p className="mt-1 text-sm text-navy-muted">
        {t('widgets.revisionComparisonHint')}
      </p>

      {imageLabels.length > 0 ? (
        <ul className="mt-4 flex flex-wrap gap-2">
          {imageLabels.map((label) => (
            <li
              key={label}
              className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900 ring-1 ring-amber-200"
            >
              {label}
            </li>
          ))}
        </ul>
      ) : null}

      {fieldChanges.length > 0 ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <ComparisonColumn title={t('widgets.previousVersion')} changes={fieldChanges} side="previous" />
          <ComparisonColumn title={t('widgets.currentVersion')} changes={fieldChanges} side="current" />
        </div>
      ) : null}
    </section>
  )
}

function ComparisonColumn({
  title,
  changes,
  side,
}: {
  title: string
  changes: RevisionFieldChange[]
  side: 'previous' | 'current'
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-[#faf8f5] p-4">
      <h3 className="text-sm font-semibold text-navy">{title}</h3>
      <dl className="mt-3 space-y-3">
        {changes.map((change) => (
          <div key={`${side}-${change.field}`}>
            <dt className="text-xs font-semibold uppercase tracking-wide text-navy-muted">
              {change.label}
            </dt>
            <dd
              className={[
                'mt-1 text-sm',
                side === 'current' ? 'font-medium text-primary' : 'text-navy',
              ].join(' ')}
            >
              {side === 'previous' ? change.previous : change.current}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
