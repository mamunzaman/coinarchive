/**
 * CoinArchive REST API base URL.
 *
 * Prefer VITE_API_BASE_URL (full path, e.g. https://site/wp-json/coinarchive/v1).
 * If only VITE_WP_API_BASE_URL is set (site root), append /wp-json/coinarchive/v1.
 */
export function resolveCoinArchiveApiBaseUrl(): string | null {
  const directBase = import.meta.env.VITE_API_BASE_URL?.trim()
  if (directBase) {
    return directBase.replace(/\/$/, '')
  }

  const wpBase = import.meta.env.VITE_WP_API_BASE_URL?.trim()
  if (wpBase) {
    return `${wpBase.replace(/\/$/, '')}/wp-json/coinarchive/v1`
  }

  return null
}

export function getCoinArchiveApiBaseUrl(): string {
  return resolveCoinArchiveApiBaseUrl() ?? ''
}
