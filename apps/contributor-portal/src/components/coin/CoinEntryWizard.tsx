import { useEffect, useRef, useState, isValidElement, cloneElement, type ReactNode, type RefObject } from 'react'
import { AlertCircle, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '../ui/Button'
import {
  findStepCompletion,
  getStepCompletionAriaLabel,
  type StepCompletionResult,
  type StepCompletionStatus,
} from '../../lib/stepCompletion'
import type { CoinFormStep, CoinFormStepId } from '../../types/coinFormSteps'
import type { ImagePreviewSource } from '../../lib/imagePreview'
import { CoinCataloguePreviewCard } from './CoinCataloguePreviewCard'
import { CoinFormDataLoadingOverlay } from './CoinFormDataLoadingOverlay'
import { CoinImagePreviewSlot } from './CoinImagePreviewSlot'
import { ImageWorkspaceSummary, type ImageWorkspaceSummaryProps } from './ImageWorkspaceSummary'
import { SubmissionWorkflowPanel } from './SubmissionWorkflowPanel'
import { WizardStatusBar, type WizardStatusBarProps } from './WizardStatusBar'
import { WizardTabletAccordions } from './WizardTabletAccordions'

type CoinEntryWizardProps = {
  mode: 'new' | 'edit'
  steps: CoinFormStep[]
  activeStepId: CoinFormStepId
  onStepChange: (stepId: CoinFormStepId) => void
  onBack: () => void
  onContinue: () => void
  isFirstStep: boolean
  isReviewStep: boolean
  isSubmitting: boolean
  submitDisabled?: boolean
  submitDisabledReason?: string
  submitLabel: string
  continueLabel?: string
  statusMessage?: string | null
  previewTitle?: string
  previewObverseUrl?: string | null
  previewReverseUrl?: string | null
  previewObverseSource?: ImagePreviewSource
  previewReverseSource?: ImagePreviewSource
  formOptionsLoading?: boolean
  formDataLoading?: boolean
  alerts?: ReactNode
  workflowPanel?: ReactNode
  cataloguePreview?: ReactNode
  onSaveDraft?: () => void
  saveDraftDisabled?: boolean
  saveDraftLabel?: string
  saveDraftMessage?: string | null
  statusBar?: WizardStatusBarProps | null
  stepCompletion?: StepCompletionResult[]
  imageWorkspaceSummary?: ImageWorkspaceSummaryProps | null
  children: ReactNode
  formId: string
}

function StepCompletionMarker({
  status,
  stepNumber,
  isActive,
  variant,
}: {
  status: StepCompletionStatus
  stepNumber: number
  isActive: boolean
  variant: 'sidebar' | 'tab'
}) {
  if (status === 'complete') {
    if (variant === 'tab') {
      return (
        <Check
          aria-hidden="true"
          className={[
            'shrink-0',
            isActive ? 'h-4 w-4 text-white' : 'h-3.5 w-3.5 text-emerald-600',
          ].join(' ')}
          strokeWidth={2.5}
        />
      )
    }

    return (
      <span
        aria-hidden="true"
        className={[
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          isActive ? 'bg-primary text-white' : 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200/80',
        ].join(' ')}
      >
        <Check className="h-4 w-4" strokeWidth={2.5} />
      </span>
    )
  }

  if (status === 'attention') {
    if (variant === 'tab') {
      return (
        <span
          aria-hidden="true"
          className={[
            'h-2 w-2 shrink-0 rounded-full',
            isActive ? 'bg-amber-200 ring-2 ring-amber-100/60' : 'bg-amber-500',
          ].join(' ')}
        />
      )
    }

    return (
      <span
        aria-hidden="true"
        className={[
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          isActive ? 'bg-primary text-white' : 'bg-amber-50 text-amber-600 ring-1 ring-amber-200/80',
        ].join(' ')}
      >
        <AlertCircle className="h-4 w-4" strokeWidth={2.25} />
      </span>
    )
  }

  if (variant === 'tab') {
    return (
      <span
        aria-hidden="true"
        className={[
          'h-2 w-2 shrink-0 rounded-full ring-1',
          isActive ? 'bg-white/35 ring-white/50' : 'bg-transparent ring-border/70',
        ].join(' ')}
      />
    )
  }

  return (
    <span
      aria-hidden="true"
      className={[
        'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
        isActive ? 'bg-primary text-white' : 'bg-white text-navy-muted/80 ring-1 ring-border/80',
      ].join(' ')}
    >
      {stepNumber}
    </span>
  )
}

function getHorizontalTabClassName(isActive: boolean, status: StepCompletionStatus): string {
  if (isActive) {
    return 'bg-primary font-bold text-white md:shadow-[0_3px_10px_rgba(72,207,193,0.28)]'
  }

  if (status === 'complete') {
    return 'bg-emerald-50/90 font-medium text-emerald-800 ring-1 ring-emerald-200/70 hover:bg-emerald-50 hover:ring-emerald-300/80'
  }

  if (status === 'attention') {
    return 'bg-amber-50/90 font-medium text-amber-900 ring-1 ring-amber-200/70 hover:bg-amber-50 hover:ring-amber-300/80'
  }

  return 'bg-white/90 font-medium text-navy-muted/85 ring-1 ring-border/30 md:font-semibold hover:bg-page hover:text-navy-muted hover:ring-border/50'
}

function StepButton({
  step,
  index,
  isActive,
  completionStatus,
  onSelect,
}: {
  step: CoinFormStep
  index: number
  isActive: boolean
  completionStatus: StepCompletionStatus
  onSelect: () => void
}) {
  const ariaLabel = getStepCompletionAriaLabel(step.label, completionStatus)

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={isActive ? 'step' : undefined}
      aria-label={ariaLabel}
      className={[
        'flex min-h-[3.25rem] w-full items-start gap-3 rounded-xl border px-4 py-3.5 text-left transition-colors',
        isActive
          ? 'border-primary/40 bg-white shadow-[var(--shadow-card)] ring-1 ring-primary/10'
          : completionStatus === 'complete'
            ? 'border-transparent bg-emerald-50/40 hover:border-emerald-200/60 hover:bg-emerald-50/70'
            : completionStatus === 'attention'
              ? 'border-transparent bg-amber-50/35 hover:border-amber-200/60 hover:bg-amber-50/65'
              : 'border-transparent bg-transparent hover:border-border hover:bg-white/70',
      ].join(' ')}
    >
      <StepCompletionMarker
        status={completionStatus}
        stepNumber={index + 1}
        isActive={isActive}
        variant="sidebar"
      />
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-navy">{step.label}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-navy-muted">{step.description}</span>
      </span>
    </button>
  )
}

