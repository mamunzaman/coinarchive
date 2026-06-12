import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AdminRejectDialog } from '../../components/admin/AdminRejectDialog'
import {
  AdminReviewChecklist,
  getAdminReviewReadiness,
} from '../../components/admin/AdminReviewChecklist'
import { AdminReviewPanel } from '../../components/coin/AdminReviewPanel'
import { SubmissionDetailHeader } from '../../components/coin/SubmissionDetailHeader'
import { SubmissionDetailLayout } from '../../components/coin/SubmissionDetailLayout'
import { SubmissionRevisionNotes } from '../../components/coin/SubmissionRevisionNotes'
import { SubmissionRevisionComparison } from '../../components/coin/SubmissionRevisionComparison'
import { Button } from '../../components/ui/Button'
import { useSubmissionImageAutosave } from '../../hooks/useSubmissionImageAutosave'
import {
  approveAdminSubmission,
  getAdminSubmission,
  rejectAdminSubmission,
  requestAdminSubmissionRevision,
} from '../../lib/adminApi'
import { getAdminContentLanguageMeta } from '../../lib/adminQueueFilters'
import {
  ApiError,
  type CoinSubmissionDetail,
  type SubmissionActivityLogsPayload,
} from '../../lib/api'
import { useAuth } from '../../hooks/useAuth'
import { getDraftStorageKey, loadFormDraft } from '../../lib/formDraftStorage'
import { hasGalleryImageChanges, hasSubmissionGalleryDrift } from '../../lib/revisionComparison'
import { getSubmissionRevisionInfo } from '../../lib/submissionRevisionNotes'
import { buildSubmissionTimeline } from '../../lib/submissionTimeline'
import { coinFormValuesFromSubmission } from '../../types/coinForm'

function AdminContentLanguageCard({ submission }: { submission: CoinSubmissionDetail }) {
  const languageMeta = getAdminContentLanguageMeta(submission)

  return (
    <div className="rounded-xl border border-sky-200 bg-sky-50/70 px-4 py-4 text-sm text-sky-950">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
        Content language
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-700/80">
            Content language
          </p>
          <p className="mt-1 font-semibold text-navy">
            <span className="mr-2 rounded-full bg-white px-2 py-0.5 text-xs font-bold text-sky-700 ring-1 ring-sky-200">
              {languageMeta.badge}
            </span>
            {languageMeta.label}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-700/80">
            Translation
          </p>
          <p className="mt-1 font-semibold text-navy">
            {languageMeta.translationStatusLabel || 'Translation status unavailable'}
          </p>
        </div>
      </div>
    </div>
  )
}

