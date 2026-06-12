import type { ContentLanguage } from '../types/coinForm'

export function isCoinFormDataLoading(options: {
  formOptionsLoading: boolean
  formOptionsLanguage: ContentLanguage | null
  contentLanguage: ContentLanguage
}): boolean {
  return (
    options.formOptionsLoading ||
    options.formOptionsLanguage === null ||
    options.formOptionsLanguage !== options.contentLanguage
  )
}