function SaveActionButtons({
  formId,
  submitLabel,
  isSubmitting,
  submitDisabled = false,
  submitDisabledReason,
  onSaveDraft,
  saveDraftDisabled = false,
  saveDraftLabel,
  buttonClassName = '',
  compact = false,
  showSubmit = true,
}: {
  formId: string
  submitLabel: string
  isSubmitting: boolean
  submitDisabled?: boolean
  submitDisabledReason?: string
  onSaveDraft?: () => void
  saveDraftDisabled?: boolean
  saveDraftLabel?: string
  buttonClassName?: string
  compact?: boolean
  showSubmit?: boolean
}) {
  const { t } = useTranslation()
  const sizeClass = compact ? '!min-h-11 !px-4 !py-2.5' : ''
  const blocked = isSubmitting || submitDisabled

  if (!showSubmit && !onSaveDraft) {
    return null
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
      {onSaveDraft ? (
        <Button
          type="button"
          variant="secondary"
          className={[sizeClass, buttonClassName].filter(Boolean).join(' ')}
          disabled={saveDraftDisabled}
          onClick={onSaveDraft}
        >
          {saveDraftLabel ?? t('common.saveDraft')}
        </Button>
      ) : null}
      {showSubmit ? (
        <Button
          type="submit"
          form={formId}
          className={[sizeClass, buttonClassName].filter(Boolean).join(' ')}
          disabled={blocked}
          title={blocked && submitDisabledReason ? submitDisabledReason : undefined}
          aria-label={
            blocked && submitDisabledReason
              ? `${submitLabel} disabled: ${submitDisabledReason}`
              : submitLabel
          }
        >
          {submitLabel}
        </Button>
      ) : null}
    </div>
  )
}

