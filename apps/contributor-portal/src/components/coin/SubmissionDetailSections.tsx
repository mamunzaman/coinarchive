import type { CoinSubmissionDetail } from '../../lib/api'
import type { SubmissionDetailImageEditState } from '../../hooks/useSubmissionImageAutosave'
import { useTranslation } from 'react-i18next'
import { SafeHtmlContent } from '../ui/SafeHtmlContent'
import { SubmissionDetailImages } from './SubmissionDetailImages'
import { SubmissionDetailLivePreview } from './SubmissionDetailLivePreview'
import { SubmissionDetailsTable } from './SubmissionDetailsTable'

function hasValue(value: unknown): boolean {
  if (value === null || value === undefined) {
    return false
  }
  if (typeof value === 'string') {
    return value.trim().length > 0
  }
  return true
}

function AboutSection({ submission }: { submission: CoinSubmissionDetail }) {
  const { t } = useTranslation()
  const acf = submission.acf
  const hasShortDescription = hasValue(submission.short_description)
  const hasHistoricalBackground = hasValue(acf?.coin_historical_background)
  const hasCollectorNotes = hasValue(acf?.coin_collector_notes)
  const hasContent = hasShortDescription || hasHistoricalBackground || hasCollectorNotes

  return (
    <section>
      <h2 className="font-serif text-xl font-semibold text-navy">{t('detail.aboutCoin')}</h2>
      {hasContent ? (
        <div className="mt-4 flex flex-col gap-5">
          {hasShortDescription ? (
            <p className="text-base leading-relaxed text-navy">{submission.short_description.trim()}</p>
          ) : null}

          {hasHistoricalBackground ? (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-navy-muted">
                {t('form.historicalBackground')}
              </h3>
              <div className="mt-2 text-base text-navy">
                <SafeHtmlContent html={acf?.coin_historical_background ?? ''} />
              </div>
            </div>
          ) : null}

          {hasCollectorNotes ? (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-navy-muted">
                {t('form.collectorNotes')}
              </h3>
              <p className="mt-2 whitespace-pre-wrap text-base leading-relaxed text-navy">
                {acf?.coin_collector_notes?.trim()}
              </p>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="mt-3 text-sm leading-relaxed text-navy-muted">
          {t('detail.noDescription')}
        </p>
      )}
    </section>
  )
}

type SubmissionDetailImageEditHandlers = {
  canEdit: boolean
  editState: SubmissionDetailImageEditState
  footerStatus: 'saved' | 'saving' | 'failed'
  onStartEdit: () => void
  onFinishEdit: () => void
  onObverseChange: (file: File | null) => void
  onReverseChange: (file: File | null) => void
  onGalleryAdd: (files: File[]) => void
  onGalleryRemove: (imageId: number) => void
  onUndoGalleryRemove: (imageId: number) => void
  onRetryObverse: () => void
  onRetryReverse: () => void
  onRevertObverse: () => void
  onRevertReverse: () => void
  onRetryGalleryUpload: (clientId: string) => void
  onDismissFailedGalleryUpload: (clientId: string) => void
  onGalleryReplace: (imageId: number, file: File) => void
  onCancelGalleryReplace: (imageId: number) => void
  onRetryGalleryReplace: (imageId: number) => void
  onGalleryPermanentDelete: (imageId: number) => void
  allowGalleryPermanentDelete?: boolean
}

type SubmissionDetailSectionsProps = {
  submission: CoinSubmissionDetail
  imageEdit: SubmissionDetailImageEditHandlers
}

export function SubmissionDetailSections({
  submission,
  imageEdit,
}: SubmissionDetailSectionsProps) {
  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-12 xl:gap-16">
      <SubmissionDetailImages submission={submission} layout="faces" {...imageEdit} />
      <div className="flex flex-col gap-10 lg:gap-12">
        <SubmissionDetailLivePreview submission={submission} editState={imageEdit.editState} />
        <AboutSection submission={submission} />
        <SubmissionDetailsTable submission={submission} />
      </div>
    </div>
  )
}

export type { SubmissionDetailImageEditHandlers }
