import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Check, Eye, Pencil, Trash2, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export const ICON_INLINE = 'h-4 w-4 shrink-0'
export const ICON_ACTION = 'h-[18px] w-[18px] shrink-0'
export const ICON_NAV = 'h-5 w-5 shrink-0'

const contributorFocus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25'

const contributorDeleteClass = [
  'inline-flex min-h-11 items-center justify-center rounded-lg border border-red-200/80',
  'bg-red-50/60 text-sm font-semibold text-red-700 transition-colors',
  'hover:bg-red-100/80 disabled:opacity-50',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200/80',
].join(' ')

type ContributorActionStyle = {
  className?: string
  fullWidth?: boolean
  compact?: boolean
  mobileSafe?: boolean
}

function contributorActionClasses(
  variantClass: string,
  { className = '', fullWidth = false, compact = false, mobileSafe = false }: ContributorActionStyle,
): string {
  return [
    variantClass,
    'inline-flex min-h-11 items-center justify-center font-semibold transition-colors',
    compact ? 'min-w-11 shrink-0 gap-0 px-0' : 'gap-2 px-3 text-sm',
    fullWidth ? 'w-full min-w-0' : 'shrink-0',
    mobileSafe && !compact ? 'px-2 text-xs sm:px-3 sm:text-sm' : '',
    contributorFocus,
    className,
  ]
    .filter(Boolean)
    .join(' ')
}

function contributorLabelClass(compact: boolean, mobileSafe: boolean): string {
  if (compact) {
    return 'sr-only'
  }
  if (mobileSafe) {
    return 'truncate'
  }
  return ''
}

const adminIconBase = [
  'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:opacity-40',
].join(' ')

type ContributorActionLinkProps = ContributorActionStyle & {
  to: string
  label: string
  ariaLabel?: string
  icon: LucideIcon
  variant?: 'primary' | 'neutral'
}

function ContributorActionLink({
  to,
  label,
  ariaLabel,
  icon: Icon,
  variant = 'primary',
  className = '',
  fullWidth = false,
  compact = false,
  mobileSafe = false,
}: ContributorActionLinkProps) {
  const variantClass = variant === 'primary' ? 'action-btn-primary' : 'action-btn-neutral'

  return (
    <Link
      to={to}
      title={ariaLabel ?? label}
      aria-label={ariaLabel ?? label}
      className={contributorActionClasses(variantClass, {
        className,
        fullWidth,
        compact,
        mobileSafe,
      })}
    >
      <Icon className={ICON_ACTION} aria-hidden />
      <span className={contributorLabelClass(compact, mobileSafe)}>{label}</span>
    </Link>
  )
}

type ContributorActionButtonProps = ContributorActionStyle & {
  label: string
  ariaLabel?: string
  icon: LucideIcon
  onClick: () => void
  disabled?: boolean
}

function ContributorActionButton({
  label,
  ariaLabel,
  icon: Icon,
  onClick,
  disabled = false,
  className = '',
  fullWidth = false,
  compact = false,
  mobileSafe = false,
}: ContributorActionButtonProps) {
  return (
    <button
      type="button"
      title={ariaLabel ?? label}
      aria-label={ariaLabel ?? label}
      disabled={disabled}
      onClick={onClick}
      className={contributorActionClasses(contributorDeleteClass, {
        className,
        fullWidth,
        compact,
        mobileSafe,
      })}
    >
      <Icon className={ICON_ACTION} aria-hidden />
      <span className={contributorLabelClass(compact, mobileSafe)}>{label}</span>
    </button>
  )
}

type ContributorViewActionProps = ContributorActionStyle & {
  to: string
}

export function ContributorViewAction({
  to,
  className,
  fullWidth,
  compact,
  mobileSafe,
}: ContributorViewActionProps) {
  const { t } = useTranslation()

  return (
    <ContributorActionLink
      to={to}
      label={t('actions.view')}
      icon={Eye}
      variant="primary"
      className={className}
      fullWidth={fullWidth}
      compact={compact}
      mobileSafe={mobileSafe}
    />
  )
}

type ContributorEditActionProps = ContributorActionStyle & {
  to: string
}

export function ContributorEditAction({
  to,
  className,
  fullWidth,
  compact,
  mobileSafe,
}: ContributorEditActionProps) {
  const { t } = useTranslation()

  return (
    <ContributorActionLink
      to={to}
      label={t('actions.edit')}
      icon={Pencil}
      variant="neutral"
      className={className}
      fullWidth={fullWidth}
      compact={compact}
      mobileSafe={mobileSafe}
    />
  )
}

type ContributorDeleteActionProps = ContributorActionStyle & {
  onClick: () => void
  disabled?: boolean
}

export function ContributorDeleteAction({
  onClick,
  disabled = false,
  className,
  fullWidth,
  compact,
  mobileSafe,
}: ContributorDeleteActionProps) {
  const { t } = useTranslation()

  return (
    <ContributorActionButton
      label={t('actions.delete')}
      ariaLabel={t('actions.deleteAria')}
      icon={Trash2}
      onClick={onClick}
      disabled={disabled}
      className={className}
      fullWidth={fullWidth}
      compact={compact}
      mobileSafe={mobileSafe}
    />
  )
}

