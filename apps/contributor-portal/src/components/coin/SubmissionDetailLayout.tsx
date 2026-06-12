import type { ReactNode } from 'react'
import type { CoinSubmissionDetail, SubmissionActivityLogsPayload } from '../../lib/api'
import type { TimelineEvent } from '../../lib/submissionTimeline'
import { SubmissionActivityTimeline } from './SubmissionActivityTimeline'
import { SubmissionAdminInfo } from './SubmissionAdminInfo'
import { SubmissionDetailImages } from './SubmissionDetailImages'
import { SubmissionDetailKeyFacts } from './SubmissionDetailKeyFacts'
import { SubmissionDetailsTable } from './SubmissionDetailsTable'
import { SubmissionMintInfo } from './SubmissionMintInfo'
import { SubmissionTimeline } from './SubmissionTimeline'
import type { SubmissionDetailImageEditHandlers } from './SubmissionDetailSections'

export type { SubmissionDetailImageEditHandlers }

export type SubmissionDetailLayoutVariant = 'contributor' | 'admin'

type SubmissionDetailLayoutProps = {
  submission: CoinSubmissionDetail
  imageEdit: SubmissionDetailImageEditHandlers
  hasActivityLogsField: boolean
  activityLogs?: SubmissionActivityLogsPayload
  timelineEvents: TimelineEvent[]
  showAdminInfo?: boolean
  header: ReactNode
  beforeMain?: ReactNode
  sidebar?: ReactNode
  layoutVariant?: SubmissionDetailLayoutVariant
  sectionEditBasePath?: string
}

export function SubmissionDetailLayout({
  submission,
  imageEdit,
  hasActivityLogsField,
  activityLogs,
  timelineEvents,
  showAdminInfo = false,
  header,
  beforeMain,
  sidebar,
  layoutVariant = 'contributor',
  sectionEditBasePath,
}: SubmissionDetailLayoutProps) {
  const hasSidebar = Boolean(sidebar)
  const isAdminReview = layoutVariant === 'admin' && hasSidebar

  const shellClass = isAdminReview
    ? 'submission-detail-admin-shell'
    : hasSidebar
      ? 'grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-8 xl:grid-cols-[minmax(0,1fr)_320px]'
      : ''

  const mainClass = isAdminReview
    ? 'submission-detail-admin-main flex flex-col gap-4 sm:gap-5'
    : 'flex min-w-0 flex-col gap-4 sm:gap-5'

  const sidebarClass = isAdminReview
    ? 'submission-detail-admin-sidebar order-first space-y-3 xl:order-none'
    : 'order-first min-w-0 space-y-4 lg:order-none lg:sticky lg:top-5 lg:self-start'
  const sectionEditHref = (step: string) =>
    sectionEditBasePath ? `${sectionEditBasePath}?step=${step}` : undefined

  return (
    <article className="pb-24 pt-2">
      {header}

      {beforeMain ? <div className="mt-4">{beforeMain}</div> : null}

      <div className={[beforeMain ? 'mt-4' : 'mt-4', shellClass].filter(Boolean).join(' ')}>
        <div className={mainClass}>
          <section id="review-images" className="scroll-mt-24">
            <SubmissionDetailImages
              submission={submission}
              layout="faces"
              compactHero
              editHref={sectionEditHref('images')}
              {...imageEdit}
            />
          </section>

          <section id="review-info" className="scroll-mt-24">
            <SubmissionDetailKeyFacts
              submission={submission}
              showContributor={layoutVariant === 'admin'}
            />
          </section>

          <section id="review-data" className="scroll-mt-24 grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
            <SubmissionDetailsTable
              submission={submission}
              editHrefs={{
                about: sectionEditHref('about'),
                specifications: sectionEditHref('specifications'),
                descriptions: sectionEditHref('descriptions'),
              }}
            />
          </section>

          <section id="review-mint" className="scroll-mt-24">
            <SubmissionMintInfo acf={submission.acf} editHref={sectionEditHref('mint')} />
          </section>

          {showAdminInfo ? (
            <section id="review-admin" className="scroll-mt-24">
              <SubmissionAdminInfo acf={submission.acf} />
            </section>
          ) : null}

          <section id="review-gallery" className="scroll-mt-24">
            <SubmissionDetailImages
              submission={submission}
              layout="gallery"
              editHref={sectionEditHref('gallery')}
              {...imageEdit}
            />
          </section>

          <section id="review-activity" className="scroll-mt-24">
            {hasActivityLogsField && activityLogs ? (
              <SubmissionActivityTimeline
                activityLogs={activityLogs}
                submissionId={submission.id}
                compact
              />
            ) : (
              <SubmissionTimeline events={timelineEvents} compact />
            )}
          </section>

          <SubmissionDetailImages submission={submission} layout="actions" {...imageEdit} />
        </div>

        {sidebar ? <div className={sidebarClass}>{sidebar}</div> : null}
      </div>
    </article>
  )
}
