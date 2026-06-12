import { Info, X } from 'lucide-react'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'

export type FieldHelpTooltipItem = {
  label: string
  description: string
}

export type FieldHelpTooltipContent = {
  title?: string
  intro?: string
  items?: FieldHelpTooltipItem[]
  footer?: string
  text?: string
}

type FieldHelpTooltipProps = FieldHelpTooltipContent & {
  label?: string
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => !element.hasAttribute('disabled') && element.tabIndex !== -1)
}

function FieldHelpPopupBody({
  title,
  intro,
  items,
  footer,
  text,
  showTitle = true,
}: FieldHelpTooltipContent & { showTitle?: boolean }) {
  if (text && !title && !intro && !items?.length && !footer) {
    return <p className="text-sm leading-relaxed text-navy">{text}</p>
  }

  return (
    <div className="space-y-3">
      {showTitle && title ? (
        <p className="font-serif text-lg font-semibold text-navy">{title}</p>
      ) : null}
      {intro ? <p className="text-sm leading-relaxed text-navy-muted">{intro}</p> : null}
      {items?.length ? (
        <ul className="space-y-2 text-sm leading-relaxed text-navy">
          {items.map((item) => (
            <li key={item.label} className="flex gap-2">
              <span aria-hidden="true" className="shrink-0 text-navy-muted">
                •
              </span>
              <span>
                <span className="font-medium">{item.label}</span>
                <span className="text-navy-muted"> — {item.description}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {footer ? (
        <p className="border-t border-border/50 pt-3 text-sm italic leading-relaxed text-navy-muted">
          {footer}
        </p>
      ) : null}
    </div>
  )
}

export function FieldHelpTooltip({
  text,
  title,
  intro,
  items,
  footer,
  label = 'Field help',
}: FieldHelpTooltipProps) {
  const { t } = useTranslation()
  const dialogTitleId = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)

  const content: FieldHelpTooltipContent = { text, title, intro, items, footer }
  const dialogLabel = title ?? label
  const showTitleInBody = !title

  const closePopup = useCallback(() => {
    setOpen(false)
    requestAnimationFrame(() => triggerRef.current?.focus())
  }, [])

  useEffect(() => {
    if (!open) {
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        closePopup()
        return
      }

      if (event.key !== 'Tab' || !dialogRef.current) {
        return
      }

      const focusableElements = getFocusableElements(dialogRef.current)
      if (focusableElements.length === 0) {
        return
      }

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node
      if (triggerRef.current?.contains(target) || dialogRef.current?.contains(target)) {
        return
      }

      closePopup()
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handlePointerDown)
    requestAnimationFrame(() => closeButtonRef.current?.focus())

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handlePointerDown)
    }
  }, [closePopup, open])

  const modal = open ? (
    <>
      <button
        type="button"
        className="field-help-backdrop"
        aria-label={t('common.closeHelp')}
        onClick={closePopup}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={dialogTitleId}
        className="field-help-modal"
      >
        <div className="field-help-modal__header">
          <p id={dialogTitleId} className="field-help-modal__title">
            {dialogLabel}
          </p>
          <button
            ref={closeButtonRef}
            type="button"
            className="field-help-close"
            aria-label={t('common.closeHelp')}
            onClick={closePopup}
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <div className="field-help-modal__body">
          <FieldHelpPopupBody {...content} showTitle={showTitleInBody} />
        </div>
      </div>
    </>
  ) : null

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="field-help-trigger"
        onClick={() => setOpen(true)}
      >
        <Info className="h-3.5 w-3.5" aria-hidden />
      </button>
      {modal ? createPortal(modal, document.body) : null}
    </>
  )
}

export function FieldLabelWithHelp({
  htmlFor,
  label,
  helpText,
  helpContent,
}: {
  htmlFor: string
  label: string
  helpText?: string
  helpContent?: FieldHelpTooltipContent
}) {
  const helpLabel = `Help for ${label}`
  const hasRichHelp =
    Boolean(helpContent?.title) ||
    Boolean(helpContent?.intro) ||
    Boolean(helpContent?.items?.length) ||
    Boolean(helpContent?.footer)

  return (
    <span className="inline-flex items-center gap-1.5">
      <label htmlFor={htmlFor} className="field-label">
        {label}
      </label>
      {hasRichHelp ? (
        <FieldHelpTooltip {...helpContent} label={helpLabel} />
      ) : helpText ? (
        <FieldHelpTooltip text={helpText} label={helpLabel} />
      ) : null}
    </span>
  )
}
