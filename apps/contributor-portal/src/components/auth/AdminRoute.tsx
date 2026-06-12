import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

function AuthRouteLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center px-4">
      <p role="status" aria-live="polite" className="text-sm text-navy-muted">
        Loading…
      </p>
    </div>
  )
}

export function AdminRoute() {
  const { user, isBootstrapping } = useAuth()

  if (isBootstrapping) {
    return <AuthRouteLoading />
  }

  const isAdmin = user?.role === 'admin' && user?.status === 'approved'

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
