import { useCallback, useEffect, useRef, useState } from 'react'
import type { CoinSubmissionDetail } from '../lib/api'
import { useAuth } from './useAuth'
import {
  saveGalleryAdd,
  saveGalleryPermanentDelete,
  saveGalleryRemove,
  saveGalleryReplace,
  saveObverseImage,
  saveReverseImage,
} from '../lib/submissionImageSave'
import { validateImageFile } from '../lib/validation'
import { validateGalleryFiles } from '../components/ui/MultiImageUploadField'

const SAVED_FLASH_MS = 2000
const REMOVAL_UNDO_MS = 4000

export type ImageCardStatus = 'idle' | 'uploading' | 'saved' | 'failed'

export type FaceAutosaveState = {
  status: ImageCardStatus
  previewUrl: string | null
  pendingFile: File | null
  error: string | null
}

export type PendingGalleryUpload = {
  clientId: string
  file: File
  previewUrl: string
  status: ImageCardStatus
  error: string | null
}

export type UndoRemovalSnack = {
  imageId: number
  label: string
}

export type GalleryReplaceState = {
  status: ImageCardStatus
  previewUrl: string | null
  pendingFile: File | null
  error: string | null
}

export type SubmissionDetailImageEditState = {
  isEditing: boolean
  obverse: FaceAutosaveState
  reverse: FaceAutosaveState
  pendingGalleryUploads: PendingGalleryUpload[]
  hiddenGalleryIds: number[]
  galleryReplaceStates: Record<number, GalleryReplaceState>
  undoSnack: UndoRemovalSnack | null
  activeSaveCount: number
  hasFailures: boolean
}

const EMPTY_FACE: FaceAutosaveState = {
  status: 'idle',
  previewUrl: null,
  pendingFile: null,
  error: null,
}

export const EMPTY_IMAGE_EDIT_STATE: SubmissionDetailImageEditState = {
  isEditing: false,
  obverse: { ...EMPTY_FACE },
  reverse: { ...EMPTY_FACE },
  pendingGalleryUploads: [],
  hiddenGalleryIds: [],
  galleryReplaceStates: {},
  undoSnack: null,
  activeSaveCount: 0,
  hasFailures: false,
}

