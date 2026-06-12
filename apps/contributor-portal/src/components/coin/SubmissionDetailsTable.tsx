import type { CoinSubmissionDetail } from '../../lib/api'
import { useTranslation } from 'react-i18next'
import { hasAiAssistedDescriptionContent } from '../../lib/aiDescriptionGenerator'
import { getCoinIssueStatusDisplayLabel, getCoinSeriesDisplayLabel } from '../../lib/coinDisplayLabels'
import { SafeHtmlContent } from '../ui/SafeHtmlContent'
import {
  DetailFieldGrid,
  DetailFieldRow,
  DetailSectionCard,
  DetailTextBlock,
} from './SubmissionDetailCard'

type SubmissionDetailsTableProps = {
  submission: CoinSubmissionDetail
  editHrefs?: {
    about?: string
    specifications?: string
    descriptions?: string
  }
}

function hasText(value: unknown): boolean {
  return typeof value === 'string' ? value.trim().length > 0 : value !== null && value !== undefined
}

function hasHtmlText(value: string | undefined): boolean {
  return Boolean(value?.replace(/<[^>]*>/g, '').trim())
}

export function SubmissionDetailsTable({ submission, editHrefs }: SubmissionDetailsTableProps) {
  const { t } = useTranslation()
  const acf = submission.acf
  const hasAiDescriptions = hasAiAssistedDescriptionContent(submission)
  const hasAbout =
    [
      submission.title,
      submission.country,
      submission.year ? String(submission.year) : '',
      submission.denomination,
      submission.coin_type,
      submission.coin_series,
      acf?.coin_designer,
      acf?.coin_theme,
      acf?.coin_country_code,
      submission.short_description,
    ].some(hasText)

  const hasSpecifications =
    [
      acf?.coin_material,
      acf?.coin_quality,
      acf?.coin_mintage,
      acf?.coin_issue_status,
      acf?.coin_source_name,
      acf?.coin_source_url,
      acf?.coin_weight_g,
      acf?.coin_diameter_mm,
      acf?.coin_thickness_mm,
      acf?.coin_edge_inscription,
    ].some(hasText)

  const hasDescriptions =
    [
      acf?.coin_obverse_description,
      acf?.coin_reverse_description,
      acf?.coin_collector_notes,
    ].some(hasText) || hasHtmlText(acf?.coin_historical_background)

  return (
    <>
      {hasAbout ? (
        <DetailSectionCard
          title={t('detail.aboutCoinTitle')}
          subtitle={t('detail.aboutCoinSubtitle')}
          editHref={editHrefs?.about}
        >
          <DetailFieldGrid>
            <DetailFieldRow label={t('fields.title')} value={submission.title ?? ''} className="detail-field-span-full" />
            <DetailFieldRow label={t('fields.country')} value={submission.country ?? ''} />
            <DetailFieldRow label={t('fields.year')} value={submission.year ? String(submission.year) : ''} />
            <DetailFieldRow label={t('form.denomination')} value={submission.denomination ?? ''} />
            <DetailFieldRow label={t('form.coinType')} value={submission.coin_type ?? ''} />
            <DetailFieldRow
              label={t('form.coinSeries')}
              value={getCoinSeriesDisplayLabel(submission.coin_series ?? '') || submission.coin_series || ''}
            />
            <DetailFieldRow label={t('form.coinDesigner')} value={acf?.coin_designer ?? ''} />
            <DetailFieldRow label={t('form.coinTheme')} value={acf?.coin_theme ?? ''} />
            <DetailFieldRow label={t('detail.countryCode')} value={acf?.coin_country_code ?? ''} />
            <DetailTextBlock label={t('form.shortDescription')} value={submission.short_description ?? ''} />
          </DetailFieldGrid>
        </DetailSectionCard>
      ) : null}

      {hasSpecifications ? (
        <DetailSectionCard
          title={t('form.specificationsTitle')}
          subtitle={t('form.reviewSpecificationsSubtitle')}
          editHref={editHrefs?.specifications}
        >
          <DetailFieldGrid>
            <DetailFieldRow label={t('specifications.material')} value={acf?.coin_material ?? ''} />
            <DetailFieldRow label={t('specifications.quality')} value={acf?.coin_quality ?? ''} />
            <DetailFieldRow label={t('specifications.mintage')} value={acf?.coin_mintage ?? ''} />
            <DetailFieldRow
              label={t('form.coinIssueStatus')}
              value={getCoinIssueStatusDisplayLabel(acf?.coin_issue_status ?? '') || acf?.coin_issue_status || ''}
            />
            <DetailFieldRow label={t('form.sourceName')} value={acf?.coin_source_name ?? ''} />
            <DetailFieldRow label={t('form.sourceUrl')} value={acf?.coin_source_url ?? ''} />
            <DetailFieldRow
              label={t('specifications.weight')}
              value={acf?.coin_weight_g != null ? `${acf.coin_weight_g} g` : ''}
            />
            <DetailFieldRow
              label={t('specifications.diameter')}
              value={acf?.coin_diameter_mm != null ? `${acf.coin_diameter_mm} mm` : ''}
            />
            <DetailFieldRow
              label={t('specifications.thickness')}
              value={acf?.coin_thickness_mm != null ? `${acf.coin_thickness_mm} mm` : ''}
            />
            <DetailFieldRow
              label={t('specifications.edgeInscription')}
              value={acf?.coin_edge_inscription ?? ''}
              className="detail-field-span-full"
            />
          </DetailFieldGrid>
        </DetailSectionCard>
      ) : null}

      {hasDescriptions ? (
        <DetailSectionCard
          title={t('form.descriptionsTitle')}
          subtitle={t('detail.descriptionsSubtitle')}
          editHref={editHrefs?.descriptions}
          titleAccessory={
            hasAiDescriptions ? (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary ring-1 ring-primary/20">
                {t('detail.aiAssisted')}
              </span>
            ) : null
          }
        >
          <DetailFieldGrid>
            <DetailTextBlock
              label={t('form.obverseDescription')}
              value={acf?.coin_obverse_description ?? ''}
            />
            <DetailTextBlock
              label={t('form.reverseDescription')}
              value={acf?.coin_reverse_description ?? ''}
            />
            {hasHtmlText(acf?.coin_historical_background) ? (
              <div className="detail-field-row detail-field-span-full border-b border-border/40 py-2.5">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-navy-muted">
                  {t('form.historicalBackground')}
                </dt>
                <dd className="mt-1.5">
                  <div className="max-h-48 overflow-y-auto rounded-lg bg-muted/20 px-3 py-2.5 text-sm text-navy">
                    <SafeHtmlContent html={acf?.coin_historical_background ?? ''} />
                  </div>
                </dd>
              </div>
            ) : null}
            <DetailTextBlock label={t('form.collectorNotes')} value={acf?.coin_collector_notes ?? ''} />
          </DetailFieldGrid>
        </DetailSectionCard>
      ) : null}
    </>
  )
}