export function AdminSubmissionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { token } = useAuth()
  const submissionId = Number.parseInt(id ?? '', 10)

  const [submission, setSubmission] = useState<CoinSubmissionDetail | null>(null)
  const [activityLogs, setActivityLogs] = useState<SubmissionActivityLogsPayload | undefined>(undefined)
  const [hasActivityLogsField, setHasActivityLogsField] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [isDeciding, setIsDeciding] = useState(false)
  const [decisionError, setDecisionError] = useState<string | null>(null)
  const [decisionMessage, setDecisionMessage] = useState<string | null>(null)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectError, setRejectError] = useState<string | null>(null)
  const initialGalleryIdsRef = useRef<number[]>([])

  const handleSubmissionUpdated = useCallback((updated: CoinSubmissionDetail) => {
    setSubmission(updated)
  }, [])

  const {
    editState,
    footerStatus,
    startEdit,
    finishEdit,
    resetEditState,
    handleObverseChange,
    handleReverseChange,
    handleGalleryAdd,
    scheduleGalleryRemove,
    undoGalleryRemove,
    retryObverse,
    retryReverse,
    revertObverse,
    revertReverse,
    retryGalleryUpload,
    dismissFailedGalleryUpload,
    handleGalleryReplace,
    cancelGalleryReplace,
    retryGalleryReplace,
    handleGalleryPermanentDelete,
  } = useSubmissionImageAutosave({
    submissionId,
    submission,
    onSubmissionUpdated: handleSubmissionUpdated,
  })

  async function loadSubmission() {
    initialGalleryIdsRef.current = []
    setIsLoading(true)
    setError(null)
    setNotFound(false)
    setSubmission(null)
    setActivityLogs(undefined)
    setHasActivityLogsField(false)
    setDecisionError(null)
    setDecisionMessage(null)
    resetEditState()

    if (!id || Number.isNaN(submissionId) || submissionId < 1) {
      setNotFound(true)
      setIsLoading(false)
      return
    }

    if (!token) {
      setError('Your session has expired. Please sign in again.')
      setIsLoading(false)
      return
    }

    try {
      const response = await getAdminSubmission(submissionId, token)
      setSubmission(response.submission)
      setActivityLogs(response.activity_logs)
      setHasActivityLogsField(response.activity_logs !== undefined)
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setNotFound(true)
      } else if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Unable to reach the server. Check your connection and try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { void loadSubmission() }, [id, token])

  useEffect(() => { initialGalleryIdsRef.current = [] }, [submissionId])

  useEffect(() => {
    if (!submission || submission.id !== submissionId) return
    if (initialGalleryIdsRef.current.length === 0) {
      initialGalleryIdsRef.current = (submission.images.gallery ?? []).map((img) => img.id)
    }
  }, [submission, submissionId])

  const editDraft = useMemo(
    () => (submission ? loadFormDraft(getDraftStorageKey('edit', submission.id)) : null),
    [submission],
  )
  const revisionInfo = submission ? getSubmissionRevisionInfo(submission) : null
  const timelineEvents = submission ? buildSubmissionTimeline(submission) : []
  const baselineValues = submission ? coinFormValuesFromSubmission(submission) : null
  const reviewReadiness = submission ? getAdminReviewReadiness(submission) : null

  const galleryChanged = useMemo(() => {
    if (!submission) return false
    const draftGalleryChanged = editDraft
      ? hasGalleryImageChanges({
          pendingAddCount: editDraft.galleryFiles.length,
          removedImageIds: editDraft.removedGalleryImageIds,
        })
      : false
    const liveGalleryChanged = hasGalleryImageChanges({
      pendingAddCount: editState.pendingGalleryUploads.length,
      removedImageIds: editState.hiddenGalleryIds,
      replacementCount: Object.keys(editState.galleryReplaceStates).length,
    })
    const savedGalleryDrift = hasSubmissionGalleryDrift(
      (submission.images.gallery ?? []).map((img) => img.id),
      initialGalleryIdsRef.current,
    )
    return draftGalleryChanged || liveGalleryChanged || savedGalleryDrift
  }, [editDraft, editState, submission])

  async function runDecision(action: () => Promise<void>) {
    setIsDeciding(true)
    setDecisionError(null)
    setDecisionMessage(null)
    try {
      await action()
    } catch (err) {
      if (err instanceof ApiError) {
        let message = err.message

        if (err.duplicate?.postId) {
          const parts = [`Existing coin #${err.duplicate.postId}`]

          if (err.duplicate.title.trim()) {
            parts.push(err.duplicate.title.trim())
          }

          if (err.duplicate.reason.trim()) {
            parts.push(`reason: ${err.duplicate.reason.replace(/_/g, ' ')}`)
          }

          message = `${message} ${parts.join(' · ')}`
        }

        setDecisionError(message)
      } else {
        setDecisionError('Unable to complete review action. Check your connection and try again.')
      }
    } finally {
      setIsDeciding(false)
    }
  }

  async function handleApprove() {
    if (!token || !submission) return
    await runDecision(async () => {
      const res = await approveAdminSubmission(submission.id, token)
      if (res.submission) setSubmission(res.submission)
      else await loadSubmission()
      setDecisionMessage(res.message ?? 'Submission approved.')
    })
  }

  function openRejectDialog() {
    setRejectReason('')
    setRejectError(null)
    setShowRejectDialog(true)
  }

  function closeRejectDialog() {
    if (isDeciding) return
    setShowRejectDialog(false)
    setRejectError(null)
  }

  async function handleRejectConfirm() {
    if (!token || !submission || !rejectReason.trim()) return
    setIsDeciding(true)
    setRejectError(null)
    try {
      const res = await rejectAdminSubmission(submission.id, rejectReason.trim(), token)
      if (res.submission) setSubmission(res.submission)
      else await loadSubmission()
      setDecisionMessage(res.message ?? 'Submission rejected.')
      setShowRejectDialog(false)
    } catch (err) {
      setRejectError(
        err instanceof ApiError
          ? err.message
          : 'Unable to reject submission. Check your connection and try again.',
      )
    } finally {
      setIsDeciding(false)
    }
  }

  async function handleRequestRevision() {
    if (!token || !submission) return
    const notes = window.prompt('Revision notes for the contributor:')
    if (!notes?.trim()) return
    await runDecision(async () => {
      const res = await requestAdminSubmissionRevision(submission.id, notes.trim(), token)
      if (res.submission) setSubmission(res.submission)
      else await loadSubmission()
      setDecisionMessage(res.message ?? 'Revision requested.')
    })
  }

  const imageEditHandlers = {
    canEdit: submission?.status === 'pending',
    editState,
    footerStatus,
    onStartEdit: startEdit,
    onFinishEdit: finishEdit,
    onObverseChange: handleObverseChange,
    onReverseChange: handleReverseChange,
    onGalleryAdd: handleGalleryAdd,
    onGalleryRemove: scheduleGalleryRemove,
    onUndoGalleryRemove: undoGalleryRemove,
    onRetryObverse: retryObverse,
    onRetryReverse: retryReverse,
    onRevertObverse: revertObverse,
    onRevertReverse: revertReverse,
    onRetryGalleryUpload: retryGalleryUpload,
    onDismissFailedGalleryUpload: dismissFailedGalleryUpload,
    onGalleryReplace: handleGalleryReplace,
    onCancelGalleryReplace: cancelGalleryReplace,
    onRetryGalleryReplace: retryGalleryReplace,
    onGalleryPermanentDelete: handleGalleryPermanentDelete,
    allowGalleryPermanentDelete: true,
  }

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-[82rem] px-4 sm:px-6">
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          <p className="text-sm text-navy-muted">Loading submission for review…</p>
        </div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="mx-auto w-full max-w-[82rem] px-4 sm:px-6">
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <p className="section-label">404</p>
          <h1 className="font-serif text-2xl font-semibold text-navy">Submission not found</h1>
          <p className="max-w-sm text-sm text-navy-muted">
            This submission does not exist or is no longer available for review.
          </p>
          <Link
            to="/admin/submissions"
            className="inline-flex min-h-11 items-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            Back to queue
          </Link>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto w-full max-w-[82rem] px-4 sm:px-6">
        <div className="flex flex-col items-center gap-4 py-12 text-center">
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
          <Button type="button" variant="secondary" onClick={() => void loadSubmission()}>
            Try again
          </Button>
        </div>
      </div>
    )
  }

  if (!submission) return null

  const beforeMain = (
    <div className="space-y-4">
      <AdminContentLanguageCard submission={submission} />
      <AdminReviewChecklist submission={submission} />
      <SubmissionRevisionNotes submission={submission} />
      {revisionInfo?.needsRevision && baselineValues ? (
        <div>
          <SubmissionRevisionComparison
            previousValues={baselineValues}
            currentValues={editDraft?.values ?? baselineValues}
            imageChanges={{
              obverseChanged: Boolean(editDraft?.obverseFile),
              reverseChanged: Boolean(editDraft?.reverseFile),
              galleryChanged,
            }}
          />
        </div>
      ) : null}
    </div>
  )

  return (
    <div className="mx-auto w-full max-w-[82rem] px-4 sm:px-6">
      <SubmissionDetailLayout
        submission={submission}
        imageEdit={imageEditHandlers}
        hasActivityLogsField={hasActivityLogsField}
        activityLogs={activityLogs}
        timelineEvents={timelineEvents}
        showAdminInfo
        layoutVariant="admin"
        header={
          <SubmissionDetailHeader
            submission={submission}
            backTo="/admin/submissions"
            backLabel="Back to queue"
            showContributorActions={false}
          />
        }
        beforeMain={beforeMain}
        sidebar={
          <>
            <AdminReviewPanel
              submission={submission}
              hasRevisionNotes={Boolean(revisionInfo?.needsRevision)}
              hasActivityLogs={Boolean(hasActivityLogsField && activityLogs)}
              onApprove={() => void handleApprove()}
              onReject={openRejectDialog}
              onRequestRevision={() => void handleRequestRevision()}
              isDeciding={isDeciding}
              decisionError={decisionError}
              decisionMessage={decisionMessage}
              reviewGuidance={reviewReadiness?.guidance}
              onReload={() => void loadSubmission()}
            />
          </>
        }
      />

      <AdminRejectDialog
        open={showRejectDialog}
        reason={rejectReason}
        isSubmitting={isDeciding}
        error={rejectError}
        onReasonChange={setRejectReason}
        onCancel={closeRejectDialog}
        onConfirm={() => void handleRejectConfirm()}
      />
    </div>
  )
}
