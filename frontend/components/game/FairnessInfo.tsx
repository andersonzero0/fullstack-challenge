'use client'
import { useState, useEffect } from 'react'
import { useGameStore } from '../../stores/gameStore'

async function sha256hex(input: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

export function FairnessInfo() {
  const { phase, serverSeedHash, roundId } = useGameStore()
  const [serverSeed, setServerSeed] = useState<string | null>(null)
  const [verified, setVerified] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)

  const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

  useEffect(() => {
    setServerSeed(null)
    setVerified(null)
  }, [roundId])

  async function fetchVerification() {
    if (!roundId) return
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/games/rounds/${roundId}/verify`)
      if (!res.ok) return
      const data = await res.json()
      setServerSeed(data.serverSeed)
      const computedHash = await sha256hex(data.serverSeed)
      setVerified(computedHash === serverSeedHash)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: '#0d0d1a', border: '1px solid #1a1a2e' }}>
      <h3 className="text-sm font-semibold" style={{ color: '#94a3b8' }}>Jogo Justo</h3>

      {/* Formula */}
      <div className="text-xs px-3 py-2 rounded font-mono" style={{ backgroundColor: '#1a1a2e', color: '#8b5cf6' }}>
        M(t) = e^(t × 0.06)
      </div>

      {/* Server seed hash */}
      {serverSeedHash && (
        <div>
          <p className="text-xs mb-1" style={{ color: '#94a3b8' }}>Hash da seed (rodada atual)</p>
          <p className="text-xs font-mono break-all" style={{ color: '#e2e8f0' }}>
            {serverSeedHash.slice(0, 16)}...
          </p>
        </div>
      )}

      {/* Verification (only after crash) */}
      {phase === 'CRASHED' && !serverSeed && (
        <button
          onClick={fetchVerification}
          disabled={loading}
          className="text-xs px-3 py-1.5 rounded font-medium"
          style={{ backgroundColor: '#1a1a2e', color: '#8b5cf6' }}
        >
          {loading ? 'Verificando...' : 'Verificar seed'}
        </button>
      )}

      {serverSeed && (
        <div className="space-y-1">
          <p className="text-xs" style={{ color: '#94a3b8' }}>Seed revelada</p>
          <p className="text-xs font-mono break-all" style={{ color: '#e2e8f0' }}>
            {serverSeed.slice(0, 16)}...
          </p>
          <div className="flex items-center gap-2 mt-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: verified ? '#00ff88' : '#ff4444' }}
            />
            <span className="text-xs font-medium" style={{ color: verified ? '#00ff88' : '#ff4444' }}>
              {verified ? 'Verificado ✓' : 'Falhou ✗'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
