import type { CoinAcfDetail, ContentLanguage } from '../types/coinForm'
export type { CoinAcfDetail } from '../types/coinForm'
import { mergeSubmissionWithAcf } from '../types/coinForm'
import type { DefaultImages, FormOptions } from '../types/formOptions'
import { EMPTY_FORM_OPTIONS, resolveFormOptions } from '../types/formOptions'
import { resolveCoinArchiveApiBaseUrl } from './apiBaseUrl'

export type RegisterContributorPayload = {
  email: string
  password: string
  display_name: string
}

export type RegisterContributorResponse = {
  message?: string
  dev_verification_token?: string
}

export type LoginContributorPayload = {
  email: string
  password: string
}

export type ContributorRole = 'admin' | 'contributor'

export type Contributor = {
  id: number
  email: string
  display_name: string
  status: string
  role?: ContributorRole
}

export type LoginContributorResponse = {
  success: boolean
  message?: string
  token: string
  expires_at?: string
  contributor: Contributor
}

export type ApiDuplicateBlockInfo = {
  postId: number
  title: string
  reason: string
}

export class ApiError extends Error {
  status: number
  code?: string
  duplicate?: ApiDuplicateBlockInfo

  constructor(
    message: string,
    status: number,
    code?: string,
    duplicate?: ApiDuplicateBlockInfo,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.duplicate = duplicate
  }
}

function getAdminApiKey(): string {
  const apiKey = import.meta.env.VITE_ADMIN_API_KEY
  if (!apiKey) {
    throw new ApiError('Admin API key is not configured.', 0)
  }
  return apiKey
}

function getApiBaseUrl(): string {
  const baseUrl = resolveCoinArchiveApiBaseUrl()
  if (!baseUrl) {
    throw new ApiError('API base URL is not configured.', 0)
  }
  return baseUrl
}

function readApiDuplicateBlockInfo(data: unknown): ApiDuplicateBlockInfo | undefined {
  if (typeof data !== 'object' || data === null) {
    return undefined
  }

  const record = data as Record<string, unknown>
  const nested =
    typeof record.data === 'object' && record.data !== null
      ? (record.data as Record<string, unknown>)
      : record
  const postId = nested.duplicate_post_id

  if (typeof postId !== 'number' || postId <= 0) {
    return undefined
  }

  return {
    postId,
    title: typeof nested.duplicate_title === 'string' ? nested.duplicate_title : '',
    reason: typeof nested.duplicate_reason === 'string' ? nested.duplicate_reason : '',
  }
}

function parseApiError(
  data: unknown,
  fallback: string,
): { message: string; code?: string; duplicate?: ApiDuplicateBlockInfo } {
  if (typeof data !== 'object' || data === null) {
    return { message: fallback }
  }

  const record = data as Record<string, unknown>
  const code = typeof record.code === 'string' ? record.code : undefined
  const duplicate = readApiDuplicateBlockInfo(record)

  if (typeof record.message === 'string' && record.message.trim()) {
    return {
      message: record.message.replace(/<[^>]*>/g, '').trim(),
      code,
      duplicate,
    }
  }

  if (typeof record.error === 'string' && record.error.trim()) {
    return { message: record.error.trim(), code, duplicate }
  }

  return { message: fallback, code, duplicate }
}

export async function registerContributor(
  payload: RegisterContributorPayload,
): Promise<RegisterContributorResponse> {
  const response = await fetch(`${getApiBaseUrl()}/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  })

  let data: unknown = null
  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (!response.ok) {
    const { message, code } = parseApiError(data, 'Registration failed. Please try again.')
    throw new ApiError(message, response.status, code)
  }

  return (data ?? {}) as RegisterContributorResponse
}

export async function loginContributor(
  payload: LoginContributorPayload,
): Promise<LoginContributorResponse> {
  const response = await fetch(`${getApiBaseUrl()}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  })

  let data: unknown = null
  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (!response.ok) {
    const { message, code } = parseApiError(data, 'Login failed. Please try again.')
    throw new ApiError(getLoginErrorMessage(code, message), response.status, code)
  }

  return data as LoginContributorResponse
}

