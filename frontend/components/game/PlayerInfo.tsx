'use client'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useGameStore } from '../../stores/gameStore'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export function PlayerInfo() {
  const { user, accessToken, isAuthenticated } = useAuth()
  const [balance, setBalance] = useState<number | null>(null)
  const phase = useGameStore(s => s.phase)
  const result = useGameStore(s => s.result)

  const fetchBalance = useCallback(async () => {
    if (!accessToken) return
    const headers = { 'Authorization': `Bearer ${accessToken}` }
    try {
      let r = await fetch(`${API_URL}/wallets/me`, { headers })
      if (r.status === 404) {
        await fetch(`${API_URL}/wallets`, { method: 'POST', headers })
        r = await fetch(`${API_URL}/wallets/me`, { headers })
      }
      const data = await r.json() as { balance: number }
      setBalance(data.balance)
    } catch {
      // ignore
    }
  }, [accessToken])

  useEffect(() => { fetchBalance() }, [fetchBalance])

  useEffect(() => {
    if (phase === 'BETTING') fetchBalance()
  }, [phase, fetchBalance])

  // refresh ~1.5s after cashout (RabbitMQ credit settles)
  useEffect(() => {
    if (result?.type !== 'WIN') return
    const t = setTimeout(fetchBalance, 1500)
    return () => clearTimeout(t)
  }, [result, fetchBalance])

  if (!isAuthenticated || !user) return null

  return (
    <div className="flex items-center gap-3 px-3 py-1.5 rounded-xl" style={{ backgroundColor: '#0d0d1a', border: '1px solid #1a1a2e' }}>
      <span className="text-xs font-medium" style={{ color: '#4a5568' }}>
        {user.username}
      </span>
      <span className="text-sm font-black" style={{ color: '#00ff88' }}>
        {balance !== null ? `R$${(balance / 100).toFixed(2)}` : '—'}
      </span>
    </div>
  )
}
