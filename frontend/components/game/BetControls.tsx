'use client'
import { useState, useEffect, useRef } from 'react'
import { useGameStore } from '../../stores/gameStore'
import { useAuthStore } from '../../stores/authStore'
import { useAutoBetStore } from '../../stores/autoBetStore'
import { useAutoBet } from '../../hooks/useAutoBet'
import { AutoBetConfig } from './AutoBetConfig'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

function useLiveMultiplier() {
  const startTimestamp = useGameStore(s => s.startTimestamp)
  const growthRate = useGameStore(s => s.growthRate)
  const phase = useGameStore(s => s.phase)
  const [multiplier, setMultiplier] = useState(1.0)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (phase !== 'RUNNING' || !startTimestamp) {
      setMultiplier(1.0)
      return
    }
    function tick() {
      const elapsed = (Date.now() - startTimestamp!) / 1000
      setMultiplier(Math.exp(elapsed * growthRate))
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [phase, startTimestamp, growthRate])

  return multiplier
}

function ActiveBetPanel({ onCashout, loading }: { onCashout: () => void; loading: boolean }) {
  const { phase, myBet } = useGameStore()
  const multiplier = useLiveMultiplier()
  const isRunning = phase === 'RUNNING' && myBet?.status === 'ACTIVE'
  const isPending = myBet?.status === 'PENDING' || (phase === 'BETTING' && myBet)

  const potentialPayout = myBet ? Math.floor(myBet.amount * multiplier) : 0

  return (
    <div className="space-y-3">
      {/* Bet card */}
      <div
        className="rounded-xl p-4"
        style={{
          backgroundColor: '#0a0a14',
          border: `1px solid ${isRunning ? '#ffd700' : isPending ? '#8b5cf6' : '#1a1a2e'}`,
          transition: 'border-color 0.3s',
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#94a3b8' }}>
            Aposta ativa
          </span>
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: isRunning ? '#ffd70022' : isPending ? '#8b5cf622' : '#1a1a2e',
              color: isRunning ? '#ffd700' : isPending ? '#8b5cf6' : '#94a3b8',
            }}
          >
            {isRunning ? '● VOANDO' : isPending ? '● AGUARDANDO' : myBet?.status}
          </span>
        </div>

        <div className="flex items-end justify-between">
          <div>
            <div className="text-xs mb-0.5" style={{ color: '#94a3b8' }}>Valor apostado</div>
            <div className="text-xl font-black" style={{ color: '#e2e8f0' }}>
              R${((myBet?.amount ?? 0) / 100).toFixed(2)}
            </div>
          </div>

          {isRunning && (
            <div className="text-right">
              <div className="text-xs mb-0.5" style={{ color: '#94a3b8' }}>Retorno atual</div>
              <div
                className="text-xl font-black"
                style={{ color: '#00ff88', fontVariantNumeric: 'tabular-nums' }}
              >
                R${(potentialPayout / 100).toFixed(2)}
              </div>
              <div className="text-xs" style={{ color: '#00ff88', opacity: 0.7 }}>
                {multiplier.toFixed(2)}x
              </div>
            </div>
          )}
        </div>

        {myBet?.cashoutMultiplier && (
          <div className="mt-2 text-xs" style={{ color: '#94a3b8' }}>
            Auto sacar em {Number(myBet.cashoutMultiplier).toFixed(2)}x
          </div>
        )}
      </div>

      {/* Cashout button */}
      {isRunning && (
        <button
          onClick={onCashout}
          disabled={loading}
          className="w-full py-4 rounded-xl font-black text-lg tracking-wide transition-all"
          style={{
            backgroundColor: loading ? '#b8960a' : '#ffd700',
            color: '#000',
            boxShadow: loading ? 'none' : '0 0 20px #ffd70066',
          }}
        >
          {loading ? 'Sacando...' : `SACAR  ${multiplier.toFixed(2)}x`}
        </button>
      )}

      {isPending && !isRunning && (
        <div
          className="w-full py-3 rounded-xl text-center text-sm font-semibold"
          style={{ backgroundColor: '#1a1a2e', color: '#94a3b8' }}
        >
          Aguardando início da rodada...
        </div>
      )}
    </div>
  )
}

function AutoRoundInfo() {
  const store = useAutoBetStore()
  const { running } = useAutoBet()
  if (!running) return null
  const current = store.totalRounds - store.roundsLeft + 1
  const pnl = store.totalPnl
  return (
    <div
      className="rounded-xl p-3 flex items-center justify-between text-xs"
      style={{ backgroundColor: '#0a0a14', border: '1px solid #8b5cf633' }}
    >
      <div className="flex flex-col gap-0.5">
        <span style={{ color: '#94a3b8' }}>Rodada</span>
        <span className="font-black text-base" style={{ color: '#8b5cf6' }}>
          {Math.min(current, store.totalRounds)} / {store.totalRounds}
        </span>
      </div>
      <div className="flex flex-col gap-0.5 text-right">
        <span style={{ color: '#94a3b8' }}>PnL</span>
        <span
          className="font-black text-base"
          style={{ color: pnl >= 0 ? '#00ff88' : '#ff4444' }}
        >
          {pnl >= 0 ? '+' : ''}R${(pnl / 100).toFixed(2)}
        </span>
      </div>
      <div className="flex flex-col gap-0.5 text-right">
        <span style={{ color: '#94a3b8' }}>Faltam</span>
        <span className="font-black text-base" style={{ color: '#e2e8f0' }}>
          {store.roundsLeft}
        </span>
      </div>
    </div>
  )
}

