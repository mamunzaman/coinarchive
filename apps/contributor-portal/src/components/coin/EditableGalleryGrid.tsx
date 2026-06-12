import { lazy, Suspense, useEffect, useId, useState, type ChangeEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ImageMinus,
  ImageUp,
  Plus,
  RotateCcw,
  Trash2,
  Undo2,
  X,
} from 'lucide-react'
import type { SubmissionImage } from '../../lib/api'
import type { ImageCardStatus } from '../../hooks/useSubmissionImageAutosave'

const ACCEPT = 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp'

const ImageCropModal = lazy(() =>
  import('../ui/ImageCropModal').then((module) => ({ default: module.ImageCropModal })),
)

type PendingPreview = {
  key: string
  file: File
  url: string
  index: number
}

function usePendingGalleryPreviews(files: File[]): PendingPreview[] {
  const [previews, setPreviews] = useState<PendingPreview[]>([])

  useEffect(() => {
    const next = files.map((file, index) => ({
      key: `${file.name}-${file.size}-${file.lastModified}-${index}`,
      file,
      url: URL.createObjectURL(file),
      index,
    }))
    setPreviews(next)

    return () => {
      for (const item of next) {
        URL.revokeObjectURL(item.url)
      }
    }
  }, [files])

  return previews
}

type EditableGalleryGridProps = {
  images: SubmissionImage[]
  removedIds: number[]
  pendingFiles?: File[]
  disabled?: boolean
  embedded?: boolean
  showAddTile?: boolean
  onToggleRemove: (id: number, remove: boolean) => void
  onRemovePendingFile?: (index: number) => void
  onAddFiles?: (files: File[]) => void
  replacementPreviews?: Record<number, string>
  onReplaceImage?: (imageId: number, file: File) => void
  onCancelReplace?: (imageId: number) => void
  replaceStatusById?: Record<number, ImageCardStatus>
  replaceErrorById?: Record<number, string>
  onRetryReplace?: (imageId: number) => void
  allowPermanentDelete?: boolean
  onPermanentDelete?: (imageId: number) => void
}

export function GalleryCornerRemoveButton({
  label,
  onClick,
  disabled,
  icon = 'minus',
}: {
  label: string
  onClick?: () => void
  disabled?: boolean
  icon?: 'minus' | 'x'
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={[
        'absolute right-2 top-2 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full',
        'bg-white/95 text-red-600 shadow-md ring-1 ring-black/10 transition-opacity',
        'hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
        'opacity-100 max-lg:opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100',
        'disabled:pointer-events-none disabled:opacity-50',
      ].join(' ')}
    >
      {icon === 'x' ? (
        <X className="h-4 w-4" aria-hidden />
      ) : (
        <ImageMinus className="h-4 w-4" aria-hidden />
      )}
    </button>
  )
}

function CardIconButton({
  label,
  onClick,
  disabled,
  tone = 'neutral',
  children,
}: {
  label: string
  onClick?: () => void
  disabled?: boolean
  tone?: 'neutral' | 'danger' | 'primary'
  children: ReactNode
}) {
  const toneClasses =
    tone === 'danger'
      ? 'bg-white/95 text-red-600 hover:bg-red-50'
      : tone === 'primary'
        ? 'bg-white/95 text-primary hover:bg-primary/10'
        : 'bg-white/95 text-navy hover:bg-white'

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={[
        'inline-flex h-10 min-w-10 items-center justify-center rounded-lg px-2.5 text-sm font-semibold shadow-sm ring-1 ring-black/5 transition-colors disabled:opacity-50',
        toneClasses,
      ].join(' ')}
    >
      {children}
    </button>
  )
}

function CardIconLabel({
  label,
  htmlFor,
  disabled,
  tone = 'primary',
  children,
}: {
  label: string
  htmlFor: string
  disabled?: boolean
  tone?: 'neutral' | 'danger' | 'primary'
  children: ReactNode
}) {
  const toneClasses =
    tone === 'danger'
      ? 'bg-white/95 text-red-600 hover:bg-red-50'
      : tone === 'primary'
        ? 'bg-white/95 text-primary hover:bg-primary/10'
        : 'bg-white/95 text-navy hover:bg-white'

  return (
    <label
      htmlFor={htmlFor}
      title={label}
      aria-label={label}
      className={[
        'inline-flex h-10 min-w-10 cursor-pointer items-center justify-center rounded-lg px-2.5 text-sm font-semibold shadow-sm ring-1 ring-black/5 transition-colors',
        disabled ? 'pointer-events-none opacity-50' : toneClasses,
      ].join(' ')}
    >
      {children}
    </label>
  )
}

