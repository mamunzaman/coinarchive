import { lazy, Suspense, type ComponentType, type ReactNode } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AdminRoute } from '../components/auth/AdminRoute'
import { GuestRoute } from '../components/auth/GuestRoute'
import { ProtectedRoute } from '../components/auth/ProtectedRoute'
import { AuthLayout } from '../components/layout/AuthLayout'
import { MainLayout } from '../components/layout/MainLayout'
import { UnsavedChangesLayout } from '../components/layout/UnsavedChangesLayout'
import { CoinWizardErrorBoundary } from '../components/coin/CoinWizardErrorBoundary'

const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, '')

const LoginPage = lazy(() => import('../pages/LoginPage').then((module) => ({ default: module.LoginPage })))
const RegisterPage = lazy(() => import('../pages/RegisterPage').then((module) => ({ default: module.RegisterPage })))
const ForgotPasswordPage = lazy(() => import('../pages/ForgotPasswordPage').then((module) => ({ default: module.ForgotPasswordPage })))
const VerifyEmailPage = lazy(() => import('../pages/VerifyEmailPage').then((module) => ({ default: module.VerifyEmailPage })))
const ResetPasswordPage = lazy(() => import('../pages/ResetPasswordPage').then((module) => ({ default: module.ResetPasswordPage })))

const DashboardPage = lazy(() => import('../pages/DashboardPage').then((module) => ({ default: module.DashboardPage })))
const MySubmissionsPage = lazy(() => import('../pages/MySubmissionsPage').then((module) => ({ default: module.MySubmissionsPage })))
const SubmissionDetailPage = lazy(() => import('../pages/SubmissionDetailPage').then((module) => ({ default: module.SubmissionDetailPage })))
const NewCoinPage = lazy(() => import('../pages/NewCoinPage').then((module) => ({ default: module.NewCoinPage })))
const EditSubmissionPage = lazy(() => import('../pages/EditSubmissionPage').then((module) => ({ default: module.EditSubmissionPage })))
const ProfilePage = lazy(() => import('../pages/ProfilePage').then((module) => ({ default: module.ProfilePage })))

const AdminDashboardPage = lazy(() => import('../pages/admin/AdminDashboardPage').then((module) => ({ default: module.AdminDashboardPage })))
const AdminSubmissionsPage = lazy(() => import('../pages/admin/AdminSubmissionsPage').then((module) => ({ default: module.AdminSubmissionsPage })))
const AdminSubmissionDetailPage = lazy(() => import('../pages/admin/AdminSubmissionDetailPage').then((module) => ({ default: module.AdminSubmissionDetailPage })))
const AdminApprovePage = lazy(() => import('../pages/AdminApprovePage').then((module) => ({ default: module.AdminApprovePage })))
const AdminImportPage = lazy(() => import('../pages/admin/AdminImportPage').then((module) => ({ default: module.AdminImportPage })))

function RouteLoadingSkeleton() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-border/70 bg-white px-5 py-5 shadow-[var(--shadow-card)]">
        <div className="h-3 w-28 rounded-full bg-muted" />
        <div className="mt-4 h-5 w-3/4 rounded-full bg-muted" />
        <div className="mt-3 h-3 w-full rounded-full bg-muted/80" />
        <div className="mt-2 h-3 w-5/6 rounded-full bg-muted/80" />
        <p className="sr-only" role="status" aria-live="polite">Loading page…</p>
      </div>
    </div>
  )
}

function routeElement(Component: ComponentType): ReactNode {
  return (
    <Suspense fallback={<RouteLoadingSkeleton />}>
      <Component />
    </Suspense>
  )
}

function coinWizardRouteElement(Component: ComponentType): ReactNode {
  return (
    <Suspense fallback={<RouteLoadingSkeleton />}>
      <CoinWizardErrorBoundary>
        <Component />
      </CoinWizardErrorBoundary>
    </Suspense>
  )
}

export const appRouter = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [
      {
        element: <GuestRoute />,
        children: [
          { path: '/login', element: routeElement(LoginPage) },
          { path: '/register', element: routeElement(RegisterPage) },
          { path: '/forgot-password', element: routeElement(ForgotPasswordPage) },
        ],
      },
      {
        element: <GuestRoute allowWhenAuthenticated />,
        children: [
          { path: '/verify-email', element: routeElement(VerifyEmailPage) },
          { path: '/reset-password', element: routeElement(ResetPasswordPage) },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <UnsavedChangesLayout />,
        children: [
          {
            element: <MainLayout />,
            children: [
              { path: '/dashboard', element: routeElement(DashboardPage) },
              { path: '/new-coin', element: coinWizardRouteElement(NewCoinPage) },
              { path: '/my-submissions', element: routeElement(MySubmissionsPage) },
              { path: '/my-submissions/:id/edit', element: coinWizardRouteElement(EditSubmissionPage) },
              { path: '/my-submissions/:id', element: routeElement(SubmissionDetailPage) },
              { path: '/profile', element: routeElement(ProfilePage) },
              {
                element: <AdminRoute />,
                children: [
                  { path: '/admin', element: routeElement(AdminDashboardPage) },
                  { path: '/admin/submissions', element: routeElement(AdminSubmissionsPage) },
                  { path: '/admin/submissions/:id', element: routeElement(AdminSubmissionDetailPage) },
                  { path: '/admin/approve', element: routeElement(AdminApprovePage) },
                  { path: '/admin/import', element: routeElement(AdminImportPage) },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '*', element: <Navigate to="/login" replace /> },
], { basename: routerBasename })
