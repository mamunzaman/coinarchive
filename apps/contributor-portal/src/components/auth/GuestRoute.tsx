import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { isApprovedContributorStatus } from '../../lib/contributorAuthStatus'

type GuestRouteProps = {
  allowWhenAuthenticated?: boolean
}

function AuthRouteLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center px-4">
      <p role="status" aria-live="polite" className="text-sm text-navy-muted">
        Loading…
      </p>
    </div>
  )
}

function resolveAuthenticatedRedirect(role?: string, status?: string): string {
  return role === 'admin' && status === 'approved' ? '/admin' : '/dashboard'
}

export function GuestRoute({ allowWhenAuthenticated = false }: GuestRouteProps) {
  const { isAuthenticated, isBootstrapping, user } = useAuth()

  if (isBootstrapping) {
    return <AuthRouteLoading />
  }

  if (
    isAuthenticated &&
    user &&
    isApprovedContributorStatus(user.status) &&
    !allowWhenAuthenticated
  ) {
    return (
      <Navigate
        to={resolveAuthenticatedRedirect(user?.role, user?.status)}
        replace
      />
    )
  }

  return <Outlet />
}