function WizardFooterBackButton({
  isFirstStep,
  isSubmitting,
  onBack,
  disabled = false,
}: {
  isFirstStep: boolean
  isSubmitting: boolean
  onBack: () => void
  disabled?: boolean
}) {
  const { t } = useTranslation()

  return (
    <Button
      type="button"
      variant="secondary"
      className="wizard-action-bar__back !min-h-11 w-full shrink-0 sm:w-auto !px-4"
      disabled={isSubmitting || disabled}
      onClick={onBack}
    >
      {isFirstStep ? `← ${t('common.cancel')}` : `← ${t('common.back')}`}
    </Button>
  )
}

function WizardFooterLayout({
  children,
  innerClassName = '',
}: {
  children: ReactNode
  innerClassName?: string
}) {
  return (
    <div className={['wizard-action-bar__inner', innerClassName].filter(Boolean).join(' ')}>
      <div className="wizard-action-bar__row">{children}</div>
    </div>
  )
}

function WizardActionBar({
  formId,
  submitLabel,
  isSubmitting,
  submitDisabled = false,
  submitDisabledReason,
  onSaveDraft,
  saveDraftDisabled,
  saveDraftLabel,
  onBack,
  onContinue,
  isFirstStep,
  showContinue,
  showSubmit,
  continueLabel,
  footerRef,
  formInteractionsDisabled = false,
  variant = 'in-card',
}: {
  formId: string
  submitLabel: string
  isSubmitting: boolean
  submitDisabled?: boolean
  submitDisabledReason?: string
  onSaveDraft?: () => void
  saveDraftDisabled?: boolean
  saveDraftLabel?: string
  onBack: () => void
  onContinue: () => void
  isFirstStep: boolean
  showContinue: boolean
  showSubmit: boolean
  continueLabel: string
  footerRef?: RefObject<HTMLDivElement | null>
  formInteractionsDisabled?: boolean
  variant?: 'dock' | 'in-card'
}) {
  const actionsDisabled = isSubmitting || formInteractionsDisabled
  const isDock = variant === 'dock'

  return (
    <div
      ref={footerRef}
      className={[
        'wizard-action-bar',
        isDock ? 'wizard-action-bar--dock' : 'wizard-action-bar--in-card',
      ].join(' ')}
      role="region"
      aria-label="Wizard actions"
    >
      <WizardFooterLayout innerClassName={isDock ? 'wizard-action-bar__inner--dock' : 'wizard-action-bar__inner--in-card'}>
        <WizardFooterBackButton
          isFirstStep={isFirstStep}
          isSubmitting={isSubmitting}
          disabled={formInteractionsDisabled}
          onBack={onBack}
        />
        <div className="wizard-action-bar__actions">
          {showContinue ? (
            <Button
              type="button"
              variant="secondary"
              className="wizard-action-bar__continue !min-h-11 w-full sm:w-auto"
              disabled={actionsDisabled}
              onClick={onContinue}
            >
              {continueLabel}
            </Button>
          ) : null}
          <SaveActionButtons
            formId={formId}
            submitLabel={submitLabel}
            isSubmitting={isSubmitting}
            submitDisabled={submitDisabled}
            submitDisabledReason={submitDisabledReason}
            onSaveDraft={onSaveDraft}
            saveDraftDisabled={saveDraftDisabled}
            saveDraftLabel={saveDraftLabel}
            showSubmit={showSubmit}
            compact
            buttonClassName="w-full sm:w-auto"
          />
        </div>
      </WizardFooterLayout>
    </div>
  )
}

function withEmbeddedWorkflowPanel(panel: ReactNode): ReactNode {
  if (isValidElement<{ embedded?: boolean }>(panel) && panel.type === SubmissionWorkflowPanel) {
    return cloneElement(panel, { embedded: true })
  }

  return panel
}

