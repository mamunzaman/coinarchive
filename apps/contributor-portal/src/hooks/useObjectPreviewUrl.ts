import { useEffect, useState } from 'react'

export function useObjectPreviewUrl(file: File | null, fallbackUrl?: string | null): string | null {
  const [objectUrl, setObjectUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!file) {
      setObjectUrl(null)
      return
    }

    const url = URL.createObjectURL(file)
    setObjectUrl(url)

    return () => {
      URL.revokeObjectURL(url)
    }
  }, [file])

  if (file && objectUrl) {
    return objectUrl
  }

  return fallbackUrl ?? null
}
