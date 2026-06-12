import {
  COIN_RECORD_STATUS_OPTIONS,
  type CoinFormValues,
  type MintVariantRow,
} from '../types/coinForm'
import {
  COIN_FORM_STEPS,
  getVisibleCoinFormSteps,
  type CoinFormStepId,
} from '../types/coinFormSteps'

export type StepCompletionStatus = 'complete' | 'attention' | 'empty'

export type StepCompletionIssue = {
  field: string
  label: string
  message: string
}

export type StepCompletionResult = {
  stepId: CoinFormStepId
  status: StepCompletionStatus
  completedCount: number
  totalCount: number
  label: string
  issues?: StepCompletionIssue[]
}

type StepEvaluation = Pick<
  StepCompletionResult,
  'status' | 'completedCount' | 'totalCount' | 'issues'
>

export type StepCompletionImages = {
  hasObverse: boolean
  hasReverse: boolean
  galleryCount?: number
}

export type StepCompletionOptions = {
  isAdmin?: boolean
  fieldErrors?: Partial<Record<keyof CoinFormValues, string>>
  imageErrors?: {
    obverse?: string | null
    reverse?: string | null
    gallery?: string | null
  }
}

const CORE_IDENTITY_FIELDS = [
  'title',
  'country',
  'year',
  'denomination',
  'coin_type',
  'short_description',
] as const satisfies ReadonlyArray<keyof CoinFormValues>

const CORE_FIELD_LABELS: Record<(typeof CORE_IDENTITY_FIELDS)[number], string> = {
  title: 'Post title',
  country: 'Country / region',
  year: 'Year',
  denomination: 'Denomination',
  coin_type: 'Coin type',
  short_description: 'Short description',
}

const SPECIFICATION_FIELDS = [
  'released_date',
  'coin_mintage',
  'coin_material',
  'coin_quality',
  'coin_weight_g',
  'coin_diameter_mm',
  'coin_thickness_mm',
  'coin_edge_inscription',
] as const satisfies ReadonlyArray<keyof CoinFormValues>

const DESCRIPTION_FIELDS = [
  'coin_obverse_description',
  'coin_reverse_description',
  'coin_historical_background',
  'coin_collector_notes',
] as const satisfies ReadonlyArray<keyof CoinFormValues>

function isFilled(value: string | undefined | null): boolean {
  return Boolean(value?.trim())
}

function countFilledFields(values: CoinFormValues, fields: readonly (keyof CoinFormValues)[]): number {
  return fields.filter((field) => isFilled(String(values[field] ?? ''))).length
}

function isYearValid(year: string): boolean {
  const yearValue = year.trim()

  if (!yearValue || !/^\d+$/.test(yearValue)) {
    return false
  }

  const parsed = Number.parseInt(yearValue, 10)
  const minYear = 500
  const maxYear = new Date().getFullYear() + 1

  return parsed >= minYear && parsed <= maxYear
}

function isCoreIdentityFieldValid(
  field: (typeof CORE_IDENTITY_FIELDS)[number],
  values: CoinFormValues,
  fieldErrors?: StepCompletionOptions['fieldErrors'],
): boolean {
  if (fieldErrors?.[field]) {
    return false
  }

  if (field === 'year') {
    return isYearValid(values.year)
  }

  return isFilled(values[field])
}

function getCoreIdentityIssues(
  values: CoinFormValues,
  options: StepCompletionOptions,
): StepCompletionIssue[] {
  const issues: StepCompletionIssue[] = []

  for (const field of CORE_IDENTITY_FIELDS) {
    if (isCoreIdentityFieldValid(field, values, options.fieldErrors)) {
      continue
    }

    const label = CORE_FIELD_LABELS[field]
    let message = `Add ${label.toLowerCase()}`

    if (field === 'year') {
      if (options.fieldErrors?.year) {
        message = options.fieldErrors.year
      } else if (isFilled(values.year)) {
        message = `Enter a valid year (500–${new Date().getFullYear() + 1})`
      } else {
        message = 'Add year'
      }
    } else if (options.fieldErrors?.[field]) {
      message = options.fieldErrors[field] as string
    }

    issues.push({ field, label, message })
  }

  return issues
}

