import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { CoinFormValues } from '../../types/coinForm'
import {
  buildTwoEuroSpecUpdates,
  getFilledTwoEuroSpecFields,
  MATERIAL_PRESET_OPTIONS,
} from '../../lib/coinFormData'
import { ConfirmDialog } from './ConfirmDialog'

type SpecificationPresetsProps = {
  values: CoinFormValues
  disabled?: boolean
  onFieldChange: <K extends keyof CoinFormValues>(field: K, value: CoinFormValues[K]) => void
}

export function TwoEuroDefaultsPreset({
  values,
  disabled = false,
  onFieldChange,
}: SpecificationPresetsProps) {
  const { t } = useTranslation()
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false)

  function applyDefaults(overwrite: boolean) {
    const updates = buildTwoEuroSpecUpdates(values, overwrite)
    for (const [field, value] of Object.entries(updates) as Array<
      [keyof CoinFormValues, CoinFormValues[keyof CoinFormValues]]
    >) {
      onFieldChange(field, value)
    }
    setShowOverwriteConfirm(false)
  }

  function handlePresetClick() {
    if (getFilledTwoEuroSpecFields(values).length > 0) {
      setShowOverwriteConfirm(true)
      return
    }

    applyDefaults(false)
  }

  return (
    <>
      <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-relaxed text-navy-muted">
            {t('specifications.twoEuroHint')}
          </p>
          <button
            type="button"
            disabled={disabled}
            onClick={handlePresetClick}
            className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-white px-4 text-xs font-semibold text-primary transition hover:border-primary/50 hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {t('specifications.twoEuroPreset')}
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={showOverwriteConfirm}
        title={t('specifications.overwriteTitle')}
        description={t('specifications.overwriteDescription')}
        confirmLabel={t('specifications.overwriteConfirm')}
        onCancel={() => setShowOverwriteConfirm(false)}
        onConfirm={() => applyDefaults(true)}
      />
    </>
  )
}

type MaterialPresetChipsProps = {
  value: string
  disabled?: boolean
  onSelect: (material: string) => void
}

export function MaterialPresetChips({ value, disabled = false, onSelect }: MaterialPresetChipsProps) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={t('specifications.materialPresets')}>
      {MATERIAL_PRESET_OPTIONS.map((preset) => {
        const isActive = value.trim() === preset

        return (
          <button
            key={preset}
            type="button"
            disabled={disabled}
            aria-pressed={isActive}
            onClick={() => onSelect(preset)}
            className={[
              'rounded-full border px-3 py-1 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-60',
              isActive
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-white text-navy hover:border-primary/30 hover:bg-primary/5',
            ].join(' ')}
          >
            {preset}
          </button>
        )
      })}
    </div>
  )
}
