import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { CoinEntryWizard } from '../components/coin/CoinEntryWizard'
import { LazyCoinFormFields, LazyReviewSubmissionStep } from '../components/coin/coinWizardLazy'
import { WizardStepLoadingSkeleton } from '../components/coin/WizardStepLoadingSkeleton'
import { DuplicateDraftInfoCard, DuplicateWarningCard } from '../components/coin/DuplicateWarningCard'
import { SubmissionWorkflowPanel } from '../components/coin/SubmissionWorkflowPanel'
import { CoinCataloguePreviewCard } from '../components/coin/CoinCataloguePreviewCard'
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
import { ApiError, getFormOptions, submitCoin, type SubmitCoinResponse } from '../lib/api'
import {
  appendCoinFormData,
  applyResolvedTaxonomyValues,
  createNewCoinFormValues,
  NEW_COIN_FORM_INITIAL_VALUES,
} from '../lib/coinFormData'
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
} from '../lib/formDraftStorage'
import { useAuth } from '../hooks/useAuth'
import { useTranslatedCoinFormSteps } from '../hooks/useTranslatedCoinFormSteps'
import { resolveContentLanguage } from '../lib/contentLanguage'
import { validateGalleryFiles } from '../components/ui/MultiImageUploadField'
import {
  validateImageFile,
  validateNewCoinForm,
  type NewCoinFieldErrors,
} from '../lib/validation'
import {
  applyMintVariantsModeChange,
  prepareCoinFormValuesForSubmit,
  type CoinFormValues,
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

export function NewCoinPage() {
  const { t } = useTranslation()
  const { requestNavigation } = useUnsavedChanges()
  const { token, user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const steps = useTranslatedCoinFormSteps(isAdmin)
  const draftRestoredRef = useRef(false)
  const formOptionsRequestIdRef = useRef(0)

  const [values, setValues] = useState<CoinFormValues>(() => createNewCoinFormValues())
  const [fieldErrors, setFieldErrors] = useState<NewCoinFieldErrors>({})
  const [formOptions, setFormOptions] = useState<FormOptions>(EMPTY_FORM_OPTIONS)
  const [formOptionsLanguage, setFormOptionsLanguage] = useState(resolveContentLanguage(undefined))
  const [defaultImages, setDefaultImages] = useState<DefaultImages>(EMPTY_DEFAULT_IMAGES)
  const [formOptionsLoading, setFormOptionsLoading] = useState(true)
  const [formOptionsFailed, setFormOptionsFailed] = useState(false)
  const [obverseFile, setObverseFile] = useState<File | null>(null)
  const [reverseFile, setReverseFile] = useState<File | null>(null)
  const [galleryFiles, setGalleryFiles] = useState<File[]>([])
  const [obverseError, setObverseError] = useState<string | null>(null)
  const [reverseError, setReverseError] = useState<string | null>(null)
  const [galleryError, setGalleryError] = useState<string | null>(null)
  const [activeStepId, setActiveStepId] = useState<CoinFormStepId>('core-identity')
  const [apiError, setApiError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAiGenerating, setIsAiGenerating] = useState(false)
  const [successResult, setSuccessResult] = useState<SubmitCoinResponse | null>(null)
  const [saveDraftMessage, setSaveDraftMessage] = useState<string | null>(null)
  const [draftNotice, setDraftNotice] = useState<string | null>(null)
  const [titleManualOverride, setTitleManualOverride] = useState(false)
  const contentLanguage = resolveContentLanguage(values.content_language)

  const formDataLoading = useMemo(
    () =>
      isCoinFormDataLoading({
        formOptionsLoading,
        formOptionsLanguage,
        contentLanguage,
      }),
    [formOptionsLoading, formOptionsLanguage, contentLanguage],
  )

  const defaultObversePreviewUrl = getDefaultImagePreviewUrl(defaultImages.obverse)
  const defaultReversePreviewUrl = getDefaultImagePreviewUrl(defaultImages.reverse)
  const selectedObversePreviewUrl = useObjectPreviewUrl(obverseFile, null)
  const selectedReversePreviewUrl = useObjectPreviewUrl(reverseFile, null)
  const obversePreviewUrl = resolveCoinImagePreviewUrl({
    selectedPreviewUrl: selectedObversePreviewUrl,
    hasSelectedImage: Boolean(obverseFile),
    defaultImageUrl: defaultObversePreviewUrl,
  })
  const reversePreviewUrl = resolveCoinImagePreviewUrl({
    selectedPreviewUrl: selectedReversePreviewUrl,
    hasSelectedImage: Boolean(reverseFile),
    defaultImageUrl: defaultReversePreviewUrl,
  })
  const obversePreviewSource = getImagePreviewSource(obverseFile, null, defaultImages.obverse)
  const reversePreviewSource = getImagePreviewSource(reverseFile, null, defaultImages.reverse)
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

  const activeIndex = steps.findIndex((step) => step.id === activeStepId)
  const safeIndex = activeIndex >= 0 ? activeIndex : 0
  const isFirstStep = safeIndex === 0
  const isReviewStep = activeStepId === 'review-submission'

  const reviewValidationErrors = useMemo(() => {
    if (!isReviewStep) {
      return {}
    }

    return validateNewCoinForm(values, {
      formOptions,
      formOptionsReady: !formOptionsLoading && !formOptionsFailed,
      formOptionsFailed,
    })
  }, [isReviewStep, values, formOptions, formOptionsLoading, formOptionsFailed])

  const draftValues = useMemo(
    () =>
      normalizeSubmissionPayload(normalizeCoinFormValues(values, { formOptions }), {
        formOptions,
      }),
    [values, formOptions],
  )

  const duplicateCheckValues = useMemo(() => {
    const normalizedValues = normalizeSubmissionPayload(values, { formOptions })
    return normalizeSubmissionPayload(
      {
        ...normalizedValues,
        title: resolveCoinPostTitle(normalizedValues, { formOptions }),
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
    enabled: Boolean(token) && isReviewStep,
  })

  const isDirty = useMemo(
    () =>
      !areCoinFormValuesEqual(values, NEW_COIN_FORM_INITIAL_VALUES) ||
      hasPendingCoinImageChanges({ obverseFile, reverseFile, galleryFiles }),
    [values, obverseFile, reverseFile, galleryFiles],
  )

  useUnsavedChangesGuard(isDirty)

  const hasObverse = hasEffectiveCoinImage(obverseFile, null, defaultImages.obverse)
  const hasReverse = hasEffectiveCoinImage(reverseFile, null, defaultImages.reverse)
  const hasGallery = galleryFiles.length > 0

  const completionPercent = useMemo(
    () =>
      computeCompletenessScore({
        values,
        hasObverse,
        hasReverse,
        hasGallery,
      }).score,
    [values, hasObverse, hasReverse, hasGallery],
  )

  const stepCompletion = useMemo(
    () =>
      getCoinStepCompletion(
        values,
        { hasObverse, hasReverse, galleryCount: galleryFiles.length },
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

  const {
    draftKey,
    lastSavedAt,
    saveError,
    saveState: draftSaveState,
    hasPendingChanges,
    saveDraftNow,
  } = useCoinDraft({
    kind: 'new',
    values: draftValues,
    obverseFile,
    reverseFile,
    galleryFiles,
    activeStepId,
    titleManualOverride,
    isDirty,
    enabled: !successResult,
  })

  const submitBlockedByDuplicate = isSubmitBlockedByDuplicateProtection(duplicateProtectionState)
  const isDuplicateChecking = duplicateCheckStatus === 'checking'
  const isSavingDraft = draftSaveState === 'saving'
  const isBusyForSubmit =
    isSubmitting ||
    isSavingDraft ||
    formDataLoading ||
    isDuplicateChecking ||
    isAiGenerating

  const submitDisabled =
    isReviewStep &&
    (Object.keys(reviewValidationErrors).length > 0 || submitBlockedByDuplicate || isBusyForSubmit)

  const submitDisabledReason = isBusyForSubmit
    ? t('validation.waitForChecks')
    : submitBlockedByDuplicate
      ? getExactDuplicateSubmitBlockMessage()
      : undefined
  const submitLabel = isSubmitting
    ? t('wizard.submitting')
    : isDuplicateChecking
      ? t('wizard.checkingUniqueness')
      : formDataLoading
        ? t('wizard.loadingData')
        : isAiGenerating
          ? t('ai.generatingShort')
          : t(`contentLanguage.submitLabel.${contentLanguage}`)
  const saveDraftDisabled = isSubmitting || isSavingDraft || formDataLoading
  const saveDraftLabel = isSavingDraft ? t('wizard.saving') : t('common.saveDraft')

  const { handleTitleChange, regenerateTitle } = useCoinPostTitle({
    values,
    setValues,
    formOptions,
    titleManualOverride,
    setTitleManualOverride,
  })

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
      isEditMode: false,
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
      galleryCount: galleryFiles.length,
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
    ],
  )

  useEffect(() => {
    if (draftRestoredRef.current) {
      return
    }

    draftRestoredRef.current = true
    const draft = loadFormDraft(getDraftStorageKey('new'))
    if (!draft) {
      return
    }

    const restoredFiles = restoreFilesFromDraft(draft)
    setValues(draft.values)
    setTitleManualOverride(draft.titleManualOverride ?? false)
    setObverseFile(restoredFiles.obverseFile)
    setReverseFile(restoredFiles.reverseFile)
    setGalleryFiles(restoredFiles.galleryFiles)
    if (draft.activeStepId) {
      setActiveStepId(draft.activeStepId)
    }
    setDraftNotice(t('common.draftRestored'))
  }, [])

  useEffect(() => {
    async function loadFormOptions() {
      const requestId = ++formOptionsRequestIdRef.current
      setFormOptionsLoading(true)
      setFormOptionsFailed(false)
      setFormOptions((current) => ({
        ...current,
        values: [],
        types: [],
        series: [],
      }))

      if (!token) {
        setFormOptionsFailed(true)
        setFormOptionsLoading(false)
        return
      }

      try {
        const response = await getFormOptions(token, contentLanguage)
        if (requestId !== formOptionsRequestIdRef.current) {
          return
        }
        setFormOptions(response.options)
        setFormOptionsLanguage(contentLanguage)
        setDefaultImages(response.default_images ?? EMPTY_DEFAULT_IMAGES)
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

    void loadFormOptions()
  }, [token, contentLanguage])

  useEffect(() => {
    if (formOptionsLoading || formOptionsFailed || formOptionsLanguage !== contentLanguage) {
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

    setValues((current) => ({
      ...current,
      country: resolved.country,
      denomination: shouldClearDenomination ? '' : resolved.denomination,
      coin_type: shouldClearCoinType ? '' : resolved.coin_type,
      coin_series: shouldClearCoinSeries ? '' : resolved.coin_series,
    }))
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

  function updateField<K extends keyof CoinFormValues>(field: K, value: CoinFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }))
    setFieldErrors((current) => ({ ...current, [field]: undefined }))
    setApiError(null)
    setSuccessResult(null)
    setSaveDraftMessage(null)
  }

  function handleObverseChange(file: File | null) {
    setObverseFile(file)
    setObverseError(file ? validateImageFile(file) : null)
    setApiError(null)
    setSuccessResult(null)
  }

  function handleReverseChange(file: File | null) {
    setReverseFile(file)
    setReverseError(file ? validateImageFile(file) : null)
    setApiError(null)
    setSuccessResult(null)
  }

  function handleObverseClear() {
    setObverseFile(null)
    setObverseError(null)
    setApiError(null)
    setSuccessResult(null)
  }

  function handleReverseClear() {
    setReverseFile(null)
    setReverseError(null)
    setApiError(null)
    setSuccessResult(null)
  }

  function handleGalleryChange(files: File[]) {
    setGalleryFiles(files)
    setGalleryError(validateGalleryFiles(files))
    setApiError(null)
    setSuccessResult(null)
  }

  function handleMintVariantsChange(variants: MintVariantRow[]) {
    setValues((current) => ({ ...current, mintVariants: variants }))
    setApiError(null)
    setSuccessResult(null)
  }

  function handleHasMintVariantsChange(hasMintVariants: boolean) {
    setValues((current) => ({ ...current, ...applyMintVariantsModeChange(current, hasMintVariants) }))
    setApiError(null)
    setSuccessResult(null)
  }

  function resetForm() {
    setValues(createNewCoinFormValues())
    setFieldErrors({})
    setObverseFile(null)
    setReverseFile(null)
    setGalleryFiles([])
    setObverseError(null)
    setReverseError(null)
    setGalleryError(null)
    setActiveStepId('core-identity')
    setDraftNotice(null)
    setTitleManualOverride(false)
  }

  function goBack() {
    if (isFirstStep) {
      requestNavigation('/dashboard')
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

    if (!isReviewStep) {
      goContinue()
      return
    }

    if (isSubmitting) {
      return
    }

    if (isBusyForSubmit) {
      setApiError(t('validation.waitForChecks'))
      return
    }

    setApiError(null)
    setSuccessResult(null)

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

    setFieldErrors(errors)
    setObverseError(nextObverseError)
    setReverseError(nextReverseError)
    setGalleryError(nextGalleryError)

    if (
      Object.keys(errors).length > 0 ||
      nextObverseError ||
      nextReverseError ||
      nextGalleryError
    ) {
      setActiveStepId(
        getStepForValidationErrors(errors, {
          obverse: nextObverseError,
          reverse: nextReverseError,
          gallery: nextGalleryError,
        }),
      )
      return
    }

    if (!token) {
      setApiError(t('dashboard.sessionExpired'))
      return
    }

    setIsSubmitting(true)

    try {
      const duplicateResult = await checkDuplicatesNow({ force: true })

      if (isSubmitBlockedByDuplicateProtection(duplicateResult.protectionState)) {
        setApiError(getExactDuplicateSubmitBlockMessage())
        return
      }

      const formData = new FormData()
      appendCoinFormData(
        formData,
        valuesForSubmit,
        { obverse: obverseFile, reverse: reverseFile, gallery: galleryFiles },
        { isAdmin, postSlug, formOptions, contentLanguage },
      )

      const response = await submitCoin(formData, token)
      clearFormDraft(draftKey)
      setSuccessResult(response)
      resetForm()
    } catch (error) {
      if (error instanceof ApiError) {
        setApiError(error.message)
      } else {
        setApiError(t('common.connectionError'))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (successResult) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <Card>
          <div
            role="status"
            className="flex flex-col gap-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900"
          >
            <p className="font-medium">{t('wizard.submitSuccess')}</p>
            <dl className="grid gap-2 text-xs sm:grid-cols-2">
              <div>
                <dt className="font-semibold uppercase tracking-wide">{t('common.postId')}</dt>
                <dd className="mt-1 font-mono">{successResult.post_id}</dd>
              </div>
              <div>
                <dt className="font-semibold uppercase tracking-wide">{t('common.status')}</dt>
                <dd className="mt-1 font-semibold uppercase">{successResult.status}</dd>
              </div>
            </dl>
            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <Link
                to="/new-coin"
                onClick={() => setSuccessResult(null)}
                className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
              >
                {t('wizard.submitAnother')}
              </Link>
              <Link
                to="/dashboard"
                className="inline-flex items-center justify-center rounded-xl border border-border bg-white px-5 py-3 text-sm font-semibold text-navy transition-all duration-200 hover:border-navy/20 hover:bg-muted"
              >
                {t('wizard.backToDashboard')}
              </Link>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <CoinEntryWizard
      mode="new"
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
      previewTitle={values.title.trim() || undefined}
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
      formId={FORM_ID}
      alerts={
        <>
          {draftNotice ? (
            <div
              role="status"
              className="mb-5 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-navy"
            >
              {draftNotice}
            </div>
          ) : null}
          {apiError ? (
            <div
              role="alert"
              className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {apiError}
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
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} noValidate>
        {isReviewStep ? (
          <Suspense fallback={<WizardStepLoadingSkeleton />}>
            <LazyReviewSubmissionStep
              values={values}
              formMode="new"
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
            obversePreviewUrl={obversePreviewUrl}
            reversePreviewUrl={reversePreviewUrl}
            obversePreviewSource={obversePreviewSource}
            reversePreviewSource={reversePreviewSource}
            onAiGeneratingChange={setIsAiGenerating}
            />
          </Suspense>
        )}
      </form>
    </CoinEntryWizard>
  )
}