function evaluateCoreIdentity(values: CoinFormValues, options: StepCompletionOptions): StepEvaluation {
  const totalCount = CORE_IDENTITY_FIELDS.length
  const completedCount = CORE_IDENTITY_FIELDS.filter((field) =>
    isCoreIdentityFieldValid(field, values, options.fieldErrors),
  ).length
  const anyFilled = CORE_IDENTITY_FIELDS.some((field) => isFilled(String(values[field] ?? '')))

  if (completedCount === totalCount) {
    return { status: 'complete', completedCount, totalCount }
  }

  if (!anyFilled) {
    return { status: 'empty', completedCount, totalCount }
  }

  return {
    status: 'attention',
    completedCount,
    totalCount,
    issues: getCoreIdentityIssues(values, options),
  }
}

function getImagesIssues(
  images: StepCompletionImages,
  options: StepCompletionOptions,
): StepCompletionIssue[] {
  const issues: StepCompletionIssue[] = []
  const hasObverse = images.hasObverse && !options.imageErrors?.obverse
  const hasReverse = images.hasReverse && !options.imageErrors?.reverse

  if (!hasObverse) {
    issues.push({
      field: 'obverse_image',
      label: 'Obverse image',
      message: options.imageErrors?.obverse ?? 'Add obverse image',
    })
  }

  if (!hasReverse) {
    issues.push({
      field: 'reverse_image',
      label: 'Reverse image',
      message: options.imageErrors?.reverse ?? 'Add reverse image',
    })
  }

  if (options.imageErrors?.gallery) {
    issues.push({
      field: 'gallery_images',
      label: 'Gallery images',
      message: options.imageErrors.gallery,
    })
  }

  return issues
}

function evaluateImages(images: StepCompletionImages, options: StepCompletionOptions): StepEvaluation {
  const totalCount = 2
  const hasObverse = images.hasObverse && !options.imageErrors?.obverse
  const hasReverse = images.hasReverse && !options.imageErrors?.reverse
  const completedCount = (hasObverse ? 1 : 0) + (hasReverse ? 1 : 0)

  if (hasObverse && hasReverse) {
    return { status: 'complete', completedCount, totalCount }
  }

  if (!images.hasObverse && !images.hasReverse) {
    return { status: 'empty', completedCount, totalCount }
  }

  return {
    status: 'attention',
    completedCount,
    totalCount,
    issues: getImagesIssues(images, options),
  }
}

function isValidMintVariant(row: MintVariantRow): boolean {
  return Boolean(row.mintMarkCode.trim())
}

function hasAnyMintData(values: CoinFormValues): boolean {
  if (values.hasMintVariants) {
    if (values.mintMarksAvailable.trim()) {
      return true
    }

    return values.mintVariants.some(
      (row) =>
        row.mintMarkCode.trim() || row.mintMintage.trim() || row.mintNotes.trim(),
    )
  }

  return Boolean(values.singleMintMark.trim() || values.mintMarksAvailable.trim())
}

function getMintInformationIssues(values: CoinFormValues): StepCompletionIssue[] {
  if (values.hasMintVariants) {
    return [
      {
        field: 'mint-information',
        label: 'Mint information',
        message: 'Add at least one mint variant with a mint mark code.',
      },
    ]
  }

  return [
    {
      field: 'mint-information',
      label: 'Mint information',
      message: 'Add a single mint mark or clear mint marks available.',
    },
  ]
}

function evaluateMintInformation(values: CoinFormValues): StepEvaluation {
  const totalCount = 1

  if (values.hasMintVariants) {
    const validVariants = values.mintVariants.filter(isValidMintVariant).length

    if (validVariants > 0) {
      return { status: 'complete', completedCount: 1, totalCount }
    }

    if (values.mintMarksAvailable.trim()) {
      return { status: 'complete', completedCount: 1, totalCount }
    }

    if (hasAnyMintData(values)) {
      return {
        status: 'attention',
        completedCount: 0,
        totalCount,
        issues: getMintInformationIssues(values),
      }
    }

    return { status: 'empty', completedCount: 0, totalCount }
  }

  if (values.singleMintMark.trim()) {
    return { status: 'complete', completedCount: 1, totalCount }
  }

  if (values.mintMarksAvailable.trim()) {
    return {
      status: 'attention',
      completedCount: 0,
      totalCount,
      issues: getMintInformationIssues(values),
    }
  }

  return { status: 'empty', completedCount: 0, totalCount }
}