const LOGIN_ERROR_MESSAGES: Record<string, string> = {
  rest_invalid_credentials: 'Invalid email or password.',
  rest_email_not_verified: 'Email address is not verified. Please check your inbox.',
  rest_contributor_not_approved: 'Your account is not approved yet. Please wait for admin approval.',
}

export type ApproveContributorResponse = {
  success: boolean
  message?: string
  contributor?: {
    id: number
    status: string
    email_verified?: boolean
    approved_by?: number
    approved_at?: string
  }
}

export async function approveContributor(
  contributorId: number,
): Promise<ApproveContributorResponse> {
  const response = await fetch(`${getApiBaseUrl()}/admin/approve-contributor`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-CoinArchive-Key': getAdminApiKey(),
    },
    body: JSON.stringify({ contributor_id: Number(contributorId) }),
  })

  let data: unknown = null
  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (!response.ok) {
    const { message, code } = parseApiError(data, 'Approval failed. Please try again.')
    throw new ApiError(getApproveErrorMessage(code, message), response.status, code)
  }

  return data as ApproveContributorResponse
}

export type SetContributorRoleResponse = {
  success: boolean
  message?: string
  contributor?: {
    id: number
    status: string
    role?: ContributorRole
    email?: string
    display_name?: string
  }
}

export async function setContributorRole(
  contributorId: number,
  role: ContributorRole,
): Promise<SetContributorRoleResponse> {
  const response = await fetch(`${getApiBaseUrl()}/admin/set-contributor-role`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-CoinArchive-Key': getAdminApiKey(),
    },
    body: JSON.stringify({ contributor_id: Number(contributorId), role }),
  })

  let data: unknown = null
  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (!response.ok) {
    const { message, code } = parseApiError(data, 'Unable to update contributor role.')
    throw new ApiError(getApproveErrorMessage(code, message), response.status, code)
  }

  return data as SetContributorRoleResponse
}

const APPROVE_ERROR_MESSAGES: Record<string, string> = {
  rest_contributor_not_found: 'Contributor not found. Check the ID and try again.',
  rest_contributor_already_approved: 'This contributor is already approved.',
  rest_contributor_not_ready: 'Contributor is not ready for approval. Verify their email first.',
  rest_missing_contributor_id: 'Contributor ID is required.',
}

function getApproveErrorMessage(code: string | undefined, fallback: string): string {
  if (code && APPROVE_ERROR_MESSAGES[code]) {
    return APPROVE_ERROR_MESSAGES[code]
  }
  return fallback
}

function getLoginErrorMessage(code: string | undefined, fallback: string): string {
  if (code && LOGIN_ERROR_MESSAGES[code]) {
    return LOGIN_ERROR_MESSAGES[code]
  }
  return fallback
}

/** Optional fields appended to submit/update FormData; backend may ignore unsupported keys. */
export type SubmitCoinFormFields = {
  content_language?: 'de' | 'en'
}

export type SubmitCoinResponse = {
  success: boolean
  message?: string
  post_id: number
  status: string
  submitted_by?: {
    auth_type: string
    contributor_id?: number | null
    email?: string | null
  }
}

export type DuplicateCheckPayload = {
  title?: string
  post_title?: string
  unique_code?: string
  coin_code?: string
  country: string
  year: string
  denomination: string
  coin_type: string
  commemorative_subject?: string
  coin_theme?: string
  coin_name?: string
  series?: string
  exclude_submission_id?: number
}

export type DuplicateCheckApiMatch = {
  id: number
  title: string
  coin_code?: string
  unique_code?: string
  status?: string
  country?: string
  year?: number | string
  view_url?: string
  edit_link?: string
  match_type?: 'exact_unique_code' | 'exact_coin_code' | 'exact_title' | 'similar'
}

export type DuplicateCheckResponse = {
  hasDuplicates: boolean
  exactUniqueCode?: boolean
  exactCoinCode?: boolean
  exactTitle?: boolean
  exactDuplicate?: boolean
  exact_unique_code?: boolean
  exact_coin_code?: boolean
  exact_title?: boolean
  exact_duplicate?: boolean
  similarMatches?: DuplicateCheckApiMatch[]
  matches: DuplicateCheckApiMatch[]
}

export type AiDescriptionField =
  | 'obverse_description'
  | 'reverse_description'
  | 'historical_background'
  | 'collector_notes'
  | 'seo_description'

