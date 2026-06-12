import { validateImageFile } from './validation'

export const MIN_IMAGE_DIMENSION = 800

export type ImageQualityItem = {
  id: string
  label: string
  status: 'pass' | 'warn' | 'fail'
  detail?: string
}

type ImageQualityContext = {
  hasObverse: boolean
  hasReverse: boolean
  hasGallery: boolean
  obverseFile: File | null
  reverseFile: File | null
  galleryFiles: File[]
  obverseDimensions: { width: number; height: number } | null
  reverseDimensions: { width: number; height: number } | null
}

function checkFileType(file: File | null): string | null {
  if (!file) {
    return null
  }

  return validateImageFile(file)
}

function checkDimensions(
  file: File | null,
  dimensions: { width: number; height: number } | null,
): string | null {
  if (!file) {
    return null
  }

  if (!dimensions) {
    return 'Checking dimensions…'
  }

  if (dimensions.width < MIN_IMAGE_DIMENSION || dimensions.height < MIN_IMAGE_DIMENSION) {
    return `Minimum ${MIN_IMAGE_DIMENSION}px on each side recommended.`
  }

  return null
}

export function buildImageQualityChecklist(context: ImageQualityContext): ImageQualityItem[] {
  const obverseTypeError = checkFileType(context.obverseFile)
  const reverseTypeError = checkFileType(context.reverseFile)
  const obverseDimensionError = checkDimensions(context.obverseFile, context.obverseDimensions)
  const reverseDimensionError = checkDimensions(context.reverseFile, context.reverseDimensions)

  const galleryTypeError = context.galleryFiles
    .map((file) => validateImageFile(file))
    .find(Boolean)

  const items: ImageQualityItem[] = [
    {
      id: 'obverse',
      label: 'Obverse image',
      status: context.hasObverse
        ? obverseTypeError || obverseDimensionError
          ? 'fail'
          : 'pass'
        : 'fail',
      detail: !context.hasObverse
        ? 'Required'
        : obverseTypeError ?? obverseDimensionError ?? undefined,
    },
    {
      id: 'reverse',
      label: 'Reverse image',
      status: context.hasReverse
        ? reverseTypeError || reverseDimensionError
          ? 'fail'
          : 'pass'
        : 'fail',
      detail: !context.hasReverse
        ? 'Required'
        : reverseTypeError ?? reverseDimensionError ?? undefined,
    },
    {
      id: 'gallery',
      label: 'Gallery image',
      status: context.hasGallery ? (galleryTypeError ? 'fail' : 'pass') : 'warn',
      detail: !context.hasGallery
        ? 'Gallery recommended'
        : galleryTypeError ?? undefined,
    },
  ]

  return items
}
