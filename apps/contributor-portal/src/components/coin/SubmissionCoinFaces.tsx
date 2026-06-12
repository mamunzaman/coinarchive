import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { CoinSubmissionDetail } from '../../lib/api'
import { resolveSubmissionDetailFaceImageUrl } from '../../lib/imagePreview'

type SubmissionCoinFacesProps = {
  submission: CoinSubmissionDetail
  compact?: boolean
  onImageClick?: (image: { src: string; alt: string; label: string }) => void
}

function CoinFaceCard({
  side,
  imageUrls,
  imageAlt,
  description,
  onImageClick,
}: {
  side: string
  imageUrls: string[]
  imageAlt: string
  description?: string | null
  onImageClick?: (image: { src: string; alt: string; label: string }) => void
}) {
  const { t } = useTranslation()
  const [sourceIndex, setSourceIndex] = useState(0)
  const imageUrl = imageUrls[sourceIndex] ?? null

  useEffect(() => {
    setSourceIndex(0)
  }, [imageUrls])

  return (
    <div className="flex min-w-0 flex-col rounded-2xl border border-border/60 bg-[#faf8f5] p-3.5 shadow-sm">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-navy-muted">
        {side}
      </p>
      {imageUrl ? (
        <button
          type="button"
          onClick={() =>
            onImageClick?.({
              src: imageUrl,
              alt: imageAlt,
              label: t('detail.imagePreviewLabel', { side }),
            })
          }
          className="flex aspect-[4/3] items-center justify-center rounded-xl bg-white p-3 transition-colors hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-primary/30 sm:p-4"
          aria-label={t('detail.openImagePreview', { side: side.toLowerCase() })}
        >
          <img
            src={imageUrl}
            alt={imageAlt}
            onError={() => setSourceIndex((current) => current + 1)}
            className="max-h-72 w-full object-contain md:max-h-80 xl:max-h-[24rem]"
          />
        </button>
      ) : (
        <div className="flex aspect-[4/3] items-center justify-center rounded-xl border border-dashed border-border/70 bg-white/80">
          <p className="text-xs italic text-navy-muted">{t('detail.notProvided')}</p>
        </div>
      )}
      {description?.trim() ? (
        <p className="mt-2 line-clamp-2 text-[11px] leading-snug text-navy-muted">
          {description.trim()}
        </p>
      ) : null}
    </div>
  )
}

export function SubmissionCoinFaces({ submission, compact = false, onImageClick }: SubmissionCoinFacesProps) {
  const { t } = useTranslation()
  const acf = submission.acf
  const obverseUrls = useMemo(
    () =>
      [...new Set([
        submission.images.obverse?.url,
        resolveSubmissionDetailFaceImageUrl(submission, 'obverse'),
        submission.default_obverse_url,
        submission.default_image_url,
      ].filter((url): url is string => Boolean(url)))],
    [submission],
  )
  const reverseUrls = useMemo(
    () =>
      [...new Set([
        submission.images.reverse?.url,
        resolveSubmissionDetailFaceImageUrl(submission, 'reverse'),
        submission.default_reverse_url,
        submission.default_image_url,
      ].filter((url): url is string => Boolean(url)))],
    [submission],
  )

  return (
    <div
      className={[
        compact ? 'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:gap-4' : 'grid grid-cols-1 gap-4 sm:grid-cols-2',
      ].join(' ')}
    >
      <CoinFaceCard
        side={t('form.obverse')}
        imageUrls={obverseUrls}
        imageAlt={`${submission.title} obverse`}
        description={acf?.coin_obverse_description}
        onImageClick={onImageClick}
      />
      <CoinFaceCard
        side={t('form.reverse')}
        imageUrls={reverseUrls}
        imageAlt={`${submission.title} reverse`}
        description={acf?.coin_reverse_description}
        onImageClick={onImageClick}
      />
    </div>
  )
}
