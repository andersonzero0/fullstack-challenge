'use client'
import { useAuthStore } from '../stores/authStore'

export function useAuth() {
  const { accessToken, user, logout, isAuthenticated } = useAuthStore()
  return { accessToken, user, logout, isAuthenticated: isAuthenticated() }
}