type ContributorSubmissionActionsProps = {
  viewPath: string
  editPath?: string
  onDelete?: () => void
  layout?: 'inline' | 'balanced-grid'
  className?: string
}

export function ContributorSubmissionActions({
  viewPath,
  editPath,
  onDelete,
  layout = 'inline',
  className = '',
}: ContributorSubmissionActionsProps) {
  const balanced = layout === 'balanced-grid'
  const actionProps = {
    fullWidth: balanced,
    mobileSafe: balanced,
  } satisfies Pick<ContributorActionStyle, 'fullWidth' | 'mobileSafe'>

  const actionCount = 1 + (editPath ? 1 : 0) + (onDelete ? 1 : 0)
  const balancedGridClass =
    actionCount >= 3
      ? 'grid grid-cols-3 gap-2'
      : actionCount === 2
        ? 'grid grid-cols-2 gap-2'
        : 'grid grid-cols-1 gap-2'

  return (
    <div
      className={[
        balanced ? balancedGridClass : 'flex flex-wrap items-center justify-end gap-2',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <ContributorViewAction to={viewPath} {...actionProps} />
      {editPath ? <ContributorEditAction to={editPath} {...actionProps} /> : null}
      {onDelete ? <ContributorDeleteAction onClick={onDelete} {...actionProps} /> : null}
    </div>
  )
}

type AdminApproveActionProps = {
  onClick: () => void
  disabled?: boolean
}

export function AdminApproveAction({ onClick, disabled = false }: AdminApproveActionProps) {
  const { t } = useTranslation()

  return (
    <button
      type="button"
      title={t('actions.approveAria')}
      aria-label={t('actions.approveAria')}
      disabled={disabled}
      onClick={onClick}
      className={[adminIconBase, 'bg-teal-500 text-white shadow-sm hover:bg-teal-600'].join(' ')}
    >
      <Check className="h-4 w-4" aria-hidden />
    </button>
  )
}

type AdminRejectActionProps = {
  onClick: () => void
  disabled?: boolean
}

export function AdminRejectAction({ onClick, disabled = false }: AdminRejectActionProps) {
  const { t } = useTranslation()

  return (
    <button
      type="button"
      title={t('actions.rejectAria')}
      aria-label={t('actions.rejectAria')}
      disabled={disabled}
      onClick={onClick}
      className={[
        adminIconBase,
        'border border-red-100 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700',
      ].join(' ')}
    >
      <X className="h-4 w-4" aria-hidden />
    </button>
  )
}

type AdminReviewActionProps = {
  to: string
  state?: unknown
  showLabel?: boolean
  className?: string
}

export function AdminReviewAction({
  to,
  state,
  showLabel = true,
  className = '',
}: AdminReviewActionProps) {
  const { t } = useTranslation()

  return (
    <Link
      to={to}
      state={state}
      title={t('actions.reviewAria')}
      aria-label={t('actions.reviewAria')}
      className={[
        'inline-flex h-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white',
        'text-slate-700 shadow-sm transition-colors hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
        showLabel ? 'gap-1.5 px-3 text-xs font-semibold' : 'w-9',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <Eye className="h-4 w-4 shrink-0" aria-hidden />
      {showLabel ? <span>{t('actions.review')}</span> : null}
    </Link>
  )
}

type AdminQueueActionRowProps = {
  detailPath: string
  state?: unknown
  isPending?: boolean
  isRowBusy?: boolean
  showQuickActions?: boolean
  onApprove?: () => void
  onReject?: () => void
  reviewShowLabel?: boolean
  layout?: 'inline' | 'card-footer'
  className?: string
}

export function AdminQueueActionRow({
  detailPath,
  state,
  isPending = false,
  isRowBusy = false,
  showQuickActions = true,
  onApprove,
  onReject,
  reviewShowLabel,
  layout = 'inline',
  className = '',
}: AdminQueueActionRowProps) {
  const showReviewLabel = reviewShowLabel ?? layout === 'card-footer'

  const actions = (
    <>
      {isPending && showQuickActions ? (
        <>
          <AdminApproveAction disabled={isRowBusy} onClick={() => onApprove?.()} />
          <AdminRejectAction disabled={isRowBusy} onClick={() => onReject?.()} />
        </>
      ) : null}
      <AdminReviewAction to={detailPath} state={state} showLabel={showReviewLabel} />
    </>
  )

  if (layout === 'card-footer') {
    return (
      <div
        className={[
          'flex w-full items-center justify-end border-t border-slate-100 bg-slate-50/80 px-3 py-2.5',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div className="inline-flex items-center gap-1.5 rounded-lg bg-white p-1 shadow-[0_1px_2px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/80">
          {actions}
        </div>
      </div>
    )
  }

  return (
    <div
      className={[
        'flex shrink-0 flex-nowrap items-center justify-end gap-2',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {actions}
    </div>
  )
}

const adminCardActionBase = [
  'inline-flex min-h-10 w-full min-w-0 items-center justify-center gap-1 rounded-lg border',
  'px-1.5 text-[11px] font-semibold leading-none transition-colors',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
  'disabled:pointer-events-none disabled:opacity-50',
  'sm:gap-1.5 sm:px-2 sm:text-xs',
].join(' ')

type AdminQueueCardActionBarProps = {
  detailPath: string
  state?: unknown
  isPending?: boolean
  isRowBusy?: boolean
  showQuickActions?: boolean
  onApprove?: () => void
  onReject?: () => void
}

export function AdminQueueCardActionBar({
  detailPath,
  state,
  isPending = false,
  isRowBusy = false,
  showQuickActions = true,
  onApprove,
  onReject,
}: AdminQueueCardActionBarProps) {
  const { t } = useTranslation()
  const showApproveReject = isPending && showQuickActions

  const reviewButton = (
    <Link
      to={detailPath}
      state={state}
      title={t('actions.reviewAria')}
      aria-label={t('actions.reviewAria')}
      className={[
        adminCardActionBase,
        'border-slate-200 bg-white text-slate-700 shadow-sm hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700',
        !showApproveReject ? 'col-span-3' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <Eye className="h-4 w-4 shrink-0" aria-hidden />
      <span className="truncate">{t('actions.review')}</span>
    </Link>
  )

  return (
    <div
      className={[
        'grid gap-2 border-t border-slate-100 px-3 py-2',
        showApproveReject ? 'grid-cols-3' : 'grid-cols-1',
      ].join(' ')}
    >
      {showApproveReject ? (
        <>
          <button
            type="button"
            title={t('actions.approveAria')}
            aria-label={t('actions.approveAria')}
            disabled={isRowBusy}
            onClick={() => onApprove?.()}
            className={[
              adminCardActionBase,
              'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
            ].join(' ')}
          >
            <Check className="h-4 w-4 shrink-0" aria-hidden />
            <span className="truncate">{t('actions.approve')}</span>
          </button>
          <button
            type="button"
            title={t('actions.rejectAria')}
            aria-label={t('actions.rejectAria')}
            disabled={isRowBusy}
            onClick={() => onReject?.()}
            className={[
              adminCardActionBase,
              'border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700',
            ].join(' ')}
          >
            <X className="h-4 w-4 shrink-0" aria-hidden />
            <span className="truncate">{t('actions.reject')}</span>
          </button>
          {reviewButton}
        </>
      ) : (
        reviewButton
      )}
    </div>
  )
}

type LabeledActionLinkProps = {
  to: string
  label: string
  icon: LucideIcon
  className?: string
}

export function LabeledActionLink({
  to,
  label,
  icon: Icon,
  className = 'action-btn-primary min-h-11 flex-1',
}: LabeledActionLinkProps) {
  return (
    <Link to={to} className={[className, 'inline-flex items-center justify-center gap-2'].join(' ')}>
      <Icon className={ICON_ACTION} aria-hidden />
      <span>{label}</span>
    </Link>
  )
}

type LabeledActionButtonProps = {
  label: string
  icon: LucideIcon
  onClick?: () => void
  disabled?: boolean
  variant?: 'primary' | 'neutral' | 'danger' | 'ghost'
  className?: string
  type?: 'button' | 'submit'
}

export function LabeledActionButton({
  label,
  icon: Icon,
  onClick,
  disabled = false,
  variant = 'neutral',
  className,
  type = 'button',
}: LabeledActionButtonProps) {
  const variantClass =
    variant === 'primary'
      ? 'action-btn-primary'
      : variant === 'danger'
        ? contributorDeleteClass
        : variant === 'ghost'
          ? 'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border/70 bg-white px-3 text-sm font-semibold text-navy transition-colors hover:border-primary/30 hover:bg-white disabled:opacity-50'
          : 'action-btn-neutral'

  return (
    <button
      type={type}
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={[variantClass, className, 'gap-2'].filter(Boolean).join(' ')}
    >
      <Icon className={ICON_ACTION} aria-hidden />
      <span>{label}</span>
    </button>
  )
}

type IconLabelProps = {
  icon: LucideIcon
  children: ReactNode
  className?: string
  iconClassName?: string
}

export function IconLabel({
  icon: Icon,
  children,
  className = '',
  iconClassName = ICON_ACTION,
}: IconLabelProps) {
  return (
    <span className={['inline-flex items-center gap-2', className].join(' ')}>
      <Icon className={iconClassName} aria-hidden />
      <span>{children}</span>
    </span>
  )
}

type IconFileLabelProps = ComponentPropsWithoutRef<'label'> & {
  icon: LucideIcon
  label: string
  disabled?: boolean
}

export function IconFileLabel({
  icon: Icon,
  label,
  disabled = false,
  className = '',
  children,
  ...props
}: IconFileLabelProps) {
  return (
    <label
      {...props}
      title={label}
      aria-label={label}
      className={[
        'inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-border/70 bg-white px-3 text-sm font-semibold text-navy transition-colors',
        disabled ? 'pointer-events-none opacity-50' : 'hover:border-primary/30 hover:bg-white',
        className,
      ].join(' ')}
    >
      {children}
      <Icon className={ICON_ACTION} aria-hidden />
      <span>{label}</span>
    </label>
  )
}
