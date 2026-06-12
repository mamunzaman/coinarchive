import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  clearAuthSessionStorage,
  readStoredAuthToken,
  writeAuthSession,
} from '../lib/authSessionStorage'
import { clearAuthSession } from '../lib/auth'
import {
  getAuthMe,
  loginAuthUser,
  logoutAuthUser,
  toAuthErrorResponse,
} from '../services/authApi'
import type {
  AuthContributor,
  AuthErrorResponse,
  AuthLoginResult,
  AuthLoginSuccess,
} from '../types/auth'

export type AuthContextValue = {
  user: AuthContributor | null
  token: string | null
  isAuthenticated: boolean
  isBootstrapping: boolean
  login: (email: string, password: string) => Promise<AuthLoginResult>
  loginWithCredentials: (email: string, password: string) => Promise<AuthLoginResult>
  logout: () => Promise<void>
  refreshUser: () => Promise<AuthContributor | AuthErrorResponse>
  setSession: (response: AuthLoginSuccess) => void
  setSessionFromLoginResponse: (response: AuthLoginSuccess) => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

type AuthProviderProps = {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthContributor | null>(null)
  const [token, setToken] = useState<string | null>(() => readStoredAuthToken())
  const [isBootstrapping, setIsBootstrapping] = useState(true)

  const clearSession = useCallback(() => {
    clearAuthSessionStorage()
    clearAuthSession()
    setToken(null)
    setUser(null)
  }, [])

  const setSessionFromLoginResponse = useCallback((response: AuthLoginSuccess) => {
    writeAuthSession(response.token, response.expires_at ?? null)
    setToken(response.token)
    setUser(response.contributor)
  }, [])

  const refreshUser = useCallback(async (): Promise<AuthContributor | AuthErrorResponse> => {
    const activeToken = token ?? readStoredAuthToken()
    if (!activeToken) {
      clearSession()
      return toAuthErrorResponse(new Error('No active session.'))
    }

    try {
      const response = await getAuthMe(activeToken)
      setToken(activeToken)
      setUser(response.contributor)
      return response.contributor
    } catch (error) {
      clearSession()
      return toAuthErrorResponse(error)
    }
  }, [clearSession, token])

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      const storedToken = readStoredAuthToken()

      if (!storedToken) {
        if (!cancelled) {
          setIsBootstrapping(false)
        }
        return
      }

      try {
        const response = await getAuthMe(storedToken)
        if (cancelled) {
          return
        }

        setToken(storedToken)
        setUser(response.contributor)
      } catch {
        if (!cancelled) {
          clearSession()
        }
      } finally {
        if (!cancelled) {
          setIsBootstrapping(false)
        }
      }
    }

    void bootstrap()

    return () => {
      cancelled = true
    }
  }, [clearSession])

  const loginWithCredentials = useCallback(
    async (email: string, password: string): Promise<AuthLoginResult> => {
      try {
        const response = await loginAuthUser({ email, password })
        setSessionFromLoginResponse(response)
        return response
      } catch (error) {
        return toAuthErrorResponse(error)
      }
    },
    [setSessionFromLoginResponse],
  )

  const logout = useCallback(async () => {
    const activeToken = token ?? readStoredAuthToken()

    if (activeToken) {
      try {
        await logoutAuthUser(activeToken)
      } catch {
        // Always clear local session even when logout request fails.
      }
    }

    clearSession()
  }, [clearSession, token])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token && user),
      isBootstrapping,
      login: loginWithCredentials,
      loginWithCredentials,
      logout,
      refreshUser,
      setSession: setSessionFromLoginResponse,
      setSessionFromLoginResponse,
    }),
    [
      user,
      token,
      isBootstrapping,
      loginWithCredentials,
      logout,
      refreshUser,
      setSessionFromLoginResponse,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
