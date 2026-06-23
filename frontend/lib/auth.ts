const KEYCLOAK_URL = process.env.NEXT_PUBLIC_KEYCLOAK_URL ?? 'http://localhost:8080'
const REALM = 'crash-game'
const CLIENT_ID = 'crash-game-client'
const REDIRECT_URI = typeof window !== 'undefined'
  ? `${window.location.origin}/callback`
  : 'http://localhost:3000/callback'

export function buildAuthUrl(codeChallenge: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: 'openid profile',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  })
  return `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/auth?${params}`
}

export async function generatePKCE(): Promise<{ verifier: string; challenge: string }> {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  const verifier = btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')

  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  const challenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')

  return { verifier, challenge }
}

export async function exchangeCode(code: string, verifier: string): Promise<{ accessToken: string; refreshToken: string }> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    code,
    code_verifier: verifier,
  })

  const res = await fetch(`${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!res.ok) throw new Error('Token exchange failed')

  const data = await res.json() as { access_token: string; refresh_token: string }
  return { accessToken: data.access_token, refreshToken: data.refresh_token }
}

export function parseJwt(token: string): { sub: string; preferred_username: string; exp: number } {
  const payload = token.split('.')[1]
  return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as { sub: string; preferred_username: string; exp: number }
}
