'use client'
import { useGameStore } from '../../stores/gameStore'

function crashColor(point: number): { fg: string; bg: string } {
  if (point < 1.5) return { fg: '#ff4444', bg: '#ff444422' }
  if (point < 2)   return { fg: '#ff6b35', bg: '#ff6b3522' }
  if (point < 5)   return { fg: '#ffa500', bg: '#ffa50022' }
  if (point < 10)  return { fg: '#00d4ff', bg: '#00d4ff22' }
  return              { fg: '#00ff88', bg: '#00ff8822' }
}

export function RoundHistory() {
  const { recentCrashPoints } = useGameStore()

  return (
    <div className="rounded-2xl p-4" style={{ backgroundColor: '#0d0d1a', border: '1px solid #1a1a2e' }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: '#4a5568' }}>
          Histórico
        </h3>
        <span className="text-xs" style={{ color: '#2d3748' }}>{recentCrashPoints.length} rodadas</span>
      </div>

      {recentCrashPoints.length === 0 ? (
        <p className="text-xs" style={{ color: '#2d3748' }}>Sem histórico</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {recentCrashPoints.map((point, i) => {
            const { fg, bg } = crashColor(point)
            const isLatest = i === 0
            return (
              <span
                key={i}
                className="text-xs font-bold px-2 py-1 rounded-lg transition-all"
                style={{
                  color: fg,
                  backgroundColor: bg,
                  border: isLatest ? `1px solid ${fg}44` : '1px solid transparent',
                  boxShadow: isLatest ? `0 0 8px ${fg}33` : 'none',
                  fontSize: isLatest ? '0.75rem' : '0.7rem',
                }}
              >
                {point.toFixed(2)}x
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}
