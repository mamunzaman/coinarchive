import type { CoinSubmissionDetail } from './api'
import type {
  FaceAutosaveState,
  SubmissionDetailImageEditState,
} from '../hooks/useSubmissionImageAutosave'

export function resolveFaceDisplayUrl(
  apiUrl: string | null | undefined,
  faceState: FaceAutosaveState,
): string | null {
  if (faceState.previewUrl) {
    return faceState.previewUrl
  }

  return apiUrl ?? null
}

export function getVisibleGalleryImages(
  submission: CoinSubmissionDetail,
  editState: SubmissionDetailImageEditState,
) {
  return (submission.images.gallery ?? []).filter(
    (image) => !editState.hiddenGalleryIds.includes(image.id),
  )
}

export function getLivePreviewGalleryCount(
  submission: CoinSubmissionDetail,
  editState: SubmissionDetailImageEditState,
): number {
  return (
    getVisibleGalleryImages(submission, editState).length + editState.pendingGalleryUploads.length
  )
}
