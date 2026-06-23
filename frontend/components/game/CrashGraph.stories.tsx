import type { Meta, StoryObj } from '@storybook/react'
import { CrashGraph } from './CrashGraph'
import { useGameStore } from '../../stores/gameStore'
import { useEffect } from 'react'

const meta: Meta<typeof CrashGraph> = {
  title: 'Game/CrashGraph',
  component: CrashGraph,
  parameters: { layout: 'padded' },
}

export default meta
type Story = StoryObj<typeof CrashGraph>

function withPhase(phase: 'IDLE' | 'BETTING' | 'RUNNING' | 'CRASHED') {
  return function PhaseWrapper() {
    const store = useGameStore()
    useEffect(() => {
      if (phase === 'BETTING') store.setRoundBetting({ roundId: 'test-round', serverSeedHash: 'abc123', bettingEndsAt: new Date(Date.now() + 8000).toISOString() })
      if (phase === 'RUNNING') store.setRoundStarted({ roundId: 'test-round', startTimestamp: Date.now() - 2000, growthRate: 0.06 })
      if (phase === 'CRASHED') store.setRoundCrashed({ roundId: 'test-round', crashPoint: 2.34 })
    }, [])
    return <CrashGraph />
  }
}

export const Idle: Story = { render: withPhase('IDLE') }
export const Betting: Story = { render: withPhase('BETTING') }
export const Running: Story = { render: withPhase('RUNNING') }
export const Crashed: Story = { render: withPhase('CRASHED') }