export type GenerateAiDescriptionsPayload = {
  content_language?: 'de' | 'en'
  language_instruction?: string
  prompt?: string
  country: string
  year: string
  denomination: string
  coin_type: string
  theme?: string
  subject?: string
  release_date?: string
  mint_data?: string
  fields_requested: AiDescriptionField[]
}

export type GenerateAiDescriptionsResponse = {
  success: boolean
  descriptions: Partial<Record<AiDescriptionField, string>>
}

export async function checkCoinDuplicates(
  payload: DuplicateCheckPayload,
  token: string,
): Promise<DuplicateCheckResponse> {
  const response = await fetch(`${getApiBaseUrl()}/duplicates/check`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  let data: unknown = null
  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (!response.ok) {
    const { message, code } = parseApiError(data, 'Unable to verify duplicates right now.')
    throw new ApiError(message, response.status, code)
  }

  return data as DuplicateCheckResponse
}

function getAiDescriptionErrorMessage(status: number, fallback: string): string {
  switch (status) {
    case 401:
      return 'AI generation requires an authenticated session.'
    case 400:
      return 'Required coin fields are missing.'
    case 429:
      return 'AI generation limit reached. Try again later.'
    case 501:
      return 'AI provider is not configured yet.'
    case 502:
      return 'AI provider returned an invalid response.'
    default:
      return fallback
  }
}

export async function generateAiDescriptions(
  payload: GenerateAiDescriptionsPayload,
  token: string,
): Promise<GenerateAiDescriptionsResponse> {
  if (!token) {
    throw new ApiError(getAiDescriptionErrorMessage(401, ''), 401)
  }

  const response = await fetch(`${getApiBaseUrl()}/ai/descriptions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  let data: unknown = null
  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (!response.ok) {
    const { message, code } = parseApiError(data, 'Could not generate descriptions.')
    throw new ApiError(getAiDescriptionErrorMessage(response.status, message), response.status, code)
  }

  return data as GenerateAiDescriptionsResponse
}

export async function submitCoin(
  formData: FormData,
  token: string,
): Promise<SubmitCoinResponse> {
  const response = await fetch(`${getApiBaseUrl()}/submit-coin`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    body: formData,
  })

  let data: unknown = null
  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (!response.ok) {
    const { message, code } = parseApiError(data, 'Coin submission failed. Please try again.')
    throw new ApiError(message, response.status, code)
  }

  return data as SubmitCoinResponse
}

export type SubmissionImageRef = {
  id: number
  url: string
}

export type CoinSubmission = {
  id: number
  title: string
  status: string
  content_language?: 'de' | 'en'
  content_language_label?: string
  content_language_badge?: string
  content_language_notice?: string
  missing_translation_language?: string
  missing_translation_language_label?: string
  translation_status?: string
  translation_status_label?: string
  translation_post_id?: number | string | null
  date: string
  modified_date?: string
  edit_link?: string
  preview_image?: SubmissionImageRef | null
  images?: {
    obverse?: SubmissionImageRef | null
    reverse?: SubmissionImageRef | null
    gallery?: SubmissionImageRef[]
  }
  admin_notes?: string | string[]
  revision_notes?: string | string[]
  review_notes?: string | string[]
  admin_feedback?: string | string[]
}

export type MySubmissionsResponse = {
  success: boolean
  submissions: CoinSubmission[]
}

export async function getMySubmissions(token: string): Promise<MySubmissionsResponse> {
  const response = await fetch(`${getApiBaseUrl()}/my-submissions`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  })

  let data: unknown = null
  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (!response.ok) {
    const { message, code } = parseApiError(data, 'Unable to load submissions. Please try again.')
    throw new ApiError(message, response.status, code)
  }

  return data as MySubmissionsResponse
}

export type {
  DefaultImageRef,
  DefaultImages,
  FormOptions,
  TaxonomyOption,
} from '../types/formOptions'

export type FormOptionsResponse = {
  success: boolean
  options: FormOptions
  default_images?: DefaultImages
}

export async function getFormOptions(
  token: string,
  contentLanguage: ContentLanguage = 'de',
): Promise<FormOptionsResponse> {
  const params = new URLSearchParams({ content_language: contentLanguage || 'de' })
  const response = await fetch(`${getApiBaseUrl()}/form-options?${params.toString()}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  })

  let data: unknown = null
  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (!response.ok) {
    const { message, code } = parseApiError(data, 'Unable to load form options. Please try again.')
    throw new ApiError(message, response.status, code)
  }

  const responseData = data as FormOptionsResponse
  const rawOptions = responseData.options ?? EMPTY_FORM_OPTIONS
  const normalizedOptions: FormOptions = {
    countries: rawOptions.countries ?? [],
    values: rawOptions.values ?? [],
    types: rawOptions.types ?? [],
    series: rawOptions.series ?? [],
  }

  return {
    ...responseData,
    options: resolveFormOptions(normalizedOptions, contentLanguage),
  }
}

