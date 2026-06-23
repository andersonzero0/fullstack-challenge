'use client'
import { useEffect, useState, useCallback } from 'react'
import { useGameStore } from '../../stores/gameStore'
import { useAuth } from '../../hooks/useAuth'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

interface MyBet {
  id: string
  amount: number
  status: string
  cashoutMultiplier: number | null
  payout: number | null
  createdAt: string
  roundCrashPoint: number | null
}

function statusColor(status: string) {
  if (status === 'CASHED_OUT') return '#00ff88'
  if (status === 'LOST') return '#ff4444'
  return '#94a3b8'
}

export function BetList() {
  const { currentBets } = useGameStore()
  const { accessToken } = useAuth()
  const [myBets, setMyBets] = useState<MyBet[]>([])
  const phase = useGameStore(s => s.phase)
  const result = useGameStore(s => s.result)

  const fetchBets = useCallback(async () => {
    if (!accessToken) return
    fetch(`${API_URL}/games/bets/me?limit=20`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(r => r.json())
      .then((res: { data: MyBet[] }) => { if (Array.isArray(res.data)) setMyBets(res.data) })
      .catch(() => {})
  }, [accessToken])

  useEffect(() => { fetchBets() }, [fetchBets, phase])

  // refresh after cashout or loss resolves
  useEffect(() => {
    if (!result) return
    const t = setTimeout(fetchBets, 1500)
    return () => clearTimeout(t)
  }, [result, fetchBets])

  return (
    <div className="flex flex-col gap-3">
      {currentBets.length > 0 && (
        <div className="rounded-xl p-4" style={{ backgroundColor: '#0d0d1a', border: '1px solid #1a1a2e' }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: '#94a3b8' }}>
            Rodada atual ({currentBets.length})
          </h3>
          <div className="space-y-1.5">
            {currentBets.map(bet => (
              <div key={bet.playerId} className="flex items-center justify-between text-xs py-1">
                <span className="font-medium truncate max-w-[120px]" style={{ color: '#e2e8f0' }}>{bet.playerName}</span>
                <div className="flex items-center gap-2">
                  <span style={{ color: '#94a3b8' }}>R${(bet.amount / 100).toFixed(2)}</span>
                  {bet.status === 'CASHED_OUT' && bet.cashoutMultiplier && (
                    <span className="font-bold" style={{ color: '#00ff88' }}>{bet.cashoutMultiplier.toFixed(2)}x</span>
                  )}
                  {bet.status === 'LOST' && <span style={{ color: '#ff4444' }}>✗</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl p-4" style={{ backgroundColor: '#0d0d1a', border: '1px solid #1a1a2e' }}>
        <h3 className="text-sm font-semibold mb-3" style={{ color: '#94a3b8' }}>Minhas apostas</h3>
        {myBets.filter(b => b.status !== 'PENDING' && b.status !== 'ACTIVE').length === 0 ? (
          <p className="text-xs" style={{ color: '#4a4a5a' }}>Nenhuma aposta ainda</p>
        ) : (
          <div className="space-y-1.5">
            {myBets.filter(b => b.status !== 'PENDING' && b.status !== 'ACTIVE').map(bet => (
              <div key={bet.id} className="flex items-center justify-between text-xs py-1 border-b" style={{ borderColor: '#1a1a2e' }}>
                <div className="flex flex-col gap-0.5">
                  <span style={{ color: statusColor(bet.status) }}>
                    {bet.status === 'CASHED_OUT' ? `Sacou ${bet.cashoutMultiplier?.toFixed(2)}x` : bet.status === 'LOST' ? 'Perdeu' : bet.status}
                  </span>
                  {bet.roundCrashPoint && (
                    <span style={{ color: '#4a4a5a' }}>crash {Number(bet.roundCrashPoint).toFixed(2)}x</span>
                  )}
                </div>
                <span style={{ color: bet.status === 'CASHED_OUT' ? '#00ff88' : '#ff4444' }}>
                  {bet.status === 'CASHED_OUT' && bet.payout
                    ? `+R$${(bet.payout / 100).toFixed(2)}`
                    : `-R$${(bet.amount / 100).toFixed(2)}`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