function evaluateSpecifications(values: CoinFormValues, options: StepCompletionOptions): StepEvaluation {
  const totalCount = SPECIFICATION_FIELDS.length
  const optionalFields = SPECIFICATION_FIELDS.filter((field) => field !== 'released_date')
  const releaseDateValid =
    isFilled(values.released_date) && !options.fieldErrors?.released_date
  const optionalFilled = countFilledFields(values, optionalFields)
  const completedCount = (releaseDateValid ? 1 : 0) + optionalFilled

  if (!releaseDateValid) {
    return {
      status: 'attention',
      completedCount,
      totalCount,
      issues: [
        {
          field: 'released_date',
          label: 'Released date',
          message: options.fieldErrors?.released_date ?? 'Release date required',
        },
      ],
    }
  }

  return evaluateOptionalFieldSection(
    values,
    SPECIFICATION_FIELDS,
    3,
    1,
    'specifications',
    'Specifications',
    'Add at least 3 specification fields or clear the section.',
  )
}

function evaluateOptionalFieldSection(
  values: CoinFormValues,
  fields: readonly (keyof CoinFormValues)[],
  completeMin: number,
  attentionMin: number,
  sectionField: string,
  sectionLabel: string,
  attentionMessage: string,
): StepEvaluation {
  const totalCount = fields.length
  const completedCount = countFilledFields(values, fields)

  if (completedCount >= completeMin) {
    return { status: 'complete', completedCount, totalCount }
  }

  if (completedCount >= attentionMin) {
    return {
      status: 'attention',
      completedCount,
      totalCount,
      issues: [{ field: sectionField, label: sectionLabel, message: attentionMessage }],
    }
  }

  return { status: 'empty', completedCount, totalCount }
}

function isRecordStatusValid(status: CoinFormValues['coin_record_status']): boolean {
  return COIN_RECORD_STATUS_OPTIONS.includes(status)
}

function evaluateStatusAdmin(values: CoinFormValues): StepEvaluation {
  const totalCount = 4
  const completedCount =
    (values.coin_is_published_catalogue ? 1 : 0) +
    (values.coin_is_featured ? 1 : 0) +
    (values.coin_is_app_enabled ? 1 : 0) +
    (isRecordStatusValid(values.coin_record_status) ? 1 : 0)

  if (!isRecordStatusValid(values.coin_record_status)) {
    return {
      status: 'attention',
      completedCount,
      totalCount,
      issues: [
        {
          field: 'coin_record_status',
          label: 'Record status',
          message: 'Select a valid record status.',
        },
      ],
    }
  }

  return { status: 'complete', completedCount, totalCount }
}

function evaluateReviewSubmission(core: StepEvaluation, images: StepEvaluation): StepEvaluation {
  const totalCount = 2
  const requiredComplete =
    (core.status === 'complete' ? 1 : 0) + (images.status === 'complete' ? 1 : 0)

  if (core.status === 'empty' && images.status === 'empty') {
    return { status: 'empty', completedCount: 0, totalCount }
  }

  if (core.status === 'attention' || images.status === 'attention') {
    return {
      status: 'attention',
      completedCount: requiredComplete,
      totalCount,
      issues: [...(core.issues ?? []), ...(images.issues ?? [])],
    }
  }

  if (core.status === 'complete' && images.status === 'complete') {
    return { status: 'complete', completedCount: totalCount, totalCount }
  }

  return { status: 'attention', completedCount: requiredComplete, totalCount }
}

function getStepLabel(stepId: CoinFormStepId): string {
  return COIN_FORM_STEPS.find((step) => step.id === stepId)?.label ?? stepId
}

function buildStepResult(stepId: CoinFormStepId, evaluation: StepEvaluation): StepCompletionResult {
  return {
    stepId,
    label: getStepLabel(stepId),
    status: evaluation.status,
    completedCount: evaluation.completedCount,
    totalCount: evaluation.totalCount,
    issues: evaluation.status === 'attention' ? evaluation.issues : undefined,
  }
}

