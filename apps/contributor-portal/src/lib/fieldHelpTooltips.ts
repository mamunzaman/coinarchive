import type { TFunction } from 'i18next'
import type { FieldHelpTooltipContent } from '../components/ui/FieldHelpTooltip'

export const FIELD_HELP_TOOLTIP_FIELDS = {
  series: 'series',
  coinType: 'coinType',
  theme: 'theme',
  mintInformation: 'mintInformation',
  country: 'country',
  releaseDate: 'releaseDate',
} as const

export type FieldHelpTooltipFieldId =
  (typeof FIELD_HELP_TOOLTIP_FIELDS)[keyof typeof FIELD_HELP_TOOLTIP_FIELDS]

const SERIES_FIELD_HELP_ITEM_KEYS = [
  'culturalHeritage',
  'europeanIntegration',
  'historicalFigures',
  'internationalEvents',
  'nationalAnniversaries',
  'natureAndEnvironment',
  'royalAndStateEvents',
  'scienceAndInnovation',
] as const

export function getSeriesFieldHelpContent(t: TFunction): FieldHelpTooltipContent {
  return {
    title: t('fieldHelp.series.title'),
    intro: t('fieldHelp.series.intro'),
    items: SERIES_FIELD_HELP_ITEM_KEYS.map((key) => ({
      label: t(`fieldHelp.series.items.${key}.label`),
      description: t(`fieldHelp.series.items.${key}.description`),
    })),
    footer: t('fieldHelp.series.footer'),
  }
}

export function getFieldHelpContent(
  t: TFunction,
  fieldId: FieldHelpTooltipFieldId,
): FieldHelpTooltipContent | undefined {
  switch (fieldId) {
    case 'series':
      return getSeriesFieldHelpContent(t)
    default:
      return undefined
  }
}
