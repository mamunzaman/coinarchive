import { AlertCircle, AlertTriangle, CheckCircle2, Info, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { DuplicateCheckStatus } from '../../lib/duplicateCheck'
import i18n from '../../i18n'
import {
  getDuplicateProtectionMessage,
  getOwnSubmissionDetailHref,
  type DuplicateProtectionState,
} from '../../lib/duplicateProtection'
import { formatRecordStatusLabel } from '../../lib/revisionComparison'
import {
  getDuplicateMatchHref,
  getExactDuplicateMatches,
  getSimilarDuplicateMatches,
  isDraftDuplicateMatch,
  type DuplicateMatch,
} from '../../lib/duplicateDetection'

type DuplicateWarningCardProps = {
  matches: DuplicateMatch[]
  status?: DuplicateCheckStatus
  protectionState?: DuplicateProtectionState | null
  ownSubmissionIds?: number[]
  prominent?: boolean
  variant?: 'compact' | 'full'
}

function getMatchTypeLabel(match: DuplicateMatch): string {
  switch (match.matchType) {
    case 'exact_unique_code':
      return i18n.t('duplicate.exactUniqueCode')
    case 'exact_coin_code':
      return i18n.t('duplicate.exactCoinCode')
    case 'exact_title':
      return i18n.t('duplicate.exactTitle')
    default:
      return i18n.t('duplicate.similarCoin')
  }
}

function isOwnSubmission(matchId: number, ownSubmissionIds: number[]): boolean {
  return ownSubmissionIds.includes(matchId)
}

function MatchActions({
  match,
  ownSubmissionIds,
}: {
  match: DuplicateMatch
  ownSubmissionIds: number[]
}) {
  if (isOwnSubmission(match.id, ownSubmissionIds)) {
    return (
      <Link
        to={getOwnSubmissionDetailHref(match.id)}
        className="inline-flex text-xs font-semibold text-primary hover:text-primary-hover"
        aria-label={`Open existing submission ${match.title}`}
      >
        {i18n.t('duplicate.openExisting')}
      </Link>
    )
  }

  const href = getDuplicateMatchHref(match)

  if (/^https?:\/\//i.test(href)) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="inline-flex text-xs font-semibold text-primary hover:text-primary-hover"
        aria-label={`View existing coin ${match.title}`}
      >
        {i18n.t('duplicate.viewExisting')}
      </a>
    )
  }

  return (
    <Link
      to={href}
      className="inline-flex text-xs font-semibold text-primary hover:text-primary-hover"
      aria-label={i18n.t('duplicate.viewExistingAria', { title: match.title })}
    >
      {i18n.t('duplicate.viewExisting')}
    </Link>
  )
}

function MatchDetails({ match }: { match: DuplicateMatch }) {
  return (
    <dl className="mt-1 grid gap-x-3 gap-y-1 text-xs text-navy-muted sm:grid-cols-2">
      {match.country ? (
        <div>
          <dt className="sr-only">{i18n.t('duplicate.countryLabel')}</dt>
          <dd>{i18n.t('duplicate.countryLabel')}: {match.country}</dd>
        </div>
      ) : null}
      {match.year ? (
        <div>
          <dt className="sr-only">{i18n.t('duplicate.yearLabel')}</dt>
          <dd>{i18n.t('duplicate.yearLabel')}: {match.year}</dd>
        </div>
      ) : null}
      {match.status ? (
        <div>
          <dt className="sr-only">{i18n.t('duplicate.statusLabel')}</dt>
          <dd>{i18n.t('duplicate.statusLabel')}: {formatRecordStatusLabel(match.status)}</dd>
        </div>
      ) : null}
    </dl>
  )
}