function createClientId(): string {
  return `gallery-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function revokePreviewUrl(url: string | null) {
  if (url?.startsWith('blob:')) {
    URL.revokeObjectURL(url)
  }
}

type UseSubmissionImageAutosaveOptions = {
  submissionId: number
  submission: CoinSubmissionDetail | null
  onSubmissionUpdated: (submission: CoinSubmissionDetail) => void
}

export function useSubmissionImageAutosave({
  submissionId,
  submission,
  onSubmissionUpdated,
}: UseSubmissionImageAutosaveOptions) {
  const { token } = useAuth()
  const [editState, setEditState] = useState<SubmissionDetailImageEditState>(EMPTY_IMAGE_EDIT_STATE)
  const submissionRef = useRef(submission)
  const removalTimersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())
  const savedFlashTimersRef = useRef<Map<'obverse' | 'reverse', ReturnType<typeof setTimeout>>>(
    new Map(),
  )

  submissionRef.current = submission

  const clearRemovalTimer = useCallback((imageId: number) => {
    const timer = removalTimersRef.current.get(imageId)
    if (timer) {
      clearTimeout(timer)
      removalTimersRef.current.delete(imageId)
    }
  }, [])

  const clearAllRemovalTimers = useCallback(() => {
    for (const timer of removalTimersRef.current.values()) {
      clearTimeout(timer)
    }
    removalTimersRef.current.clear()
  }, [])

  const resetEditState = useCallback(() => {
    clearAllRemovalTimers()
    for (const timer of savedFlashTimersRef.current.values()) {
      clearTimeout(timer)
    }
    savedFlashTimersRef.current.clear()

    setEditState((current) => {
      revokePreviewUrl(current.obverse.previewUrl)
      revokePreviewUrl(current.reverse.previewUrl)
      for (const item of current.pendingGalleryUploads) {
        revokePreviewUrl(item.previewUrl)
      }
      for (const replaceState of Object.values(current.galleryReplaceStates)) {
        revokePreviewUrl(replaceState.previewUrl)
      }
      return { ...EMPTY_IMAGE_EDIT_STATE }
    })
  }, [clearAllRemovalTimers])

  useEffect(() => {
    return () => {
      clearAllRemovalTimers()
      for (const timer of savedFlashTimersRef.current.values()) {
        clearTimeout(timer)
      }
    }
  }, [clearAllRemovalTimers])

  const beginSave = useCallback(() => {
    setEditState((current) => ({
      ...current,
      activeSaveCount: current.activeSaveCount + 1,
    }))
  }, [])

  const endSave = useCallback((failed: boolean) => {
    setEditState((current) => {
      const nextCount = Math.max(0, current.activeSaveCount - 1)
      const hasFailedItems =
        current.obverse.status === 'failed' ||
        current.reverse.status === 'failed' ||
        current.pendingGalleryUploads.some((item) => item.status === 'failed') ||
        Object.values(current.galleryReplaceStates).some((item) => item.status === 'failed')

      return {
        ...current,
        activeSaveCount: nextCount,
        hasFailures: failed ? true : hasFailedItems,
      }
    })
  }, [])

  const flashFaceSaved = useCallback((side: 'obverse' | 'reverse') => {
    const existing = savedFlashTimersRef.current.get(side)
    if (existing) {
      clearTimeout(existing)
    }

    const timer = setTimeout(() => {
      setEditState((current) => {
        revokePreviewUrl(current[side].previewUrl)
        return {
          ...current,
          [side]: {
            status: 'idle',
            previewUrl: null,
            pendingFile: null,
            error: null,
          },
        }
      })
      savedFlashTimersRef.current.delete(side)
    }, SAVED_FLASH_MS)

    savedFlashTimersRef.current.set(side, timer)
  }, [])

  const uploadFace = useCallback(
    async (side: 'obverse' | 'reverse', file: File) => {
      const currentSubmission = submissionRef.current

      if (!currentSubmission || !token) {
        setEditState((current) => ({
          ...current,
          [side]: {
            ...current[side],
            status: 'failed',
            error: token ? 'Submission unavailable.' : 'Your session has expired. Please sign in again.',
          },
        }))
        return
      }

      const validationError = validateImageFile(file)
      if (validationError) {
        const previewUrl = URL.createObjectURL(file)
        setEditState((current) => {
          revokePreviewUrl(current[side].previewUrl)
          return {
            ...current,
            [side]: {
              status: 'failed',
              previewUrl,
              pendingFile: file,
              error: validationError,
            },
          }
        })
        return
      }

      const previewUrl = URL.createObjectURL(file)

      setEditState((current) => {
        revokePreviewUrl(current[side].previewUrl)
        return {
          ...current,
          hasFailures: false,
          [side]: {
            status: 'uploading',
            previewUrl,
            pendingFile: file,
            error: null,
          },
        }
      })

      beginSave()

      const result =
        side === 'obverse'
          ? await saveObverseImage(submissionId, currentSubmission, file, token)
          : await saveReverseImage(submissionId, currentSubmission, file, token)

      endSave(!result.ok)

      if (result.ok) {
        submissionRef.current = result.submission
        onSubmissionUpdated(result.submission)
        setEditState((current) => {
          revokePreviewUrl(current[side].previewUrl)
          return {
            ...current,
            [side]: {
              status: 'saved',
              previewUrl: null,
              pendingFile: null,
              error: null,
            },
          }
        })
        flashFaceSaved(side)
        return
      }

      setEditState((current) => ({
        ...current,
        [side]: {
          status: 'failed',
          previewUrl,
          pendingFile: file,
          error: result.message,
        },
      }))
    },
    [beginSave, endSave, flashFaceSaved, onSubmissionUpdated, submissionId, token],
  )

  const uploadGalleryFile = useCallback(
    async (file: File, clientId?: string) => {
      const id = clientId ?? createClientId()

      const validationError = validateGalleryFiles([file])
      if (validationError) {
        const previewUrl = URL.createObjectURL(file)
        setEditState((current) => ({
          ...current,
          hasFailures: true,
          pendingGalleryUploads: [
            ...current.pendingGalleryUploads,
            {
              clientId: id,
              file,
              previewUrl,
              status: 'failed',
              error: validationError,
            },
          ],
        }))
        return
      }

      const previewUrl = URL.createObjectURL(file)

      setEditState((current) => {
        const existing = current.pendingGalleryUploads.find((item) => item.clientId === id)
        if (existing) {
          if (existing.previewUrl !== previewUrl) {
            revokePreviewUrl(existing.previewUrl)
          }
          return {
            ...current,
            hasFailures: false,
            pendingGalleryUploads: current.pendingGalleryUploads.map((item) =>
              item.clientId === id
                ? { ...item, status: 'uploading', error: null, previewUrl }
                : item,
            ),
          }
        }

        return {
          ...current,
          hasFailures: false,
          pendingGalleryUploads: [
            ...current.pendingGalleryUploads,
            { clientId: id, file, previewUrl, status: 'uploading', error: null },
          ],
        }
      })

      const snapshot = submissionRef.current

      if (!token || !snapshot) {
        setEditState((current) => ({
          ...current,
          hasFailures: true,
          pendingGalleryUploads: current.pendingGalleryUploads.map((item) =>
            item.clientId === id
              ? {
                  ...item,
                  status: 'failed',
                  error: token
                    ? 'Submission unavailable.'
                    : 'Your session has expired. Please sign in again.',
                }
              : item,
          ),
        }))
        return
      }

      beginSave()

      const result = await saveGalleryAdd(submissionId, snapshot, [file], token)
      endSave(!result.ok)

      if (result.ok) {
        submissionRef.current = result.submission
        onSubmissionUpdated(result.submission)

        setEditState((current) => {
          const item = current.pendingGalleryUploads.find((entry) => entry.clientId === id)
          if (item) {
            revokePreviewUrl(item.previewUrl)
          }
          return {
            ...current,
            pendingGalleryUploads: current.pendingGalleryUploads.filter(
              (entry) => entry.clientId !== id,
            ),
          }
        })
        return
      }

      setEditState((current) => ({
        ...current,
        pendingGalleryUploads: current.pendingGalleryUploads.map((item) =>
          item.clientId === id
            ? { ...item, status: 'failed', error: result.message }
            : item,
        ),
      }))
    },
    [beginSave, endSave, onSubmissionUpdated, submissionId, token],
  )

  const executeGalleryRemove = useCallback(
    async (imageId: number) => {
      clearRemovalTimer(imageId)

      const snapshot = submissionRef.current

      if (!snapshot || !token) {
        setEditState((current) => ({
          ...current,
          hiddenGalleryIds: current.hiddenGalleryIds.filter((id) => id !== imageId),
          undoSnack: null,
          hasFailures: true,
        }))
        return
      }

      beginSave()

      const result = await saveGalleryRemove(submissionId, snapshot, imageId, token)
      endSave(!result.ok)

      if (result.ok) {
        submissionRef.current = result.submission
        onSubmissionUpdated(result.submission)
        setEditState((current) => ({
          ...current,
          hiddenGalleryIds: current.hiddenGalleryIds.filter((id) => id !== imageId),
          undoSnack: null,
        }))
        return
      }

      setEditState((current) => ({
        ...current,
        hiddenGalleryIds: current.hiddenGalleryIds.filter((id) => id !== imageId),
        undoSnack: null,
        hasFailures: true,
      }))
    },
    [beginSave, clearRemovalTimer, endSave, onSubmissionUpdated, submissionId, token],
  )

  const scheduleGalleryRemove = useCallback(
    (imageId: number) => {
      clearRemovalTimer(imageId)

      setEditState((current) => ({
        ...current,
        hiddenGalleryIds: current.hiddenGalleryIds.includes(imageId)
          ? current.hiddenGalleryIds
          : [...current.hiddenGalleryIds, imageId],
        undoSnack: { imageId, label: 'Gallery image removed' },
        hasFailures: false,
      }))

      const timer = setTimeout(() => {
        removalTimersRef.current.delete(imageId)
        void executeGalleryRemove(imageId)
      }, REMOVAL_UNDO_MS)

      removalTimersRef.current.set(imageId, timer)
    },
    [clearRemovalTimer, executeGalleryRemove],
  )

  const undoGalleryRemove = useCallback(
    (imageId: number) => {
      clearRemovalTimer(imageId)
      setEditState((current) => ({
        ...current,
        hiddenGalleryIds: current.hiddenGalleryIds.filter((id) => id !== imageId),
        undoSnack: current.undoSnack?.imageId === imageId ? null : current.undoSnack,
      }))
    },
    [clearRemovalTimer],
  )

  const startEdit = useCallback(() => {
    setEditState({
      ...EMPTY_IMAGE_EDIT_STATE,
      isEditing: true,
    })
  }, [])

  const finishEdit = useCallback(() => {
    resetEditState()
  }, [resetEditState])

  const handleObverseChange = useCallback(
    (file: File | null) => {
      if (!file) {
        return
      }
      void uploadFace('obverse', file)
    },
    [uploadFace],
  )

  const handleReverseChange = useCallback(
    (file: File | null) => {
      if (!file) {
        return
      }
      void uploadFace('reverse', file)
    },
    [uploadFace],
  )

  const handleGalleryAdd = useCallback(
    (files: File[]) => {
      for (const file of files) {
        void uploadGalleryFile(file)
      }
    },
    [uploadGalleryFile],
  )

  const retryObverse = useCallback(() => {
    const file = editState.obverse.pendingFile
    if (file) {
      void uploadFace('obverse', file)
    }
  }, [editState.obverse.pendingFile, uploadFace])

  const retryReverse = useCallback(() => {
    const file = editState.reverse.pendingFile
    if (file) {
      void uploadFace('reverse', file)
    }
  }, [editState.reverse.pendingFile, uploadFace])

  const retryGalleryUpload = useCallback(
    (clientId: string) => {
      setEditState((current) => {
        const item = current.pendingGalleryUploads.find((entry) => entry.clientId === clientId)
        if (item) {
          void uploadGalleryFile(item.file, clientId)
        }
        return current
      })
    },
    [uploadGalleryFile],
  )

  const dismissFailedGalleryUpload = useCallback((clientId: string) => {
    setEditState((current) => {
      const item = current.pendingGalleryUploads.find((entry) => entry.clientId === clientId)
      if (item) {
        revokePreviewUrl(item.previewUrl)
      }
      return {
        ...current,
        pendingGalleryUploads: current.pendingGalleryUploads.filter(
          (entry) => entry.clientId !== clientId,
        ),
      }
    })
  }, [])

  const uploadGalleryReplace = useCallback(
    async (imageId: number, file: File) => {
      const validationError = validateGalleryFiles([file])
      const previewUrl = URL.createObjectURL(file)

      if (validationError) {
        setEditState((current) => {
          const previous = current.galleryReplaceStates[imageId]
          revokePreviewUrl(previous?.previewUrl ?? null)
          return {
            ...current,
            hasFailures: true,
            galleryReplaceStates: {
              ...current.galleryReplaceStates,
              [imageId]: {
                status: 'failed',
                previewUrl,
                pendingFile: file,
                error: validationError,
              },
            },
          }
        })
        return
      }

      setEditState((current) => {
        const previous = current.galleryReplaceStates[imageId]
        revokePreviewUrl(previous?.previewUrl ?? null)
        return {
          ...current,
          hasFailures: false,
          galleryReplaceStates: {
            ...current.galleryReplaceStates,
            [imageId]: {
              status: 'uploading',
              previewUrl,
              pendingFile: file,
              error: null,
            },
          },
        }
      })

      const snapshot = submissionRef.current

      if (!snapshot || !token) {
        setEditState((current) => ({
          ...current,
          hasFailures: true,
          galleryReplaceStates: {
            ...current.galleryReplaceStates,
            [imageId]: {
              status: 'failed',
              previewUrl,
              pendingFile: file,
              error: token
                ? 'Submission unavailable.'
                : 'Your session has expired. Please sign in again.',
            },
          },
        }))
        return
      }

      beginSave()

      const result = await saveGalleryReplace(submissionId, snapshot, imageId, file, token)
      endSave(!result.ok)

      if (result.ok) {
        submissionRef.current = result.submission
        onSubmissionUpdated(result.submission)
        setEditState((current) => {
          const previous = current.galleryReplaceStates[imageId]
          revokePreviewUrl(previous?.previewUrl ?? null)
          const nextReplaceStates = { ...current.galleryReplaceStates }
          delete nextReplaceStates[imageId]
          return {
            ...current,
            galleryReplaceStates: nextReplaceStates,
          }
        })
        return
      }

      setEditState((current) => ({
        ...current,
        galleryReplaceStates: {
          ...current.galleryReplaceStates,
          [imageId]: {
            status: 'failed',
            previewUrl,
            pendingFile: file,
            error: result.message,
          },
        },
      }))
    },
    [beginSave, endSave, onSubmissionUpdated, submissionId, token],
  )

  const handleGalleryReplace = useCallback(
    (imageId: number, file: File) => {
      void uploadGalleryReplace(imageId, file)
    },
    [uploadGalleryReplace],
  )

  const cancelGalleryReplace = useCallback((imageId: number) => {
    setEditState((current) => {
      const previous = current.galleryReplaceStates[imageId]
      if (previous) {
        revokePreviewUrl(previous.previewUrl)
      }
      const nextReplaceStates = { ...current.galleryReplaceStates }
      delete nextReplaceStates[imageId]
      const hasFailedItems =
        current.obverse.status === 'failed' ||
        current.reverse.status === 'failed' ||
        current.pendingGalleryUploads.some((item) => item.status === 'failed') ||
        Object.values(nextReplaceStates).some((item) => item.status === 'failed')

      return {
        ...current,
        galleryReplaceStates: nextReplaceStates,
        hasFailures: hasFailedItems,
      }
    })
  }, [])

  const retryGalleryReplace = useCallback(
    (imageId: number) => {
      setEditState((current) => {
        const item = current.galleryReplaceStates[imageId]
        if (item?.pendingFile) {
          void uploadGalleryReplace(imageId, item.pendingFile)
        }
        return current
      })
    },
    [uploadGalleryReplace],
  )

  const permanentDeleteGalleryImage = useCallback(
    async (imageId: number) => {
      clearRemovalTimer(imageId)

      const snapshot = submissionRef.current

      if (!snapshot || !token) {
        setEditState((current) => ({
          ...current,
          hasFailures: true,
        }))
        return
      }

      beginSave()

      const result = await saveGalleryPermanentDelete(submissionId, snapshot, imageId, token)
      endSave(!result.ok)

      if (result.ok) {
        submissionRef.current = result.submission
        onSubmissionUpdated(result.submission)
        setEditState((current) => ({
          ...current,
          hiddenGalleryIds: current.hiddenGalleryIds.filter((id) => id !== imageId),
          undoSnack: current.undoSnack?.imageId === imageId ? null : current.undoSnack,
        }))
        return
      }

      setEditState((current) => ({
        ...current,
        hasFailures: true,
      }))
    },
    [beginSave, clearRemovalTimer, endSave, onSubmissionUpdated, submissionId, token],
  )

  const handleGalleryPermanentDelete = useCallback(
    (imageId: number) => {
      void permanentDeleteGalleryImage(imageId)
    },
    [permanentDeleteGalleryImage],
  )

  const revertFace = useCallback((side: 'obverse' | 'reverse') => {
    setEditState((current) => {
      revokePreviewUrl(current[side].previewUrl)
      const nextObverse = side === 'obverse' ? { ...EMPTY_FACE } : current.obverse
      const nextReverse = side === 'reverse' ? { ...EMPTY_FACE } : current.reverse
      const hasFailedItems =
        nextObverse.status === 'failed' ||
        nextReverse.status === 'failed' ||
        current.pendingGalleryUploads.some((item) => item.status === 'failed') ||
        Object.values(current.galleryReplaceStates).some((item) => item.status === 'failed')

      return {
        ...current,
        obverse: nextObverse,
        reverse: nextReverse,
        hasFailures: hasFailedItems,
      }
    })
  }, [])

  const revertObverse = useCallback(() => revertFace('obverse'), [revertFace])
  const revertReverse = useCallback(() => revertFace('reverse'), [revertFace])

  const footerStatus: 'saved' | 'saving' | 'failed' = editState.hasFailures
    ? 'failed'
    : editState.activeSaveCount > 0
      ? 'saving'
      : 'saved'

  return {
    editState,
    footerStatus,
    startEdit,
    finishEdit,
    resetEditState,
    handleObverseChange,
    handleReverseChange,
    handleGalleryAdd,
    scheduleGalleryRemove,
    undoGalleryRemove,
    retryObverse,
    retryReverse,
    revertObverse,
    revertReverse,
    retryGalleryUpload,
    dismissFailedGalleryUpload,
    handleGalleryReplace,
    cancelGalleryReplace,
    retryGalleryReplace,
    handleGalleryPermanentDelete,
  }
}
