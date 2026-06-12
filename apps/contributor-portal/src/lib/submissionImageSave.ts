import {
  ApiError,
  getMySubmission,
  updateMySubmission,
  type CoinSubmissionDetail,
} from './api'
import { appendSubmissionImageUpdateFormData } from './coinFormData'

export type SubmissionImageSaveResult =
  | { ok: true; submission: CoinSubmissionDetail }
  | { ok: false; message: string; code?: string }

async function refreshSubmissionDetail(
  submissionId: number,
  token: string,
  fallback: CoinSubmissionDetail,
): Promise<CoinSubmissionDetail> {
  try {
    const response = await getMySubmission(submissionId, token)
    return response.submission
  } catch {
    return fallback
  }
}

async function runImageUpdate(
  submissionId: number,
  submission: CoinSubmissionDetail,
  token: string,
  images: Parameters<typeof appendSubmissionImageUpdateFormData>[2],
): Promise<SubmissionImageSaveResult> {
  const formData = new FormData()
  appendSubmissionImageUpdateFormData(formData, submission, images)

  try {
    const response = await updateMySubmission(submissionId, formData, token)
    return { ok: true, submission: response.submission }
  } catch (err) {
    if (err instanceof ApiError) {
      return { ok: false, message: err.message, code: err.code }
    }
    return { ok: false, message: 'Unable to save image changes. Check your connection and try again.' }
  }
}

export async function saveObverseImage(
  submissionId: number,
  submission: CoinSubmissionDetail,
  file: File,
  token: string,
): Promise<SubmissionImageSaveResult> {
  return runImageUpdate(submissionId, submission, token, { obverse: file })
}

export async function saveReverseImage(
  submissionId: number,
  submission: CoinSubmissionDetail,
  file: File,
  token: string,
): Promise<SubmissionImageSaveResult> {
  return runImageUpdate(submissionId, submission, token, { reverse: file })
}

export async function saveGalleryAdd(
  submissionId: number,
  submission: CoinSubmissionDetail,
  files: File[],
  token: string,
): Promise<SubmissionImageSaveResult> {
  const galleryCountBefore = submission.images.gallery?.length ?? 0
  const result = await runImageUpdate(submissionId, submission, token, { gallery: files })

  if (!result.ok) {
    return result
  }

  const refreshed = await refreshSubmissionDetail(submissionId, token, result.submission)
  const galleryCountAfter = refreshed.images.gallery?.length ?? 0

  if (galleryCountAfter <= galleryCountBefore) {
    return {
      ok: false,
      message: 'Gallery upload could not be confirmed. Please try again.',
    }
  }

  return { ok: true, submission: refreshed }
}

export async function saveGalleryRemove(
  submissionId: number,
  submission: CoinSubmissionDetail,
  imageId: number,
  token: string,
): Promise<SubmissionImageSaveResult> {
  const galleryCountBefore = submission.images.gallery?.length ?? 0
  const result = await runImageUpdate(submissionId, submission, token, {
    removeGalleryImageIds: [imageId],
  })

  if (!result.ok) {
    return result
  }

  const refreshed = await refreshSubmissionDetail(submissionId, token, result.submission)
  const galleryCountAfter = refreshed.images.gallery?.length ?? 0

  if (galleryCountBefore > 0 && galleryCountAfter >= galleryCountBefore) {
    return {
      ok: false,
      message: 'Gallery removal could not be confirmed. Please try again.',
    }
  }

  return { ok: true, submission: refreshed }
}

export async function saveGalleryReplace(
  submissionId: number,
  submission: CoinSubmissionDetail,
  imageId: number,
  file: File,
  token: string,
): Promise<SubmissionImageSaveResult> {
  const galleryCountBefore = submission.images.gallery?.length ?? 0
  const result = await runImageUpdate(submissionId, submission, token, {
    replaceGallery: { imageId, file },
  })

  if (!result.ok) {
    return result
  }

  const refreshed = await refreshSubmissionDetail(submissionId, token, result.submission)
  const galleryCountAfter = refreshed.images.gallery?.length ?? 0

  if (galleryCountBefore > 0 && galleryCountAfter !== galleryCountBefore) {
    return {
      ok: false,
      message: 'Gallery replace could not be confirmed. Please try again.',
    }
  }

  if (refreshed.images.gallery?.some((image) => image.id === imageId)) {
    return {
      ok: false,
      message: 'Gallery replace could not be confirmed. Please try again.',
    }
  }

  return { ok: true, submission: refreshed }
}

export async function saveGalleryPermanentDelete(
  submissionId: number,
  submission: CoinSubmissionDetail,
  imageId: number,
  token: string,
): Promise<SubmissionImageSaveResult> {
  const galleryCountBefore = submission.images.gallery?.length ?? 0
  const inGallery = submission.images.gallery?.some((image) => image.id === imageId) ?? false

  const result = await runImageUpdate(submissionId, submission, token, {
    removeGalleryImageIds: inGallery ? [imageId] : undefined,
    deleteGalleryAttachmentIds: [imageId],
  })

  if (!result.ok) {
    return result
  }

  const refreshed = await refreshSubmissionDetail(submissionId, token, result.submission)
  const galleryCountAfter = refreshed.images.gallery?.length ?? 0

  if (inGallery && galleryCountBefore > 0 && galleryCountAfter >= galleryCountBefore) {
    return {
      ok: false,
      message: 'Gallery delete could not be confirmed. Please try again.',
    }
  }

  return { ok: true, submission: refreshed }
}
