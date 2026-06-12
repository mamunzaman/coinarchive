const ALLOWED_TAGS = new Set([
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  'ul',
  'ol',
  'li',
  'a',
  'h2',
  'h3',
  'blockquote',
])

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function containsHtmlMarkup(text: string): boolean {
  return /<[a-z][\s\S]*>/i.test(text)
}

function sanitizeElement(element: Element): void {
  const children = Array.from(element.children)

  for (const child of children) {
    const tag = child.tagName.toLowerCase()

    if (!ALLOWED_TAGS.has(tag)) {
      child.replaceWith(...Array.from(child.childNodes))
      continue
    }

    for (const attribute of Array.from(child.attributes)) {
      const name = attribute.name.toLowerCase()

      if (name.startsWith('on')) {
        child.removeAttribute(attribute.name)
        continue
      }

      if (tag === 'a' && name === 'href') {
        const href = attribute.value.trim()
        if (/^javascript:/i.test(href)) {
          child.removeAttribute(attribute.name)
        }
        continue
      }

      if (name !== 'href') {
        child.removeAttribute(attribute.name)
      }
    }

    sanitizeElement(child)
  }
}

export function sanitizeHtmlForDisplay(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) {
    return ''
  }

  if (!containsHtmlMarkup(trimmed)) {
    return escapeHtml(trimmed).replace(/\n/g, '<br />')
  }

  if (typeof DOMParser === 'undefined') {
    return escapeHtml(trimmed)
  }

  const doc = new DOMParser().parseFromString(trimmed, 'text/html')
  sanitizeElement(doc.body)

  return doc.body.innerHTML.trim()
}
