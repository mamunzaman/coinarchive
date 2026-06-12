export function formatSubmittedDate(date: string): string {
  const parsed = new Date(date.includes('T') ? date : date.replace(' ', 'T'))
  if (Number.isNaN(parsed.getTime())) {
    return date
  }

  return parsed.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}
