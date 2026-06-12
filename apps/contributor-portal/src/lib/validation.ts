import i18n from '../i18n'

export type RegisterFormValues = {
  display_name: string
  email: string
  password: string
}

export type RegisterFieldErrors = Partial<Record<keyof RegisterFormValues, string>>

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateRegisterForm(values: RegisterFormValues): RegisterFieldErrors {
  const errors: RegisterFieldErrors = {}

  if (!values.display_name.trim()) {
    errors.display_name = i18n.t('auth.errors.displayNameRequired')
  }

  if (!values.email.trim()) {
    errors.email = i18n.t('auth.errors.emailRequired')
  } else if (!EMAIL_PATTERN.test(values.email.trim())) {
    errors.email = i18n.t('auth.errors.emailInvalid')
  }

  if (!values.password) {
    errors.password = i18n.t('auth.errors.passwordRequired')
  } else if (values.password.length < 8) {
    errors.password = i18n.t('auth.errors.passwordMin')
  }

  return errors
}

export type LoginFormValues = {
  email: string
  password: string
}

export type LoginFieldErrors = Partial<Record<keyof LoginFormValues, string>>

export function validateLoginForm(values: LoginFormValues): LoginFieldErrors {
  const errors: LoginFieldErrors = {}

  if (!values.email.trim()) {
    errors.email = i18n.t('auth.errors.emailRequired')
  } else if (!EMAIL_PATTERN.test(values.email.trim())) {
    errors.email = i18n.t('auth.errors.emailInvalid')
  }

  if (!values.password) {
    errors.password = i18n.t('auth.errors.passwordRequired')
  }

  return errors
}

import type { CoinFormValues } from '../types/coinForm'
import { COIN_ISSUE_STATUS_OPTIONS, isMintVariantRowFilled } from '../types/coinForm'
import {
  isKnownTaxonomyOption,
  isRecognizedCoinSeriesValue,
  type FormOptions,
  type TaxonomyOption,
} from '../types/formOptions'

export type NewCoinFormValues = CoinFormValues

export type NewCoinFieldErrors = Partial<Record<keyof CoinFormValues, string>>

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const ALLOWED_IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp'])
const MAX_IMAGE_SIZE = 5 * 1024 * 1024

export type CoinFormValidationContext = {
  formOptions?: FormOptions
  formOptionsReady?: boolean
  formOptionsFailed?: boolean
}

function validateTaxonomySelection(
  value: string,
  options: TaxonomyOption[],
  field: 'country' | 'denomination' | 'coin_type' | 'coin_series',
  errors: NewCoinFieldErrors,
  context?: CoinFormValidationContext,
  isKnown: (value: string, options: TaxonomyOption[]) => boolean = isKnownTaxonomyOption,
): void {
  if (!context) {
    return
  }

  if (context.formOptionsFailed || (context.formOptionsReady && options.length === 0)) {
    errors[field] = i18n.t('validation.taxonomyOptionsFailed')
    return
  }

  if (!context.formOptionsReady) {
    errors[field] = i18n.t('validation.taxonomyOptionsFailed')
    return
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return
  }

  if (!isKnown(trimmed, options)) {
    errors[field] = i18n.t('validation.taxonomyInvalidOption')
  }
}

const OPTIONAL_URL_PATTERN = /^https?:\/\/.+/i

export function validateNewCoinForm(
  values: NewCoinFormValues,
  context?: CoinFormValidationContext,
): NewCoinFieldErrors {
  const errors: NewCoinFieldErrors = {}
  const formOptions = context?.formOptions

  if (!values.title.trim()) {
    errors.title = i18n.t('validation.titleRequired')
  }

  if (!values.country.trim()) {
    errors.country = i18n.t('validation.countryRequired')
  }

  const minYear = 500
  const maxYear = new Date().getFullYear() + 1
  const yearValue = values.year.trim()

  if (!yearValue) {
    errors.year = i18n.t('validation.yearRequired')
  } else if (!/^\d+$/.test(yearValue)) {
    errors.year = i18n.t('validation.yearInvalid')
  } else {
    const year = Number.parseInt(yearValue, 10)

    if (year < minYear) {
      errors.year = i18n.t('validation.yearMin', { min: minYear })
    } else if (year > maxYear) {
      errors.year = i18n.t('validation.yearMax', { max: maxYear })
    }
  }

  if (!values.denomination.trim()) {
    errors.denomination = i18n.t('validation.denominationRequired')
  }

  if (!values.coin_type.trim()) {
    errors.coin_type = i18n.t('validation.coinTypeRequired')
  }

  if (!values.short_description.trim()) {
    errors.short_description = i18n.t('validation.shortDescriptionRequired')
  }

  if (!values.released_date.trim()) {
    errors.released_date = i18n.t('validation.releaseDateRequired')
  }

  const sourceUrl = values.coin_source_url.trim()
  if (sourceUrl && !OPTIONAL_URL_PATTERN.test(sourceUrl)) {
    errors.coin_source_url = i18n.t('validation.sourceUrlInvalid')
  }

  const issueStatus = values.coin_issue_status.trim()
  if (
    issueStatus &&
    !COIN_ISSUE_STATUS_OPTIONS.includes(
      issueStatus as (typeof COIN_ISSUE_STATUS_OPTIONS)[number],
    )
  ) {
    errors.coin_issue_status = i18n.t('validation.issueStatusInvalid')
  }

  if (
    values.hasMintVariants &&
    !values.mintVariants.some(isMintVariantRowFilled) &&
    !values.mintMarksAvailable.trim()
  ) {
    errors.mintMarksAvailable = i18n.t('validation.mintVariantsRequired')
  }

  if (formOptions) {
    validateTaxonomySelection(
      values.country,
      formOptions.countries,
      'country',
      errors,
      context,
    )
    validateTaxonomySelection(
      values.denomination,
      formOptions.values,
      'denomination',
      errors,
      context,
    )
    validateTaxonomySelection(
      values.coin_type,
      formOptions.types,
      'coin_type',
      errors,
      context,
    )
    validateTaxonomySelection(
      values.coin_series,
      formOptions.series,
      'coin_series',
      errors,
      context,
      isRecognizedCoinSeriesValue,
    )
  }

  return errors
}

export function validateImageFile(file: File): string | null {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  const typeAllowed = ALLOWED_IMAGE_TYPES.has(file.type)
  const extensionAllowed = ALLOWED_IMAGE_EXTENSIONS.has(extension)

  if (!typeAllowed && !extensionAllowed) {
    return i18n.t('validation.imageType')
  }

  if (file.size > MAX_IMAGE_SIZE) {
    return i18n.t('validation.imageSize')
  }

  return null
}