function withCompactCataloguePreview(preview: ReactNode): ReactNode {
  if (
    isValidElement<{ embedded?: boolean; compact?: boolean }>(preview) &&
    preview.type === CoinCataloguePreviewCard
  ) {
    return cloneElement(preview, { embedded: true, compact: true })
  }

  return preview
}

function WizardSpecimenPreview({
  previewTitle,
  previewObverseUrl,
  previewReverseUrl,
  previewObverseSource,
  previewReverseSource,
  formOptionsLoading,
  compact = false,
}: {
  previewTitle?: string
  previewObverseUrl?: string | null
  previewReverseUrl?: string | null
  previewObverseSource?: ImagePreviewSource
  previewReverseSource?: ImagePreviewSource
  formOptionsLoading?: boolean
  compact?: boolean
}) {
  const { t } = useTranslation()

  return (
    <div className={compact ? 'min-w-0' : 'min-w-0 rounded-xl border border-border/70 bg-panel p-3 shadow-[var(--shadow-card)] sm:p-4 xl:p-4'}>
      {!compact ? (
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-navy-muted">
          {t('wizard.specimenPreview')}
        </p>
      ) : null}
      {previewTitle ? (
        <p className={compact ? 'truncate text-xs font-medium text-navy' : 'mt-1.5 truncate text-xs font-medium text-navy xl:mt-2 xl:text-sm'}>
          {previewTitle}
        </p>
      ) : null}
      <div className={compact ? 'mt-2 grid grid-cols-2 gap-2' : 'mt-2.5 grid grid-cols-2 gap-2 sm:gap-3 xl:mt-4 xl:grid-cols-1 xl:gap-3'}>
        <div>
          <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-navy-muted xl:mb-2 xl:text-xs">
            Obverse
          </p>
          <CoinImagePreviewSlot
            previewUrl={previewObverseUrl}
            previewSource={previewObverseSource}
            formOptionsLoading={formOptionsLoading}
            alt="Obverse preview"
            size="catalogue"
            objectFit="contain"
            className={[
              'rounded-lg bg-white',
              compact ? 'max-h-24 sm:max-h-28' : 'sm:max-h-40 xl:max-h-none xl:rounded-xl',
            ].join(' ')}
          />
        </div>
        <div>
          <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-navy-muted xl:mb-2 xl:text-xs">
            Reverse
          </p>
          <CoinImagePreviewSlot
            previewUrl={previewReverseUrl}
            previewSource={previewReverseSource}
            formOptionsLoading={formOptionsLoading}
            alt="Reverse preview"
            size="catalogue"
            objectFit="contain"
            className={[
              'rounded-lg bg-white',
              compact ? 'max-h-24 sm:max-h-28' : 'sm:max-h-40 xl:max-h-none xl:rounded-xl',
            ].join(' ')}
          />
        </div>
      </div>
    </div>
  )
}