export function BetControls() {
  const [tab, setTab] = useState<'manual' | 'auto'>('manual')
  const [amountReais, setAmountReais] = useState('10')
  const [autoCashoutAt, setAutoCashoutAt] = useState('')
  const [loading, setLoading] = useState(false)

  const { phase, myBet, setMyBet } = useGameStore()
  const { accessToken, user } = useAuthStore()
  const autoStore = useAutoBetStore()

  const betActive = !!myBet && (myBet.status === 'PENDING' || myBet.status === 'ACTIVE')
  const autoRunning = autoStore.running

  async function placeBet() {
    if (!accessToken || !user) return
    const amountCents = Math.round(parseFloat(amountReais) * 100)
    if (amountCents < 100 || amountCents > 1000000) return
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/games/bet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          amount: amountCents,
          ...(autoCashoutAt !== '' && parseFloat(autoCashoutAt) >= 1.01
            ? { autoCashoutAt: parseFloat(autoCashoutAt) }
            : {}),
        }),
      })
      if (res.ok) {
        setMyBet({ playerId: user.id, playerName: user.username, amount: amountCents, status: 'PENDING', cashoutMultiplier: null })
      }
    } finally {
      setLoading(false)
    }
  }

  async function cashout() {
    if (!accessToken) return
    setLoading(true)
    try {
      await fetch(`${API_URL}/games/bet/cashout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
    } finally {
      setLoading(false)
    }
  }

  const canBet = phase === 'BETTING' && !myBet && !!accessToken
  const canCashout = phase === 'RUNNING' && myBet?.status === 'ACTIVE' && !!accessToken
  const tabLocked = betActive || autoRunning  // betActive já filtra só PENDING/ACTIVE

  return (
    <div className="rounded-xl p-4" style={{ backgroundColor: '#0d0d1a', border: '1px solid #1a1a2e' }}>
      {/* Tabs */}
      <div className="flex mb-4 rounded-lg overflow-hidden relative" style={{ backgroundColor: '#1a1a2e' }}>
        {(['manual', 'auto'] as const).map(t => (
          <button
            key={t}
            onClick={() => { if (!tabLocked) setTab(t) }}
            disabled={tabLocked}
            className="flex-1 py-2 text-sm font-semibold capitalize transition-colors"
            style={{
              backgroundColor: tab === t ? '#00ff88' : 'transparent',
              color: tab === t ? '#000' : tabLocked && tab !== t ? '#3a3a4a' : '#94a3b8',
              cursor: tabLocked ? 'not-allowed' : 'pointer',
            }}
          >
            {t === 'manual' ? 'Manual' : 'Auto'}
          </button>
        ))}
        {tabLocked && (
          <div
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs"
            style={{ color: '#4a4a5a' }}
          >
            🔒
          </div>
        )}
      </div>

      {/* Auto round info (shown at top when auto running) */}
      {tab === 'auto' && <AutoRoundInfo />}

      {/* Active bet display (replaces inputs) */}
      {betActive ? (
        <ActiveBetPanel onCashout={cashout} loading={loading} />
      ) : tab === 'auto' ? (
        <AutoBetConfig />
      ) : (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: '#94a3b8' }}>Valor (R$)</label>
            <input
              type="number"
              value={amountReais}
              onChange={e => setAmountReais(e.target.value)}
              min="1"
              step="1"
              className="w-full px-3 py-2 rounded-lg text-white text-sm"
              style={{ backgroundColor: '#1a1a2e', border: '1px solid #2a2a3e', outline: 'none' }}
            />
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[1, 5, 10, 50].map(v => (
              <button
                key={v}
                onClick={() => setAmountReais(String(v))}
                className="py-1.5 text-xs font-medium rounded-lg transition-colors hover:opacity-80"
                style={{ backgroundColor: '#1a1a2e', color: '#94a3b8' }}
              >
                R${v}
              </button>
            ))}
          </div>

          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: '#94a3b8' }}>
              Auto Sacar em (opcional)
            </label>
            <input
              type="number"
              value={autoCashoutAt}
              onChange={e => setAutoCashoutAt(e.target.value)}
              min="1.01"
              step="0.01"
              placeholder="ex: 2.00"
              className="w-full px-3 py-2 rounded-lg text-white text-sm"
              style={{ backgroundColor: '#1a1a2e', border: '1px solid #2a2a3e', outline: 'none' }}
            />
          </div>

          <button
            onClick={placeBet}
            disabled={!canBet || loading}
            className="w-full py-3 rounded-lg font-bold transition-all"
            style={{
              backgroundColor: canBet ? '#00ff88' : '#1a1a2e',
              color: canBet ? '#000' : '#4a4a5a',
              opacity: loading ? 0.7 : 1,
              boxShadow: canBet ? '0 0 16px #00ff8844' : 'none',
            }}
          >
            {loading ? 'Enviando...' : canBet ? 'APOSTAR' : phase === 'RUNNING' ? 'Rodada em andamento' : 'Aguardando apostas...'}
          </button>

          {!accessToken && (
            <p className="text-xs text-center" style={{ color: '#94a3b8' }}>Faça login para apostar</p>
          )}
        </div>
      )}
    </div>
  )
}
