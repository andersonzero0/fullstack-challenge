'use client'
import { useEffect, useRef } from 'react'
import { useGameStore } from '../../stores/gameStore'
import { useSound } from '../../hooks/useSound'

const AUTO_CLOSE_MS = 2800

export function ResultModal() {
  const result = useGameStore(s => s.result)
  const clearResult = useGameStore(s => s.clearResult)
  const { playWin, playLoss } = useSound()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastResultRef = useRef<typeof result>(null)

  useEffect(() => {
    if (!result) return
    // Avoid replaying sound for same result object reference
    if (result === lastResultRef.current) return
    lastResultRef.current = result

    if (result.type === 'WIN') playWin()
    else playLoss()

    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => clearResult(), AUTO_CLOSE_MS)

    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [result, playWin, playLoss, clearResult])

  if (!result) return null

  const isWin = result.type === 'WIN'

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
    >
      <div
        className="pointer-events-auto rounded-2xl px-8 py-6 text-center shadow-2xl"
        style={{
          backgroundColor: '#0d0d1a',
          border: `2px solid ${isWin ? '#00ff88' : '#ff4444'}`,
          animation: 'resultPop 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
          minWidth: 220,
        }}
      >
        <div className="text-4xl mb-2">{isWin ? '🎉' : '💥'}</div>

        <div
          className="text-lg font-bold mb-1"
          style={{ color: isWin ? '#00ff88' : '#ff4444' }}
        >
          {isWin ? 'SACOU!' : 'CRASH!'}
        </div>

        {isWin && result.multiplier && (
          <div className="text-3xl font-black mb-2" style={{ color: '#00ff88' }}>
            {result.multiplier.toFixed(2)}x
          </div>
        )}

        <div
          className="text-xl font-bold"
          style={{ color: isWin ? '#00ff88' : '#ff4444' }}
        >
          {isWin ? '+' : '-'}R${(result.amount / 100).toFixed(2)}
        </div>

        {isWin && result.betAmount && (
          <div className="text-xs mt-1" style={{ color: '#94a3b8' }}>
            lucro: +R${((result.amount - result.betAmount) / 100).toFixed(2)}
          </div>
        )}

        {/* Progress bar */}
        <div className="mt-4 h-1 rounded-full overflow-hidden" style={{ backgroundColor: '#1a1a2e' }}>
          <div
            className="h-full rounded-full"
            style={{
              backgroundColor: isWin ? '#00ff88' : '#ff4444',
              animation: `shrink ${AUTO_CLOSE_MS}ms linear forwards`,
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes resultPop {
          from { transform: scale(0.7); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
        @keyframes shrink {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
    </div>
  )
}