export function CoinEntryWizard({
  mode,
  steps,
  activeStepId,
  onStepChange,
  onBack,
  onContinue,
  isFirstStep,
  isReviewStep,
  isSubmitting,
  submitDisabled = false,
  submitDisabledReason,
  submitLabel,
  continueLabel,
  statusMessage,
  previewTitle,
  previewObverseUrl,
  previewReverseUrl,
  previewObverseSource = 'none',
  previewReverseSource = 'none',
  formOptionsLoading = false,
  formDataLoading = false,
  alerts,
  workflowPanel,
  cataloguePreview,
  onSaveDraft,
  saveDraftDisabled = false,
  saveDraftLabel,
  saveDraftMessage,
  statusBar,
  stepCompletion: stepCompletionProp,
  imageWorkspaceSummary,
  children,
  formId,
}: CoinEntryWizardProps) {
  const { t } = useTranslation()
  const resolvedContinueLabel = continueLabel ?? t('common.continue')
  const stepCompletion = stepCompletionProp ?? statusBar?.stepCompletion ?? []

  const activeStep = steps.find((step) => step.id === activeStepId) ?? steps[0]
  const activeIndex = steps.findIndex((step) => step.id === activeStepId)
  const isEditMode = mode === 'edit'
  const showContinue = !isReviewStep
  const showSubmit = isEditMode || (mode === 'new' && isReviewStep)

  const footerActionsRef = useRef<HTMLDivElement>(null)
  const stepNavRef = useRef<HTMLElement>(null)
  const [footerActionsVisible, setFooterActionsVisible] = useState(false)

  const wizardActionBarProps = {
    formId,
    submitLabel,
    isSubmitting,
    submitDisabled,
    submitDisabledReason,
    onSaveDraft,
    saveDraftDisabled,
    saveDraftLabel,
    onBack,
    onContinue,
    isFirstStep,
    showContinue,
    showSubmit,
    continueLabel: resolvedContinueLabel,
    formInteractionsDisabled: formDataLoading,
  }

  useEffect(() => {
    const nav = stepNavRef.current
    if (!nav) {
      return
    }

    const activeButton = nav.querySelector<HTMLElement>('[aria-current="step"]')
    activeButton?.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' })
  }, [activeStepId])

  useEffect(() => {
    if (!isEditMode) {
      setFooterActionsVisible(false)
      return
    }

    const node = footerActionsRef.current
    if (!node) {
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => setFooterActionsVisible(entry.isIntersecting),
      { threshold: 0.15, rootMargin: '0px 0px -8px 0px' },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [isEditMode, activeStepId])

  const wizardGridClass =
    'grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)_280px] xl:gap-5'

  const wizardHeaderOffsetClass = 'top-12 sm:top-14'

  const wizardScrollPaddingClass = 'wizard-scroll-padding'

  const showSpecimenPreview =
    formOptionsLoading ||
    previewObverseUrl ||
    previewReverseUrl ||
    previewObverseSource === 'selected' ||
    previewReverseSource === 'selected' ||
    previewObverseSource === 'existing' ||
    previewReverseSource === 'existing' ||
    previewObverseSource === 'default' ||
    previewReverseSource === 'default'

  const tabletWorkflowPanel = workflowPanel ? withEmbeddedWorkflowPanel(workflowPanel) : undefined
  const tabletCataloguePreview = cataloguePreview
    ? withCompactCataloguePreview(cataloguePreview)
    : undefined
  const tabletSpecimenPreview =
    !cataloguePreview && showSpecimenPreview ? (
      <WizardSpecimenPreview
        previewTitle={previewTitle}
        previewObverseUrl={previewObverseUrl}
        previewReverseUrl={previewReverseUrl}
        previewObverseSource={previewObverseSource}
        previewReverseSource={previewReverseSource}
        formOptionsLoading={formOptionsLoading}
        compact
      />
    ) : undefined

  return (
    <div
      className={[
        'wizard-root mx-auto flex w-full min-w-0 max-w-[1440px] flex-col overflow-x-hidden px-3 pt-3 sm:px-4 sm:pt-4 md:px-5 lg:px-6',
        wizardScrollPaddingClass,
      ].join(' ')}
    >
      <div className="mb-3 md:mb-4 xl:mb-5">
        {isEditMode ? (
          <div className="flex flex-col gap-4 sm:gap-5 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
            <div className="min-w-0 flex-1">
              <p className="section-label">{t('wizard.editEntry')}</p>
              <h1 className="mt-1 font-serif text-2xl font-semibold text-navy sm:text-3xl">
                {t('wizard.updateSpecimen')}
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-navy-muted">
                {t('wizard.headerDescription')}
              </p>

              {saveDraftMessage ? (
                <p role="status" className="mt-2 text-sm text-emerald-700">
                  {saveDraftMessage}
                </p>
              ) : null}

              <div
                className={[
                  'hidden',
                  footerActionsVisible
                    ? 'pointer-events-none translate-y-1 opacity-0'
                    : 'opacity-100',
                ].join(' ')}
                aria-hidden
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                  <SaveActionButtons
                    formId={formId}
                    submitLabel={submitLabel}
                    isSubmitting={isSubmitting}
                    submitDisabled={submitDisabled}
                    submitDisabledReason={submitDisabledReason}
                    onSaveDraft={onSaveDraft}
                  saveDraftDisabled={saveDraftDisabled}
                  saveDraftLabel={saveDraftLabel}
                    buttonClassName="w-full shrink-0 whitespace-nowrap sm:w-auto"
                    compact
                  />
                </div>
              </div>
            </div>

            <div
              className={[
                'hidden shrink-0 xl:block xl:sticky xl:top-14 xl:z-30',
                footerActionsVisible
                  ? 'pointer-events-none translate-y-1 opacity-0'
                  : 'opacity-100',
              ].join(' ')}
              aria-hidden={footerActionsVisible}
            >
              <div className="flex flex-row items-center gap-3 shrink-0 whitespace-nowrap">
                <SaveActionButtons
                  formId={formId}
                  submitLabel={submitLabel}
                  isSubmitting={isSubmitting}
                  submitDisabled={submitDisabled}
                  submitDisabledReason={submitDisabledReason}
                  onSaveDraft={onSaveDraft}
                  saveDraftDisabled={saveDraftDisabled}
                  saveDraftLabel={saveDraftLabel}
                  buttonClassName="shrink-0 whitespace-nowrap"
                  compact
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-5 xl:grid-cols-[260px_minmax(0,1fr)_280px]">
            <div className="hidden xl:block" aria-hidden />
            <div className="min-w-0">
              <p className="section-label">{t('wizard.newEntry')}</p>
              <h1 className="mt-1 font-serif text-2xl font-semibold text-navy sm:text-3xl">
                {t('wizard.specimenRegistration')}
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-navy-muted">
                {t('wizard.headerDescription')}
              </p>
            </div>
            <div className="hidden xl:block" aria-hidden />
          </div>
        )}
      </div>

      <div
        className={[
          'wizard-step-nav-shell xl:hidden mb-3 md:mb-4',
          'sticky z-30',
          wizardHeaderOffsetClass,
          'overflow-hidden rounded-xl border border-border/60 bg-white/95 py-2.5',
          'shadow-[0_4px_12px_rgba(28,28,30,0.04)] backdrop-blur-md',
        ].join(' ')}
      >
        <div className="relative min-w-0 overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 z-10 w-5 bg-gradient-to-r from-white via-white/95 to-transparent sm:w-6"
          />
          <nav
            ref={stepNavRef}
            aria-label={t('wizard.formSteps')}
            className="wizard-step-nav"
          >
            {steps.map((step, index) => {
              const completionStatus =
                findStepCompletion(stepCompletion, step.id)?.status ?? 'empty'
              const isActive = step.id === activeStepId
              const ariaLabel = getStepCompletionAriaLabel(step.label, completionStatus)

              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => onStepChange(step.id)}
                  aria-current={isActive ? 'step' : undefined}
                  aria-label={ariaLabel}
                  className={[
                    'inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm transition-[color,box-shadow]',
                    'min-h-11 min-w-max whitespace-nowrap md:min-h-12 md:gap-2.5 md:px-6 md:text-[15px]',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2',
                    getHorizontalTabClassName(isActive, completionStatus),
                  ].join(' ')}
                >
                  <StepCompletionMarker
                    status={completionStatus}
                    stepNumber={index + 1}
                    isActive={isActive}
                    variant="tab"
                  />
                  <span className="whitespace-nowrap">
                    {completionStatus === 'empty' ? `${index + 1}. ` : ''}
                    {step.label}
                  </span>
                </button>
              )
            })}
          </nav>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-5 bg-gradient-to-l from-white via-white/95 to-transparent sm:w-6"
          />
        </div>
      </div>

      <div className={[wizardGridClass, 'min-w-0 md:pt-1 xl:pt-0'].join(' ')}>
        <aside className="hidden xl:block">
          <div className="sticky top-20 rounded-xl border border-border/70 bg-white/90 p-4 shadow-[var(--shadow-card)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-navy-muted">
              {t('wizard.registrationProgress')}
            </p>
            <nav aria-label={t('wizard.formSteps')} className="mt-3 flex flex-col gap-2">
              {steps.map((step, index) => (
                <StepButton
                  key={step.id}
                  step={step}
                  index={index}
                  isActive={step.id === activeStepId}
                  completionStatus={findStepCompletion(stepCompletion, step.id)?.status ?? 'empty'}
                  onSelect={() => onStepChange(step.id)}
                />
              ))}
            </nav>
          </div>
        </aside>

        <div className="order-1 flex min-w-0 flex-col gap-3 xl:order-none xl:col-start-2 xl:row-start-1 xl:gap-5">
          {statusBar ? <WizardStatusBar {...statusBar} /> : null}

          {imageWorkspaceSummary ? (
            <div className="lg:hidden">
              <ImageWorkspaceSummary {...imageWorkspaceSummary} />
            </div>
          ) : null}

          <section className="min-w-0 md:scroll-mt-[8.75rem] lg:scroll-mt-[8.75rem] xl:scroll-mt-0">
            <div className="flex min-w-0 flex-col rounded-xl border border-border/70 bg-surface shadow-[var(--shadow-card)]">
              <div className="p-4 sm:p-6 lg:p-6 xl:p-7">
                <div className="mb-4 flex scroll-mt-[8.75rem] flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-4 md:scroll-mt-[8.75rem] xl:mb-5 xl:scroll-mt-0">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-navy-muted">
                      Step {activeIndex + 1} of {steps.length}
                    </p>
                    <h2 className="mt-1 font-serif text-xl font-semibold text-navy sm:text-2xl">
                      {activeStep.label}
                    </h2>
                    <p className="mt-2 text-sm text-navy-muted">{activeStep.description}</p>
                  </div>
                  {activeStep.id === 'core-identity' ? (
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                      Mandatory
                    </span>
                  ) : null}
                </div>

                {alerts}

                <div className="relative flex flex-col gap-6 pb-1 sm:pb-2">
                  {children}
                  {formDataLoading ? <CoinFormDataLoadingOverlay /> : null}
                </div>
              </div>

              <WizardActionBar
                {...wizardActionBarProps}
                variant="in-card"
                footerRef={isEditMode ? footerActionsRef : undefined}
              />
            </div>
          </section>

          <WizardTabletAccordions
            workflowPanel={tabletWorkflowPanel}
            cataloguePreview={tabletCataloguePreview}
            specimenPreview={tabletSpecimenPreview}
            archivalTip={activeStep.tip}
            statusMessage={statusMessage}
          />
        </div>

        <aside className="hidden min-w-0 xl:order-none xl:col-span-1 xl:col-start-3 xl:row-start-1 xl:block">
          <div className="flex flex-col gap-3 xl:sticky xl:top-20 xl:max-h-[calc(100vh-6rem)] xl:overflow-y-auto xl:overscroll-contain xl:pr-0.5">
            {workflowPanel ? <div className="order-1 min-w-0 xl:order-3">{workflowPanel}</div> : null}
            {cataloguePreview ? (
              <div className="order-2 min-w-0 xl:order-1">{cataloguePreview}</div>
            ) : null}
            {showSpecimenPreview ? (
              <div className="order-3 min-w-0 xl:order-2">
                <WizardSpecimenPreview
                  previewTitle={previewTitle}
                  previewObverseUrl={previewObverseUrl}
                  previewReverseUrl={previewReverseUrl}
                  previewObverseSource={previewObverseSource}
                  previewReverseSource={previewReverseSource}
                  formOptionsLoading={formOptionsLoading}
                />
              </div>
            ) : null}

            <div className="order-4 min-w-0 rounded-xl border border-border/70 bg-white p-3 shadow-[var(--shadow-card)] sm:p-4 xl:order-4 xl:p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-navy-muted">
                {t('wizard.archivalTip')}
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-navy-muted xl:mt-2 xl:text-sm">
                {activeStep.tip}
              </p>
            </div>

            {statusMessage ? (
              <div className="order-5 min-w-0 rounded-xl border border-border/70 bg-white p-3 shadow-[var(--shadow-card)] sm:p-4 xl:order-5 xl:p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-navy-muted">
                  {t('wizard.sessionStatus')}
                </p>
                <p className="mt-1.5 text-xs text-navy xl:mt-2 xl:text-sm">{statusMessage}</p>
              </div>
            ) : null}
          </div>
        </aside>
      </div>

      <WizardActionBar {...wizardActionBarProps} variant="dock" />
    </div>
  )
}
