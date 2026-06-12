import { lazy, Suspense, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MintInformationFields } from './MintInformationFields'
import { ExistingImageReplaceField } from './ExistingImageReplaceField'
import { EditableGalleryGrid } from './EditableGalleryGrid'
import { CroppableMultiImageUploadField } from '../ui/CroppableMultiImageUploadField'
import { CoinCodePreview } from './CoinCodePreview'
import { ContentLanguageField } from './ContentLanguageField'
import { CoinWizardErrorBoundary } from './CoinWizardErrorBoundary'
import { WizardFieldLoadingSkeleton } from './WizardStepLoadingSkeleton'
import { SelectField } from '../ui/SelectField'
import { TextAreaField } from '../ui/TextAreaField'
import { TextField } from '../ui/TextField'
import { MaterialPresetChips, TwoEuroDefaultsPreset } from '../ui/SpecificationPresets'
import { TaxonomySelectWithOther } from './TaxonomySelectWithOther'
import type { ContributorRole, SubmissionImage } from '../../lib/api'
import {
  COIN_RECORD_STATUS_OPTIONS,
  type CoinFormValues,
  type MintVariantRow,
} from '../../types/coinForm'
import { getCoinIssueStatusSelectOptions, getCoinQualitySelectOptions } from '../../lib/coinFormData'
import type { CoinFormStepId } from '../../types/coinFormSteps'
import { EMPTY_FORM_OPTIONS, type FormOptions } from '../../types/formOptions'
import { FIELD_HELP } from '../../lib/fieldHelpContent'
import { getSeriesFieldHelpContent } from '../../lib/fieldHelpTooltips'
import {
  getCoinFormFieldCorrection,
  normalizeCoinFormValues,
  type CoinFormCorrection,
} from '../../lib/coinFormNormalize'
import { useCoinFormFieldNormalize } from '../../hooks/useCoinFormFieldNormalize'
import {
  getIssueMessageForField,
  getSectionIssueMessages,
  type StepCompletionIssue,
} from '../../lib/stepCompletion'
import type { ImagePreviewSource } from '../../lib/imagePreview'
import { resolveCoinImagePreviewUrl } from '../../lib/imagePreview'
import { useObjectPreviewUrl } from '../../hooks/useObjectPreviewUrl'
import type { AiDescriptionTarget } from '../../lib/aiDescriptionPrompts'
import type { GeneratedDescriptions } from '../../lib/aiDescriptionGenerator'

const LazyReleaseDatePickerField = lazy(() =>
  import('./ReleaseDatePickerField').then((module) => ({ default: module.ReleaseDatePickerField })),
)

const LazyAIWritingAssistant = lazy(() =>
  import('./AIWritingAssistant').then((module) => ({ default: module.AIWritingAssistant })),
)

const LazyRichTextField = lazy(() =>
  import('../forms/RichTextField').then((module) => ({ default: module.RichTextField })),
)

const AI_FIELD_TO_FORM_FIELD = {
  obverse_description: 'coin_obverse_description',
  obverse: 'coin_obverse_description',
  reverse_description: 'coin_reverse_description',
  reverse: 'coin_reverse_description',
  historical_background: 'coin_historical_background',
  collector_notes: 'coin_collector_notes',
} as const satisfies Record<string, keyof CoinFormValues>

