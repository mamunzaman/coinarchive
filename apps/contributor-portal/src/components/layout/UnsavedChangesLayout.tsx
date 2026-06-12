import { Outlet } from 'react-router-dom'
import { UnsavedChangesProvider } from '../../contexts/UnsavedChangesContext'

export function UnsavedChangesLayout() {
  return (
    <UnsavedChangesProvider>
      <Outlet />
    </UnsavedChangesProvider>
  )
}
