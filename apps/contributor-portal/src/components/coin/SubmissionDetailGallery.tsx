import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { SubmissionImage } from '../../lib/api'
import { DetailSectionCard } from './SubmissionDetailCard'

type SubmissionDetailGalleryProps = {
  title: string
  images: SubmissionImage[]
  showEmpty?: boolean
  editHref?: string
  onImageClick?: (image: { src: string; alt: string; label: string }) => void
}

function GalleryImageButton({
  image,
  title,
  index,
  onImageClick,
}: {
  image: SubmissionImage
  title: string
  index: number
  onImageClick?: (image: { src: string; alt: string; label: string }) => void
}) {
  const { t } = useTranslation()
  const [hasError, setHasError] = useState(false)
  const displayUrl = hasError ? null : image.url
  const alt = `${title} gallery ${index + 1}`

  useEffect(() => {
    setHasError(false)
  }, [image.url])

  return (
    <button
      type="button"
      onClick={() =>
        displayUrl
          ? onImageClick?.({
              src: displayUrl,
              alt,
              label: t('widgets.galleryImagePreview', { number: index + 1 }),
            })
          : undefined
      }
      disabled={!displayUrl}
      className="overflow-hidden rounded-lg border border-border/60 bg-[#faf8f5] p-1.5 transition-colors hover:border-primary/30 hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-default disabled:hover:border-border/60 disabled:hover:bg-[#faf8f5]"
      aria-label={t('widgets.openGalleryPreview', { number: index + 1 })}
    >
      {displayUrl ? (
        <img
          src={displayUrl}
          alt={alt}
          onError={() => setHasError(true)}
          className="aspect-square w-full rounded-md bg-white object-contain p-0.5"
        />
      ) : (
        <div className="flex aspect-square w-full items-center justify-center rounded-md bg-white font-serif text-2xl text-primary/35">
          ◎
        </div>
      )}
    </button>
  )
}

export function SubmissionDetailGallery({
  title,
  images,
  showEmpty = true,
  editHref,
  onImageClick,
}: SubmissionDetailGalleryProps) {
  const { t } = useTranslation()

  if (images.length === 0 && !showEmpty) {
    return null
  }

  return (
    <DetailSectionCard
      title={t('detail.gallery')}
      subtitle={
        images.length > 0
          ? t('review.imageCount', { count: images.length })
          : undefined
      }
      editHref={editHref}
    >
      {images.length > 0 ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {images.map((image, index) => (
            <GalleryImageButton
              key={image.id}
              image={image}
              title={title}
              index={index}
              onImageClick={onImageClick}
            />
          ))}
        </div>
      ) : (
        <p className="py-4 text-center text-sm italic text-navy-muted">{t('common.notProvided')}</p>
      )}
    </DetailSectionCard>
  )
}
