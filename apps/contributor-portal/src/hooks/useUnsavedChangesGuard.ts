import { useEffect } from 'react'
import { useUnsavedChanges } from '../contexts/UnsavedChangesContext'

export function useUnsavedChangesGuard(isDirty: boolean) {
  const { setDirty } = useUnsavedChanges()

  useEffect(() => {
    setDirty(isDirty)
    return () => setDirty(false)
  }, [isDirty, setDirty])
}
