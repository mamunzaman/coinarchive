import type { CoinAcfDetail } from '../../types/coinForm'
import { useTranslation } from 'react-i18next'
import { COIN_RECORD_STATUS_OPTIONS } from '../../types/coinForm'
import { DetailFieldGrid, DetailFieldRow, DetailSectionCard } from './SubmissionDetailCard'

function formatBoolean(value: number | boolean | undefined, yes: string, no: string): string {
  if (value === undefined || value === null) {
    return ''
  }

  if (typeof value === 'boolean') {
    return value ? yes : no
  }

  return Number(value) === 1 ? yes : no
}

function formatRecordStatus(value: string | undefined): string {
  if (!value) {
    return ''
  }

  if (COIN_RECORD_STATUS_OPTIONS.includes(value as (typeof COIN_RECORD_STATUS_OPTIONS)[number])) {
    return value.charAt(0).toUpperCase() + value.slice(1)
  }

  return value
}

type SubmissionAdminInfoProps = {
  acf?: CoinAcfDetail
  bare?: boolean
}

function AdminInfoContent({ acf }: { acf?: CoinAcfDetail }) {
  const { t } = useTranslation()

  return (
    <DetailFieldGrid>
      <DetailFieldRow
        label={t('review.publishedInCatalogue')}
        value={formatBoolean(acf?.coin_is_published_catalogue, t('common.yes'), t('common.no'))}
      />
      <DetailFieldRow
        label={t('review.featuredCoin')}
        value={formatBoolean(acf?.coin_is_featured, t('common.yes'), t('common.no'))}
      />
      <DetailFieldRow
        label={t('form.appEnabled')}
        value={formatBoolean(acf?.coin_is_app_enabled, t('common.yes'), t('common.no'))}
      />
      <DetailFieldRow label={t('form.recordStatus')} value={formatRecordStatus(acf?.coin_record_status)} />
    </DetailFieldGrid>
  )
}

export function SubmissionAdminInfo({ acf, bare = false }: SubmissionAdminInfoProps) {
  const { t } = useTranslation()
  const hasContent = Boolean(
    acf?.coin_is_published_catalogue !== undefined ||
      acf?.coin_is_featured !== undefined ||
      acf?.coin_is_app_enabled !== undefined ||
      acf?.coin_record_status,
  )

  if (!hasContent) {
    return null
  }

  const content = <AdminInfoContent acf={acf} />

  if (bare) {
    return content
  }

  return (
    <DetailSectionCard title={t('review.statusVisibilityTitle')} subtitle={t('review.statusVisibilitySubtitle')}>
      {content}
    </DetailSectionCard>
  )
}