type CoinFormFieldsProps = {
  values: CoinFormValues
  fieldErrors: Partial<Record<keyof CoinFormValues, string>>
  onFieldChange: <K extends keyof CoinFormValues>(field: K, value: CoinFormValues[K]) => void
  contributorRole?: ContributorRole
  disabled?: boolean
  formOptions?: FormOptions
  formOptionsLoading?: boolean
  formDataLoading?: boolean
  formOptionsFailed?: boolean
  contentLanguageLocked?: boolean
  contentLanguageLockedReason?: string
  obverseFile?: File | null
  reverseFile?: File | null
  galleryFiles?: File[]
  obverseError?: string
  reverseError?: string
  galleryError?: string
  onObverseChange: (file: File | null) => void
  onReverseChange: (file: File | null) => void
  onObverseClear?: () => void
  onReverseClear?: () => void
  onGalleryChange: (files: File[]) => void
  onMintVariantsChange: (variants: MintVariantRow[]) => void
  onHasMintVariantsChange: (hasMintVariants: boolean) => void
  imageEditMode?: boolean
  currentObverseUrl?: string | null
  currentReverseUrl?: string | null
  obverseExistingRemoved?: boolean
  reverseExistingRemoved?: boolean
  obversePreviewUrl?: string | null
  reversePreviewUrl?: string | null
  obversePreviewSource?: ImagePreviewSource
  reversePreviewSource?: ImagePreviewSource
  existingGalleryImages?: SubmissionImage[]
  removedGalleryImageIds?: number[]
  onGalleryImageRemoveToggle?: (id: number, remove: boolean) => void
  galleryReplacementPreviews?: Record<number, string>
  onGalleryReplace?: (id: number, file: File) => void
  onCancelGalleryReplace?: (id: number) => void
  allowGalleryPermanentDelete?: boolean
  onGalleryPermanentDelete?: (id: number) => void
  onAiGeneratingChange?: (isGenerating: boolean) => void
  obverseLabel?: string
  reverseLabel?: string
  activeStep?: CoinFormStepId
  stepIssues?: StepCompletionIssue[]
}

function SectionHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div className="border-b border-border/60 pb-4">
      <h2 className="font-serif text-lg font-semibold text-navy">{title}</h2>
      {description ? <p className="mt-1 text-sm text-navy-muted">{description}</p> : null}
    </div>
  )
}

function SectionAttentionBanner({ messages }: { messages: string[] }) {
  const { t } = useTranslation()

  if (messages.length === 0) {
    return null
  }

  return (
    <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 px-4 py-3">
      <p className="text-xs font-semibold text-amber-900">{t('form.needsAttention')}</p>
      {messages.map((message) => (
        <p key={message} className="mt-0.5 text-xs text-amber-800">
          {message}
        </p>
      ))}
    </div>
  )
}

function CorrectionChip({
  correction,
  disabled,
  onApply,
}: {
  correction: CoinFormCorrection | null
  disabled?: boolean
  onApply: (correction: CoinFormCorrection) => void
}) {
  const { t } = useTranslation()

  if (!correction) {
    return null
  }

  return (
    <div className="-mt-2 flex flex-wrap items-center gap-2 text-xs text-navy-muted" role="status">
      <span>{t('form.didYouMean')}</span>
      <button
        type="button"
        className="rounded-full border border-gold/40 bg-gold/10 px-3 py-1 font-semibold text-navy transition hover:border-gold hover:bg-gold/20 focus:outline-none focus:ring-2 focus:ring-gold/50 disabled:cursor-not-allowed disabled:opacity-60"
        aria-label={t('form.applySuggestion', {
          label: correction.label,
          value: correction.corrected,
        })}
        disabled={disabled}
        onClick={() => onApply(correction)}
      >
        {correction.corrected}
      </button>
    </div>
  )
}