export type SubmissionImage = {
  id: number
  url: string
}

export type SubmissionActivityLog = {
  id: number
  post_id: number
  user_id: number
  event_type: string
  event_label: string
  event_message: string
  event_data?: Record<string, unknown>
  created_at: string
}

export type SubmissionActivityLogsPayload = {
  recent: SubmissionActivityLog[]
  total: number
}

export type CoinSubmissionDetail = {
  id: number
  title: string
  status: string
  content_language?: 'de' | 'en'
  content_language_label?: string
  content_language_badge?: string
  content_language_notice?: string
  missing_translation_language?: string
  missing_translation_language_label?: string
  translation_status?: string
  translation_status_label?: string
  translation_post_id?: number | string | null
  date: string
  modified_date?: string
  thumbnail_url?: string | null
  obverse_url?: string | null
  reverse_url?: string | null
  image_url?: string | null
  default_image_url?: string | null
  default_obverse_url?: string | null
  default_reverse_url?: string | null
  country: string
  denomination: string
  coin_type: string
  coin_series?: string
  year: number
  short_description: string
  acf?: CoinAcfDetail
  images: {
    obverse: SubmissionImage | null
    reverse: SubmissionImage | null
    gallery?: SubmissionImage[]
  }
  admin_notes?: string | string[]
  revision_notes?: string | string[]
  review_notes?: string | string[]
  admin_feedback?: string | string[]
  submitted_by?: {
    auth_type?: string
    contributor_id?: number | null
    email?: string | null
  }
}

export type MySubmissionDetailResponse = {
  success: boolean
  submission: CoinSubmissionDetail
  acf?: CoinAcfDetail
  activity_logs?: SubmissionActivityLogsPayload
}

export type MySubmissionActivityResponse = {
  success: boolean
  post_id: number
  total: number
  activity_logs: SubmissionActivityLog[]
}

function normalizeActivityLog(raw: unknown): SubmissionActivityLog | null {
  if (typeof raw !== 'object' || raw === null) {
    return null
  }

  const record = raw as Record<string, unknown>

  if (typeof record.id !== 'number' || typeof record.event_type !== 'string') {
    return null
  }

  return {
    id: record.id,
    post_id: typeof record.post_id === 'number' ? record.post_id : 0,
    user_id: typeof record.user_id === 'number' ? record.user_id : 0,
    event_type: record.event_type,
    event_label: typeof record.event_label === 'string' ? record.event_label : record.event_type,
    event_message: typeof record.event_message === 'string' ? record.event_message : '',
    event_data:
      typeof record.event_data === 'object' && record.event_data !== null
        ? (record.event_data as Record<string, unknown>)
        : undefined,
    created_at: typeof record.created_at === 'string' ? record.created_at : '',
  }
}

function normalizeActivityLogsPayload(raw: unknown): SubmissionActivityLogsPayload | undefined {
  if (typeof raw !== 'object' || raw === null) {
    return undefined
  }

  const record = raw as Record<string, unknown>
  const recentRaw = Array.isArray(record.recent) ? record.recent : []
  const recent = recentRaw
    .map(normalizeActivityLog)
    .filter((log): log is SubmissionActivityLog => log !== null)

  return {
    recent,
    total: typeof record.total === 'number' ? record.total : recent.length,
  }
}

function normalizeActivityLogList(raw: unknown): SubmissionActivityLog[] {
  if (!Array.isArray(raw)) {
    return []
  }

  return raw.map(normalizeActivityLog).filter((log): log is SubmissionActivityLog => log !== null)
}

