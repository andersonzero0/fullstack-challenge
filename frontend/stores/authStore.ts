'use client'
import { create } from 'zustand'

interface AuthState {
  accessToken: string | null
  user: { id: string; username: string } | null
  setTokens: (accessToken: string, refreshToken: string) => void
  logout: () => void
  isAuthenticated: () => boolean
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  user: null,

  setTokens: (accessToken: string, refreshToken: string) => {
    try {
      const payload = JSON.parse(atob(accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as { sub: string; preferred_username: string }
      localStorage.setItem('refresh_token', refreshToken)
      set({ accessToken, user: { id: payload.sub, username: payload.preferred_username } })
    } catch {
      set({ accessToken, user: null })
    }
  },

  logout: () => {
    localStorage.removeItem('refresh_token')
    set({ accessToken: null, user: null })
  },

  isAuthenticated: () => get().accessToken !== null,
}))

if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
  // Expose store for Playwright E2E injection
  ;(window as unknown as Record<string, unknown>)['__authStore'] = useAuthStore
}
