import { useEffect, useState } from 'react'

export type ImageLoadStatus = 'idle' | 'loading' | 'loaded' | 'error'

export function useImageLoadState(url: string | null | undefined): ImageLoadStatus {
  const [status, setStatus] = useState<ImageLoadStatus>('idle')

  useEffect(() => {
    if (!url) {
      setStatus('idle')
      return
    }

    setStatus('loading')

    const img = new Image()
    img.onload = () => setStatus('loaded')
    img.onerror = () => setStatus('error')
    img.src = url

    return () => {
      img.onload = null
      img.onerror = null
    }
  }, [url])

  return status
}
