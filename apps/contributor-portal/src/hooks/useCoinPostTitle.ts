import { useCallback, useEffect, useMemo } from 'react'
import type { CoinFormValues } from '../types/coinForm'
import type { FormOptions } from '../types/formOptions'
import { generateCoinPostTitle } from '../lib/coinTitle'

type UseCoinPostTitleOptions = {
  values: CoinFormValues
  setValues: React.Dispatch<React.SetStateAction<CoinFormValues>>
  formOptions?: FormOptions
  titleManualOverride: boolean
  setTitleManualOverride: React.Dispatch<React.SetStateAction<boolean>>
  enabled?: boolean
}

export function useCoinPostTitle({
  values,
  setValues,
  formOptions,
  titleManualOverride,
  setTitleManualOverride,
  enabled = true,
}: UseCoinPostTitleOptions) {
  const titleSourceKey = useMemo(
    () =>
      JSON.stringify({
        country: values.country,
        year: values.year,
        denomination: values.denomination,
        coin_type: values.coin_type,
        coin_theme: values.coin_theme,
        coin_series: values.coin_series,
        short_description: values.short_description,
      }),
    [
      values.country,
      values.year,
      values.denomination,
      values.coin_type,
      values.coin_theme,
      values.coin_series,
      values.short_description,
    ],
  )

  const autoTitle = useMemo(
    () => generateCoinPostTitle(values, { formOptions }),
    [formOptions, titleSourceKey, values],
  )

  useEffect(() => {
    if (!enabled || titleManualOverride) {
      return
    }

    setValues((current) => {
      if (current.title === autoTitle) {
        return current
      }

      return { ...current, title: autoTitle }
    })
  }, [autoTitle, enabled, setValues, titleManualOverride])

  const handleTitleChange = useCallback(
    (nextTitle: string) => {
      setValues((current) => ({ ...current, title: nextTitle }))
      setTitleManualOverride(nextTitle !== autoTitle)
    },
    [autoTitle, setTitleManualOverride, setValues],
  )

  const regenerateTitle = useCallback(() => {
    setTitleManualOverride(false)
    setValues((current) => ({
      ...current,
      title: generateCoinPostTitle(current, { formOptions }),
    }))
  }, [formOptions, setTitleManualOverride, setValues])

  return {
    autoTitle,
    handleTitleChange,
    regenerateTitle,
  }
}
