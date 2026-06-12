import type { CoinFormValues } from '../types/coinForm'
import type { CoinFormStepId } from '../types/coinFormSteps'

const DRAFT_INDEX_KEY = 'coinarchive:draft-index'
const DRAFT_PREFIX = 'coinarchive:draft:'

export type SerializedImageFile = {
  name: string
  type: string
  dataUrl: string
}

export type FormDraftPayload = {
  values: CoinFormValues
  obverseFile: SerializedImageFile | null
  reverseFile: SerializedImageFile | null
  galleryFiles: SerializedImageFile[]
  removedGalleryImageIds?: number[]
  activeStepId?: CoinFormStepId
  titleManualOverride?: boolean
  savedAt: string
}

export type DraftIndexEntry = {
  key: string
  kind: 'new' | 'edit'
  submissionId?: number
  title: string
  updatedAt: string
}

export function getDraftStorageKey(kind: 'new' | 'edit', submissionId?: number): string {
  if (kind === 'new') {
    return `${DRAFT_PREFIX}new`
  }

  return `${DRAFT_PREFIX}edit:${submissionId ?? 0}`
}

function readDraftIndex(): DraftIndexEntry[] {
  try {
    const raw = localStorage.getItem(DRAFT_INDEX_KEY)
    if (!raw) {
      return []
    }

    const parsed = JSON.parse(raw) as DraftIndexEntry[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeDraftIndex(entries: DraftIndexEntry[]) {
  localStorage.setItem(DRAFT_INDEX_KEY, JSON.stringify(entries))
}

export function listSavedDrafts(): DraftIndexEntry[] {
  return readDraftIndex().sort(
    (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  )
}

export function upsertDraftIndexEntry(entry: DraftIndexEntry) {
  const next = readDraftIndex().filter((item) => item.key !== entry.key)
  next.push(entry)
  writeDraftIndex(next)
}

export function removeDraftIndexEntry(key: string) {
  writeDraftIndex(readDraftIndex().filter((item) => item.key !== key))
}

export async function fileToSerializedImage(file: File): Promise<SerializedImageFile> {
  const dataUrl = await readFileAsDataUrl(file)
  return { name: file.name, type: file.type, dataUrl }
}

export function serializedImageToFile(serialized: SerializedImageFile): File {
  const blob = dataUrlToBlob(serialized.dataUrl)
  return new File([blob], serialized.name, { type: serialized.type || blob.type })
}

export function saveFormDraft(key: string, payload: FormDraftPayload, indexEntry: DraftIndexEntry) {
  try {
    localStorage.setItem(key, JSON.stringify(payload))
    upsertDraftIndexEntry(indexEntry)
    return true
  } catch {
    return false
  }
}

export function loadFormDraft(key: string): FormDraftPayload | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) {
      return null
    }

    return JSON.parse(raw) as FormDraftPayload
  } catch {
    return null
  }
}

export function clearFormDraft(key: string) {
  localStorage.removeItem(key)
  removeDraftIndexEntry(key)
}

export function restoreFilesFromDraft(payload: FormDraftPayload) {
  return {
    obverseFile: payload.obverseFile ? serializedImageToFile(payload.obverseFile) : null,
    reverseFile: payload.reverseFile ? serializedImageToFile(payload.reverseFile) : null,
    galleryFiles: payload.galleryFiles.map(serializedImageToFile),
    removedGalleryImageIds: payload.removedGalleryImageIds ?? [],
  }
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64 = ''] = dataUrl.split(',')
  const mime = header.match(/data:([^;]+)/)?.[1] ?? 'application/octet-stream'
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return new Blob([bytes], { type: mime })
}