function normalizeSubmissionImages(submission: CoinSubmissionDetail): CoinSubmissionDetail {
  return {
    ...submission,
    images: {
      obverse: submission.images?.obverse ?? null,
      reverse: submission.images?.reverse ?? null,
      gallery: Array.isArray(submission.images?.gallery) ? submission.images.gallery : [],
    },
  }
}

function normalizeSubmissionDetail(data: unknown): CoinSubmissionDetail {
  if (typeof data !== 'object' || data === null) {
    throw new ApiError('Invalid submission response.', 0)
  }

  const record = data as Record<string, unknown>
  const submission = record.submission as CoinSubmissionDetail
  const acf = record.acf as CoinAcfDetail | undefined

  return normalizeSubmissionImages(mergeSubmissionWithAcf(submission, acf))
}

export async function getMySubmission(
  id: number,
  token: string,
): Promise<MySubmissionDetailResponse> {
  const response = await fetch(`${getApiBaseUrl()}/my-submissions/${id}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  })

  let data: unknown = null
  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (!response.ok) {
    const { message, code } = parseApiError(data, 'Unable to load submission. Please try again.')
    throw new ApiError(message, response.status, code)
  }

  const submission = normalizeSubmissionDetail(data)
  const record = typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : {}
  const activity_logs = normalizeActivityLogsPayload(record.activity_logs)

  return {
    success: true,
    submission,
    acf: submission.acf,
    activity_logs,
  }
}

export async function getMySubmissionActivity(
  id: number,
  token: string,
): Promise<MySubmissionActivityResponse> {
  const response = await fetch(`${getApiBaseUrl()}/my-submissions/${id}/activity`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  })

  let data: unknown = null
  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (!response.ok) {
    const { message, code } = parseApiError(data, 'Unable to load activity. Please try again.')
    throw new ApiError(message, response.status, code)
  }

  if (typeof data !== 'object' || data === null) {
    throw new ApiError('Invalid activity response.', 0)
  }

  const record = data as Record<string, unknown>
  const activity_logs = normalizeActivityLogList(record.activity_logs)

  return {
    success: true,
    post_id: typeof record.post_id === 'number' ? record.post_id : id,
    total: typeof record.total === 'number' ? record.total : activity_logs.length,
    activity_logs,
  }
}

export type UpdateMySubmissionResponse = {
  success: boolean
  message?: string
  submission: CoinSubmissionDetail
  acf?: CoinAcfDetail
}

export async function updateMySubmission(
  id: number,
  formData: FormData,
  token: string,
): Promise<UpdateMySubmissionResponse> {
  const response = await fetch(`${getApiBaseUrl()}/my-submissions/${id}/update`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    body: formData,
  })

  let data: unknown = null
  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (!response.ok) {
    const { message, code } = parseApiError(data, 'Unable to update submission. Please try again.')
    throw new ApiError(message, response.status, code)
  }

  const record = data as Record<string, unknown>
  const submission = normalizeSubmissionDetail(data)

  return {
    success: Boolean(record.success),
    message: typeof record.message === 'string' ? record.message : undefined,
    submission,
    acf: submission.acf,
  }
}

export type DeleteMySubmissionResponse = {
  success: boolean
  deleted_attachments?: unknown[]
  skipped_attachments?: unknown[]
  message?: string
}

export async function deleteMySubmission(
  id: number | string,
  token: string,
): Promise<DeleteMySubmissionResponse> {
  const response = await fetch(`${getApiBaseUrl()}/my-submissions/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  })

  let data: unknown = null
  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (!response.ok) {
    const { message, code } = parseApiError(data, 'Unable to delete submission. Please try again.')
    throw new ApiError(message, response.status, code)
  }

  if (typeof data !== 'object' || data === null) {
    return { success: true }
  }

  const record = data as Record<string, unknown>

  return {
    success: Boolean(record.success ?? true),
    deleted_attachments: Array.isArray(record.deleted_attachments)
      ? record.deleted_attachments
      : undefined,
    skipped_attachments: Array.isArray(record.skipped_attachments)
      ? record.skipped_attachments
      : undefined,
    message: typeof record.message === 'string' ? record.message : undefined,
  }
}