function MatchList({
  matches,
  ownSubmissionIds,
  tone,
  variant = 'full',
}: {
  matches: DuplicateMatch[]
  ownSubmissionIds: number[]
  tone: 'red' | 'amber'
  variant?: 'compact' | 'full'
}) {
  const badgeClass =
    tone === 'red'
      ? 'bg-red-50 text-red-800 ring-red-200'
      : 'bg-amber-50 text-amber-900 ring-amber-200'
  const isCompact = variant === 'compact'

  return (
    <ul className={isCompact ? 'space-y-1.5' : 'space-y-2'}>
      {matches.map((match) => (
        <li
          key={match.id}
          className={[
            'rounded-lg border',
            isCompact ? 'px-2.5 py-2' : 'px-3 py-2.5',
            tone === 'red' ? 'border-red-200/80 bg-white/80' : 'border-amber-200/80 bg-white/70',
          ].join(' ')}
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <span
                className={[
                  'inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1',
                  badgeClass,
                ].join(' ')}
              >
                {getMatchTypeLabel(match)}
              </span>
              <p className={['mt-1.5 font-medium text-navy', isCompact ? 'truncate text-xs' : 'text-sm'].join(' ')}>
                {match.title}
              </p>
              {!isCompact ? <MatchDetails match={match} /> : null}
            </div>
            <div className="shrink-0 sm:pt-1">
              <MatchActions match={match} ownSubmissionIds={ownSubmissionIds} />
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}

function CompactDuplicateStatus({
  matches,
  status,
  protectionState,
  ownSubmissionIds,
}: Required<Pick<DuplicateWarningCardProps, 'matches' | 'status' | 'ownSubmissionIds'>> & {
  protectionState: DuplicateProtectionState | null
}) {
  const exactMatch = getExactDuplicateMatches(matches)[0]
  const similarMatch = getSimilarDuplicateMatches(matches)[0]

  if (status === 'checking') {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-lg border border-cyan-200/80 bg-cyan-50/70 px-3 py-2 text-xs text-cyan-950"
      >
        <div className="flex items-center gap-2">
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-cyan-700" aria-hidden />
          <div className="min-w-0">
            <p className="font-semibold">{i18n.t('duplicate.checkingShort')}</p>
            <p className="mt-0.5 text-[11px] text-cyan-900/75">
              {i18n.t('duplicate.waitForCompletion')}
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-amber-950"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-700" aria-hidden />
          <p className="font-semibold">{i18n.t('duplicate.unavailable')}</p>
        </div>
      </div>
    )
  }

  if (protectionState === 'EXACT_DUPLICATE') {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-lg border border-red-200 bg-red-50/85 px-3 py-2 text-xs text-red-950"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-700" aria-hidden />
            <p className="shrink-0 font-semibold">{i18n.t('duplicate.exactFoundTitle')}</p>
            {exactMatch ? (
              <span className="shrink-0 rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold text-red-800 ring-1 ring-red-200">
                {getMatchTypeLabel(exactMatch)}
              </span>
            ) : null}
            {exactMatch ? (
              <p className="min-w-0 truncate text-red-900/80">{exactMatch.title}</p>
            ) : null}
          </div>
          {exactMatch ? (
            <div className="shrink-0">
              <MatchActions match={exactMatch} ownSubmissionIds={ownSubmissionIds} />
            </div>
          ) : null}
        </div>
      </div>
    )
  }

  if (protectionState === 'SIMILAR_MATCH') {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-lg border border-amber-200 bg-amber-50/85 px-3 py-2 text-xs text-amber-950"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700" aria-hidden />
          <p className="shrink-0 font-semibold">{i18n.t('duplicate.similarFoundTitle')}</p>
          {similarMatch ? <p className="min-w-0 truncate text-amber-900/75">{similarMatch.title}</p> : null}
        </div>
      </div>
    )
  }

  if (protectionState === 'NO_MATCH' || status === 'clear') {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-xs text-emerald-950"
      >
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-700" aria-hidden />
          <p className="font-semibold">{i18n.t('duplicate.noMatchTitle')}</p>
        </div>
      </div>
    )
  }

  return null
}