function ReplaceStatusBadge({ status }: { status: ImageCardStatus }) {
  if (status === 'idle') {
    return (
      <span className="absolute left-2 top-2 rounded-md bg-white/95 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary shadow-sm ring-1 ring-black/5">
        New image
      </span>
    )
  }

  const label =
    status === 'uploading' ? 'Uploading' : status === 'saved' ? 'Saved' : 'Failed'

  return (
    <span
      className={[
        'absolute left-2 top-2 rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] shadow-sm ring-1',
        status === 'uploading'
          ? 'bg-white/95 text-navy ring-black/5'
          : status === 'saved'
            ? 'bg-primary/10 text-primary ring-primary/20'
            : 'bg-red-50 text-red-700 ring-red-200',
      ].join(' ')}
    >
      {status === 'uploading' ? (
        <span className="mr-1 inline-block h-2.5 w-2.5 animate-spin rounded-full border-2 border-primary/30 border-t-primary align-[-2px]" />
      ) : null}
      {label}
    </span>
  )
}

export function GalleryAddCropTile({
  disabled,
  onAddFiles,
}: {
  disabled?: boolean
  onAddFiles: (files: File[]) => void
}) {
  const { t } = useTranslation()
  const inputId = useId()
  const [queue, setQueue] = useState<File[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [cropOpen, setCropOpen] = useState(false)
  const [croppedBatch, setCroppedBatch] = useState<File[]>([])

  function handleSelect(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (selected.length === 0) {
      return
    }
    setCroppedBatch([])
    setQueue(selected)
    setCurrentIndex(0)
    setCropOpen(true)
  }

  function handleCropSave(file: File) {
    const nextBatch = [...croppedBatch, file]
    const nextIndex = currentIndex + 1

    if (nextIndex < queue.length) {
      setCroppedBatch(nextBatch)
      setCurrentIndex(nextIndex)
      return
    }

    onAddFiles(nextBatch)
    setCropOpen(false)
    setQueue([])
    setCurrentIndex(0)
    setCroppedBatch([])
  }

  function handleClose() {
    setCropOpen(false)
    setQueue([])
    setCurrentIndex(0)
    setCroppedBatch([])
  }

  return (
    <>
      <label
        htmlFor={inputId}
        className={[
          'group flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/70 bg-white/70 p-4 text-center transition-colors',
          disabled ? 'pointer-events-none opacity-50' : 'hover:border-primary/40 hover:bg-primary/5',
        ].join(' ')}
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
          <Plus className="h-5 w-5" aria-hidden />
        </span>
        <span className="text-sm font-semibold text-navy">{t('widgets.addCrop')}</span>
        <input
          id={inputId}
          type="file"
          accept={ACCEPT}
          multiple
          className="sr-only"
          disabled={disabled}
          onChange={handleSelect}
        />
      </label>

      {cropOpen ? (
        <Suspense fallback={null}>
          <ImageCropModal
            open={cropOpen}
            file={queue[currentIndex] ?? null}
            title={
              queue.length > 1
                ? t('widgets.cropGalleryImageProgress', {
                    current: currentIndex + 1,
                    total: queue.length,
                  })
                : t('widgets.cropGalleryImage')
            }
            onClose={handleClose}
            onSave={handleCropSave}
          />
        </Suspense>
      ) : null}
    </>
  )
}

function ExistingGalleryCard({
  image,
  isPendingRemoval,
  disabled,
  replacementPreviewUrl,
  replaceStatus,
  replaceError,
  allowPermanentDelete,
  onToggleRemove,
  onReplaceImage,
  onCancelReplace,
  onRetryReplace,
  onPermanentDelete,
}: {
  image: SubmissionImage
  isPendingRemoval: boolean
  disabled: boolean
  replacementPreviewUrl?: string
  replaceStatus?: ImageCardStatus
  replaceError?: string
  allowPermanentDelete: boolean
  onToggleRemove: (remove: boolean) => void
  onReplaceImage?: (file: File) => void
  onCancelReplace?: () => void
  onRetryReplace?: () => void
  onPermanentDelete?: () => void
}) {
  const replaceInputId = useId()
  const displayUrl = replacementPreviewUrl ?? image.url
  const hasReplacement = Boolean(replacementPreviewUrl)
  const isReplaceBusy = replaceStatus === 'uploading'
  const isReplaceFailed = replaceStatus === 'failed'

  return (
    <div
      className={[
        'group relative flex h-full flex-col overflow-hidden rounded-xl border bg-white shadow-sm',
        isPendingRemoval
          ? 'border-red-200'
          : hasReplacement
            ? 'border-primary/35 ring-1 ring-primary/10'
            : 'border-border/60',
      ].join(' ')}
    >
      <div className="relative aspect-square w-full shrink-0 overflow-hidden bg-panel">
        <img
          src={displayUrl}
          alt="Gallery image"
          className={[
            'h-full w-full object-cover transition-opacity',
            isPendingRemoval ? 'grayscale opacity-70' : isReplaceBusy ? 'opacity-85' : '',
          ].join(' ')}
        />

        {hasReplacement ? <ReplaceStatusBadge status={replaceStatus ?? 'idle'} /> : null}

        {!isPendingRemoval ? (
          <GalleryCornerRemoveButton
            label="Remove gallery image"
            disabled={disabled || isReplaceBusy}
            onClick={() => onToggleRemove(true)}
          />
        ) : null}

        {isPendingRemoval ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-navy/45 px-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-white">
              Pending removal
            </p>
            <CardIconButton
              label="Undo remove"
              tone="primary"
              disabled={disabled}
              onClick={() => onToggleRemove(false)}
            >
              <Undo2 className="h-4 w-4" aria-hidden />
            </CardIconButton>
          </div>
        ) : (
          <div
            className={[
              'absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-gradient-to-t from-black/70 via-black/35 to-transparent px-2 pb-2 pt-10 transition-opacity',
              'opacity-100 max-lg:opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100',
            ].join(' ')}
          >
            {!hasReplacement && onReplaceImage ? (
              <>
                <input
                  id={replaceInputId}
                  type="file"
                  accept={ACCEPT}
                  className="sr-only"
                  disabled={disabled || isReplaceBusy}
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    event.target.value = ''
                    if (file) {
                      onReplaceImage(file)
                    }
                  }}
                />
                <CardIconLabel
                  label="Replace image"
                  htmlFor={replaceInputId}
                  tone="primary"
                  disabled={disabled || isReplaceBusy}
                >
                  <ImageUp className="h-4 w-4" aria-hidden />
                </CardIconLabel>
              </>
            ) : null}

            {hasReplacement && onCancelReplace && replaceStatus !== 'uploading' ? (
              <CardIconButton label="Cancel replace" disabled={disabled} onClick={onCancelReplace}>
                <X className="h-4 w-4" aria-hidden />
              </CardIconButton>
            ) : null}

            {isReplaceFailed && onRetryReplace ? (
              <CardIconButton label="Retry replace" tone="primary" disabled={disabled} onClick={onRetryReplace}>
                <RotateCcw className="h-4 w-4" aria-hidden />
              </CardIconButton>
            ) : null}

            {allowPermanentDelete && onPermanentDelete ? (
              <CardIconButton
                label="Delete gallery attachment permanently"
                tone="danger"
                disabled={disabled || isReplaceBusy}
                onClick={onPermanentDelete}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </CardIconButton>
            ) : null}
          </div>
        )}
      </div>

      {isReplaceFailed && replaceError ? (
        <div className="border-t border-border/50 px-2.5 py-2">
          <p role="alert" className="text-xs text-red-600">
            {replaceError}
          </p>
        </div>
      ) : null}
    </div>
  )
}

