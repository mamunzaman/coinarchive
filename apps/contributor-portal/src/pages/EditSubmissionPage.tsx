import { Suspense, useEffect, useMemo, useRef, useState, useCallback } from 'react'
import type { FormEvent } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CoinEntryWizard } from '../components/coin/CoinEntryWizard'
import { LazyCoinFormFields, LazyReviewSubmissionStep } from '../components/coin/coinWizardLazy'
import { WizardStepLoadingSkeleton } from '../components/coin/WizardStepLoadingSkeleton'
import { DuplicateDraftInfoCard, DuplicateWarningCard } from '../components/coin/DuplicateWarningCard'
import { SubmissionRevisionNotes } from '../components/coin/SubmissionRevisionNotes'
import { SubmissionWorkflowPanel } from '../components/coin/SubmissionWorkflowPanel'
import { CoinCataloguePreviewCard } from '../components/coin/CoinCataloguePreviewCard'
import { SubmissionRevisionComparison } from '../components/coin/SubmissionRevisionComparison'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useUnsavedChanges } from '../contexts/UnsavedChangesContext'
import { useUnsavedChangesGuard } from '../hooks/useUnsavedChangesGuard'
import { useDuplicateCheck } from '../hooks/useDuplicateCheck'
import {
  getExactDuplicateSubmitBlockMessage,
  isSubmitBlockedByDuplicateProtection,
} from '../lib/duplicateProtection'
import { useCoinDraft } from '../hooks/useCoinDraft'
import { useCoinPostTitle } from '../hooks/useCoinPostTitle'
import {
  ApiError,
  getFormOptions,
  getMySubmission,
  updateMySubmission,
  type CoinSubmissionDetail,
} from '../lib/api'
import { appendCoinFormData, appendSubmissionImageUpdateFormData, applyResolvedTaxonomyValues } from '../lib/coinFormData'
import { isCoinFormDataLoading } from '../lib/coinFormLoading'
import { normalizeCoinFormValues } from '../lib/coinFormNormalize'
import { normalizeSubmissionPayload } from '../lib/inputNormalization'
import { resolveCoinPostTitle, generateCoinPostSlug } from '../lib/coinTitle'
import { areCoinFormValuesEqual, hasPendingCoinImageChanges } from '../lib/coinFormDirty'
import {
  clearFormDraft,
  getDraftStorageKey,
  loadFormDraft,
  restoreFilesFromDraft,
  type FormDraftPayload,
} from '../lib/formDraftStorage'
import { useAuth } from '../hooks/useAuth'
import { useTranslatedCoinFormSteps } from '../hooks/useTranslatedCoinFormSteps'
import { resolveContentLanguage, resolveSubmissionContentLanguage } from '../lib/contentLanguage'
import { getSubmissionRevisionInfo } from '../lib/submissionRevisionNotes'
import { isEditableSubmissionStatus, isNeedsRevisionStatus } from '../lib/submissionListUtils'
import { validateGalleryFiles } from '../components/ui/MultiImageUploadField'
import { hasGalleryImageChanges } from '../lib/revisionComparison'
import {
  validateImageFile,
  validateNewCoinForm,
  type NewCoinFieldErrors,
} from '../lib/validation'
import {
  coinFormValuesFromSubmission,
  applyMintVariantsModeChange,
  EMPTY_COIN_FORM_VALUES,
  prepareCoinFormValuesForSubmit,
  type CoinFormValues,
  type ContentLanguage,
  type MintVariantRow,
} from '../types/coinForm'
import {
  getStepForValidationErrors,
  type CoinFormStepId,
} from '../types/coinFormSteps'
import {
  getDefaultImagePreviewUrl,
  getImagePreviewSource,
  hasEffectiveCoinImage,
  resolveCoinImagePreviewUrl,
} from '../lib/imagePreview'
import {
  EMPTY_DEFAULT_IMAGES,
  EMPTY_FORM_OPTIONS,
  isKnownTaxonomyOption,
  isRecognizedCoinSeriesValue,
  type DefaultImages,
  type FormOptions,
} from '../types/formOptions'
import { useObjectPreviewUrl } from '../hooks/useObjectPreviewUrl'
import type { WizardSaveState } from '../components/coin/WizardStatusBar'
import { computeCompletenessScore } from '../lib/completenessScore'
import { findStepCompletion, getCoinStepCompletion } from '../lib/stepCompletion'

const FORM_ID = 'coin-entry-form'

function isContentLanguageEditableStatus(status: string): boolean {
  return status.trim().toLowerCase().replace(/-/g, '_') === 'draft'
}