export function DuplicateWarningCard({
  matches,
  status = 'clear',
  protectionState = null,
  ownSubmissionIds = [],
  prominent = false,
  variant = 'full',
}: DuplicateWarningCardProps) {
  if (variant === 'compact') {
    return (
      <CompactDuplicateStatus
        matches={matches}
        status={status}
        protectionState={protectionState}
        ownSubmissionIds={ownSubmissionIds}
      />
    )
  }

  const shellClass = prominent
    ? 'px-4 py-4 text-sm shadow-[var(--shadow-card)]'
    : 'px-3 py-3 text-sm'

  if (status === 'checking') {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-lg border border-cyan-200/80 bg-cyan-50/60 px-3 py-2 text-xs text-cyan-950"
      >
        <div className="flex items-center gap-2">
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-cyan-700" aria-hidden />
          <div className="min-w-0">
            <p className="font-semibold">{i18n.t('duplicate.checkingUniqueness')}</p>
            <p className="text-[11px] text-cyan-900/75">{i18n.t('duplicate.comparingRecords')}</p>
            <p className="text-[11px] text-cyan-900/75">
              {i18n.t('duplicate.waitForCompletion')}
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-lg border border-amber-200/90 bg-amber-50/70 px-3 py-2 text-xs text-amber-950"
      >
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700" aria-hidden />
          <div className="min-w-0">
            <p className="font-semibold">{i18n.t('duplicate.unavailable')}</p>
            <p className="text-[11px] text-amber-900/75">{i18n.t('duplicate.unavailableDetail')}</p>
          </div>
        </div>
      </div>
    )
  }

  if (protectionState === 'EXACT_DUPLICATE') {
    const exactMatches = getExactDuplicateMatches(matches)

    return (
      <div
        role="status"
        aria-live="polite"
        className={['rounded-xl border border-red-300 bg-red-50/90 text-red-950', shellClass].join(' ')}
      >
        <div className="flex items-start gap-2.5">
          <AlertCircle
            className="mt-0.5 h-5 w-5 shrink-0 text-red-700"
            aria-hidden
          />
          <div className="min-w-0 flex-1 space-y-2.5">
            <p className="font-semibold">{i18n.t('duplicate.exactFoundTitle')}</p>
            <p className="text-xs leading-relaxed text-red-900/90 sm:text-sm">
              {getDuplicateProtectionMessage('EXACT_DUPLICATE')}
            </p>
            {exactMatches.length > 0 ? (
              <MatchList matches={exactMatches} ownSubmissionIds={ownSubmissionIds} tone="red" />
            ) : null}
          </div>
        </div>
      </div>
    )
  }

  if (protectionState === 'SIMILAR_MATCH') {
    const similarMatches = getSimilarDuplicateMatches(matches)

    return (
      <div
        role="status"
        aria-live="polite"
        className={[
          'rounded-xl border border-amber-200 bg-amber-50/90 text-amber-950',
          shellClass,
        ].join(' ')}
      >
        <div className="flex items-start gap-2.5">
          <AlertTriangle
            className="mt-0.5 h-5 w-5 shrink-0 text-amber-700"
            aria-hidden
          />
          <div className="min-w-0 flex-1 space-y-2.5">
            <p className="font-semibold">{i18n.t('duplicate.similarFoundTitle')}</p>
            <p className="text-xs leading-relaxed text-amber-900/85 sm:text-sm">
              {getDuplicateProtectionMessage('SIMILAR_MATCH')}
            </p>
            {similarMatches.length > 0 ? (
              <MatchList matches={similarMatches} ownSubmissionIds={ownSubmissionIds} tone="amber" />
            ) : null}
          </div>
        </div>
      </div>
    )
  }

  if (protectionState === 'NO_MATCH' || status === 'clear') {
    return (
      <div
        role="status"
        aria-live="polite"
        className={[
          'rounded-lg border border-emerald-200/70 bg-emerald-50/50 text-emerald-950',
          prominent ? 'rounded-xl px-4 py-3 text-sm' : 'px-3 py-2 text-xs',
        ].join(' ')}
      >
        <div className="flex items-start gap-2">
          <CheckCircle2
            className={['mt-0.5 shrink-0 text-emerald-700', prominent ? 'h-4 w-4' : 'h-3.5 w-3.5'].join(' ')}
            aria-hidden
          />
          <div className="min-w-0">
            <p className="font-semibold">{i18n.t('duplicate.noMatchTitle')}</p>
            <p className={prominent ? 'text-sm text-emerald-900/75' : 'text-[11px] text-emerald-900/75'}>
              {getDuplicateProtectionMessage('NO_MATCH')}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return null
}

type DuplicateDraftInfoCardProps = {
  matches: DuplicateMatch[]
}

export function DuplicateDraftInfoCard({ matches }: DuplicateDraftInfoCardProps) {
  const draftMatches = matches.filter(isDraftDuplicateMatch)

  if (draftMatches.length === 0) {
    return null
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-xl border border-slate-200/90 bg-slate-50/90 px-4 py-4 text-sm text-slate-800"
    >
      <div className="flex items-start gap-3">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-slate-600" aria-hidden />
        <div className="min-w-0 flex-1 space-y-3">
          <p className="font-semibold text-navy">
            {i18n.t('duplicate.draftInfo')}
          </p>
          <ul className="space-y-2">
            {draftMatches.map((match) => (
              <li
                key={match.id}
                className="rounded-lg border border-slate-200/80 bg-white/80 px-3 py-2.5"
              >
                <p className="font-medium text-navy">{match.title}</p>
                <p className="mt-1 text-xs text-navy-muted">
                  #{match.id}
                  {match.year ? ` · ${match.year}` : ''}
                  {match.country ? ` · ${match.country}` : ''}
                </p>
                <Link
                  to={getDuplicateMatchHref(match)}
                  className="mt-2 inline-flex text-xs font-semibold text-primary hover:text-primary-hover"
                >
                  {i18n.t('duplicate.continueDraft')}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
