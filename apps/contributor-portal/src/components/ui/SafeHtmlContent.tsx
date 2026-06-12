import { useMemo } from 'react'
import { containsHtmlMarkup, sanitizeHtmlForDisplay } from '../../lib/sanitizeHtml'

type SafeHtmlContentProps = {
  html: string
  className?: string
}

export function SafeHtmlContent({ html, className = '' }: SafeHtmlContentProps) {
  const trimmed = html.trim()

  const safeHtml = useMemo(() => {
    if (!trimmed) {
      return ''
    }
    return sanitizeHtmlForDisplay(trimmed)
  }, [trimmed])

  if (!trimmed) {
    return null
  }

  if (!containsHtmlMarkup(trimmed)) {
    return <p className={['whitespace-pre-wrap', className].filter(Boolean).join(' ')}>{trimmed}</p>
  }

  return (
    <div
      className={['prose-safe leading-relaxed', className].filter(Boolean).join(' ')}
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  )
}
