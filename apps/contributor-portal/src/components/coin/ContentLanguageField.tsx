import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { SelectField } from '../ui/SelectField'
import { getContentLanguageSelectOptions } from '../../lib/contentLanguage'
import type { ContentLanguage } from '../../types/coinForm'

type ContentLanguageFieldProps = {
  value: ContentLanguage
  onChange: (value: ContentLanguage) => void
  disabled?: boolean
  lockedReason?: string
}

export function ContentLanguageField({
  value,
  onChange,
  disabled = false,
  lockedReason,
}: ContentLanguageFieldProps) {
  const { t, i18n } = useTranslation()
  const options = useMemo(() => getContentLanguageSelectOptions(), [i18n.language])

  return (
    <div className="flex flex-col gap-2">
      <SelectField
        label={t('contentLanguage.label')}
        name="content_language"
        value={value}
        onChange={(event) => onChange(event.target.value as ContentLanguage)}
        options={options}
        hint={t('contentLanguage.helper')}
        disabled={disabled}
      />
      {disabled && lockedReason ? (
        <p className="text-xs leading-relaxed text-navy-muted">{lockedReason}</p>
      ) : null}
    </div>
  )
}
