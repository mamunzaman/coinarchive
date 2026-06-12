import { useLocation } from 'react-router-dom'
import { AppLayout } from './AppLayout'
import { CoinEntryWizardLayout } from './CoinEntryWizardLayout'
import { isCoinEntryWizardPath } from '../../lib/coinEntryRoutes'

export function MainLayout() {
  const { pathname } = useLocation()

  if (isCoinEntryWizardPath(pathname)) {
    return <CoinEntryWizardLayout />
  }

  return <AppLayout />
}
