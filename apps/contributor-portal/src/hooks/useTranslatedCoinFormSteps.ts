import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { getVisibleCoinFormSteps, type CoinFormStep } from '../types/coinFormSteps'

export function useTranslatedCoinFormSteps(isAdmin: boolean): CoinFormStep[] {
  const { t, i18n } = useTranslation()

  return useMemo(
    () =>
      getVisibleCoinFormSteps(isAdmin).map((step) => ({
        ...step,
        label: t(`wizard.steps.${step.id}.label`),
        description: t(`wizard.steps.${step.id}.description`),
        tip: t(`wizard.steps.${step.id}.tip`),
      })),
    [isAdmin, i18n.language, t],
  )
}
