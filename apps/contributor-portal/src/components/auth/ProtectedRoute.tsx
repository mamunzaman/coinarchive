import { useEffect, useRef } from 'react'
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import {
  isApprovedContributorStatus,
  isPendingApprovalContributorStatus,
  isRejectedContributorStatus,
} from '../../lib/contributorAuthStatus'
import { AUTH_ERROR_CODES } from '../../types/auth'

function AuthRouteLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center px-4">
      <p role="status" aria-live="polite" className="text-sm text-navy-muted">
        Loading…
      </p>
    </div>
  )
}

export function ProtectedRoute() {
  const { isAuthenticated, isBootstrapping, user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const redirectStartedRef = useRef(false)

  useEffect(() => {
    if (isBootstrapping || !isAuthenticated || !user) {
      redirectStartedRef.current = false
      return
    }

    if (isApprovedContributorStatus(user.status)) {
      redirectStartedRef.current = false
      return
    }

    if (redirectStartedRef.current) {
      return
    }

    redirectStartedRef.current = true

    const authMessage = isRejectedContributorStatus(user.status)
      ? 'Your contributor account has been rejected. Contact an administrator if you believe this is a mistake.'
      : isPendingApprovalContributorStatus(user.status)
        ? 'Your account is verified and awaiting admin approval.'
        : 'Your account is not approved to access the contributor portal.'

    const authCode = isRejectedContributorStatus(user.status)
      ? AUTH_ERROR_CODES.ACCOUNT_REJECTED
      : AUTH_ERROR_CODES.PENDING_APPROVAL

    void (async () => {
      await logout()
      navigate('/login', {
        replace: true,
        state: { authMessage, authCode },
      })
    })()
  }, [isAuthenticated, isBootstrapping, logout, navigate, user])

  if (isBootstrapping) {
    return <AuthRouteLoading />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }

  if (!user || !isApprovedContributorStatus(user.status)) {
    return <AuthRouteLoading />
  }

  return <Outlet />
}
