import type { InputHTMLAttributes } from 'react'
import { FieldLabelWithHelp } from './FieldHelpTooltip'

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  hint?: string
  helpTooltip?: string
  error?: string
  attention?: string
  autoFormatHint?: string
}

export function TextField({
  label,
  hint,
  helpTooltip,
  error,
  attention,
  autoFormatHint,
  id,
  className = '',
  'aria-describedby': ariaDescribedBy,
  ...props
}: TextFieldProps) {
  const fieldId = id ?? label.toLowerCase().replace(/\s+/g, '-')
  const errorId = error ? `${fieldId}-error` : undefined
  const attentionId = !error && attention ? `${fieldId}-attention` : undefined
  const formatHintId = autoFormatHint ? `${fieldId}-format-hint` : undefined
  const describedBy =
    [ariaDescribedBy, errorId, attentionId, formatHintId].filter(Boolean).join(' ') || undefined

  return (
    <div className="flex flex-col gap-2">
      <FieldLabelWithHelp htmlFor={fieldId} label={label} helpText={helpTooltip} />
      <input
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={[
          'field-control',
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
