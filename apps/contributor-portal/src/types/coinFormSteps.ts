export type CoinFormStepId =
  | 'core-identity'
  | 'images'
  | 'mint-information'
  | 'specifications'
  | 'descriptions'
  | 'status-admin'
  | 'review-submission'

export type CoinFormStep = {
  id: CoinFormStepId
  label: string
  description: string
  tip: string
}

export const COIN_FORM_STEPS: CoinFormStep[] = [
  {
    id: 'core-identity',
    label: 'Core Identity',
    description: 'Required details used to identify and classify the coin.',
    tip: 'Use the official catalogue title and accurate country, year, denomination, and coin type.',
  },
  {
    id: 'images',
    label: 'Images',
    description: 'Obverse, reverse, and optional gallery photographs.',
    tip: 'Existing images remain unchanged unless you replace or remove them. JPG, PNG, or WEBP up to 5MB each.',
  },
  {
    id: 'mint-information',
    label: 'Mint Information',
    description: 'Single mint mark or multi-mint variant details.',
    tip: 'Enable mint variants when the same issue was struck at multiple mints with distinct marks.',
  },
  {
    id: 'specifications',
    label: 'Specifications',
    description: 'Optional physical and production details.',
    tip: 'Include weight, diameter, and quality when known — these enrich catalogue search and comparison.',
  },
  {
    id: 'descriptions',
    label: 'Descriptions',
    description: 'Optional detailed notes for catalogue and collector context.',
    tip: 'Describe devices, historical context, and collector notes that help reviewers validate the entry.',
  },
  {
    id: 'status-admin',
    label: 'Status & Admin',
    description: 'Catalogue visibility and record status settings.',
    tip: 'Published catalogue and featured flags control public visibility after approval.',
  },
  {
    id: 'review-submission',
    label: 'Review Submission',
    description: 'Confirm images, details, and recommended fields before submitting.',
    tip: 'Check for duplicates and missing catalogue details — you can still go back to edit.',
  },
]

export function getVisibleCoinFormSteps(isAdmin: boolean): CoinFormStep[] {
  if (isAdmin) {
    return COIN_FORM_STEPS
  }

  return COIN_FORM_STEPS.filter((step) => step.id !== 'status-admin')
}

export function getCoinFormStepById(
  stepId: CoinFormStepId,
  isAdmin: boolean,
): CoinFormStep | undefined {
  return getVisibleCoinFormSteps(isAdmin).find((step) => step.id === stepId)
}

const CORE_IDENTITY_FIELDS = [
  'title',
  'country',
  'year',
  'denomination',
  'coin_type',
  'short_description',
] as const

const SPECIFICATIONS_REQUIRED_FIELDS = ['released_date'] as const

const MINT_INFORMATION_FIELDS = ['mintMarksAvailable', 'singleMintMark'] as const

export function getStepForValidationErrors(
  fieldErrors: Partial<Record<string, string>>,
  imageErrors?: {
    obverse?: string | null
    reverse?: string | null
    gallery?: string | null
  },
): CoinFormStepId {
  if (CORE_IDENTITY_FIELDS.some((field) => fieldErrors[field])) {
    return 'core-identity'
  }

  if (MINT_INFORMATION_FIELDS.some((field) => fieldErrors[field])) {
    return 'mint-information'
  }

  if (SPECIFICATIONS_REQUIRED_FIELDS.some((field) => fieldErrors[field])) {
    return 'specifications'
  }

  if (imageErrors?.obverse || imageErrors?.reverse || imageErrors?.gallery) {
    return 'images'
  }

  return 'core-identity'
}
