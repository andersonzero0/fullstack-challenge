'use client'
import { useState } from 'react'
import { BetList } from './BetList'
import { RoundHistory } from './RoundHistory'
import { Leaderboard } from './Leaderboard'
import { FairnessInfo } from './FairnessInfo'

type Tab = 'bets' | 'history' | 'leaderboard' | 'fair'

const TABS: { id: Tab; label: string }[] = [
  { id: 'bets', label: 'Apostas' },
  { id: 'history', label: 'Histórico' },
  { id: 'leaderboard', label: 'Placar' },
  { id: 'fair', label: '🔒' },
]

export function GameTabs() {
  const [activeTab, setActiveTab] = useState<Tab>('bets')

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Tab bar */}
      <div
        className="flex rounded-xl overflow-hidden shrink-0"
        style={{ backgroundColor: '#0d0d1a', border: '1px solid #1a1a2e' }}
      >
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className="flex-1 py-2.5 text-xs font-bold transition-all"
            style={{
              backgroundColor: activeTab === id ? '#8b5cf6' : 'transparent',
              color: activeTab === id ? '#fff' : '#4a5568',
              boxShadow: activeTab === id ? '0 0 12px rgba(139,92,246,0.3)' : 'none',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content — scrollable, fills remaining height */}
      <div className="flex-1 min-h-0 overflow-y-auto mt-3">
        {activeTab === 'bets' && <BetList />}
        {activeTab === 'history' && <RoundHistory />}
        {activeTab === 'leaderboard' && <Leaderboard />}
        {activeTab === 'fair' && <FairnessInfo />}
      </div>
    </div>
  )
}
