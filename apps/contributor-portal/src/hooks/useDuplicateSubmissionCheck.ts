import { useEffect, useMemo, useState } from 'react'
import {
  getMySubmission,
  getMySubmissions,
  type CoinSubmissionDetail,
  type MySubmissionsResponse,
} from '../lib/api'
import { resolveDuplicateCheckStatus } from '../lib/duplicateCheck'
import {
  categorizeDuplicateMatches,
  findDuplicateMatches,
  getFormMintMark,
  type CategorizedDuplicateMatches,
  type DuplicateIdentityValues,
  type DuplicateMatch,
} from '../lib/duplicateDetection'

const DEBOUNCE_MS = 1_200
const LIST_CACHE_TTL_MS = 60_000

type UseDuplicateSubmissionCheckOptions = {
  token: string | null
  values: DuplicateIdentityValues
  excludeSubmissionId?: number
  enabled?: boolean
}

const detailCache = new Map<number, CoinSubmissionDetail>()

let listCache: {
  token: string
  fetchedAt: number
  response: MySubmissionsResponse
} | null = null

let lastCompletedCheckKey: string | null = null

function isValidDuplicateCheckYear(year: string): boolean {
  const trimmed = year.trim()

  if (!/^\d+$/.test(trimmed)) {
    return false
  }

  const parsed = Number.parseInt(trimmed, 10)
  const minYear = 500
  const maxYear = new Date().getFullYear() + 1

  return parsed >= minYear && parsed <= maxYear
}

function buildDuplicateFingerprint(values: DuplicateIdentityValues): string {
  return [
    values.country.trim().toLowerCase(),
    values.year.trim(),
    values.denomination.trim().toLowerCase(),
    values.coin_type.trim().toLowerCase(),
    getFormMintMark(values),
  ].join('|')
}

function buildCheckKey(
  fingerprint: string,
  token: string,
  excludeSubmissionId?: number,
): string {
  return `${token}|${excludeSubmissionId ?? ''}|${fingerprint}`
}

async function getMySubmissionsCached(token: string): Promise<MySubmissionsResponse> {
  const now = Date.now()

  if (
    listCache &&
    listCache.token === token &&
    now - listCache.fetchedAt < LIST_CACHE_TTL_MS
  ) {
    return listCache.response
  }

  const response = await getMySubmissions(token)
  listCache = {
    token,
    fetchedAt: now,
    response,
  }

  return response
}

const EMPTY_CATEGORIZED: CategorizedDuplicateMatches = {
  warningMatches: [],
  draftMatches: [],
  referenceMatches: [],
  allMatches: [],
}

export function useDuplicateSubmissionCheck({
  token,
  values,
  excludeSubmissionId,
  enabled = true,
}: UseDuplicateSubmissionCheckOptions) {
  const [matches, setMatches] = useState<DuplicateMatch[]>([])
  const [isChecking, setIsChecking] = useState(false)
  const [hasError, setHasError] = useState(false)

  const canCheck = useMemo(
    () =>
      enabled &&
      Boolean(token) &&
      Boolean(values.country.trim()) &&
      Boolean(values.year.trim()) &&
      Boolean(values.denomination.trim()) &&
      Boolean(values.coin_type.trim()) &&
      isValidDuplicateCheckYear(values.year),
    [
      enabled,
      token,
      values.country,
      values.year,
      values.denomination,
      values.coin_type,
    ],
  )

  useEffect(() => {
    if (!canCheck || !token) {
      setMatches([])
      setIsChecking(false)
      setHasError(false)
      return
    }

    let cancelled = false
    setIsChecking(true)
    setHasError(false)

    const timer = window.setTimeout(() => {
      void (async () => {
        const fingerprint = buildDuplicateFingerprint(values)
        const checkKey = buildCheckKey(fingerprint, token, excludeSubmissionId)

        if (checkKey === lastCompletedCheckKey) {
          if (!cancelled) {
            setIsChecking(false)
          }
          return
        }

        try {
          const listResponse = await getMySubmissionsCached(token)

          if (cancelled) {
            return
          }

          const ids = listResponse.submissions
            .map((submission) => submission.id)
            .filter((id) => id !== excludeSubmissionId)

          const details = await Promise.all(
            ids.map(async (id) => {
              if (detailCache.has(id)) {
                return detailCache.get(id) as CoinSubmissionDetail
              }

              const response = await getMySubmission(id, token)
              detailCache.set(id, response.submission)
              return response.submission
            }),
          )

          if (cancelled) {
            return
          }

          const nextMatches = findDuplicateMatches(values, details, excludeSubmissionId)
          setMatches(nextMatches)
          setHasError(false)
          lastCompletedCheckKey = checkKey
        } catch {
          if (!cancelled) {
            setMatches([])
            setHasError(true)
          }
        } finally {
          if (!cancelled) {
            setIsChecking(false)
          }
        }
      })()
    }, DEBOUNCE_MS)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [
    canCheck,
    excludeSubmissionId,
    token,
    values.country,
    values.year,
    values.denomination,
    values.coin_type,
    values.singleMintMark,
    values.hasMintVariants,
  ])

  const categorized = useMemo(
    () => (matches.length > 0 ? categorizeDuplicateMatches(matches) : EMPTY_CATEGORIZED),
    [matches],
  )

  const status = resolveDuplicateCheckStatus(canCheck, isChecking, hasError, matches)

  return {
    status,
    matches,
    ...categorized,
    isChecking,
    hasError,
  }
}
