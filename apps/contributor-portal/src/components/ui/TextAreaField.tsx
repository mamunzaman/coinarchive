import type { TextareaHTMLAttributes } from 'react'
import { FieldLabelWithHelp } from './FieldHelpTooltip'

type TextAreaFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string
  hint?: string
  helpTooltip?: string
  error?: string
  attention?: string
  autoFormatHint?: string
}

export function TextAreaField({
  label,
  hint,
  helpTooltip,
  error,
  attention,
  autoFormatHint,
  id,
  className = '',
  rows = 4,
  ...props
}: TextAreaFieldProps) {
  const fieldId = id ?? label.toLowerCase().replace(/\s+/g, '-')
  const errorId = error ? `${fieldId}-error` : undefined
  const attentionId = !error && attention ? `${fieldId}-attention` : undefined

  const formatHintId = autoFormatHint ? `${fieldId}-format-hint` : undefined

  return (
    <div className="flex flex-col gap-2">
      <FieldLabelWithHelp htmlFor={fieldId} label={label} helpText={helpTooltip} />
      <textarea
        id={fieldId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={[errorId, attentionId, formatHintId].filter(Boolean).join(' ') || undefined}
        className={[
          'field-control resize-y',
          error ? 'field-control--error' : attention ? 'field-control--attention' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...props}
      />
      {error ? (
        <p id={errorId} role="alert" className="field-message field-message--error">
          {error}
        </p>
      ) : null}
      {!error && attention ? (
        <p id={attentionId} className="field-message field-message--attention">
          {attention}
        </p>
      ) : null}
      {!error && !attention && hint ? (
        <p className="field-message field-message--hint">{hint}</p>
      ) : null}
      {!error && autoFormatHint ? (
        <p id={formatHintId} className="field-message field-message--hint">
          {autoFormatHint}
        </p>
      ) : null}
    </div>
  )
}
