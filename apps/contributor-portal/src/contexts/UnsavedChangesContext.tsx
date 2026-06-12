import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  Link,
  useBlocker,
  useNavigate,
  type LinkProps,
  type NavigateOptions,
} from 'react-router-dom'
import { LeaveConfirmDialog } from '../components/ui/LeaveConfirmDialog'

type PendingNavigation = {
  to: string
  options?: NavigateOptions
}

type UnsavedChangesContextValue = {
  isDirty: boolean
  setDirty: (dirty: boolean) => void
  requestNavigation: (to: string, options?: NavigateOptions) => void
}

const UnsavedChangesContext = createContext<UnsavedChangesContextValue | null>(null)

function useUnsavedChangesContext() {
  const context = useContext(UnsavedChangesContext)
  if (!context) {
    throw new Error('UnsavedChangesContext is unavailable.')
  }
  return context
}

export function UnsavedChangesProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const isDirtyRef = useRef(false)
  const [isDirty, setIsDirtyState] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const pendingNavigationRef = useRef<PendingNavigation | null>(null)

  const setDirty = useCallback((dirty: boolean) => {
    isDirtyRef.current = dirty
    setIsDirtyState(dirty)
  }, [])

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirtyRef.current && currentLocation.pathname !== nextLocation.pathname,
  )

  useEffect(() => {
    if (blocker.state === 'blocked') {
      setDialogOpen(true)
    }
  }, [blocker.state])

  useEffect(() => {
    if (!isDirty) {
      return
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  const cancelLeave = useCallback(() => {
    setDialogOpen(false)
    pendingNavigationRef.current = null
    if (blocker.state === 'blocked') {
      blocker.reset()
    }
  }, [blocker])

  const confirmLeave = useCallback(() => {
    setDialogOpen(false)
    isDirtyRef.current = false
    setIsDirtyState(false)

    if (blocker.state === 'blocked') {
      blocker.proceed()
      pendingNavigationRef.current = null
      return
    }

    const pending = pendingNavigationRef.current
    pendingNavigationRef.current = null
    if (pending) {
      navigate(pending.to, pending.options)
    }
  }, [blocker, navigate])

  const requestNavigation = useCallback(
    (to: string, options?: NavigateOptions) => {
      if (!isDirtyRef.current) {
        navigate(to, options)
        return
      }

      pendingNavigationRef.current = { to, options }
      setDialogOpen(true)
    },
    [navigate],
  )

  return (
    <UnsavedChangesContext.Provider value={{ isDirty, setDirty, requestNavigation }}>
      {children}
      <LeaveConfirmDialog
        open={dialogOpen}
        onCancel={cancelLeave}
        onConfirm={confirmLeave}
      />
    </UnsavedChangesContext.Provider>
  )
}

export function useUnsavedChanges() {
  return useUnsavedChangesContext()
}

export function GuardedLink({ to, onClick, ...props }: LinkProps) {
  const { isDirty, requestNavigation } = useUnsavedChanges()

  return (
    <Link
      {...props}
      to={to}
      onClick={(event) => {
        onClick?.(event)
        if (event.defaultPrevented || !isDirty) {
          return
        }

        event.preventDefault()
        const target = typeof to === 'string' ? to : `${to.pathname ?? ''}${to.search ?? ''}`
        requestNavigation(target)
      }}
    />
  )
}
