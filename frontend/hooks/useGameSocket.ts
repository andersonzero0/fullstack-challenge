'use client'
import { useEffect } from 'react'
import { getSocket } from '../lib/socket'
import { useGameStore } from '../stores/gameStore'
import { useAuthStore } from '../stores/authStore'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export function useGameSocket() {
  const { setRoundBetting, setRoundStarted, setRoundCrashed, addBet, updateBetCashout, initHistory, setMyBet } = useGameStore()
  const accessToken = useAuthStore(s => s.accessToken)

  useEffect(() => {
    fetch(`${API_URL}/games/rounds/history?limit=20`)
      .then(r => r.json())
      .then((res: { data: { crashPoint: number }[] }) => {
        if (Array.isArray(res.data)) initHistory(res.data.map(r => r.crashPoint))
      })
      .catch(() => {})

    // Restore active bet after page reload
    if (accessToken) {
      fetch(`${API_URL}/games/bets/me/active`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
        .then(r => r.ok ? r.json() : null)
        .then((bet: { playerId: string; playerName: string; amount: number; status: string; cashoutMultiplier: number | null; autoCashoutAt: number | null } | null) => {
          if (bet) setMyBet(bet)
        })
        .catch(() => {})
    }

    const socket = getSocket()

    socket.on('round:betting', setRoundBetting)
    socket.on('round:started', setRoundStarted)
    socket.on('round:crashed', setRoundCrashed)
    socket.on('bet:placed', addBet)
    socket.on('bet:cashout', updateBetCashout)

    return () => {
      socket.off('round:betting', setRoundBetting)
      socket.off('round:started', setRoundStarted)
      socket.off('round:crashed', setRoundCrashed)
      socket.off('bet:placed', addBet)
      socket.off('bet:cashout', updateBetCashout)
    }
  }, [setRoundBetting, setRoundStarted, setRoundCrashed, addBet, updateBetCashout, initHistory, setMyBet, accessToken])
}
