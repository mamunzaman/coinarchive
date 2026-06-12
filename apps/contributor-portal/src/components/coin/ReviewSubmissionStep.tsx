import type { ReactNode } from 'react'
import { Pencil, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { DuplicateWarningCard } from './DuplicateWarningCard'
import { CoinCodePreview } from './CoinCodePreview'
import { SafeHtmlContent } from '../ui/SafeHtmlContent'
import { Button } from '../ui/Button'
import { TextField } from '../ui/TextField'
import { computeCompletenessScore } from '../../lib/completenessScore'
import type { DuplicateCheckStatus } from '../../lib/duplicateCheck'
import type { DuplicateProtectionState } from '../../lib/duplicateProtection'
import type { DuplicateMatch } from '../../lib/duplicateDetection'
import { formatRecordStatusLabel } from '../../lib/revisionComparison'
import {
  formatMintMarkDisplay,
  getMintMarkLabel,
  REVIEW_DEFAULT_IMAGE_NOTE,
  type CoinFormValues,
  type MintVariantRow,
} from '../../types/coinForm'
import { getImageReviewStateLabel, type ImagePreviewSource } from '../../lib/imagePreview'
import { CoinImagePreviewSlot } from './CoinImagePreviewSlot'
import {
  getCoinIssueStatusDisplayLabel,
  getCoinSeriesDisplayLabel,
  getCoinTypeDisplayLabel,
} from '../../lib/coinDisplayLabels'
import { getContentLanguageReviewLabel } from '../../lib/contentLanguage'
import { getCountryDisplayLabel } from '../../lib/countryLabels'
import { getSpecificationDisplayValue } from '../../lib/coinFormData'
import { getCoinFormCorrections, type CoinFormCorrection } from '../../lib/coinFormNormalize'
import {
  EMPTY_FORM_OPTIONS,
  isKnownTaxonomyOption,
  isRecognizedCoinSeriesValue,
  type FormOptions,
} from '../../types/formOptions'
import { normalizeTitle } from '../../lib/inputNormalization'

type ReviewSubmissionStepProps = {
  values: CoinFormValues
  isAdmin?: boolean
  formOptions?: FormOptions
  formOptionsReady?: boolean
  duplicateCheckStatus?: DuplicateCheckStatus
  duplicateProtectionState?: DuplicateProtectionState | null
  ownSubmissionIds?: number[]
  formOptionsLoading?: boolean
  duplicateMatches: DuplicateMatch[]
  obversePreviewUrl?: string | null
  reversePreviewUrl?: string | null
  obversePreviewSource?: ImagePreviewSource
  reversePreviewSource?: ImagePreviewSource
  galleryPreviewUrls?: string[]
  hasExistingObverse?: boolean
  hasExistingReverse?: boolean
  existingGalleryUrls?: string[]
  titleManualOverride?: boolean
  titleError?: string
  releasedDateError?: string
  onTitleChange?: (value: string) => void
  onRegenerateTitle?: () => void
  disabled?: boolean
  formMode?: 'new' | 'edit'
}

function ReviewSectionCard({
  title,
  subtitle,
  children,
  className = '',
}: {
  title: string
  subtitle?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={[
        'overflow-hidden rounded-xl border border-border/60 bg-white shadow-[var(--shadow-card)]',
        className,
      ].join(' ')}
    >
      <header className="border-b border-border/50 bg-[#faf9f7]/80 px-4 py-3 sm:px-5">
        <h3 className="font-serif text-base font-semibold text-navy sm:text-lg">{title}</h3>
        {subtitle ? <p className="mt-0.5 text-xs text-navy-muted">{subtitle}</p> : null}
      </header>
      <div className="px-4 py-4 sm:px-5">{children}</div>
    </section>
  )
}

function ReviewDetailGrid({ children }: { children: ReactNode }) {
  return <dl className="grid gap-x-6 md:grid-cols-2">{children}</dl>
}

function ReviewDetailRow({
  label,
  value,
  emptyLabel,
  error,
  className = '',
}: {
  label: string
  value: string
  emptyLabel?: string
  error?: string
  className?: string
}) {
  const { t } = useTranslation()
  const trimmed = value.trim()
  const isEmpty = !trimmed
  const showError = Boolean(error)

  return (
    <div
      className={[
        'border-b border-border/40 py-3 first:pt-0 last:border-b-0 last:pb-0',
        showError ? 'rounded-lg border border-red-200 bg-red-50/60 px-3 -mx-1' : '',
        className,
      ].join(' ')}
    >
      <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-navy-muted">
        {label}
      </dt>
      <dd
        className={[
          'mt-1 text-sm leading-relaxed',
          showError ? 'font-medium text-red-700' : isEmpty ? 'italic text-navy-muted' : 'text-navy',
        ].join(' ')}
      >
        {showError ? error : trimmed || (emptyLabel ?? t('common.notProvided'))}
      </dd>
    </div>
  )
}

function ReviewCorrectionList({ corrections }: { corrections: CoinFormCorrection[] }) {
  const { t } = useTranslation()

  if (corrections.length === 0) {
    return null
  }

  return (
    <div className="mt-4 rounded-lg border border-gold/30 bg-gold/10 px-3 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-navy">
        {t('review.suggestedCorrections')}
      </p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {corrections.map((correction) => (
          <div key={correction.field} className="rounded-lg bg-white/75 px-3 py-2 text-xs">
            <p className="font-semibold text-navy">{correction.label}</p>
            <p className="mt-1 text-navy-muted">
              {t('review.originalValue')}: <span className="font-medium text-navy">{correction.original}</span>
            </p>
            <p className="text-navy-muted">
              {t('review.correctedValue')}: <span className="font-medium text-navy">{correction.corrected}</span>
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

function ReviewTextBlock({
  label,
  value,
  html = false,
  emptyLabel,
  className = 'md:col-span-2',
}: {
  label: string
  value: string
  html?: boolean
  emptyLabel?: string
  className?: string
}) {
  const { t } = useTranslation()
  const trimmed = value.trim()
  const isEmpty = !trimmed

  return (
    <div
      className={[
        'border-b border-border/40 py-3 first:pt-0 last:border-b-0 last:pb-0',
        className,
      ].join(' ')}
    >
      <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-navy-muted">
        {label}
      </dt>
      <dd className="mt-1">
        {isEmpty ? (
          <span className="text-sm italic text-navy-muted">
            {emptyLabel ?? t('common.notProvided')}
          </span>
        ) : (
          <div className="max-h-36 overflow-y-auto rounded-lg bg-muted/25 px-3 py-2.5 text-sm leading-relaxed text-navy">
            {html ? <SafeHtmlContent html={trimmed} /> : <p className="whitespace-pre-wrap">{trimmed}</p>}
          </div>
        )}
      </dd>
    </div>
  )
}

function ReviewImageFace({
  label,
  previewUrl,
  previewSource,
  formOptionsLoading,
  hasExisting,
}: {
  label: string
  previewUrl?: string | null
  previewSource: ImagePreviewSource
  formOptionsLoading?: boolean
  hasExisting?: boolean
}) {
  const { t } = useTranslation()

  const showPreview =
    formOptionsLoading ||
    Boolean(previewUrl) ||
    previewSource === 'default' ||
    hasExisting

  const stateLabel = formOptionsLoading
    ? t('common.loadingImagePreview')
    : getImageReviewStateLabel(previewSource)

  return (
    <div className="rounded-xl border border-border/60 bg-[#faf8f5] p-3">
      <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-navy-muted">
        {label}
      </p>
      {showPreview ? (
        <div className="mx-auto w-full max-w-[9.5rem] sm:max-w-[10.5rem]">
          <CoinImagePreviewSlot
            previewUrl={previewUrl}
            previewSource={previewSource}
            formOptionsLoading={formOptionsLoading}
            alt={`${label} review`}
            size="catalogue"
            objectFit="contain"
            className="w-full rounded-lg shadow-none"
          />
        </div>
      ) : (
        <p className="py-5 text-center text-sm italic text-navy-muted">
          {t('common.notProvided')}
        </p>
      )}
      <p className="mt-2 text-center text-[11px] leading-snug text-navy-muted">{stateLabel}</p>
      {previewSource === 'default' && previewUrl ? (
        <p className="mt-1 text-center text-[10px] text-navy-muted/80">{REVIEW_DEFAULT_IMAGE_NOTE}</p>
      ) : null}
    </div>
  )
}

function ReviewMintVariantBlock({ row, index }: { row: MintVariantRow; index: number }) {
  const city = getMintMarkLabel(row.mintMarkCode) ?? ''

  return (
    <div className="rounded-lg border border-border/50 bg-[#faf8f5] px-3 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-navy-muted">
        Variant {index + 1}
      </p>
      <div className="mt-2 space-y-0">
        <ReviewDetailRow
          label="Mint mark"
          value={formatMintMarkDisplay(row.mintMarkCode) || row.mintMarkCode}
        />
        <ReviewDetailRow label="Mint city / location" value={city} />
        <ReviewDetailRow label="Variant mintage" value={row.mintMintage} />
        <ReviewTextBlock label="Variant notes" value={row.mintNotes} className="" />
      </div>
    </div>
  )
}

function isStaleTaxonomyValue(
  value: string,
  options: FormOptions['countries'],
  formOptionsReady: boolean,
  isRecognized: (value: string, options: FormOptions['countries']) => boolean = isKnownTaxonomyOption,
): boolean {
  const trimmed = value.trim()
  return (
    formOptionsReady &&
    options.length > 0 &&
    Boolean(trimmed) &&
    !isRecognized(trimmed, options)
  )
}

function getTitleSourceFields(values: CoinFormValues): string[] {
  const fields = [
    { label: 'Country', value: values.country },
    { label: 'Year', value: values.year },
    { label: 'Denomination', value: values.denomination },
    { label: 'Coin Type', value: values.coin_type },
  ].filter((field) => field.value.trim())

  const hasSubject = [
    values.coin_theme,
    values.coin_series,
    values.short_description,
  ].some((value) => value?.trim())

  return hasSubject ? [...fields.map((field) => field.label), 'Theme'] : fields.map((field) => field.label)
}

export function ReviewSubmissionStep({
  values,
  isAdmin = false,
  formOptions = EMPTY_FORM_OPTIONS,
  formOptionsReady = false,
  duplicateCheckStatus = 'clear',
  duplicateProtectionState = null,
  ownSubmissionIds = [],
  formOptionsLoading = false,
  duplicateMatches,
  obversePreviewUrl,
  reversePreviewUrl,
  obversePreviewSource = 'none',
  reversePreviewSource = 'none',
  galleryPreviewUrls = [],
  hasExistingObverse = false,
  hasExistingReverse = false,
  existingGalleryUrls = [],
  titleManualOverride = false,
  titleError,
  releasedDateError,
  onTitleChange,
  onRegenerateTitle,
  disabled = false,
  formMode = 'new',
}: ReviewSubmissionStepProps) {
  const { t } = useTranslation()
  const hasObverse = Boolean(obversePreviewUrl || hasExistingObverse || obversePreviewSource === 'default')
  const hasReverse = Boolean(reversePreviewUrl || hasExistingReverse || reversePreviewSource === 'default')
  const hasGallery = galleryPreviewUrls.length > 0 || existingGalleryUrls.length > 0

  const completeness = computeCompletenessScore({
    values,
    hasObverse,
    hasReverse,
    hasGallery,
  })

  const mintRows = values.hasMintVariants
    ? values.mintVariants.filter(
        (row) => row.mintMarkCode.trim() || row.mintMintage.trim() || row.mintNotes.trim(),
      )
    : []

  const allGalleryUrls = [...galleryPreviewUrls, ...existingGalleryUrls]
  const titleSourceFields = getTitleSourceFields(values)
  const galleryCount = allGalleryUrls.length
  const contentLanguage = values.content_language === 'en' ? 'en' : 'de'
  const contentLanguageBadge = contentLanguage.toUpperCase()
  const contentLanguageName = t(`review.languageNames.${contentLanguage}`)

  const staleTaxonomyWarnings = [
    {
      label: t('fields.country'),
      stale: isStaleTaxonomyValue(values.country, formOptions.countries, formOptionsReady),
    },
    {
      label: t('form.denomination'),
      stale: isStaleTaxonomyValue(values.denomination, formOptions.values, formOptionsReady),
    },
    {
      label: t('form.coinType'),
      stale: isStaleTaxonomyValue(values.coin_type, formOptions.types, formOptionsReady),
    },
    {
      label: t('form.coinSeries'),
      stale: isStaleTaxonomyValue(
        values.coin_series,
        formOptions.series,
        formOptionsReady,
        isRecognizedCoinSeriesValue,
      ),
    },
  ].filter((item) => item.stale)
  const suggestedCorrections = getCoinFormCorrections(values, { formOptions })

  return (
    <section className="flex flex-col gap-5 md:gap-6">
      <div className="flex flex-col gap-2.5">
        <div className="rounded-xl border border-border/60 bg-white p-3 shadow-sm sm:p-4">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                <h3 className="font-serif text-base font-semibold text-navy sm:text-lg">
                  {t('review.seoPostTitle')}
                </h3>
                <span
                  className={[
                    'inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold sm:text-xs',
                    titleManualOverride
                      ? 'bg-amber-50 text-amber-950 ring-1 ring-amber-200'
                      : 'bg-emerald-50 text-emerald-950 ring-1 ring-emerald-200',
                  ].join(' ')}
                >
                  {titleManualOverride ? (
                    <Pencil className="size-3 shrink-0" aria-hidden="true" />
                  ) : (
                    <Sparkles className="size-3 shrink-0" aria-hidden="true" />
                  )}
                  {titleManualOverride ? t('review.manuallyEdited') : t('review.autoGenerated')}
                </span>
                {titleManualOverride ? (
                  <span className="text-[11px] text-navy-muted sm:text-xs">{t('review.customTitle')}</span>
                ) : null}
              </div>
              {titleSourceFields.length > 0 ? (
                <p className="mt-1.5 text-[11px] leading-snug text-navy-muted sm:text-xs">
                  <span className="font-medium text-navy-muted/90">{t('review.generatedFrom')}</span>{' '}
                  {titleSourceFields.join(' • ')}
                </p>
              ) : null}
              <p className="mt-1 text-[11px] text-navy-muted sm:text-xs">
                {t('review.titleSeoHint')}
              </p>
              <p className="mt-1 text-[11px] text-navy-muted sm:text-xs">
                {t('review.titleCleanupHint')}
              </p>
            </div>
            {titleManualOverride && onRegenerateTitle ? (
              <Button
                type="button"
                variant="secondary"
                onClick={onRegenerateTitle}
                disabled={disabled}
                className="w-full shrink-0 px-2.5 py-1.5 text-xs lg:w-auto"
              >
                {t('review.resetAutoTitle')}
              </Button>
            ) : null}
          </div>
          <div className="mt-2">
            <TextField
              label={t('review.postTitle')}
              name="post_title"
              value={values.title}
              onChange={(event) => onTitleChange?.(event.target.value)}
              onBlur={() => {
                const normalized = normalizeTitle(values.title)
                if (normalized !== values.title) {
                  onTitleChange?.(normalized)
                }
              }}
              error={titleError}
              disabled={disabled || !onTitleChange}
              className="px-3 py-2 text-base font-semibold text-navy"
              required
            />
          </div>
          <div className="mt-2.5">
            <DuplicateWarningCard
              matches={duplicateMatches}
              status={duplicateCheckStatus}
              protectionState={duplicateProtectionState}
              ownSubmissionIds={ownSubmissionIds}
              variant="compact"
            />
          </div>
        </div>

      </div>

      <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3.5 sm:px-5">
        <p className="text-sm font-medium text-navy">{t('review.finalAuditTitle')}</p>
        <p className="mt-1 text-xs text-navy-muted">
          {t('review.finalAuditHint', { empty: t('common.notProvided') })}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 sm:px-5">
        <p className="text-sm font-medium text-navy">{t('review.reviewBeforeSubmit')}</p>
        <p className="text-xs font-semibold text-primary">
          {t('review.catalogueReadiness', { score: completeness.score })}
        </p>
      </div>

      <CoinCodePreview
        variant="review"
        country={values.country}
        year={values.year}
        denomination={values.denomination}
        coinType={values.coin_type}
        releaseDate={values.released_date}
        countries={formOptions.countries}
      />

      <div className="grid gap-5 md:grid-cols-2 md:gap-6">
        <ReviewSectionCard
          title={t('review.imagesTitle')}
          subtitle={t('review.imagesSubtitle')}
          className="md:col-span-2"
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <ReviewImageFace
              label={t('form.obverse')}
              previewUrl={obversePreviewUrl}
              previewSource={obversePreviewSource}
              formOptionsLoading={formOptionsLoading}
              hasExisting={hasExistingObverse}
            />
            <ReviewImageFace
              label={t('form.reverse')}
              previewUrl={reversePreviewUrl}
              previewSource={reversePreviewSource}
              formOptionsLoading={formOptionsLoading}
              hasExisting={hasExistingReverse}
            />
            <div className="rounded-xl border border-border/60 bg-[#faf8f5] p-3 sm:col-span-2 lg:col-span-1">
              <div className="mb-2.5 flex items-center justify-between gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-navy-muted">
                  {t('review.gallery')}
                </p>
                <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-navy-muted ring-1 ring-border/60">
                  {t('review.imageCount', { count: galleryCount })}
                </span>
              </div>
              {galleryCount > 0 ? (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-2">
                  {allGalleryUrls.map((url, index) => (
                    <img
                      key={`${url}-${index}`}
                      src={url}
                      alt={t('review.galleryAlt', { number: index + 1 })}
                      className="aspect-square rounded-lg border border-border/60 bg-white object-contain p-1"
                    />
                  ))}
                </div>
              ) : (
                <p className="py-5 text-center text-sm italic text-navy-muted">
                  {t('common.notProvided')}
                </p>
              )}
            </div>
          </div>
        </ReviewSectionCard>

        <ReviewSectionCard
          title={t('form.reviewCoreIdentityTitle')}
          subtitle={t('form.reviewCoreIdentitySubtitle')}
          className="md:col-span-2"
        >
          <ReviewDetailGrid>
            <ReviewDetailRow
              label={t('contentLanguage.label')}
              value={getContentLanguageReviewLabel(values.content_language)}
            />
            <ReviewDetailRow label={t('fields.title')} value={values.title} />
            <ReviewDetailRow
              label={t('fields.country')}
              value={getCountryDisplayLabel(values.country) || values.country}
            />
            <ReviewDetailRow label={t('fields.year')} value={values.year} />
            <ReviewDetailRow label={t('form.denomination')} value={values.denomination} />
            <ReviewDetailRow
              label={t('form.coinType')}
              value={getCoinTypeDisplayLabel(values.coin_type) || values.coin_type}
            />
            <ReviewDetailRow
              label={t('form.coinSeries')}
              value={getCoinSeriesDisplayLabel(values.coin_series) || values.coin_series}
            />
            <ReviewDetailRow
              label={t('form.coinDesigner')}
              value={values.coin_designer}
            />
            <ReviewDetailRow
              label={t('specifications.releasedDate')}
              value={values.released_date}
              error={releasedDateError}
            />
            <ReviewDetailRow label={t('form.coinTheme')} value={values.coin_theme} className="md:col-span-2" />
          </ReviewDetailGrid>
          <ReviewCorrectionList
            corrections={suggestedCorrections.filter((correction) =>
              ['country', 'denomination', 'released_date'].includes(correction.field),
            )}
          />
          {staleTaxonomyWarnings.length > 0 ? (
            <div
              role="alert"
              className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-950"
            >
              <p className="font-semibold">{t('review.taxonomyNeedsAttention')}</p>
              <ul className="mt-1.5 list-disc space-y-1 pl-4">
                {staleTaxonomyWarnings.map((item) => (
                  <li key={item.label}>
                    <span className="font-medium">{item.label}:</span> {t('review.taxonomyStale')}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </ReviewSectionCard>

        <ReviewSectionCard
          title={t('mint.title')}
          subtitle={t('mint.description')}
          className="md:col-span-2"
        >
          <ReviewDetailGrid>
            <ReviewDetailRow
              label={t('mint.status')}
              value={values.hasMintVariants ? t('mint.variants') : t('mint.singleMint')}
            />
            <ReviewDetailRow label={t('mint.totalMintage')} value={values.coin_mintage} />
            <ReviewDetailRow
              label={t('mint.marksAvailable')}
              value={values.mintMarksAvailable}
              className="md:col-span-2"
            />
          </ReviewDetailGrid>

          {values.hasMintVariants ? (
            mintRows.length > 0 ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {mintRows.map((row, index) => (
                  <ReviewMintVariantBlock key={`${row.mintMarkCode}-${index}`} row={row} index={index} />
                ))}
              </div>
            ) : values.mintMarksAvailable.trim() ? (
              <p className="mt-4 text-sm text-navy-muted">{t('mint.marksOnlyReview')}</p>
            ) : (
              <p className="mt-4 text-sm italic text-navy-muted">{t('mint.emptyVariants')}</p>
            )
          ) : (
            <div className="mt-4 rounded-lg border border-border/50 bg-[#faf8f5] px-3 py-3">
              <ReviewDetailGrid>
                <ReviewDetailRow
                  label={t('mint.singleMintMark')}
                  value={formatMintMarkDisplay(values.singleMintMark) || values.singleMintMark}
                />
                <ReviewDetailRow
                  label={t('mint.city')}
                  value={getMintMarkLabel(values.singleMintMark) ?? ''}
                />
              </ReviewDetailGrid>
            </div>
          )}
        </ReviewSectionCard>

        <ReviewSectionCard
          title={t('form.specificationsTitle')}
          subtitle={t('form.reviewSpecificationsSubtitle')}
        >
          <ReviewDetailGrid>
            <ReviewDetailRow
              label={t('specifications.material')}
              value={getSpecificationDisplayValue(values, 'coin_material', { mode: formMode })}
            />
            <ReviewDetailRow
              label={t('specifications.quality')}
              value={getSpecificationDisplayValue(values, 'coin_quality', { mode: formMode })}
            />
            <ReviewDetailRow
              label={t('specifications.weight')}
              value={getSpecificationDisplayValue(values, 'coin_weight_g', { mode: formMode })}
            />
            <ReviewDetailRow
              label={t('specifications.diameter')}
              value={getSpecificationDisplayValue(values, 'coin_diameter_mm', { mode: formMode })}
            />
            <ReviewDetailRow
              label={t('specifications.thickness')}
              value={getSpecificationDisplayValue(values, 'coin_thickness_mm', { mode: formMode })}
            />
            <ReviewDetailRow
              label={t('specifications.mintage')}
              value={values.coin_mintage}
            />
            <ReviewDetailRow
              label={t('form.coinIssueStatus')}
              value={
                getCoinIssueStatusDisplayLabel(values.coin_issue_status) || values.coin_issue_status
              }
            />
            <ReviewDetailRow
              label={t('form.sourceName')}
              value={values.coin_source_name}
            />
            <ReviewDetailRow
              label={t('form.sourceUrl')}
              value={values.coin_source_url}
              className="md:col-span-2"
            />
            <ReviewDetailRow
              label={t('specifications.edgeInscription')}
              value={values.coin_edge_inscription}
              className="md:col-span-2"
            />
          </ReviewDetailGrid>
          <ReviewCorrectionList
            corrections={suggestedCorrections.filter((correction) => correction.field === 'coin_quality')}
          />
        </ReviewSectionCard>

        <ReviewSectionCard title={t('review.descriptionsTitle')} subtitle={t('review.descriptionsSubtitle')}>
          <ReviewDetailGrid>
            <ReviewTextBlock label={t('form.shortDescription')} value={values.short_description} />
            <ReviewTextBlock
              label={t('form.historicalBackground')}
              value={values.coin_historical_background}
              html
            />
            <ReviewTextBlock
              label={t('form.obverseDescription')}
              value={values.coin_obverse_description}
              html
            />
            <ReviewTextBlock
              label={t('form.reverseDescription')}
              value={values.coin_reverse_description}
              html
            />
            <ReviewTextBlock label={t('form.collectorNotes')} value={values.coin_collector_notes} html />
          </ReviewDetailGrid>
        </ReviewSectionCard>

        {isAdmin ? (
          <ReviewSectionCard
            title={t('review.statusVisibilityTitle')}
            subtitle={t('review.statusVisibilitySubtitle')}
            className="md:col-span-2"
          >
            <ReviewDetailGrid>
              <ReviewDetailRow
                label={t('review.publishedInCatalogue')}
                value={values.coin_is_published_catalogue ? t('common.yes') : t('common.no')}
              />
              <ReviewDetailRow
                label={t('review.featuredCoin')}
                value={values.coin_is_featured ? t('common.yes') : t('common.no')}
              />
              <ReviewDetailRow
                label={t('form.appEnabled')}
                value={values.coin_is_app_enabled ? t('common.yes') : t('common.no')}
              />
              <ReviewDetailRow
                label={t('form.recordStatus')}
                value={formatRecordStatusLabel(values.coin_record_status)}
              />
            </ReviewDetailGrid>
          </ReviewSectionCard>
        ) : null}
      </div>

      {completeness.missingRecommended.length > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4">
          <p className="text-sm font-semibold text-amber-950">
            {t('review.missingRecommended')}
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-900">
            {completeness.missingRecommended.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <DuplicateWarningCard
        matches={duplicateMatches}
        status={duplicateCheckStatus}
        protectionState={duplicateProtectionState}
        ownSubmissionIds={ownSubmissionIds}
        variant="full"
        prominent
      />

      <div className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-4 shadow-sm sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              {t('review.languageConfirmationTitle')}
            </p>
            <p className="mt-2 text-sm font-semibold text-navy">
              {t('review.languageConfirmation', { language: contentLanguageName })}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-navy-muted">
              {t('review.languageLockedAfterSubmit')}
            </p>
          </div>
          <span className="inline-flex w-fit rounded-full bg-white px-3 py-1 text-xs font-bold text-primary ring-1 ring-primary/25">
            {contentLanguageBadge}
          </span>
        </div>
      </div>

      <p className="text-xs text-navy-muted">{t('review.submitHint')}</p>
    </section>
  )
}
