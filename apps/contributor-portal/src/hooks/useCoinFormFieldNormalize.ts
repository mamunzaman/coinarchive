import { useCallback, useState } from 'react'
import {
  AUTO_FORMAT_HINT,
  normalizeCoinFormField,
} from '../lib/coinFormNormalize'
import type { CoinFormValues } from '../types/coinForm'
import type { FormOptions } from '../types/formOptions'

type UseCoinFormFieldNormalizeOptions = {
  formOptions?: FormOptions
  onFieldChange: <K extends keyof CoinFormValues>(field: K, value: CoinFormValues[K]) => void
}

export function useCoinFormFieldNormalize({
  formOptions,
  onFieldChange,
}: UseCoinFormFieldNormalizeOptions) {
  const [formattedFields, setFormattedFields] = useState<
    Partial<Record<keyof CoinFormValues, boolean>>
  >({})

  const changeField = useCallback(
    <K extends keyof CoinFormValues>(field: K, value: CoinFormValues[K]) => {
      setFormattedFields((prev) => {
        if (!prev[field]) {
          return prev
        }
        const next = { ...prev }
        delete next[field]
        return next
      })
      onFieldChange(field, value)
    },
    [onFieldChange],
  )

  const blurField = useCallback(
    <K extends keyof CoinFormValues>(field: K, value: CoinFormValues[K]) => {
      const normalized = normalizeCoinFormField(field, value, { formOptions })
      if (normalized !== value) {
        onFieldChange(field, normalized)
        setFormattedFields((prev) => ({ ...prev, [field]: true }))
      }
    },
    [formOptions, onFieldChange],
  )

  const formatHint = useCallback(
    (field: keyof CoinFormValues) => (formattedFields[field] ? AUTO_FORMAT_HINT : undefined),
    [formattedFields],
  )

  return { changeField, blurField, formatHint }
}