export function EditSubmissionPage() {
  const { t } = useTranslation()
  const { requestNavigation } = useUnsavedChanges()
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const { token, user } = useAuth()
  const submissionId = Number.parseInt(id ?? '', 10)

  const isAdmin = user?.role === 'admin'
  const steps = useTranslatedCoinFormSteps(isAdmin)
  const formOptionsRequestIdRef = useRef(0)
  const initialLoadCompleteRef = useRef(false)
  const requestedStepId = useMemo((): CoinFormStepId | null => {
    const step = searchParams.get('step')?.trim().toLowerCase()
    const mappedStep =
      step === 'images' || step === 'gallery'
        ? 'images'
        : step === 'about'
          ? 'core-identity'
          : step === 'specifications'
            ? 'specifications'
            : step === 'descriptions'
              ? 'descriptions'
              : step === 'mint'
                ? 'mint-information'
                : step === 'status'
                  ? 'status-admin'
                  : null

    return mappedStep && steps.some((item) => item.id === mappedStep) ? mappedStep : null
  }, [searchParams, steps])

  const [submission, setSubmission] = useState<CoinSubmissionDetail | null>(null)
  const [values, setValues] = useState<CoinFormValues | null>(null)
  const [savedValues, setSavedValues] = useState<CoinFormValues | null>(null)
  const [fieldErrors, setFieldErrors] = useState<NewCoinFieldErrors>({})
  const [obverseFile, setObverseFile] = useState<File | null>(null)
  const [reverseFile, setReverseFile] = useState<File | null>(null)
  const [obverseRemoved, setObverseRemoved] = useState(false)
  const [reverseRemoved, setReverseRemoved] = useState(false)
  const [galleryFiles, setGalleryFiles] = useState<File[]>([])
  const [removedGalleryImageIds, setRemovedGalleryImageIds] = useState<number[]>([])
  const [galleryReplacements, setGalleryReplacements] = useState<Record<number, File>>({})
  const [permanentDeleteGalleryIds, setPermanentDeleteGalleryIds] = useState<number[]>([])
  const [galleryReplacementPreviews, setGalleryReplacementPreviews] = useState<
    Record<number, string>
  >({})
  const [obverseError, setObverseError] = useState<string | null>(null)
  const [reverseError, setReverseError] = useState<string | null>(null)
  const [galleryError, setGalleryError] = useState<string | null>(null)
  const [activeStepId, setActiveStepId] = useState<CoinFormStepId>('core-identity')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAiGenerating, setIsAiGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [notEditable, setNotEditable] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [formOptions, setFormOptions] = useState<FormOptions>(EMPTY_FORM_OPTIONS)
  const [formOptionsLanguage, setFormOptionsLanguage] = useState<ContentLanguage | null>(null)
  const [defaultImages, setDefaultImages] = useState<DefaultImages>(EMPTY_DEFAULT_IMAGES)
  const [formOptionsLoading, setFormOptionsLoading] = useState(true)
  const [formOptionsFailed, setFormOptionsFailed] = useState(false)
  const [saveDraftMessage, setSaveDraftMessage] = useState<string | null>(null)
  const [draftNotice, setDraftNotice] = useState<string | null>(null)
  const [titleManualOverride, setTitleManualOverride] = useState(false)
  const contentLanguage = resolveContentLanguage(values?.content_language)
  const contentLanguageLocked = submission
    ? !isContentLanguageEditableStatus(submission.status)
    : false
  const contentLanguageLockedReason = contentLanguageLocked
    ? t('contentLanguage.lockedAfterSubmission')
    : undefined

  const formDataLoading = useMemo(
    () =>
      isCoinFormDataLoading({
        formOptionsLoading,
        formOptionsLanguage,
        contentLanguage,
      }),
    [formOptionsLoading, formOptionsLanguage, contentLanguage],
  )

  function clearLocalizedTaxonomyOptions() {
    setFormOptions((current) => ({
      ...current,
      values: [],
      types: [],
      series: [],
    }))
  }

  const setCoinFormValues = useCallback(
    (updater: React.SetStateAction<CoinFormValues>) => {
      setValues((current) => {
        if (!current) {
          return current
        }

        return typeof updater === 'function' ? updater(current) : updater
      })
    },
    [],
  )

  const { handleTitleChange, regenerateTitle } = useCoinPostTitle({
    values: values ?? EMPTY_COIN_FORM_VALUES,
    setValues: setCoinFormValues,
    formOptions,
    titleManualOverride,
    setTitleManualOverride,
    enabled: Boolean(values),
  })

  const existingObverseUrl = submission?.images.obverse?.url ?? null
  const existingReverseUrl = submission?.images.reverse?.url ?? null
  const effectiveExistingObverseUrl = obverseRemoved ? null : existingObverseUrl
  const effectiveExistingReverseUrl = reverseRemoved ? null : existingReverseUrl
  const defaultObversePreviewUrl = getDefaultImagePreviewUrl(defaultImages.obverse)
  const defaultReversePreviewUrl = getDefaultImagePreviewUrl(defaultImages.reverse)
  const selectedObversePreviewUrl = useObjectPreviewUrl(obverseFile, null)
  const selectedReversePreviewUrl = useObjectPreviewUrl(reverseFile, null)
  const obversePreviewUrl = resolveCoinImagePreviewUrl({
    selectedPreviewUrl: selectedObversePreviewUrl,
    hasSelectedImage: Boolean(obverseFile),
    existingImageUrl: effectiveExistingObverseUrl,
    defaultImageUrl: defaultObversePreviewUrl,
  })
  const reversePreviewUrl = resolveCoinImagePreviewUrl({
    selectedPreviewUrl: selectedReversePreviewUrl,
    hasSelectedImage: Boolean(reverseFile),
    existingImageUrl: effectiveExistingReverseUrl,
    defaultImageUrl: defaultReversePreviewUrl,
  })
  const obversePreviewSource = getImagePreviewSource(
    obverseFile,
    effectiveExistingObverseUrl,
    defaultImages.obverse,
  )
  const reversePreviewSource = getImagePreviewSource(
    reverseFile,
    effectiveExistingReverseUrl,
    defaultImages.reverse,
  )

  const activeIndex = steps.findIndex((step) => step.id === activeStepId)
  const safeIndex = activeIndex >= 0 ? activeIndex : 0
  const isFirstStep = safeIndex === 0
  const isReviewStep = activeStepId === 'review-submission'

  const reviewValidationErrors = useMemo(() => {
    if (!isReviewStep || !values) {
      return {}
    }

    return validateNewCoinForm(values, {
      formOptions,
      formOptionsReady: !formOptionsLoading && !formOptionsFailed,
      formOptionsFailed,
    })
  }, [isReviewStep, values, formOptions, formOptionsLoading, formOptionsFailed])

  const galleryPreviewUrls = useMemo(
    () => galleryFiles.map((file) => URL.createObjectURL(file)),
    [galleryFiles],
  )

  useEffect(() => {
    return () => {
      for (const url of galleryPreviewUrls) {
        URL.revokeObjectURL(url)
      }
    }
  }, [galleryPreviewUrls])

  const isDirty = useMemo(() => {
    if (!values || !savedValues) {
      return false
    }

    return (
      !areCoinFormValuesEqual(values, savedValues) ||
      hasPendingCoinImageChanges({
        obverseFile,
        reverseFile,
        galleryFiles,
        removedGalleryImageIds,
        galleryReplacements,
        permanentDeleteGalleryIds,
      }) ||
      obverseRemoved ||
      reverseRemoved
    )
  }, [
    values,
    savedValues,
    obverseFile,
    reverseFile,
    galleryFiles,
    removedGalleryImageIds,
    galleryReplacements,
    permanentDeleteGalleryIds,
    obverseRemoved,
    reverseRemoved,
  ])

  useUnsavedChangesGuard(isDirty)

  const draftValues = useMemo(
    () =>
      normalizeSubmissionPayload(
        normalizeCoinFormValues(values ?? EMPTY_COIN_FORM_VALUES, { formOptions }),
        { formOptions },
      ),
    [values, formOptions],
  )

  const duplicateCheckValues = useMemo(() => {
    const currentValues = normalizeSubmissionPayload(values ?? EMPTY_COIN_FORM_VALUES, {
      formOptions,
    })
    return normalizeSubmissionPayload(
      {
        ...currentValues,
        title: resolveCoinPostTitle(currentValues, { formOptions }),
      },
      { formOptions },
    )
  }, [formOptions, values])
  const {
    status: duplicateCheckStatus,
    protectionState: duplicateProtectionState,
    matches: duplicateMatches,
    ownSubmissionIds,
    checkNow: checkDuplicatesNow,
  } = useDuplicateCheck({
    token,
    values: duplicateCheckValues,
    formOptions,
    excludeSubmissionId: submissionId,
    enabled: Boolean(token) && Boolean(values) && isReviewStep,
  })

  const {
    draftKey,
    lastSavedAt,
    saveError,
    saveState: draftSaveState,
    hasPendingChanges,
    saveDraftNow,
  } = useCoinDraft({
    kind: 'edit',
    submissionId,
    values: draftValues,
    obverseFile,
    reverseFile,
    galleryFiles,
    removedGalleryImageIds,
    activeStepId,
    titleManualOverride,
    isDirty,
    enabled: Boolean(values) && !notEditable,
  })

  const submitBlockedByDuplicate = isSubmitBlockedByDuplicateProtection(duplicateProtectionState)
  const isDuplicateChecking = duplicateCheckStatus === 'checking'
  const isSavingDraft = draftSaveState === 'saving'
  const isBusyForSubmit =
    isSubmitting ||
    isSavingDraft ||
    formDataLoading ||
    isLoading ||
    isDuplicateChecking ||
    isAiGenerating

  const submitDisabled =
    (isReviewStep && (Object.keys(reviewValidationErrors).length > 0 || submitBlockedByDuplicate)) ||
    isBusyForSubmit

  const submitDisabledReason = isBusyForSubmit
    ? t('validation.waitForChecks')
    : submitBlockedByDuplicate
      ? getExactDuplicateSubmitBlockMessage()
      : undefined
  const baseSubmitLabel =
    submission && isNeedsRevisionStatus(submission.status)
      ? t('wizard.updateSubmission')
      : t('wizard.saveChanges')
  const submitLabel = isSubmitting
    ? t('wizard.submitting')
    : isDuplicateChecking
      ? t('wizard.checkingUniqueness')
      : formDataLoading || isLoading
        ? t('wizard.loadingData')
        : isAiGenerating
          ? t('ai.generatingShort')
          : baseSubmitLabel
  const saveDraftDisabled = isSubmitting || isSavingDraft || formDataLoading || isLoading
  const saveDraftLabel = isSavingDraft ? t('wizard.saving') : t('common.saveDraft')

  const hasExistingObverse = Boolean(effectiveExistingObverseUrl && !obverseFile)
  const hasExistingReverse = Boolean(effectiveExistingReverseUrl && !reverseFile)
  const hasObverse = hasEffectiveCoinImage(obverseFile, effectiveExistingObverseUrl, defaultImages.obverse)
  const hasReverse = hasEffectiveCoinImage(reverseFile, effectiveExistingReverseUrl, defaultImages.reverse)
  const existingGalleryCount = useMemo(() => {
    if (!submission) {
      return 0
    }

    return (submission.images.gallery ?? []).filter(
      (image) =>
        !removedGalleryImageIds.includes(image.id) &&
        !permanentDeleteGalleryIds.includes(image.id),
    ).length
  }, [submission, removedGalleryImageIds, permanentDeleteGalleryIds])

  const completionPercent = useMemo(
    () =>
      computeCompletenessScore({
        values: values ?? EMPTY_COIN_FORM_VALUES,
        hasObverse,
        hasReverse,
        hasGallery: galleryFiles.length > 0 || existingGalleryCount > 0,
      }).score,
    [values, hasObverse, hasReverse, galleryFiles.length, existingGalleryCount],
  )

  const stepCompletion = useMemo(
    () =>
      getCoinStepCompletion(
        values ?? EMPTY_COIN_FORM_VALUES,
        {
          hasObverse,
          hasReverse,
          galleryCount: galleryFiles.length + existingGalleryCount,
        },
        {
          isAdmin,
          fieldErrors,
          imageErrors: {
            obverse: obverseError,
            reverse: reverseError,
            gallery: galleryError,
          },
        },
      ),
    [
      values,
      hasObverse,
      hasReverse,
      galleryFiles.length,
      existingGalleryCount,
      isAdmin,
      fieldErrors,
      obverseError,
      reverseError,
      galleryError,
    ],
  )

  const activeStepIssues = useMemo(
    () => findStepCompletion(stepCompletion, activeStepId)?.issues,
    [stepCompletion, activeStepId],
  )

  const wizardSaveState = useMemo((): WizardSaveState => {
    if (isSubmitting) {
      return 'saving'
    }

    return draftSaveState
  }, [isSubmitting, draftSaveState])

  const wizardStatusBar = useMemo(
    () => ({
      completionPercent,
      stepCompletion,
      isDirty,
      hasDraft: Boolean(lastSavedAt),
      isEditMode: true,
      isAdmin,
      duplicateCheckStatus,
      saveState: wizardSaveState,
      lastSavedAt,
      hasPendingChanges,
    }),
    [
      completionPercent,
      stepCompletion,
      isDirty,
      lastSavedAt,
      hasPendingChanges,
      isAdmin,
      duplicateCheckStatus,
      wizardSaveState,
    ],
  )

  const imageWorkspaceSummary = useMemo(
    () => ({
      obverseUrl: obversePreviewUrl,
      reverseUrl: reversePreviewUrl,
      obverseSource: obversePreviewSource,
      reverseSource: reversePreviewSource,
      formOptionsLoading,
      hasObverse,
      hasReverse,
      galleryCount: galleryFiles.length + existingGalleryCount,
      onJumpToImages: () => setActiveStepId('images'),
    }),
    [
      obversePreviewUrl,
      reversePreviewUrl,
      obversePreviewSource,
      reversePreviewSource,
      formOptionsLoading,
      hasObverse,
      hasReverse,
      galleryFiles.length,
      existingGalleryCount,
    ],
  )

  function restoreDraftIfPresent(
    loadedValues: CoinFormValues,
    preserveServerTaxonomyFields: boolean,
  ): {
    values: CoinFormValues
    draft: FormDraftPayload | null
  } {
    const draft = loadFormDraft(getDraftStorageKey('edit', submissionId))
    if (!draft) {
      return { values: loadedValues, draft: null }
    }

    if (preserveServerTaxonomyFields) {
      return {
        values: {
          ...draft.values,
          content_language: loadedValues.content_language,
          denomination: loadedValues.denomination,
          coin_type: loadedValues.coin_type,
          coin_series: loadedValues.coin_series,
        },
        draft,
      }
    }

    return { values: draft.values, draft }
  }

  function debugEditLanguageLoad(message: string, details: Record<string, unknown>) {
    if (import.meta.env.DEV) {
      console.debug(`[EditSubmissionPage] ${message}`, details)
    }
  }

  async function loadSubmission() {
    initialLoadCompleteRef.current = false
    setIsLoading(true)
    setError(null)
    setNotFound(false)
    setNotEditable(false)
    setSuccessMessage(null)
    setFormOptionsLoading(true)
    setFormOptionsFailed(false)
    setFormOptionsLanguage(null)
    clearLocalizedTaxonomyOptions()

    if (!id || Number.isNaN(submissionId) || submissionId < 1) {
      setNotFound(true)
      setIsLoading(false)
      return
    }

    if (!token) {
      setError(t('dashboard.sessionExpired'))
      setIsLoading(false)
      return
    }

    try {
      const submissionResponse = await getMySubmission(submissionId, token)
      const loadedSubmission = submissionResponse.submission
      setSubmission(loadedSubmission)
      const savedContentLanguage = resolveSubmissionContentLanguage(loadedSubmission)
      const loadedValues = coinFormValuesFromSubmission(loadedSubmission)
      const contentLanguageEditable = isContentLanguageEditableStatus(loadedSubmission.status)
      const { values: restoredValues, draft } = restoreDraftIfPresent(
        loadedValues,
        !contentLanguageEditable,
      )
      const nextValues = contentLanguageEditable
        ? restoredValues
        : { ...restoredValues, content_language: savedContentLanguage }

      debugEditLanguageLoad('submission loaded', {
        submissionId,
        status: loadedSubmission.status,
        savedContentLanguage,
        mappedContentLanguage: loadedValues.content_language,
        draftRestored: Boolean(draft),
        contentLanguageEditable,
      })

      setValues({
        ...nextValues,
        coin_historical_background: nextValues.coin_historical_background ?? '',
      })
      setSavedValues(loadedValues)

      if (draft) {
        const restoredFiles = restoreFilesFromDraft(draft)
        setObverseFile(restoredFiles.obverseFile)
        setReverseFile(restoredFiles.reverseFile)
        setGalleryFiles(restoredFiles.galleryFiles)
        setRemovedGalleryImageIds(restoredFiles.removedGalleryImageIds)
        setGalleryReplacements({})
        setPermanentDeleteGalleryIds([])
        setActiveStepId(requestedStepId ?? draft.activeStepId ?? 'core-identity')
        setTitleManualOverride(draft.titleManualOverride ?? false)
        setDraftNotice(t('common.draftRestored'))
      } else {
        setRemovedGalleryImageIds([])
        setGalleryFiles([])
        setGalleryReplacements({})
        setPermanentDeleteGalleryIds([])
        setObverseFile(null)
        setReverseFile(null)
        setActiveStepId(requestedStepId ?? 'core-identity')
        setTitleManualOverride(Boolean(loadedValues.title.trim()))
        setDraftNotice(null)
      }

      if (
        !isEditableSubmissionStatus(loadedSubmission.status) &&
        !isContentLanguageEditableStatus(loadedSubmission.status)
      ) {
        setNotEditable(true)
      }

      const requestId = ++formOptionsRequestIdRef.current
      try {
        const optionsResult = await getFormOptions(token, savedContentLanguage)
        if (requestId === formOptionsRequestIdRef.current) {
          setFormOptions(optionsResult.options)
          setFormOptionsLanguage(savedContentLanguage)
          setDefaultImages(optionsResult.default_images ?? EMPTY_DEFAULT_IMAGES)
          setFormOptionsFailed(false)
          debugEditLanguageLoad('form options loaded', {
            submissionId,
            optionsLanguage: savedContentLanguage,
            valueCount: optionsResult.options.values.length,
            typeCount: optionsResult.options.types.length,
          })
        }
      } catch {
        if (requestId === formOptionsRequestIdRef.current) {
          setFormOptionsFailed(true)
        }
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setNotFound(true)
      } else if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError(t('common.connectionError'))
      }
    } finally {
      setFormOptionsLoading(false)
      setIsLoading(false)
      initialLoadCompleteRef.current = true
    }
  }

  useEffect(() => {
    void loadSubmission()
  }, [id, token, requestedStepId])

  useEffect(() => {
    if (!token || !values || isLoading || !initialLoadCompleteRef.current) {
      return
    }

    if (formOptionsLanguage === contentLanguage && !formOptionsFailed) {
      return
    }

    const authToken = token

    async function loadLocalizedFormOptions() {
      const requestId = ++formOptionsRequestIdRef.current
      setFormOptionsLoading(true)
      setFormOptionsFailed(false)
      clearLocalizedTaxonomyOptions()

      debugEditLanguageLoad('reload form options', {
        submissionId,
        optionsLanguage: contentLanguage,
      })

      try {
        const response = await getFormOptions(authToken, contentLanguage)
        if (requestId !== formOptionsRequestIdRef.current) {
          return
        }
        setFormOptions(response.options)
        setFormOptionsLanguage(contentLanguage)
        setDefaultImages(response.default_images ?? EMPTY_DEFAULT_IMAGES)
        debugEditLanguageLoad('form options reloaded', {
          submissionId,
          optionsLanguage: contentLanguage,
          valueCount: response.options.values.length,
          typeCount: response.options.types.length,
        })
      } catch {
        if (requestId === formOptionsRequestIdRef.current) {
          setFormOptionsFailed(true)
        }
      } finally {
        if (requestId === formOptionsRequestIdRef.current) {
          setFormOptionsLoading(false)
        }
      }
    }

    void loadLocalizedFormOptions()
  }, [
    contentLanguage,
    formOptionsFailed,
    formOptionsLanguage,
    isLoading,
    submissionId,
    token,
    values,
  ])

  useEffect(() => {
    if (
      !values ||
      formOptionsLoading ||
      formOptionsFailed ||
      formOptionsLanguage === null ||
      formOptionsLanguage !== contentLanguage
    ) {
      return
    }

    const resolved = applyResolvedTaxonomyValues(values, formOptions, contentLanguage)
    const needsResolution =
      resolved.country !== values.country ||
      resolved.denomination !== values.denomination ||
      resolved.coin_type !== values.coin_type ||
      resolved.coin_series !== values.coin_series

    const shouldClearDenomination =
      Boolean(resolved.denomination.trim()) &&
      !isKnownTaxonomyOption(resolved.denomination, formOptions.values)
    const shouldClearCoinType =
      Boolean(resolved.coin_type.trim()) &&
      !isKnownTaxonomyOption(resolved.coin_type, formOptions.types)
    const shouldClearCoinSeries =
      Boolean(resolved.coin_series.trim()) &&
      !isRecognizedCoinSeriesValue(resolved.coin_series, formOptions.series)

    if (!needsResolution && !shouldClearDenomination && !shouldClearCoinType && !shouldClearCoinSeries) {
      return
    }

    setValues((current) =>
      current
        ? {
            ...current,
            country: resolved.country,
            denomination: shouldClearDenomination ? '' : resolved.denomination,
            coin_type: shouldClearCoinType ? '' : resolved.coin_type,
            coin_series: shouldClearCoinSeries ? '' : resolved.coin_series,
          }
        : current,
    )
    setFieldErrors((current) => ({
      ...current,
      denomination: shouldClearDenomination
        ? t('validation.taxonomyLanguageMismatch')
        : current.denomination,
      coin_type: shouldClearCoinType
        ? t('validation.taxonomyLanguageMismatch')
        : current.coin_type,
      coin_series: shouldClearCoinSeries
        ? t('validation.taxonomyLanguageMismatch')
        : current.coin_series,
    }))
  }, [
    contentLanguage,
    formOptions,
    formOptionsFailed,
    formOptionsLanguage,
    formOptionsLoading,
    t,
    values,
  ])

  useEffect(() => {
    const next: Record<number, string> = {}
    for (const [id, file] of Object.entries(galleryReplacements)) {
      next[Number(id)] = URL.createObjectURL(file)
    }
    setGalleryReplacementPreviews(next)

    return () => {
      for (const url of Object.values(next)) {
        URL.revokeObjectURL(url)
      }
    }
  }, [galleryReplacements])

  function updateField<K extends keyof CoinFormValues>(field: K, value: CoinFormValues[K]) {
    if (!values) {
      return
    }

    if (field === 'content_language' && contentLanguageLocked) {
      return
    }

    setValues((current) => (current ? { ...current, [field]: value } : current))
    setFieldErrors((current) => ({ ...current, [field]: undefined }))
    setError(null)
    setSuccessMessage(null)
  }

  function handleObverseChange(file: File | null) {
    setObverseFile(file)
    if (file) {
      setObverseRemoved(false)
    }
    setObverseError(file ? validateImageFile(file) : null)
    setError(null)
    setSuccessMessage(null)
  }

  function handleReverseChange(file: File | null) {
    setReverseFile(file)
    if (file) {
      setReverseRemoved(false)
    }
    setReverseError(file ? validateImageFile(file) : null)
    setError(null)
    setSuccessMessage(null)
  }

  function handleObverseClear() {
    if (obverseFile) {
      handleObverseChange(null)
      return
    }

    if (existingObverseUrl) {
      setObverseRemoved(true)
      setObverseError(null)
      setError(null)
      setSuccessMessage(null)
    }
  }

  function handleReverseClear() {
    if (reverseFile) {
      handleReverseChange(null)
      return
    }

    if (existingReverseUrl) {
      setReverseRemoved(true)
      setReverseError(null)
      setError(null)
      setSuccessMessage(null)
    }
  }

  function handleGalleryChange(files: File[]) {
    setGalleryFiles(files)
    setGalleryError(validateGalleryFiles(files))
    setError(null)
    setSuccessMessage(null)
  }

  function handleGalleryImageRemoveToggle(imageId: number, remove: boolean) {
    setRemovedGalleryImageIds((current) => {
      if (remove) {
        return current.includes(imageId) ? current : [...current, imageId]
      }

      return current.filter((id) => id !== imageId)
    })
    setPermanentDeleteGalleryIds((current) => current.filter((id) => id !== imageId))
    setError(null)
    setSuccessMessage(null)
  }

  function handleGalleryReplace(imageId: number, file: File) {
    const replaceError = validateGalleryFiles([file])
    if (replaceError) {
      setGalleryError(replaceError)
      return
    }

    setGalleryReplacements((current) => ({ ...current, [imageId]: file }))
    setRemovedGalleryImageIds((current) => current.filter((id) => id !== imageId))
    setPermanentDeleteGalleryIds((current) => current.filter((id) => id !== imageId))
    setGalleryError(null)
    setError(null)
    setSuccessMessage(null)
  }

  function handleCancelGalleryReplace(imageId: number) {
    setGalleryReplacements((current) => {
      const next = { ...current }
      delete next[imageId]
      return next
    })
    setGalleryError(null)
    setError(null)
    setSuccessMessage(null)
  }

  function handleGalleryPermanentDelete(imageId: number) {
    setPermanentDeleteGalleryIds((current) =>
      current.includes(imageId) ? current : [...current, imageId],
    )
    setRemovedGalleryImageIds((current) =>
      current.includes(imageId) ? current : [...current, imageId],
    )
    setGalleryReplacements((current) => {
      const next = { ...current }
      delete next[imageId]
      return next
    })
    setError(null)
    setSuccessMessage(null)
  }

  function handleMintVariantsChange(variants: MintVariantRow[]) {
    if (!values) {
      return
    }

    setValues({ ...values, mintVariants: variants })
    setError(null)
    setSuccessMessage(null)
  }

  function handleHasMintVariantsChange(hasMintVariants: boolean) {
    if (!values) {
      return
    }

    setValues({ ...values, ...applyMintVariantsModeChange(values, hasMintVariants) })
    setError(null)
    setSuccessMessage(null)
  }

  const detailPath = `/my-submissions/${submissionId}`

  function goBack() {
    if (isFirstStep) {
      requestNavigation(detailPath)
      return
    }

    setActiveStepId(steps[safeIndex - 1].id)
  }

  function goContinue() {
    if (isReviewStep) {
      return
    }

    setActiveStepId(steps[safeIndex + 1].id)
  }

  async function handleSaveDraft() {
    if (saveDraftDisabled) {
      return
    }

    const saved = await saveDraftNow()
    setSaveDraftMessage(saved ? t('common.draftSaved') : null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!values || notEditable) {
      return
    }

    if (isSubmitting) {
      return
    }

    if (isBusyForSubmit) {
      setError(t('validation.waitForChecks'))
      return
    }

    setError(null)
    setSuccessMessage(null)

    const normalizedValues = normalizeSubmissionPayload(
      applyResolvedTaxonomyValues(
        normalizeCoinFormValues(values, { formOptions }),
        formOptions,
        contentLanguage,
      ),
      { formOptions },
    )
    const finalTitle = resolveCoinPostTitle(normalizedValues, { formOptions })
    const valuesForSubmit = prepareCoinFormValuesForSubmit({
      ...normalizedValues,
      title: finalTitle,
    })
    const postSlug = generateCoinPostSlug(finalTitle)
    setValues(valuesForSubmit)

    const errors = validateNewCoinForm(valuesForSubmit, {
      formOptions,
      formOptionsReady: !formOptionsLoading && !formOptionsFailed,
      formOptionsFailed,
    })
    const nextObverseError = obverseFile ? validateImageFile(obverseFile) : null
    const nextReverseError = reverseFile ? validateImageFile(reverseFile) : null
    const nextGalleryError = validateGalleryFiles(galleryFiles)
    const replacementFiles = Object.values(galleryReplacements)
    const nextGalleryReplaceError =
      replacementFiles.length > 0 ? validateGalleryFiles(replacementFiles) : null

    setFieldErrors(errors)
    setObverseError(nextObverseError)
    setReverseError(nextReverseError)
    setGalleryError(nextGalleryError ?? nextGalleryReplaceError)

    if (
      Object.keys(errors).length > 0 ||
      nextObverseError ||
      nextReverseError ||
      nextGalleryError ||
      nextGalleryReplaceError
    ) {
      setActiveStepId(
        getStepForValidationErrors(errors, {
          obverse: nextObverseError,
          reverse: nextReverseError,
          gallery: nextGalleryError ?? nextGalleryReplaceError,
        }),
      )
      return
    }

    if (!token) {
      setError(t('dashboard.sessionExpired'))
      return
    }

    if (!submission) {
      return
    }

    setIsSubmitting(true)

    try {
      const duplicateResult = await checkDuplicatesNow({ force: true })

      if (isSubmitBlockedByDuplicateProtection(duplicateResult.protectionState)) {
        setError(getExactDuplicateSubmitBlockMessage())
        return
      }

      let currentSubmission = submission

      for (const [id, file] of Object.entries(galleryReplacements)) {
        const replaceFormData = new FormData()
        appendSubmissionImageUpdateFormData(replaceFormData, currentSubmission, {
          replaceGallery: { imageId: Number(id), file },
        })
        const replaceResponse = await updateMySubmission(submissionId, replaceFormData, token)
        currentSubmission = replaceResponse.submission
      }

      const formData = new FormData()
      appendCoinFormData(
        formData,
        valuesForSubmit,
        {
          obverse: obverseFile,
          reverse: reverseFile,
          oldObverseImageId: obverseFile ? currentSubmission.images.obverse?.id : undefined,
          oldReverseImageId: reverseFile ? currentSubmission.images.reverse?.id : undefined,
          gallery: galleryFiles,
          removeGalleryImageIds: removedGalleryImageIds,
          deleteGalleryAttachmentIds: permanentDeleteGalleryIds,
        },
        {
          includeEmptyOptionalFields: true,
          isAdmin,
          postSlug,
          formOptions,
          contentLanguage,
        },
      )

      const response = await updateMySubmission(submissionId, formData, token)
      const nextValues = coinFormValuesFromSubmission(response.submission)
      setSubmission(response.submission)
      setValues({
        ...nextValues,
        coin_historical_background: nextValues.coin_historical_background ?? '',
      })
      setSavedValues(nextValues)
      setObverseFile(null)
      setReverseFile(null)
      setObverseRemoved(false)
      setReverseRemoved(false)
      setGalleryFiles([])
      setRemovedGalleryImageIds([])
      setGalleryReplacements({})
      setPermanentDeleteGalleryIds([])
      clearFormDraft(draftKey)
      setSuccessMessage(t('common.changesSaved'))
    } catch (err) {
      if (err instanceof ApiError && err.code === 'rest_submission_not_editable') {
        setNotEditable(true)
        setError(t('common.publishedCannotEdit'))
      } else if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError(t('common.connectionError'))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <Card>
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
            <p className="text-sm text-navy-muted">{t('submissions.loadingDetail')}</p>
          </div>
        </Card>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <Card>
          <div className="flex flex-col items-center gap-4 py-10 text-center">
            <h2 className="font-serif text-xl font-semibold text-navy">{t('submissions.notFoundTitle')}</h2>
            <Link
              to="/my-submissions"
              className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
            >
              {t('submissions.backToSubmissions')}
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  if (notEditable && submission) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <Card>
          <div className="flex flex-col gap-4 py-4">
            <SubmissionRevisionNotes submission={submission} />
            <p className="text-center text-sm text-navy-muted">
              {t('submissions.cannotEditStatus')}
            </p>
            <Link
              to={detailPath}
              className="inline-flex items-center justify-center rounded-xl border border-border bg-white px-5 py-3 text-sm font-semibold text-navy transition-all duration-200 hover:border-navy/20 hover:bg-muted"
            >
              View submission
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  if (!values || !submission) {
    return null
  }

  const existingGalleryUrls = (submission.images.gallery ?? [])
    .filter((image) => !removedGalleryImageIds.includes(image.id))
    .filter((image) => !permanentDeleteGalleryIds.includes(image.id))
    .map((image) => galleryReplacementPreviews[image.id] ?? image.url)

  return (
    <CoinEntryWizard
      mode="edit"
      steps={steps}
      activeStepId={activeStepId}
      onStepChange={setActiveStepId}
      onBack={goBack}
      onContinue={goContinue}
      isFirstStep={isFirstStep}
      isReviewStep={isReviewStep}
      isSubmitting={isSubmitting}
      submitDisabled={submitDisabled}
      submitDisabledReason={submitDisabledReason}
      submitLabel={submitLabel}
      previewTitle={values.title.trim() || submission.title}
      previewObverseUrl={obversePreviewUrl}
      previewReverseUrl={reversePreviewUrl}
      previewObverseSource={obversePreviewSource}
      previewReverseSource={reversePreviewSource}
      formOptionsLoading={formOptionsLoading}
      formDataLoading={formDataLoading}
      onSaveDraft={() => void handleSaveDraft()}
      saveDraftDisabled={saveDraftDisabled}
      saveDraftLabel={saveDraftLabel}
      saveDraftMessage={saveDraftMessage}
      statusBar={wizardStatusBar}
      imageWorkspaceSummary={imageWorkspaceSummary}
      cataloguePreview={
        <CoinCataloguePreviewCard
          values={values}
          obversePreviewUrl={obversePreviewUrl}
          reversePreviewUrl={reversePreviewUrl}
          obversePreviewSource={obversePreviewSource}
          reversePreviewSource={reversePreviewSource}
          formOptionsLoading={formOptionsLoading}
          countries={formOptions.countries}
        />
      }
      workflowPanel={
        <SubmissionWorkflowPanel
          values={values}
          obverseFile={obverseFile}
          reverseFile={reverseFile}
          galleryFiles={galleryFiles}
          hasExistingObverse={hasExistingObverse}
          hasExistingReverse={hasExistingReverse}
          existingGalleryCount={existingGalleryUrls.length}
          obversePreviewUrl={obversePreviewUrl}
          reversePreviewUrl={reversePreviewUrl}
          lastSavedAt={lastSavedAt}
          saveError={saveError}
          stepCompletion={stepCompletion}
          duplicateCheckStatus={duplicateCheckStatus}
          duplicateMatches={duplicateMatches}
          onJumpToStep={setActiveStepId}
        />
      }
      statusMessage={
        submission && isNeedsRevisionStatus(submission.status)
          ? `Needs revision — update submission #${submissionId}`
          : `Editing pending submission #${submissionId}`
      }
      formId={FORM_ID}
      alerts={
        <>
          <SubmissionRevisionNotes submission={submission} />
          {draftNotice ? (
            <div
              role="status"
              className="mb-5 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-navy"
            >
              {draftNotice}
            </div>
          ) : null}
          {successMessage ? (
            <div
              role="status"
              className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
            >
              <p className="font-medium">{successMessage}</p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                <Link
                  to={detailPath}
                  className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
                >
                  View submission
                </Link>
                <Button
                  type="button"
                  variant="secondary"
                  className="!min-h-10"
                  onClick={() => setSuccessMessage(null)}
                >
                  Continue editing
                </Button>
              </div>
            </div>
          ) : null}
          {error ? (
            <div
              role="alert"
              className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </div>
          ) : null}
          {!isReviewStep ? (
            <div className="mb-5 space-y-3">
              <DuplicateWarningCard
                matches={duplicateMatches}
                status={duplicateCheckStatus}
                protectionState={duplicateProtectionState}
                ownSubmissionIds={ownSubmissionIds}
              />
              <DuplicateDraftInfoCard matches={duplicateMatches} />
            </div>
          ) : null}
          {savedValues && getSubmissionRevisionInfo(submission).needsRevision ? (
            <div className="mb-5">
              <SubmissionRevisionComparison
                previousValues={savedValues}
                currentValues={values}
                imageChanges={{
                  obverseChanged: Boolean(obverseFile),
                  reverseChanged: Boolean(reverseFile),
                  galleryChanged: hasGalleryImageChanges({
                    pendingAddCount: galleryFiles.length,
                    removedImageIds: removedGalleryImageIds,
                    replacementCount: Object.keys(galleryReplacements).length,
                    permanentDeleteIds: permanentDeleteGalleryIds,
                  }),
                }}
              />
            </div>
          ) : null}
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} noValidate>
        {isReviewStep ? (
          <Suspense fallback={<WizardStepLoadingSkeleton />}>
            <LazyReviewSubmissionStep
              values={values}
              formMode="edit"
              isAdmin={isAdmin}
              formOptions={formOptions}
              formOptionsReady={!formOptionsLoading && !formOptionsFailed}
              duplicateCheckStatus={duplicateCheckStatus}
              duplicateProtectionState={duplicateProtectionState}
              ownSubmissionIds={ownSubmissionIds}
              formOptionsLoading={formOptionsLoading}
              duplicateMatches={duplicateMatches}
              obversePreviewUrl={obversePreviewUrl}
              reversePreviewUrl={reversePreviewUrl}
              obversePreviewSource={obversePreviewSource}
              reversePreviewSource={reversePreviewSource}
              galleryPreviewUrls={galleryPreviewUrls}
              hasExistingObverse={hasExistingObverse}
              hasExistingReverse={hasExistingReverse}
              existingGalleryUrls={existingGalleryUrls}
              titleManualOverride={titleManualOverride}
              titleError={reviewValidationErrors.title ?? fieldErrors.title}
              releasedDateError={reviewValidationErrors.released_date ?? fieldErrors.released_date}
              onTitleChange={handleTitleChange}
              onRegenerateTitle={regenerateTitle}
              disabled={isSubmitting}
            />
          </Suspense>
        ) : (
          <Suspense fallback={<WizardStepLoadingSkeleton />}>
            <LazyCoinFormFields
          activeStep={activeStepId}
          stepIssues={activeStepIssues}
          values={values}
          fieldErrors={fieldErrors}
          onFieldChange={updateField}
          contributorRole={user?.role}
          disabled={isSubmitting}
          formOptions={formOptions}
          formOptionsLoading={formOptionsLoading}
          formDataLoading={formDataLoading}
          formOptionsFailed={formOptionsFailed}
          contentLanguageLocked={contentLanguageLocked}
          contentLanguageLockedReason={contentLanguageLockedReason}
          obverseFile={obverseFile}
          reverseFile={reverseFile}
          galleryFiles={galleryFiles}
          obverseError={obverseError ?? undefined}
          reverseError={reverseError ?? undefined}
          galleryError={galleryError ?? undefined}
          onObverseChange={handleObverseChange}
          onReverseChange={handleReverseChange}
          onObverseClear={handleObverseClear}
          onReverseClear={handleReverseClear}
          onGalleryChange={handleGalleryChange}
          onMintVariantsChange={handleMintVariantsChange}
          onHasMintVariantsChange={handleHasMintVariantsChange}
          imageEditMode
          currentObverseUrl={effectiveExistingObverseUrl}
          currentReverseUrl={effectiveExistingReverseUrl}
          obverseExistingRemoved={obverseRemoved}
          reverseExistingRemoved={reverseRemoved}
          obversePreviewUrl={obversePreviewUrl}
          reversePreviewUrl={reversePreviewUrl}
          obversePreviewSource={obversePreviewSource}
          reversePreviewSource={reversePreviewSource}
          existingGalleryImages={submission.images.gallery ?? []}
          removedGalleryImageIds={removedGalleryImageIds}
          onGalleryImageRemoveToggle={handleGalleryImageRemoveToggle}
          galleryReplacementPreviews={galleryReplacementPreviews}
          onGalleryReplace={handleGalleryReplace}
          onCancelGalleryReplace={handleCancelGalleryReplace}
          allowGalleryPermanentDelete={isAdmin}
          onGalleryPermanentDelete={handleGalleryPermanentDelete}
          onAiGeneratingChange={setIsAiGenerating}
            />
          </Suspense>
        )}
      </form>
    </CoinEntryWizard>
  )
}