function PendingGalleryCard({
  item,
  disabled,
  onRemove,
}: {
  item: PendingPreview
  disabled?: boolean
  onRemove?: () => void
}) {
  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-primary/35 bg-white shadow-sm ring-1 ring-primary/10">
      <div className="relative aspect-square w-full shrink-0 overflow-hidden">
        <img src={item.url} alt={item.file.name} className="h-full w-full object-cover" />
        <span className="absolute left-2 top-2 rounded-md bg-white/95 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary shadow-sm ring-1 ring-black/5">
          New image
        </span>
        <GalleryCornerRemoveButton
          label="Remove gallery image"
          disabled={disabled}
          onClick={onRemove}
        />
      </div>
    </div>
  )
}

export function EditableGalleryGrid({
  images,
  removedIds,
  pendingFiles = [],
  disabled = false,
  embedded = false,
  showAddTile = false,
  onToggleRemove,
  onRemovePendingFile,
  onAddFiles,
  replacementPreviews = {},
  onReplaceImage,
  onCancelReplace,
  replaceStatusById = {},
  replaceErrorById = {},
  onRetryReplace,
  allowPermanentDelete = false,
  onPermanentDelete,
}: EditableGalleryGridProps) {
  const { t } = useTranslation()
  const pendingPreviews = usePendingGalleryPreviews(pendingFiles)
  const [cropReplace, setCropReplace] = useState<{ imageId: number; file: File } | null>(null)
  const hasContent =
    images.length > 0 || pendingPreviews.length > 0 || (showAddTile && onAddFiles)

  if (!hasContent) {
    return null
  }

  const grid = (
    <div
      className={
        embedded
          ? 'contents'
          : 'mt-3 grid grid-cols-2 gap-2.5 md:grid-cols-[repeat(auto-fill,minmax(130px,1fr))] md:gap-3 xl:grid-cols-[repeat(auto-fill,minmax(140px,1fr))] xl:gap-4'
      }
    >
      {images.map((image) => {
        const isPendingRemoval = removedIds.includes(image.id)
        const replacementPreviewUrl = replacementPreviews[image.id]

        return (
          <ExistingGalleryCard
            key={image.id}
            image={image}
            isPendingRemoval={isPendingRemoval}
            disabled={disabled}
            replacementPreviewUrl={replacementPreviewUrl}
            replaceStatus={replaceStatusById[image.id]}
            replaceError={replaceErrorById[image.id]}
            allowPermanentDelete={allowPermanentDelete}
            onToggleRemove={(remove) => onToggleRemove(image.id, remove)}
            onReplaceImage={
              onReplaceImage ? (file) => setCropReplace({ imageId: image.id, file }) : undefined
            }
            onCancelReplace={
              onCancelReplace && replacementPreviewUrl
                ? () => onCancelReplace(image.id)
                : undefined
            }
            onRetryReplace={
              onRetryReplace && replaceStatusById[image.id] === 'failed'
                ? () => onRetryReplace(image.id)
                : undefined
            }
            onPermanentDelete={
              onPermanentDelete
                ? () => {
                    if (
                      window.confirm(
                        'Permanently delete this image from the media library? This cannot be undone.',
                      )
                    ) {
                      onPermanentDelete(image.id)
                    }
                  }
                : undefined
            }
          />
        )
      })}

      {pendingPreviews.map((item) => (
        <PendingGalleryCard
          key={item.key}
          item={item}
          disabled={disabled}
          onRemove={() => onRemovePendingFile?.(item.index)}
        />
      ))}

      {showAddTile && onAddFiles ? (
        <GalleryAddCropTile disabled={disabled} onAddFiles={onAddFiles} />
      ) : null}
    </div>
  )

  const cropModal = cropReplace ? (
    <Suspense fallback={null}>
      <ImageCropModal
        open={Boolean(cropReplace)}
        file={cropReplace.file}
        title={t('widgets.cropGalleryReplacement')}
        onClose={() => setCropReplace(null)}
        onSave={(file) => {
          if (onReplaceImage) {
            onReplaceImage(cropReplace.imageId, file)
          }
          setCropReplace(null)
        }}
      />
    </Suspense>
  ) : null

  if (embedded) {
    return (
      <>
        {grid}
        {cropModal}
      </>
    )
  }

  return (
    <>
      <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
        <p className="text-xs font-medium uppercase tracking-wide text-navy-muted">{t('detail.gallery')}</p>
        {grid}
      </div>
      {cropModal}
    </>
  )
}
