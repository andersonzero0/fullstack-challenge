'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { exchangeCode } from '../../lib/auth'
import { useAuthStore } from '../../stores/authStore'

export default function CallbackPage() {
  const router = useRouter()
  const setTokens = useAuthStore(s => s.setTokens)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const verifier = sessionStorage.getItem('pkce_verifier')

    if (!code || !verifier) {
      router.replace('/login')
      return
    }

    sessionStorage.removeItem('pkce_verifier')

    exchangeCode(code, verifier)
      .then(({ accessToken, refreshToken }) => {
        setTokens(accessToken, refreshToken)
        router.replace('/game')
      })
      .catch(() => router.replace('/login'))
  }, [router, setTokens])

  return (
    <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0a0a0f' }}>
      <p style={{ color: '#94a3b8' }}>Autenticando...</p>
    </main>
  )
}
