import {
  getCoinImageRemovePreviewNotice,
  getImagePreviewLabel,
  resolveCoinImageClearAction,
  type ImagePreviewSource,
} from '../../lib/imagePreview'
import { CroppableFileUploadField } from '../ui/CroppableFileUploadField'

type ExistingImageReplaceFieldProps = {
  label: string
  replaceLabel: string
  sideLabel: string
  currentUrl?: string | null
  previewUrl?: string | null
  previewSource?: ImagePreviewSource
  previewAlt?: string
  fileName?: string | null
  isNewSelection?: boolean
  imageEditMode?: boolean
  existingImageRemoved?: boolean
  error?: string
  attention?: string
  formOptionsLoading?: boolean
  name?: string
  disabled?: boolean
  onFileChange: (file: File | null) => void
  onClear?: () => void
}

export function ExistingImageReplaceField({
  label,
  replaceLabel,
  sideLabel,
  currentUrl,
  previewUrl,
  previewSource = 'none',
  previewAlt,
  fileName,
  isNewSelection = false,
  imageEditMode = false,
  existingImageRemoved = false,
  error,
  attention,
  formOptionsLoading = false,
  name,
  disabled,
  onFileChange,
  onClear,
}: ExistingImageReplaceFieldProps) {
  const thumbnailUrl = previewUrl ?? currentUrl ?? null
  const hasExistingImage = Boolean(currentUrl)
  const clearAction = resolveCoinImageClearAction({
    sideLabel,
    isNewSelection,
    hasExistingImage,
    imageEditMode,
    existingImageRemoved,
  })
  const clearNotice =
    imageEditMode && existingImageRemoved && !isNewSelection
      ? getCoinImageRemovePreviewNotice()
      : null

  return (
    <div className="flex h-full min-w-0 flex-col">
      <CroppableFileUploadField
        label={replaceLabel}
        name={name}
        fileName={fileName ?? null}
        previewUrl={thumbnailUrl}
        previewSource={isNewSelection ? 'selected' : previewSource}
        previewLabel={getImagePreviewLabel(isNewSelection ? 'selected' : previewSource, fileName)}
        previewAlt={previewAlt ?? label}
        formOptionsLoading={formOptionsLoading}
        isNewSelection={isNewSelection}
        clearAction={clearAction}
        clearNotice={clearNotice}
        error={error}
        attention={attention}
        disabled={disabled}
        onFileChange={onFileChange}
        onClear={onClear}
      />
    </div>
  )
}
