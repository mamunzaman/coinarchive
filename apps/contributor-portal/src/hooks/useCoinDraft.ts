import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { CoinFormValues } from '../types/coinForm'
import type { CoinFormStepId } from '../types/coinFormSteps'
import { generateCoinPostTitle } from '../lib/coinTitle'
import {
  fileToSerializedImage,
  getDraftStorageKey,
  saveFormDraft,
  type DraftIndexEntry,
  type FormDraftPayload,
  type SerializedImageFile,
} from '../lib/formDraftStorage'

const DEBOUNCE_MS = 2_500
const LABEL_TICK_MS = 30_000

export type CoinDraftSaveState = 'idle' | 'saving' | 'saved' | 'error'

type UseCoinDraftOptions = {
  kind: 'new' | 'edit'
  submissionId?: number
  values: CoinFormValues
  obverseFile: File | null
  reverseFile: File | null
  galleryFiles: File[]
  removedGalleryImageIds?: number[]
  activeStepId?: CoinFormStepId
  titleManualOverride?: boolean
  isDirty: boolean
  enabled?: boolean
}

const serializedImageCache = new Map<string, SerializedImageFile>()

function getFileCacheKey(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`
}

async function serializeFileWithCache(file: File): Promise<SerializedImageFile> {
  const cacheKey = getFileCacheKey(file)
  const cached = serializedImageCache.get(cacheKey)

  if (cached) {
    return cached
  }

  const serialized = await fileToSerializedImage(file)
  serializedImageCache.set(cacheKey, serialized)
  return serialized
}

export function formatDraftSavedLabel(lastSavedAt: string | null, now = Date.now()): string {
  if (!lastSavedAt) {
    return 'No draft yet'
  }

  const savedTime = new Date(lastSavedAt).getTime()
  if (Number.isNaN(savedTime)) {
    return 'Saved just now'
  }

  const diffMs = now - savedTime
  if (diffMs < 60_000) {
    return 'Saved just now'
  }

  const minutes = Math.floor(diffMs / 60_000)
  if (minutes === 1) {
    return 'Saved 1 min ago'
  }

  return `Saved ${minutes} min ago`
}

function buildDraftSignature(
  values: CoinFormValues,
  activeStepId: CoinFormStepId | undefined,
  titleManualOverride: boolean | undefined,
  obverseFile: File | null,
  reverseFile: File | null,
  galleryFiles: File[],
  removedGalleryImageIds: number[],
): string {
  return JSON.stringify({
    values,
    activeStepId,
    titleManualOverride: Boolean(titleManualOverride),
    obverse: obverseFile
      ? `${obverseFile.name}:${obverseFile.size}:${obverseFile.lastModified}`
      : null,
    reverse: reverseFile
      ? `${reverseFile.name}:${reverseFile.size}:${reverseFile.lastModified}`
      : null,
    gallery: galleryFiles.map(
      (file) => `${file.name}:${file.size}:${file.lastModified}`,
    ),
    removedGalleryImageIds,
  })
}

export function useCoinDraft({
  kind,
  submissionId,
  values,
  obverseFile,
  reverseFile,
  galleryFiles,
  removedGalleryImageIds = [],
  activeStepId,
  titleManualOverride = false,
  isDirty,
  enabled = true,
}: UseCoinDraftOptions) {
  const { t } = useTranslation()
  const draftKey = getDraftStorageKey(kind, submissionId)
  const [saveState, setSaveState] = useState<CoinDraftSaveState>('idle')
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [hasPendingChanges, setHasPendingChanges] = useState(false)
  const [labelTick, setLabelTick] = useState(0)

  const isSavingRef = useRef(false)
  const debounceTimerRef = useRef<number | null>(null)
  const lastSavedSignatureRef = useRef<string | null>(null)
  const previousStepRef = useRef<CoinFormStepId | undefined>(activeStepId)
  const persistDraftRef = useRef<
    (options?: { force?: boolean }) => Promise<boolean>
  >(async () => false)
  const isDirtyRef = useRef(isDirty)
  const hasPendingChangesRef = useRef(hasPendingChanges)

  const contentSignature = buildDraftSignature(
    values,
    activeStepId,
    titleManualOverride,
    obverseFile,
    reverseFile,
    galleryFiles,
    removedGalleryImageIds,
  )

  const persistDraft = useCallback(
    async ({ force = false }: { force?: boolean } = {}) => {
      if (!enabled) {
        return false
      }

      if (!force && !isDirty) {
        return false
      }

      if (isSavingRef.current) {
        return false
      }

      isSavingRef.current = true
      setSaveState('saving')
      setSaveError(null)

      try {
        const [serializedObverse, serializedReverse, serializedGallery] = await Promise.all([
          obverseFile ? serializeFileWithCache(obverseFile) : Promise.resolve(null),
          reverseFile ? serializeFileWithCache(reverseFile) : Promise.resolve(null),
          Promise.all(galleryFiles.map((file) => serializeFileWithCache(file))),
        ])

        const savedAt = new Date().toISOString()
        const payload: FormDraftPayload = {
          values,
          obverseFile: serializedObverse,
          reverseFile: serializedReverse,
          galleryFiles: serializedGallery,
          removedGalleryImageIds,
          activeStepId,
          titleManualOverride,
          savedAt,
        }

        const indexEntry: DraftIndexEntry = {
          key: draftKey,
          kind,
          submissionId,
          title:
            values.title.trim() ||
            generateCoinPostTitle(values) ||
            (kind === 'new'
              ? t('widgets.untitledDraft')
              : t('widgets.submissionNumber', { id: submissionId })),
          updatedAt: savedAt,
        }

        const saved = saveFormDraft(draftKey, payload, indexEntry)
        if (!saved) {
          setSaveError(t('widgets.draftSaveFailed'))
          setSaveState('error')
          return false
        }

        setLastSavedAt(savedAt)
        lastSavedSignatureRef.current = buildDraftSignature(
          values,
          activeStepId,
          titleManualOverride,
          obverseFile,
          reverseFile,
          galleryFiles,
          removedGalleryImageIds,
        )
        setHasPendingChanges(false)
        setSaveState('saved')
        return true
      } catch {
        setSaveError(t('widgets.draftSaveFailed'))
        setSaveState('error')
        return false
      } finally {
        isSavingRef.current = false
      }
    },
    [
      activeStepId,
      draftKey,
      enabled,
      galleryFiles,
      isDirty,
      kind,
      obverseFile,
      removedGalleryImageIds,
      reverseFile,
      submissionId,
      titleManualOverride,
      t,
      values,
    ],
  )

  useEffect(() => {
    persistDraftRef.current = persistDraft
  }, [persistDraft])

  useEffect(() => {
    isDirtyRef.current = isDirty
    hasPendingChangesRef.current = hasPendingChanges
  }, [hasPendingChanges, isDirty])

  useEffect(() => {
    if (!enabled) {
      return
    }

    if (
      lastSavedSignatureRef.current !== null &&
      contentSignature !== lastSavedSignatureRef.current
    ) {
      setHasPendingChanges(true)
      if (saveState === 'saved') {
        setSaveState('idle')
      }
    }
  }, [contentSignature, enabled, saveState])

  useEffect(() => {
    if (!enabled || !isDirty) {
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
      }
      return
    }

    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = window.setTimeout(() => {
      debounceTimerRef.current = null
      void persistDraftRef.current()
    }, DEBOUNCE_MS)

    return () => {
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
      }
    }
  }, [contentSignature, enabled, isDirty])

  useEffect(() => {
    if (!enabled) {
      return
    }

    if (previousStepRef.current === activeStepId) {
      return
    }

    previousStepRef.current = activeStepId
    void persistDraftRef.current({ force: true })
  }, [activeStepId, enabled])

  useEffect(() => {
    if (!enabled) {
      return
    }

    const handleBeforeUnload = () => {
      if (isDirtyRef.current || hasPendingChangesRef.current) {
        void persistDraftRef.current({ force: true })
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [enabled])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setLabelTick((current) => current + 1)
    }, LABEL_TICK_MS)

    return () => window.clearInterval(timer)
  }, [])

  const savedLabel = useMemo(
    () => formatDraftSavedLabel(lastSavedAt, Date.now()),
    [labelTick, lastSavedAt],
  )

  const saveDraftNow = useCallback(() => persistDraft({ force: true }), [persistDraft])
  const flushDraft = useCallback(() => persistDraft({ force: true }), [persistDraft])

  return {
    draftKey,
    lastSavedAt,
    saveError,
    saveState,
    hasPendingChanges,
    savedLabel,
    saveDraftNow,
    flushDraft,
  }
}
