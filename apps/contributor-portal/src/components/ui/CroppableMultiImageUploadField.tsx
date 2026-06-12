import { lazy, Suspense, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { GalleryAddCropTile, GalleryCornerRemoveButton } from '../coin/EditableGalleryGrid'
import { validateGalleryFiles } from './MultiImageUploadField'

const ImageCropModal = lazy(() =>
  import('./ImageCropModal').then((module) => ({ default: module.ImageCropModal })),
)

type CroppableMultiImageUploadFieldProps = {
  label: string
  hint?: string
  error?: string
  files: File[]
  name?: string
  id?: string
  disabled?: boolean
  hideFileList?: boolean
  onFilesChange: (files: File[]) => void
}

type FilePreview = {
  key: string
  file: File
  url: string
  index: number
}

function useFilePreviews(files: File[]): FilePreview[] {
  const [previews, setPreviews] = useState<FilePreview[]>([])

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

function NewGalleryFileCard({
  preview,
  disabled,
  onRemove,
}: {
  preview: FilePreview
  disabled?: boolean
  onRemove: () => void
}) {
  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-primary/35 bg-white shadow-sm ring-1 ring-primary/10">
      <div className="relative aspect-square w-full shrink-0 overflow-hidden">
        <img src={preview.url} alt={preview.file.name} className="h-full w-full object-cover" />
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

export function CroppableMultiImageUploadField({
  label,
  hint = 'JPG, PNG, WEBP up to 5MB each',
  error,
  files,
  id,
  disabled,
  hideFileList = false,
  onFilesChange,
}: CroppableMultiImageUploadFieldProps) {
  const fieldId = id ?? label.toLowerCase().replace(/\s+/g, '-')
  const errorId = error ? `${fieldId}-error` : undefined
  const previews = useFilePreviews(files)
  const validationError = validateGalleryFiles(files)

  function handleAddFiles(newFiles: File[]) {
    onFilesChange([...files, ...newFiles])
  }

  function removeFile(index: number) {
    onFilesChange(files.filter((_, fileIndex) => fileIndex !== index))
  }

  if (hideFileList) {
    return null
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <label htmlFor={fieldId} className="text-sm font-medium text-navy">
          {label}
        </label>
        <p id={fieldId} className="text-xs text-navy-muted">
          {hint}
        </p>
      </div>

      <div
        className={[
          'rounded-xl border bg-muted/20 p-3',
          error || validationError ? 'border-red-300' : 'border-border/60',
        ].join(' ')}
        aria-invalid={error || validationError ? true : undefined}
        aria-describedby={errorId}
      >
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-[repeat(auto-fill,minmax(130px,1fr))] md:gap-3 xl:grid-cols-[repeat(auto-fill,minmax(140px,1fr))] xl:gap-4">
          {previews.map((preview) => (
            <NewGalleryFileCard
              key={preview.key}
              preview={preview}
              disabled={disabled}
              onRemove={() => removeFile(preview.index)}
            />
          ))}
          <GalleryAddCropTile disabled={disabled} onAddFiles={handleAddFiles} />
        </div>
      </div>

      {error || validationError ? (
        <p id={errorId} role="alert" className="text-xs text-red-600">
          {error ?? validationError}
        </p>
      ) : null}
    </div>
  )
}

export function useGalleryCropReplace() {
  const { t } = useTranslation()
  const [pendingReplace, setPendingReplace] = useState<{
    file: File
    onComplete: (file: File) => void
  } | null>(null)

  function requestCropReplace(file: File, onComplete: (file: File) => void) {
    setPendingReplace({ file, onComplete })
  }

  function closeCropReplace() {
    setPendingReplace(null)
  }

  const cropModal = pendingReplace ? (
    <Suspense fallback={null}>
      <ImageCropModal
        open={Boolean(pendingReplace)}
        file={pendingReplace.file}
        title={t('widgets.cropGalleryImage')}
        onClose={closeCropReplace}
        onSave={(file) => {
          pendingReplace.onComplete(file)
          closeCropReplace()
        }}
      />
    </Suspense>
  ) : null

  return { pendingReplace, requestCropReplace, closeCropReplace, cropModal }
}