export function CoinFormFields({
  values,
  fieldErrors,
  onFieldChange,
  contributorRole = 'contributor',
  disabled = false,
  formOptions = EMPTY_FORM_OPTIONS,
  formOptionsLoading = false,
  formDataLoading = false,
  formOptionsFailed = false,
  contentLanguageLocked = false,
  contentLanguageLockedReason,
  obverseFile,
  reverseFile,
  galleryFiles = [],
  obverseError,
  reverseError,
  galleryError,
  onObverseChange,
  onReverseChange,
  onObverseClear,
  onReverseClear,
  onGalleryChange,
  onMintVariantsChange,
  onHasMintVariantsChange,
  imageEditMode = false,
  currentObverseUrl,
  currentReverseUrl,
  obverseExistingRemoved = false,
  reverseExistingRemoved = false,
  obversePreviewUrl: obversePreviewUrlProp,
  reversePreviewUrl: reversePreviewUrlProp,
  obversePreviewSource = 'none',
  reversePreviewSource = 'none',
  existingGalleryImages = [],
  removedGalleryImageIds = [],
  onGalleryImageRemoveToggle,
  galleryReplacementPreviews = {},
  onGalleryReplace,
  onCancelGalleryReplace,
  allowGalleryPermanentDelete = false,
  onGalleryPermanentDelete,
  onAiGeneratingChange,
  obverseLabel,
  reverseLabel,
  activeStep,
  stepIssues,
}: CoinFormFieldsProps) {
  const { t } = useTranslation()
  const resolvedObverseLabel = obverseLabel ?? t('form.obverseImage')
  const resolvedReverseLabel = reverseLabel ?? t('form.reverseImage')
  const isAdmin = contributorRole === 'admin'
  const showHeading = !activeStep
  const { changeField, blurField, formatHint } = useCoinFormFieldNormalize({
    formOptions,
    onFieldChange,
  })
  const [aiUsageCount, setAiUsageCount] = useState(0)
  const [aiGeneratedFields, setAiGeneratedFields] = useState<Set<AiDescriptionTarget>>(new Set())
  const previewValues = useMemo(
    () => normalizeCoinFormValues(values, { formOptions }),
    [values, formOptions],
  )
  const seriesHelpContent = useMemo(() => getSeriesFieldHelpContent(t), [t])
  const countryCorrection = getCoinFormFieldCorrection('country', values.country, { formOptions })
  const denominationCorrection = getCoinFormFieldCorrection('denomination', values.denomination, {
    formOptions,
  })
  const qualityCorrection = getCoinFormFieldCorrection('coin_quality', values.coin_quality, {
    formOptions,
  })
  const releaseDateCorrection = getCoinFormFieldCorrection('released_date', values.released_date, {
    formOptions,
  })

  function applyCorrection(correction: CoinFormCorrection) {
    onFieldChange(
      correction.field,
      correction.corrected as CoinFormValues[typeof correction.field],
    )
  }

  function applyAiDescriptions(descriptions: GeneratedDescriptions) {
    for (const [aiField, formField] of Object.entries(AI_FIELD_TO_FORM_FIELD)) {
      const value = descriptions[aiField as keyof GeneratedDescriptions]
      if (value !== undefined) {
        onFieldChange(formField, value)
      }
    }

    if (descriptions.seo_description !== undefined) {
      onFieldChange('short_description', descriptions.seo_description)
    }
  }

  function fieldAttention(field: keyof CoinFormValues): string | undefined {
    if (fieldErrors[field]) {
      return undefined
    }

    return getIssueMessageForField(stepIssues, field)
  }

  function imageFieldAttention(field: string, imageError?: string): string | undefined {
    if (imageError) {
      return undefined
    }

    return getIssueMessageForField(stepIssues, field)
  }
  const computedObverseUrl = useObjectPreviewUrl(obverseFile ?? null, null)
  const computedReverseUrl = useObjectPreviewUrl(reverseFile ?? null, null)
  const obverseThumbnailUrl = obversePreviewUrlProp ?? resolveCoinImagePreviewUrl({
    selectedPreviewUrl: computedObverseUrl,
    hasSelectedImage: Boolean(obverseFile),
    existingImageUrl: currentObverseUrl,
  })
  const reverseThumbnailUrl = reversePreviewUrlProp ?? resolveCoinImagePreviewUrl({
    selectedPreviewUrl: computedReverseUrl,
    hasSelectedImage: Boolean(reverseFile),
    existingImageUrl: currentReverseUrl,
  })
  const qualityOptions = useMemo(() => getCoinQualitySelectOptions(), [])
  const issueStatusOptions = useMemo(() => getCoinIssueStatusSelectOptions(), [])
  const fieldsDisabled = disabled || formDataLoading
  const taxonomyOptionsLoading = formOptionsLoading || formDataLoading

  function renderCoreIdentity() {
    return (
      <section className="flex flex-col gap-5">
        {showHeading ? (
          <SectionHeading
            title={t('form.coreIdentityTitle')}
            description={t('form.coreIdentityDescription')}
          />
        ) : null}
        <ContentLanguageField
          value={values.content_language}
          onChange={(language) => changeField('content_language', language)}
          disabled={fieldsDisabled || contentLanguageLocked}
          lockedReason={contentLanguageLocked ? contentLanguageLockedReason : undefined}
        />
        {formOptionsFailed && !formDataLoading ? (
          <div
            role="alert"
            className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          >
            {t('validation.taxonomyOptionsFailed')}
          </div>
        ) : null}
        <CoinCodePreview
          country={previewValues.country}
          year={previewValues.year}
          denomination={previewValues.denomination}
          coinType={previewValues.coin_type}
          releaseDate={previewValues.released_date}
          countries={formOptions.countries}
        />
        <p className="text-xs text-navy-muted">{t('form.coinCodeHint')}</p>
        <TextField
          label={t('form.coinTheme')}
          name="coin_theme"
          placeholder={t('form.coinThemePlaceholder')}
          value={values.coin_theme}
          onChange={(event) => changeField('coin_theme', event.target.value)}
          onBlur={() => blurField('coin_theme', values.coin_theme)}
          autoFormatHint={formatHint('coin_theme')}
          disabled={fieldsDisabled}
        />
        <TextField
          label={t('form.coinDesigner')}
          name="coin_designer"
          placeholder={t('form.coinDesignerPlaceholder')}
          value={values.coin_designer}
          onChange={(event) => changeField('coin_designer', event.target.value)}
          onBlur={() => blurField('coin_designer', values.coin_designer)}
          autoFormatHint={formatHint('coin_designer')}
          disabled={fieldsDisabled}
          helpTooltip={FIELD_HELP.designer}
        />
        <TaxonomySelectWithOther
          label={t('form.countryRegion')}
          name="country"
          value={values.country}
          options={formOptions.countries}
          onChange={(next) => changeField('country', next)}
          error={fieldErrors.country}
          attention={fieldAttention('country')}
          placeholder={t('form.selectCountry')}
          hint={t('form.countryCodeHint')}
          disabled={fieldsDisabled}
          required
          allowCustom={false}
          optionsLoading={taxonomyOptionsLoading}
          optionsFailed={formOptionsFailed}
        />
        <CorrectionChip correction={countryCorrection} disabled={fieldsDisabled} onApply={applyCorrection} />
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label={t('fields.year')}
            name="year"
            type="number"
            min={1}
            inputMode="numeric"
            placeholder="1921"
            value={values.year}
            onChange={(event) => changeField('year', event.target.value)}
            onBlur={() => blurField('year', values.year)}
            autoFormatHint={formatHint('year')}
            error={fieldErrors.year}
            attention={fieldAttention('year')}
            disabled={fieldsDisabled}
            required
          />
          <div className="flex flex-col gap-3">
            <TaxonomySelectWithOther
              label={t('form.denomination')}
              name="denomination"
              value={values.denomination}
              options={formOptions.values}
              onChange={(next) => changeField('denomination', next)}
              error={fieldErrors.denomination}
              attention={fieldAttention('denomination')}
              placeholder={t('form.selectDenomination')}
              disabled={fieldsDisabled}
              required
              allowCustom={false}
              optionsLoading={taxonomyOptionsLoading}
              optionsFailed={formOptionsFailed}
            />
            <CorrectionChip
              correction={denominationCorrection}
              disabled={fieldsDisabled}
              onApply={applyCorrection}
            />
          </div>
        </div>
        <TaxonomySelectWithOther
          label={t('form.coinType')}
          name="coin_type"
          value={values.coin_type}
          options={formOptions.types}
          onChange={(next) => changeField('coin_type', next)}
          error={fieldErrors.coin_type}
          attention={fieldAttention('coin_type')}
          placeholder={t('form.selectCoinType')}
          disabled={fieldsDisabled}
          required
          allowCustom={false}
          optionsLoading={taxonomyOptionsLoading}
          optionsFailed={formOptionsFailed}
        />
        <TaxonomySelectWithOther
          label={t('form.coinSeries')}
          name="coin_series"
          value={values.coin_series}
          options={formOptions.series}
          onChange={(next) => changeField('coin_series', next)}
          error={fieldErrors.coin_series}
          attention={fieldAttention('coin_series')}
          placeholder={t('form.selectCoinSeries')}
          disabled={fieldsDisabled}
          allowCustom={false}
          optionsLoading={taxonomyOptionsLoading}
          optionsFailed={formOptionsFailed}
          helpContent={seriesHelpContent}
        />
        <TextAreaField
          label={t('form.shortDescription')}
          name="short_description"
          placeholder={t('form.shortDescriptionPlaceholder')}
          value={values.short_description}
          onChange={(event) => changeField('short_description', event.target.value)}
          onBlur={() => blurField('short_description', values.short_description)}
          autoFormatHint={formatHint('short_description')}
          error={fieldErrors.short_description}
          attention={fieldAttention('short_description')}
          disabled={fieldsDisabled}
          required
        />
      </section>
    )
  }

  function renderImages() {
    const imageAttentionMessages = (stepIssues ?? [])
      .filter((issue) =>
        ['obverse_image', 'reverse_image', 'gallery_images'].includes(issue.field),
      )
      .map((issue) => issue.message)

    return (
      <section className="flex flex-col gap-5">
        {showHeading ? (
          <SectionHeading
            title={t('form.imagesTitle')}
            description={
              imageEditMode
                ? t('form.imagesDescriptionEdit')
                : t('form.imagesDescriptionNew')
            }
          />
        ) : null}
        <SectionAttentionBanner messages={imageAttentionMessages} />
        {imageEditMode ? (
          <p className="text-xs text-navy-muted">
            {t('form.existingImagesHint')}
          </p>
        ) : null}
        <div className="grid min-w-0 gap-3 md:grid-cols-2 md:items-stretch md:gap-4 xl:gap-5">
          <ExistingImageReplaceField
            label={t('form.currentObverse')}
            replaceLabel={imageEditMode ? t('form.replaceObverse') : resolvedObverseLabel}
            sideLabel={t('form.obverse')}
            currentUrl={currentObverseUrl}
            previewUrl={obverseThumbnailUrl}
            previewSource={obversePreviewSource}
            previewAlt={t('form.obversePreview')}
            name="obverse_image"
            fileName={obverseFile?.name ?? null}
            isNewSelection={Boolean(obverseFile)}
            imageEditMode={imageEditMode}
            existingImageRemoved={obverseExistingRemoved}
            error={obverseError}
            attention={imageFieldAttention('obverse_image', obverseError)}
            disabled={fieldsDisabled}
            formOptionsLoading={formOptionsLoading}
            onFileChange={onObverseChange}
            onClear={onObverseClear}
          />
          <ExistingImageReplaceField
            label={t('form.currentReverse')}
            replaceLabel={imageEditMode ? t('form.replaceReverse') : resolvedReverseLabel}
            sideLabel={t('form.reverse')}
            currentUrl={currentReverseUrl}
            previewUrl={reverseThumbnailUrl}
            previewSource={reversePreviewSource}
            previewAlt={t('form.reversePreview')}
            name="reverse_image"
            fileName={reverseFile?.name ?? null}
            isNewSelection={Boolean(reverseFile)}
            imageEditMode={imageEditMode}
            existingImageRemoved={reverseExistingRemoved}
            error={reverseError}
            attention={imageFieldAttention('reverse_image', reverseError)}
            disabled={fieldsDisabled}
            formOptionsLoading={formOptionsLoading}
            onFileChange={onReverseChange}
            onClear={onReverseClear}
          />
        </div>
        {imageEditMode && onGalleryImageRemoveToggle ? (
          <>
            <EditableGalleryGrid
              images={existingGalleryImages}
              removedIds={removedGalleryImageIds}
              pendingFiles={galleryFiles}
              disabled={fieldsDisabled}
              showAddTile
              replacementPreviews={galleryReplacementPreviews}
              allowPermanentDelete={allowGalleryPermanentDelete}
              onToggleRemove={onGalleryImageRemoveToggle}
              onReplaceImage={onGalleryReplace}
              onCancelReplace={onCancelGalleryReplace}
              onPermanentDelete={onGalleryPermanentDelete}
              onAddFiles={(newFiles) => onGalleryChange([...galleryFiles, ...newFiles])}
              onRemovePendingFile={(index) =>
                onGalleryChange(galleryFiles.filter((_, fileIndex) => fileIndex !== index))
              }
            />
            {galleryError ? (
              <p role="alert" className="text-xs text-red-600">
                {galleryError}
              </p>
            ) : null}
          </>
        ) : (
          <CroppableMultiImageUploadField
            label={t('form.galleryImages')}
            name="gallery_images"
            files={galleryFiles}
            error={galleryError}
            disabled={fieldsDisabled}
            onFilesChange={onGalleryChange}
          />
        )}
      </section>
    )
  }

  function renderMintInformation() {
    return (
      <MintInformationFields
        values={values}
        onFieldChange={onFieldChange}
        onMintVariantsChange={onMintVariantsChange}
        onHasMintVariantsChange={onHasMintVariantsChange}
        disabled={fieldsDisabled}
        hideHeading={!showHeading}
        sectionAttentionMessages={getSectionIssueMessages(stepIssues, 'mint-information')}
        mintMarksAvailableError={fieldErrors.mintMarksAvailable}
      />
    )
  }

  function renderSpecifications() {
    const specsAttentionMessages = getSectionIssueMessages(stepIssues, 'specifications')
    const hasSpecsAttention = specsAttentionMessages.length > 0

    return (
      <section
        className={[
          'flex flex-col gap-5',
          hasSpecsAttention ? 'rounded-xl border border-amber-200/80 bg-amber-50/30 p-4' : '',
        ].join(' ')}
      >
        {showHeading ? (
          <SectionHeading
            title={t('form.specificationsTitle')}
            description={t('form.specificationsDescription')}
          />
        ) : null}
        <SectionAttentionBanner messages={specsAttentionMessages} />
        <TwoEuroDefaultsPreset
          values={values}
          disabled={fieldsDisabled}
          onFieldChange={onFieldChange}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-3">
            <Suspense fallback={<WizardFieldLoadingSkeleton />}>
              <LazyReleaseDatePickerField
                label={t('specifications.releasedDate')}
                name="released_date"
                value={values.released_date}
                onChange={(next) => changeField('released_date', next)}
                onBlur={() => blurField('released_date', values.released_date)}
                disabled={fieldsDisabled}
                required
                hint={t('form.releaseDateHint')}
                error={fieldErrors.released_date}
              />
            </Suspense>
            <CorrectionChip
              correction={releaseDateCorrection}
              disabled={fieldsDisabled}
              onApply={applyCorrection}
            />
          </div>
          <TextField
            label={t('specifications.mintage')}
            name="coin_mintage"
            placeholder={t('form.mintagePlaceholder')}
            value={values.coin_mintage}
            onChange={(event) => changeField('coin_mintage', event.target.value)}
            onBlur={() => blurField('coin_mintage', values.coin_mintage)}
            autoFormatHint={formatHint('coin_mintage')}
            disabled={fieldsDisabled}
            helpTooltip={FIELD_HELP.mintage}
          />
        </div>
        <SelectField
          label={t('form.coinIssueStatus')}
          name="coin_issue_status"
          value={values.coin_issue_status}
          onChange={(event) =>
            changeField(
              'coin_issue_status',
              event.target.value as CoinFormValues['coin_issue_status'],
            )
          }
          options={issueStatusOptions}
          disabled={fieldsDisabled}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <TextField
              label={t('specifications.material')}
              name="coin_material"
              placeholder={t('form.materialPlaceholder')}
              value={values.coin_material}
              onChange={(event) => changeField('coin_material', event.target.value)}
              onBlur={() => blurField('coin_material', values.coin_material)}
              autoFormatHint={formatHint('coin_material')}
              disabled={fieldsDisabled}
              helpTooltip={FIELD_HELP.material}
            />
            <MaterialPresetChips
              value={values.coin_material}
              disabled={fieldsDisabled}
              onSelect={(material) => onFieldChange('coin_material', material)}
            />
          </div>
          <div className="flex flex-col gap-3">
            <SelectField
              label={t('specifications.quality')}
              name="coin_quality"
              value={values.coin_quality}
              onChange={(event) =>
                changeField('coin_quality', event.target.value as CoinFormValues['coin_quality'])
              }
              options={qualityOptions}
              disabled={fieldsDisabled}
            />
            <CorrectionChip correction={qualityCorrection} disabled={fieldsDisabled} onApply={applyCorrection} />
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          <TextField
            label={t('specifications.weight')}
            name="coin_weight_g"
            type="number"
            step="any"
            min={0}
            placeholder="8.50"
            value={values.coin_weight_g}
            onChange={(event) => changeField('coin_weight_g', event.target.value)}
            onBlur={() => blurField('coin_weight_g', values.coin_weight_g)}
            autoFormatHint={formatHint('coin_weight_g')}
            disabled={fieldsDisabled}
            helpTooltip={FIELD_HELP.weight}
          />
          <TextField
            label={t('specifications.diameter')}
            name="coin_diameter_mm"
            type="number"
            step="any"
            min={0}
            placeholder="25.75"
            value={values.coin_diameter_mm}
            onChange={(event) => changeField('coin_diameter_mm', event.target.value)}
            onBlur={() => blurField('coin_diameter_mm', values.coin_diameter_mm)}
            autoFormatHint={formatHint('coin_diameter_mm')}
            disabled={fieldsDisabled}
            helpTooltip={FIELD_HELP.diameter}
          />
          <TextField
            label={t('specifications.thickness')}
            name="coin_thickness_mm"
            type="number"
            step="any"
            min={0}
            placeholder="2.20"
            value={values.coin_thickness_mm}
            onChange={(event) => changeField('coin_thickness_mm', event.target.value)}
            onBlur={() => blurField('coin_thickness_mm', values.coin_thickness_mm)}
            autoFormatHint={formatHint('coin_thickness_mm')}
            disabled={fieldsDisabled}
          />
        </div>
        <div className="rounded-xl border border-border/60 bg-page/40 p-4">
          <SectionHeading
            title={t('form.sourcesTitle')}
            description={t('form.sourcesDescription')}
          />
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <TextField
              label={t('form.sourceName')}
              name="coin_source_name"
              placeholder={t('form.sourceNamePlaceholder')}
              value={values.coin_source_name}
              onChange={(event) => changeField('coin_source_name', event.target.value)}
              onBlur={() => blurField('coin_source_name', values.coin_source_name)}
              autoFormatHint={formatHint('coin_source_name')}
              disabled={fieldsDisabled}
            />
            <TextField
              label={t('form.sourceUrl')}
              name="coin_source_url"
              type="url"
              placeholder={t('form.sourceUrlPlaceholder')}
              value={values.coin_source_url}
              onChange={(event) => changeField('coin_source_url', event.target.value)}
              onBlur={() => blurField('coin_source_url', values.coin_source_url)}
              autoFormatHint={formatHint('coin_source_url')}
              error={fieldErrors.coin_source_url}
              disabled={fieldsDisabled}
            />
          </div>
        </div>
        <TextAreaField
          label={t('specifications.edgeInscription')}
          name="coin_edge_inscription"
          rows={3}
          placeholder={t('form.edgeInscriptionPlaceholder')}
          value={values.coin_edge_inscription}
          onChange={(event) => changeField('coin_edge_inscription', event.target.value)}
          onBlur={() => blurField('coin_edge_inscription', values.coin_edge_inscription)}
          autoFormatHint={formatHint('coin_edge_inscription')}
          disabled={fieldsDisabled}
          helpTooltip={FIELD_HELP.edgeInscription}
        />
      </section>
    )
  }

  function renderDescriptions() {
    const descriptionsAttentionMessages = getSectionIssueMessages(stepIssues, 'descriptions')
    const hasDescriptionsAttention = descriptionsAttentionMessages.length > 0

    return (
      <section
        className={[
          'flex flex-col gap-5',
          hasDescriptionsAttention ? 'rounded-xl border border-amber-200/80 bg-amber-50/30 p-4' : '',
        ].join(' ')}
      >
        {showHeading ? (
          <SectionHeading
            title={t('form.descriptionsTitle')}
            description={t('form.descriptionsDescription')}
          />
        ) : null}
        <SectionAttentionBanner messages={descriptionsAttentionMessages} />
        <Suspense fallback={<WizardFieldLoadingSkeleton />}>
          <LazyAIWritingAssistant
            values={values}
            disabled={fieldsDisabled}
            usageCount={aiUsageCount}
            generatedFields={aiGeneratedFields}
            onUsageCountChange={setAiUsageCount}
            onGeneratedFieldsChange={setAiGeneratedFields}
            onApplyDescriptions={applyAiDescriptions}
            onGeneratingChange={onAiGeneratingChange}
          />
        </Suspense>
        <TextAreaField
          label={t('form.obverseDescription')}
          name="coin_obverse_description"
          value={values.coin_obverse_description}
          onChange={(event) => changeField('coin_obverse_description', event.target.value)}
          onBlur={() => blurField('coin_obverse_description', values.coin_obverse_description)}
          autoFormatHint={formatHint('coin_obverse_description')}
          disabled={fieldsDisabled}
        />
        <TextAreaField
          label={t('form.reverseDescription')}
          name="coin_reverse_description"
          value={values.coin_reverse_description}
          onChange={(event) => changeField('coin_reverse_description', event.target.value)}
          onBlur={() => blurField('coin_reverse_description', values.coin_reverse_description)}
          autoFormatHint={formatHint('coin_reverse_description')}
          disabled={fieldsDisabled}
        />
        <CoinWizardErrorBoundary variant="inline">
          <Suspense fallback={<WizardFieldLoadingSkeleton />}>
            <LazyRichTextField
              label={t('form.historicalBackground')}
              name="coin_historical_background"
              hint={t('form.historicalBackgroundHint')}
              placeholder={t('form.historicalBackgroundPlaceholder')}
              value={values.coin_historical_background ?? ''}
              onChange={(html) => onFieldChange('coin_historical_background', html)}
              error={fieldErrors.coin_historical_background}
              attention={fieldAttention('coin_historical_background')}
              disabled={fieldsDisabled}
            />
          </Suspense>
        </CoinWizardErrorBoundary>
        <TextAreaField
          label={t('form.collectorNotes')}
          name="coin_collector_notes"
          value={values.coin_collector_notes}
          onChange={(event) => changeField('coin_collector_notes', event.target.value)}
          onBlur={() => blurField('coin_collector_notes', values.coin_collector_notes)}
          autoFormatHint={formatHint('coin_collector_notes')}
          disabled={fieldsDisabled}
        />
      </section>
    )
  }

  function renderStatusAdmin() {
    if (!isAdmin) {
      return null
    }

    return (
      <section className="flex flex-col gap-5">
        {showHeading ? (
          <SectionHeading
            title={t('form.adminControlsTitle')}
            description={t('wizard.steps.status-admin.description')}
          />
        ) : null}
        <label className="flex items-center gap-3 rounded-xl border border-border bg-white px-4 py-3">
          <input
            type="checkbox"
            name="coin_is_published_catalogue"
            checked={values.coin_is_published_catalogue}
            onChange={(event) =>
              onFieldChange('coin_is_published_catalogue', event.target.checked)
            }
            disabled={fieldsDisabled}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
          />
          <span className="text-sm font-medium text-navy">{t('form.publishedCatalogue')}</span>
        </label>
        <label className="flex items-center gap-3 rounded-xl border border-border bg-white px-4 py-3">
          <input
            type="checkbox"
            name="coin_is_featured"
            checked={values.coin_is_featured}
            onChange={(event) => onFieldChange('coin_is_featured', event.target.checked)}
            disabled={fieldsDisabled}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
          />
          <span className="text-sm font-medium text-navy">{t('form.featured')}</span>
        </label>
        <label className="flex items-center gap-3 rounded-xl border border-border bg-white px-4 py-3">
          <input
            type="checkbox"
            name="coin_is_app_enabled"
            checked={values.coin_is_app_enabled}
            onChange={(event) => onFieldChange('coin_is_app_enabled', event.target.checked)}
            disabled={fieldsDisabled}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
          />
          <span className="text-sm font-medium text-navy">{t('form.appEnabled')}</span>
        </label>
        <SelectField
          label={t('form.recordStatus')}
          name="coin_record_status"
          value={values.coin_record_status}
          onChange={(event) =>
            onFieldChange(
              'coin_record_status',
              event.target.value as CoinFormValues['coin_record_status'],
            )
          }
          options={COIN_RECORD_STATUS_OPTIONS.map((option) => ({
            value: option,
            label: option.charAt(0).toUpperCase() + option.slice(1),
          }))}
          attention={fieldAttention('coin_record_status')}
          disabled={fieldsDisabled}
        />
      </section>
    )
  }

  if (activeStep) {
    switch (activeStep) {
      case 'core-identity':
        return renderCoreIdentity()
      case 'images':
        return renderImages()
      case 'mint-information':
        return renderMintInformation()
      case 'specifications':
        return renderSpecifications()
      case 'descriptions':
        return renderDescriptions()
      case 'status-admin':
        return renderStatusAdmin()
      default:
        return null
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {renderCoreIdentity()}
      {renderImages()}
      {renderMintInformation()}
      {renderSpecifications()}
      {renderDescriptions()}
      {renderStatusAdmin()}
    </div>
  )
}
