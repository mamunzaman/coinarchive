import {
  AlertCircle,
  CheckCircle,
  Eye,
  ImageMinus,
  Images,
  MessageSquare,
  Pencil,
  PlusCircle,
  RefreshCw,
  Save,
  Send,
  ImageUp,
  type LucideIcon,
} from 'lucide-react'
import type { SubmissionActivityLog } from './api'
import { formatSubmittedDate } from './format'

const EVENT_ICONS: Record<string, LucideIcon> = {
  created: PlusCircle,
  submitted: Send,
  updated: Pencil,
  saved_draft: Save,
  image_replaced: ImageUp,
  gallery_image_added: Images,
  gallery_image_removed: ImageMinus,
  gallery_updated: Images,
  status_changed: RefreshCw,
  reviewed: Eye,
  published: CheckCircle,
  unpublished: RefreshCw,
  featured: CheckCircle,
  unfeatured: RefreshCw,
  app_enabled: CheckCircle,
  app_disabled: RefreshCw,
  rejected: AlertCircle,
  admin_note_added: MessageSquare,
}

export function getActivityEventIcon(eventType: string): LucideIcon {
  return EVENT_ICONS[eventType] ?? Pencil
}

export function formatActivityDate(createdAt: string): string {
  return formatSubmittedDate(createdAt)
}

export function getActivityActor(log: SubmissionActivityLog): string | null {
  const data = log.event_data

  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>
    const candidates = [
      record.display_name,
      record.user_display_name,
      record.actor_name,
      record.contributor_name,
    ]

    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim()) {
        return candidate.trim()
      }
    }
  }

  if (log.user_id > 0) {
    return `User #${log.user_id}`
  }

  return null
}
