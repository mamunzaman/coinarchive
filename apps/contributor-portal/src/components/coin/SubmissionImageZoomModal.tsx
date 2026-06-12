import { useEffect } from 'react'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

type SubmissionImageZoomModalProps = {
  image: {
    src: string
    alt: string
    label: string
  } | null
  onClose: () => void
}

export function SubmissionImageZoomModal({ image, onClose }: SubmissionImageZoomModalProps) {
  const { t } = useTranslation()

  useEffect(() => {
    if (!image) {
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [image, onClose])

  if (!image) {
    return null
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={image.label}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="relative max-w-[90vw]" onClick={(event) => event.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          className="absolute right-2 top-2 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-slate-700 shadow-lg transition-colors hover:bg-white"
          aria-label={t('detail.closeImagePreview')}
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
        <img
          src={image.src}
          alt={image.alt}
          className="max-h-[85vh] max-w-[90vw] rounded-2xl bg-white object-contain p-2 shadow-2xl"
        />
      </div>
    </div>
  )
}
