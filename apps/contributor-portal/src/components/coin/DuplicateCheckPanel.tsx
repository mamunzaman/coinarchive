import { AlertTriangle, Check, Copy, Info, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  getDuplicateCheckLabel,
  getDuplicateCheckTone,
  type DuplicateCheckStatus,
} from '../../lib/duplicateCheck'
import {
  categorizeDuplicateMatches,
  getDuplicateMatchHref,
  type DuplicateMatch,
} from '../../lib/duplicateDetection'
import { formatRecordStatusLabel } from '../../lib/revisionComparison'

type DuplicateCheckPanelProps = {
  status: DuplicateCheckStatus
  matches?: DuplicateMatch[]
  compact?: boolean
}

const toneTextClass = {
  neutral: 'text-navy-muted',
  success: 'text-emerald-700',
  warning: 'text-amber-800',
  danger: 'text-red-700',
  primary: 'text-primary',
  info: 'text-slate-700',
} as const

const toneBgClass = {
  neutral: 'border-border/60 bg-muted/20',
  success: 'border-emerald-200/80 bg-emerald-50/50',
  warning: 'border-amber-200 bg-amber-50/80',
  danger: 'border-red-200/80 bg-red-50/50',
  primary: 'border-border/60 bg-muted/20',
  info: 'border-slate-200/90 bg-slate-50/90',
} as const

function StatusIcon({ status }: { status: DuplicateCheckStatus }) {
  if (status === 'checking') {
    return <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
  }

  if (status === 'clear') {
    return <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} aria-hidden />
  }

  if (status === 'match' || status === 'error') {
    return <AlertTriangle className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
  }

  if (status === 'draft-info' || status === 'reference') {
    return <Info className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
  }

  return <Copy className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
}

export function DuplicateCheckPanel({
  status,
  matches = [],
  compact = true,
}: DuplicateCheckPanelProps) {
  const tone = getDuplicateCheckTone(status)
  const label = getDuplicateCheckLabel(status)
  const { warningMatches, draftMatches, referenceMatches } = categorizeDuplicateMatches(matches)
  const primaryWarning = warningMatches[0]
  const primaryDraft = draftMatches[0]
  const primaryReference = referenceMatches[0]

  return (
    <div className="space-y-2">
      <p
        className={[
          'inline-flex items-center gap-1.5 text-xs font-medium xl:text-sm',
          toneTextClass[tone],
        ].join(' ')}
      >
        <StatusIcon status={status} />
        {label}
      </p>

      {status === 'match' && primaryWarning ? (
        <div
          className={[
            'rounded-lg border px-2.5 py-2',
            toneBgClass.warning,
            compact ? 'text-xs' : 'text-sm',
          ].join(' ')}
        >
          <p className="text-[11px] text-amber-950/90 xl:text-xs">
            Possible duplicate submission found.
          </p>
          <p className="mt-1 truncate font-medium text-navy">{primaryWarning.title}</p>
          <p className="mt-0.5 text-[11px] text-navy-muted xl:text-xs">
            #{primaryWarning.id}
            {primaryWarning.status
              ? ` · ${formatRecordStatusLabel(primaryWarning.status)}`
              : ''}
            {primaryWarning.year ? ` · ${primaryWarning.year}` : ''}
          </p>
          <Link
            to={`/my-submissions/${primaryWarning.id}`}
            className="mt-1.5 inline-flex text-[11px] font-semibold text-primary hover:text-primary-hover xl:text-xs"
          >
            Review possible match
          </Link>
          {warningMatches.length > 1 ? (
            <p className="mt-1 text-[10px] text-amber-900/75 xl:text-[11px]">
              +{warningMatches.length - 1} more possible{' '}
              {warningMatches.length - 1 === 1 ? 'match' : 'matches'}
            </p>
          ) : null}
        </div>
      ) : null}

      {status === 'draft-info' && primaryDraft ? (
        <div
          className={[
            'rounded-lg border px-2.5 py-2',
            toneBgClass.info,
            compact ? 'text-xs' : 'text-sm',
          ].join(' ')}
        >
          <p className="text-[11px] text-slate-700 xl:text-xs">
            You already have an unfinished draft that may be the same coin.
          </p>
          <p className="mt-1 truncate font-medium text-navy">{primaryDraft.title}</p>
          <p className="mt-0.5 text-[11px] text-navy-muted xl:text-xs">
            #{primaryDraft.id}
            {primaryDraft.year ? ` · ${primaryDraft.year}` : ''}
          </p>
          <Link
            to={getDuplicateMatchHref(primaryDraft)}
            className="mt-1.5 inline-flex text-[11px] font-semibold text-primary hover:text-primary-hover xl:text-xs"
          >
            Continue draft
          </Link>
          {draftMatches.length > 1 ? (
            <p className="mt-1 text-[10px] text-slate-600 xl:text-[11px]">
              +{draftMatches.length - 1} more draft {draftMatches.length - 1 === 1 ? 'match' : 'matches'}
            </p>
          ) : null}
        </div>
      ) : null}

      {status === 'reference' && primaryReference ? (
        <div
          className={[
            'rounded-lg border px-2.5 py-2',
            toneBgClass.info,
            compact ? 'text-xs' : 'text-sm',
          ].join(' ')}
        >
          <p className="truncate font-medium text-navy">{primaryReference.title}</p>
          <p className="mt-0.5 text-[11px] text-navy-muted xl:text-xs">
            #{primaryReference.id}
            {primaryReference.status
              ? ` · ${formatRecordStatusLabel(primaryReference.status)}`
              : ''}
          </p>
          <Link
            to={`/my-submissions/${primaryReference.id}`}
            className="mt-1.5 inline-flex text-[11px] font-semibold text-primary hover:text-primary-hover xl:text-xs"
          >
            View entry
          </Link>
        </div>
      ) : null}

      {status === 'error' ? (
        <p className="text-[11px] text-navy-muted xl:text-xs">
          Duplicate check failed — you can still save and submit.
        </p>
      ) : null}

      {status === 'insufficient' ? (
        <p className="text-[11px] text-navy-muted xl:text-xs">
          Add country, year, denomination, and coin type to check.
        </p>
      ) : null}
    </div>
  )
}
