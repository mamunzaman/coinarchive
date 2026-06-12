import { useCallback, useState, type ReactNode } from 'react'
import {
  BookOpen,
  ChevronDown,
  Info,
  Lightbulb,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

type AccordionSectionId = 'action-center' | 'catalogue-preview' | 'archival-tip' | 'session-status'

type WizardTabletAccordionsProps = {
  workflowPanel?: ReactNode
  cataloguePreview?: ReactNode
  specimenPreview?: ReactNode
  archivalTip?: string
  statusMessage?: string | null
}

type AccordionSectionConfig = {
  id: AccordionSectionId
  title: string
  icon: LucideIcon
  defaultOpen: boolean
  content: ReactNode
}

function WizardAccordionItem({
  id,
  title,
  icon: Icon,
  isOpen,
  onToggle,
  children,
}: {
  id: string
  title: string
  icon: LucideIcon
  isOpen: boolean
  onToggle: () => void
  children: ReactNode
}) {
  const panelId = `wizard-accordion-${id}`
  const headerId = `${panelId}-header`

  return (
    <div className="wizard-accordion-section min-w-0 overflow-hidden rounded-xl border border-border/70 bg-white shadow-[var(--shadow-card)]">
      <button
        type="button"
        id={headerId}
        className="wizard-accordion-trigger flex w-full min-w-0 items-center gap-2.5 px-3 py-3 text-left sm:gap-3 sm:px-3.5 sm:py-3.5"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={onToggle}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-navy">{title}</span>
        <ChevronDown
          aria-hidden
          className={[
            'h-4 w-4 shrink-0 text-navy-muted transition-transform duration-200',
            isOpen ? 'rotate-180' : '',
          ].join(' ')}
        />
      </button>
      <div
        id={panelId}
        role="region"
        aria-labelledby={headerId}
        className="wizard-accordion-panel"
        data-open={isOpen ? 'true' : 'false'}
      >
        <div className="wizard-accordion-panel__inner">
          <div className="wizard-accordion-body border-t border-border/50 px-3 pb-3 pt-2.5 sm:px-3.5 sm:pb-3.5 sm:pt-3">
            {isOpen ? children : null}
          </div>
        </div>
      </div>
    </div>
  )
}

export function WizardTabletAccordions({
  workflowPanel,
  cataloguePreview,
  specimenPreview,
  archivalTip,
  statusMessage,
}: WizardTabletAccordionsProps) {
  const { t } = useTranslation()

  const sections: AccordionSectionConfig[] = []

  if (workflowPanel) {
    sections.push({
      id: 'action-center',
      title: t('workflow.actionCenter'),
      icon: Sparkles,
      defaultOpen: true,
      content: workflowPanel,
    })
  }

  const previewContent = cataloguePreview ?? specimenPreview
  if (previewContent) {
    sections.push({
      id: 'catalogue-preview',
      title: cataloguePreview
        ? t('review.cataloguePreview')
        : t('wizard.specimenPreview'),
      icon: BookOpen,
      defaultOpen: false,
      content: previewContent,
    })
  }

  if (archivalTip) {
    sections.push({
      id: 'archival-tip',
      title: t('wizard.archivalTip'),
      icon: Lightbulb,
      defaultOpen: false,
      content: <p className="text-xs leading-relaxed text-navy-muted sm:text-sm">{archivalTip}</p>,
    })
  }

  if (statusMessage) {
    sections.push({
      id: 'session-status',
      title: t('wizard.sessionStatus'),
      icon: Info,
      defaultOpen: false,
      content: <p className="text-xs text-navy sm:text-sm">{statusMessage}</p>,
    })
  }

  const defaultOpenState = sections.reduce(
    (state, section) => {
      state[section.id] = section.defaultOpen
      return state
    },
    {} as Record<AccordionSectionId, boolean>,
  )

  const [openSections, setOpenSections] = useState(defaultOpenState)

  const toggleSection = useCallback((id: AccordionSectionId) => {
    setOpenSections((current) => ({ ...current, [id]: !current[id] }))
  }, [])

  if (sections.length === 0) {
    return null
  }

  return (
    <div className="flex min-w-0 flex-col gap-2 sm:gap-2.5 xl:hidden">
      {sections.map((section) => (
        <WizardAccordionItem
          key={section.id}
          id={section.id}
          title={section.title}
          icon={section.icon}
          isOpen={openSections[section.id]}
          onToggle={() => toggleSection(section.id)}
        >
          {section.content}
        </WizardAccordionItem>
      ))}
    </div>
  )
}
