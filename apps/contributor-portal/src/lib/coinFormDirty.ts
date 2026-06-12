import type { CoinFormValues } from '../types/coinForm'

export function areCoinFormValuesEqual(left: CoinFormValues, right: CoinFormValues): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

export function hasPendingCoinImageChanges(state: {
  obverseFile?: File | null
  reverseFile?: File | null
  galleryFiles?: File[]
  removedGalleryImageIds?: number[]
  galleryReplacements?: Record<number, File>
  permanentDeleteGalleryIds?: number[]
}): boolean {
  return (
    Boolean(state.obverseFile) ||
    Boolean(state.reverseFile) ||
    (state.galleryFiles?.length ?? 0) > 0 ||
    (state.removedGalleryImageIds?.length ?? 0) > 0 ||
    Object.keys(state.galleryReplacements ?? {}).length > 0 ||
    (state.permanentDeleteGalleryIds?.length ?? 0) > 0
  )
}
