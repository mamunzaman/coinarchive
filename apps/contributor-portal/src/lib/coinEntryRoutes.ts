export function isCoinEntryWizardPath(pathname: string): boolean {
  return pathname === '/new-coin' || /^\/my-submissions\/\d+\/edit$/.test(pathname)
}
