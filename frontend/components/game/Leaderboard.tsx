'use client'
import { useEffect, useState } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

interface LeaderboardEntry {
  playerId: string
  playerName: string
  totalPayout: number
  wins: number
}

export function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])

  useEffect(() => {
    fetch(`${API_URL}/games/rounds/leaderboard`)
      .then(r => r.json())
      .then(data => setEntries(Array.isArray(data) ? data : []))
      .catch(() => {})

    const interval = setInterval(() => {
      fetch(`${API_URL}/games/rounds/leaderboard`)
        .then(r => r.json())
        .then(data => setEntries(Array.isArray(data) ? data : []))
        .catch(() => {})
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="rounded-xl p-4" style={{ backgroundColor: '#0d0d1a', border: '1px solid #1a1a2e' }}>
      <h3 className="text-sm font-semibold mb-3" style={{ color: '#94a3b8' }}>Placar</h3>
      {entries.length === 0 ? (
        <p className="text-xs" style={{ color: '#4a4a5a' }}>Sem dados</p>
      ) : (
        <div className="space-y-2">
          {entries.map((e, i) => (
            <div key={e.playerId} className="flex items-center gap-2 text-xs">
              <span className="w-5 text-center font-bold" style={{ color: i < 3 ? '#ffd700' : '#94a3b8' }}>
                {i + 1}
              </span>
              <span className="flex-1 font-medium truncate" style={{ color: '#e2e8f0' }}>
                {e.playerName}
              </span>
              <span style={{ color: '#00ff88' }}>R${(e.totalPayout / 100).toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
