import { useTranslation } from 'react-i18next'
import type { CoinSubmissionDetail } from '../../lib/api'
import type { SubmissionDetailImageEditState } from '../../hooks/useSubmissionImageAutosave'
import {
  getLivePreviewGalleryCount,
  getVisibleGalleryImages,
  resolveFaceDisplayUrl,
} from '../../lib/submissionDetailImagePreview'

type SubmissionDetailLivePreviewProps = {
  submission: CoinSubmissionDetail
  editState: SubmissionDetailImageEditState
}

function PreviewThumb({
  label,
  url,
  emptyLabel,
}: {
  label: string
  url: string | null
  emptyLabel: string
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-navy-muted">
        {label}
      </p>
      {url ? (
        <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-border/50 bg-white p-2">
          <img src={url} alt={label} className="max-h-full max-w-full object-contain" />
        </div>
      ) : (
        <div className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-border/60 bg-white/60 px-2 text-center">
          <p className="text-xs text-navy-muted">{emptyLabel}</p>
        </div>
      )}
    </div>
  )
}

export function SubmissionDetailLivePreview({
  submission,
  editState,
}: SubmissionDetailLivePreviewProps) {
  const { t } = useTranslation()

  if (!editState.isEditing) {
    return null
  }

  const obverseUrl = resolveFaceDisplayUrl(submission.images.obverse?.url, editState.obverse)
  const reverseUrl = resolveFaceDisplayUrl(submission.images.reverse?.url, editState.reverse)
  const visibleGallery = getVisibleGalleryImages(submission, editState)
  const galleryCount = getLivePreviewGalleryCount(submission, editState)
  const previewTiles = [
    ...visibleGallery.map((image) => ({ key: `saved-${image.id}`, url: image.url })),
    ...editState.pendingGalleryUploads.map((item) => ({
      key: item.clientId,
      url: item.previewUrl,
    })),
  ]

  return (
    <section className="rounded-2xl border border-border/40 bg-white/80 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-serif text-lg font-semibold text-navy">{t('widgets.livePreview')}</h2>
        <span className="rounded-full bg-label/80 px-2.5 py-1 text-xs font-medium text-navy-muted">
          {t('widgets.galleryLabel', { count: galleryCount })}
        </span>
      </div>

      <div className="mt-4 flex gap-3">
        <PreviewThumb label={t('form.obverse')} url={obverseUrl} emptyLabel={t('widgets.noObverse')} />
        <PreviewThumb label={t('form.reverse')} url={reverseUrl} emptyLabel={t('widgets.noReverse')} />
      </div>

      {previewTiles.length > 0 ? (
        <div className="mt-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-navy-muted">
            {t('detail.gallery')}
          </p>
          <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-5">
            {previewTiles.map((tile) => (
              <div
                key={tile.key}
                className="overflow-hidden rounded-lg border border-border/40 bg-white p-1"
              >
                <img
                  src={tile.url}
                  alt={t('widgets.galleryPreview')}
                  className="aspect-square w-full rounded object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  )
}
