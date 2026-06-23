'use client'
import { useEffect, useRef } from 'react'
import { useGameStore } from '../stores/gameStore'
import { useAutoBetStore } from '../stores/autoBetStore'
import { useAuthStore } from '../stores/authStore'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export function useAutoBet() {
  const phase = useGameStore(s => s.phase)
  const myBet = useGameStore(s => s.myBet)
  const setMyBet = useGameStore(s => s.setMyBet)
  const { accessToken, user } = useAuthStore()
  const store = useAutoBetStore()
  const placedThisRound = useRef(false)

  useEffect(() => {
    if (!store.running || !accessToken || !user) return
    if (store.roundsLeft <= 0 || store.totalPnl <= -store.stopLossAmount) {
      store.setRunning(false)
      return
    }

    if (phase === 'BETTING' && !placedThisRound.current) {
      placedThisRound.current = true
      fetch(`${API_URL}/games/bet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ amount: store.currentAmount, autoCashoutAt: store.autoCashoutAt }),
      }).then(r => {
        if (r.ok) {
          setMyBet({ playerId: user.id, playerName: user.username, amount: store.currentAmount, status: 'PENDING', cashoutMultiplier: null })
        }
      }).catch(() => {})
    }

    if (phase === 'CRASHED' || phase === 'BETTING') {
      placedThisRound.current = false
      if (myBet) {
        if (myBet.status === 'CASHED_OUT' && myBet.cashoutMultiplier) {
          store.onWin(Math.floor(myBet.amount * myBet.cashoutMultiplier))
        } else if (myBet.status === 'LOST') {
          store.onLoss(myBet.amount)
        }
      }
    }
  }, [phase, store.running])

  return store
}