export function getCoinStepCompletion(
  values: CoinFormValues,
  images: StepCompletionImages,
  options: StepCompletionOptions = {},
): StepCompletionResult[] {
  const isAdmin = options.isAdmin ?? false
  const visibleSteps = getVisibleCoinFormSteps(isAdmin)

  const coreIdentity = evaluateCoreIdentity(values, options)
  const imageStep = evaluateImages(images, options)
  const mintInformation = evaluateMintInformation(values)
  const specifications = evaluateSpecifications(values, options)
  const descriptions = evaluateOptionalFieldSection(
    values,
    DESCRIPTION_FIELDS,
    2,
    1,
    'descriptions',
    'Descriptions',
    'Add at least 2 description fields or clear the section.',
  )
  const statusAdmin = evaluateStatusAdmin(values)
  const reviewSubmission = evaluateReviewSubmission(coreIdentity, imageStep)

  const evaluations: Record<CoinFormStepId, StepEvaluation> = {
      'core-identity': coreIdentity,
      images: imageStep,
      'mint-information': mintInformation,
      specifications,
      descriptions,
      'status-admin': statusAdmin,
      'review-submission': reviewSubmission,
    }

  return visibleSteps.map((step) => buildStepResult(step.id, evaluations[step.id]))
}

export function getCoinStepCompletionById(
  stepId: CoinFormStepId,
  values: CoinFormValues,
  images: StepCompletionImages,
  options: StepCompletionOptions = {},
): StepCompletionResult | undefined {
  return getCoinStepCompletion(values, images, options).find((result) => result.stepId === stepId)
}

export function findStepCompletion(
  stepCompletion: StepCompletionResult[],
  stepId: CoinFormStepId,
): StepCompletionResult | undefined {
  return stepCompletion.find((result) => result.stepId === stepId)
}

export function getIssueMessageForField(
  issues: StepCompletionIssue[] | undefined,
  field: string,
): string | undefined {
  return issues?.find((issue) => issue.field === field)?.message
}

export function getSectionIssueMessages(
  issues: StepCompletionIssue[] | undefined,
  sectionField: string,
): string[] {
  return (issues ?? [])
    .filter((issue) => issue.field === sectionField)
    .map((issue) => issue.message)
}

export function getStepCompletionAriaLabel(
  stepLabel: string,
  status: StepCompletionStatus | undefined,
): string {
  if (status === 'complete') return `${stepLabel} complete`
  if (status === 'attention') return `${stepLabel} need attention`
  return `${stepLabel} empty`
}

const REQUIRED_WIZARD_STEP_IDS: CoinFormStepId[] = ['core-identity', 'images']

const CATALOGUE_HEALTH_STEP_IDS: CoinFormStepId[] = [
  'core-identity',
  'images',
  'mint-information',
  'specifications',
]

export type WizardNextAction = {
  stepId: CoinFormStepId
  message: string
  isReview: boolean
}

export function getCatalogueHealthSteps(
  stepCompletion: StepCompletionResult[],
): StepCompletionResult[] {
  return CATALOGUE_HEALTH_STEP_IDS.map((stepId) => findStepCompletion(stepCompletion, stepId)).filter(
    (step): step is StepCompletionResult => Boolean(step),
  )
}

export function getWizardNextAction(stepCompletion: StepCompletionResult[]): WizardNextAction {
  for (const stepId of REQUIRED_WIZARD_STEP_IDS) {
    const step = findStepCompletion(stepCompletion, stepId)
    if (step && step.status !== 'complete') {
      return {
        stepId,
        message: `Complete ${step.label}`,
        isReview: false,
      }
    }
  }

  const optionalStep = stepCompletion.find(
    (step) =>
      !REQUIRED_WIZARD_STEP_IDS.includes(step.stepId) &&
      step.stepId !== 'review-submission' &&
      (step.status === 'attention' || step.status === 'empty'),
  )

  if (optionalStep) {
    return {
      stepId: optionalStep.stepId,
      message: `Complete ${optionalStep.label}`,
      isReview: false,
    }
  }

  return {
    stepId: 'review-submission',
    message: 'Review and submit',
    isReview: true,
  }
}
