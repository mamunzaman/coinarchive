import i18n from '../i18n'

export function getSectionTitle(pathname: string): string {
  if (pathname === '/dashboard') {
    return i18n.t('pages.dashboard')
  }

  if (pathname === '/new-coin') {
    return i18n.t('pages.newCoin')
  }

  if (pathname === '/my-submissions') {
    return i18n.t('pages.mySubmissions')
  }

  if (/^\/my-submissions\/\d+\/edit$/.test(pathname)) {
    return i18n.t('pages.editSubmission')
  }

  if (/^\/my-submissions\/\d+$/.test(pathname)) {
    return i18n.t('pages.submissionDetail')
  }

  if (pathname === '/profile') {
    return i18n.t('pages.profile')
  }

  if (pathname === '/admin') {
    return i18n.t('pages.adminDashboard')
  }

  if (pathname === '/admin/submissions') {
    return i18n.t('pages.submissionQueue')
  }

  if (/^\/admin\/submissions\/\d+$/.test(pathname)) {
    return i18n.t('pages.reviewSubmission')
  }

  if (pathname === '/admin/approve') {
    return i18n.t('pages.approveContributors')
  }

  if (pathname === '/admin/import') {
    return i18n.t('pages.bulkImport')
  }

  return i18n.t('pages.default')
}
