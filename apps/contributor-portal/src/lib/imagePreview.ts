import i18n from '../i18n'
import type { DefaultImageRef } from '../types/formOptions'
import type { ImageLoadStatus } from '../hooks/useImageLoadState'
import type { CoinSubmissionDetail } from './api'

export type ImagePreviewSource = 'selected' | 'existing' | 'default' | 'none'

export type CoinImagePreviewDisplayState =
  | 'empty'
  | 'loading-default'
  | 'loading-image'
  | 'loaded'
  | 'error'

export function resolveCoinImagePreviewDisplayState(options: {
  formOptionsLoading?: boolean
  previewSource?: ImagePreviewSource
  previewUrl?: string | null
  imageLoadStatus: ImageLoadStatus
  isNewSelection?: boolean
}): CoinImagePreviewDisplayState {
  const {
    formOptionsLoading = false,
    previewSource = 'none',
    previewUrl,
    imageLoadStatus,
    isNewSelection = false,
  } = options

  if (previewUrl && imageLoadStatus === 'loaded') {
    return 'loaded'
  }

  if (previewUrl && imageLoadStatus === 'error') {
    return 'error'
  }

  if (
    formOptionsLoading &&
    !isNewSelection &&
    previewSource !== 'selected' &&
    previewSource !== 'existing'
  ) {
    return 'loading-default'
  }

  if (
    previewSource === 'default' &&
    !previewUrl &&
    !isNewSelection
  ) {
    return 'loading-default'
  }

  if (previewUrl) {
    return 'loading-image'
  }

  return 'empty'
}

export function getCoinImagePreviewLoadingText(
  displayState: CoinImagePreviewDisplayState,
  previewSource: ImagePreviewSource = 'none',
): string | null {
  if (displayState === 'loading-default') {
    return 'Loading default image…'
  }

  if (displayState === 'loading-image') {
    return previewSource === 'default' ? 'Loading default image…' : 'Loading image…'
  }

  return null
}

export function getDefaultImagePreviewUrl(ref?: DefaultImageRef | null): string | null {
  if (!ref) {
    return null
  }

  return ref.thumb_url || ref.url || null
}

export function resolveCoinImagePreviewUrl(options: {
  selectedPreviewUrl?: string | null
  hasSelectedImage?: boolean
  uploadedPreviewUrl?: string | null
  existingImageUrl?: string | null
  defaultImageUrl?: string | null
  fallbackPlaceholder?: string | null
}): string | null {
  const {
    selectedPreviewUrl,
    hasSelectedImage = false,
    uploadedPreviewUrl,
    existingImageUrl,
    defaultImageUrl,
    fallbackPlaceholder,
  } = options

  if (selectedPreviewUrl) {
    return selectedPreviewUrl
  }

  if (hasSelectedImage) {
    return fallbackPlaceholder ?? null
  }

  return (
    uploadedPreviewUrl ||
    existingImageUrl ||
    defaultImageUrl ||
    fallbackPlaceholder ||
    null
  )
}

export function resolveSubmissionDetailFaceImageUrl(
  submission: CoinSubmissionDetail,
  side: 'obverse' | 'reverse',
): string | null {
  const existingImageUrl =
    side === 'obverse'
      ? submission.images.obverse?.url || submission.obverse_url
      : submission.images.reverse?.url || submission.reverse_url
  const defaultImageUrl =
    side === 'obverse'
      ? submission.default_obverse_url || submission.default_image_url
      : submission.default_reverse_url || submission.default_image_url

  return resolveCoinImagePreviewUrl({
    existingImageUrl,
    defaultImageUrl,
    fallbackPlaceholder: null,
  })
}

export function getImagePreviewSource(
  file: File | null | undefined,
  existingUrl?: string | null,
  defaultRef?: DefaultImageRef | null,
): ImagePreviewSource {
  if (file) {
    return 'selected'
  }

  if (existingUrl) {
    return 'existing'
  }

  if (getDefaultImagePreviewUrl(defaultRef)) {
    return 'default'
  }

  return 'none'
}

export function hasEffectiveCoinImage(
  file: File | null | undefined,
  existingUrl?: string | null,
  defaultRef?: DefaultImageRef | null,
): boolean {
  return getImagePreviewSource(file, existingUrl, defaultRef) !== 'none'
}

export function getImagePreviewLabel(source: ImagePreviewSource, fileName?: string | null): string {
  if (source === 'selected' && fileName) {
    return fileName
  }

  if (source === 'selected') {
    return i18n.t('imagePreview.imageSelected')
  }

  if (source === 'existing') {
    return i18n.t('imagePreview.currentImage')
  }

  if (source === 'default') {
    return i18n.t('imagePreview.defaultWillBeUsed')
  }

  return i18n.t('upload.noFileSelected')
}

export function getImageReviewStateLabel(source: ImagePreviewSource): string {
  if (source === 'selected') {
    return i18n.t('imagePreview.newSelectedForUpload')
  }

  if (source === 'existing') {
    return i18n.t('imagePreview.existingSubmission')
  }

  if (source === 'default') {
    return i18n.t('imagePreview.willUseDefault')
  }

  return i18n.t('imagePreview.notProvided')
}

export function getImageWorkspaceStatusLabel(source: ImagePreviewSource, ready: boolean): string {
  if (source === 'default') {
    return i18n.t('imagePreview.wordpressDefault')
  }

  if (ready) {
    return i18n.t('imagePreview.ready')
  }

  return i18n.t('imagePreview.missing')
}

export type CoinImageClearActionVariant = 'default' | 'destructive'

export function resolveCoinImageClearAction(options: {
  sideLabel: string
  isNewSelection: boolean
  hasExistingImage: boolean
  imageEditMode?: boolean
  existingImageRemoved?: boolean
}): {
  label: string
  variant: CoinImageClearActionVariant
  ariaLabel: string
} | null {
  const {
    sideLabel,
    isNewSelection,
    hasExistingImage,
    imageEditMode = false,
    existingImageRemoved = false,
  } = options

  if (existingImageRemoved) {
    return null
  }

  if (isNewSelection) {
    const label =
      imageEditMode && hasExistingImage
        ? i18n.t('imagePreview.useCurrentImage')
        : i18n.t('imagePreview.useDefault')
    const ariaLabel =
      imageEditMode && hasExistingImage
        ? i18n.t('imagePreview.useCurrentImageAria', { side: sideLabel })
        : i18n.t('imagePreview.useDefaultAria', { side: sideLabel })

    return {
      label,
      variant: 'default',
      ariaLabel,
    }
  }

  if (imageEditMode && hasExistingImage) {
    return {
      label: i18n.t('imagePreview.removeImage'),
      variant: 'destructive',
      ariaLabel: i18n.t('imagePreview.removeImageAria', { side: sideLabel }),
    }
  }

  return null
}

export function getCoinImageRemovePreviewNotice(): string {
  return i18n.t('imagePreview.removePreviewNotice')
}
