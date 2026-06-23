'use client'
import { useGameSocket } from '../../hooks/useGameSocket'
import { CrashGraph } from '../../components/game/CrashGraph'
import { BetControls } from '../../components/game/BetControls'
import { PlayerInfo } from '../../components/game/PlayerInfo'
import { GameTabs } from '../../components/game/GameTabs'
import { ResultModal } from '../../components/game/ResultModal'

export default function GamePage() {
  useGameSocket()

  return (
    <div
      className="flex flex-col"
      style={{
        backgroundColor: '#050508',
        height: '100dvh',
        overflow: 'hidden',
      }}
    >
      {/* Grid bg */}
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(0,255,136,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,136,0.025) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
      }} />

      <ResultModal />

      {/* Header */}
      <header
        className="relative z-10 flex items-center justify-between px-4 md:px-6 shrink-0"
        style={{ height: 52, borderBottom: '1px solid #0d0d1a' }}
      >
        <div className="flex items-center gap-2">
          <span
            className="text-lg font-black tracking-tight"
            style={{ color: '#00ff88', textShadow: '0 0 20px rgba(0,255,136,0.4)' }}
          >
            CRASH
          </span>
          <span
            className="text-xs px-1.5 py-0.5 rounded font-bold"
            style={{ backgroundColor: '#00ff8815', color: '#00ff88', border: '1px solid #00ff8825' }}
          >
            AO VIVO
          </span>
        </div>
        <PlayerInfo />
      </header>

      {/* Body — fills remaining height */}
      <div className="relative z-10 flex-1 min-h-0 px-4 md:px-6 py-3 md:py-4">

        {/* Desktop: side-by-side, no scroll */}
        <div className="hidden lg:grid h-full gap-4" style={{ gridTemplateColumns: '1fr 320px' }}>
          {/* Left col */}
          <div className="flex flex-col gap-3 min-h-0">
            {/* Graph: fills available space */}
            <div className="flex-1 min-h-0">
              <CrashGraph />
            </div>
            {/* Bet controls: fixed height */}
            <div className="shrink-0">
              <BetControls />
            </div>
          </div>

          {/* Right col: scrollable panel */}
          <div className="flex flex-col min-h-0">
            <GameTabs />
          </div>
        </div>

        {/* Mobile: stacked, natural scroll */}
        <div className="flex flex-col gap-3 lg:hidden h-full overflow-y-auto">
          <div style={{ aspectRatio: '16/9' }}>
            <CrashGraph />
          </div>
          <BetControls />
          <div style={{ minHeight: 360 }}>
            <GameTabs />
          </div>
        </div>

      </div>
    </div>
  )
}
