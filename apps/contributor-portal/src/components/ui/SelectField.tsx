import type { SelectHTMLAttributes } from 'react'
import { FieldLabelWithHelp, type FieldHelpTooltipContent } from './FieldHelpTooltip'

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string
  hint?: string
  helpTooltip?: string
  helpContent?: FieldHelpTooltipContent
  error?: string
  attention?: string
  options: Array<{ value: string; label: string }>
}

export function SelectField({
  label,
  hint,
  helpTooltip,
  helpContent,
  error,
  attention,
  options,
  id,
  className = '',
  ...props
}: SelectFieldProps) {
  const fieldId = id ?? label.toLowerCase().replace(/\s+/g, '-')
  const errorId = error ? `${fieldId}-error` : undefined
  const attentionId = !error && attention ? `${fieldId}-attention` : undefined

  return (
    <div className="flex flex-col gap-2">
      <FieldLabelWithHelp
        htmlFor={fieldId}
        label={label}
        helpText={helpTooltip}
        helpContent={helpContent}
      />
      <select
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId ?? attentionId}
        className={[
          'field-control',
          error ? 'field-control--error' : attention ? 'field-control--attention' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value || 'empty'} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
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
    </div>
  )
}
