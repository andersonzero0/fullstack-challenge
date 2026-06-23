import { create } from 'zustand'

export type AutoBetStrategy = 'fixed' | 'martingale'

interface AutoBetState {
  running: boolean
  strategy: AutoBetStrategy
  baseAmount: number
  currentAmount: number
  autoCashoutAt: number
  stopLossAmount: number
  roundsLeft: number
  totalRounds: number
  totalPnl: number

  setRunning: (v: boolean) => void
  setStrategy: (v: AutoBetStrategy) => void
  setBaseAmount: (v: number) => void
  setAutoCashoutAt: (v: number) => void
  setStopLoss: (v: number) => void
  setTotalRounds: (v: number) => void
  onWin: (payout: number) => void
  onLoss: (betAmount: number) => void
  reset: () => void
}

export const useAutoBetStore = create<AutoBetState>((set, get) => ({
  running: false,
  strategy: 'fixed',
  baseAmount: 1000,
  currentAmount: 1000,
  autoCashoutAt: 2.0,
  stopLossAmount: 10000,
  roundsLeft: 10,
  totalRounds: 10,
  totalPnl: 0,

  setRunning: (v) => set({ running: v }),
  setStrategy: (v) => set({ strategy: v, currentAmount: get().baseAmount }),
  setBaseAmount: (v) => set({ baseAmount: v, currentAmount: v }),
  setAutoCashoutAt: (v) => set({ autoCashoutAt: v }),
  setStopLoss: (v) => set({ stopLossAmount: v }),
  setTotalRounds: (v) => set({ totalRounds: v, roundsLeft: v }),

  onWin: (payout) => set((s) => ({
    totalPnl: s.totalPnl + payout - s.currentAmount,
    currentAmount: s.strategy === 'martingale' ? s.baseAmount : s.currentAmount,
    roundsLeft: s.roundsLeft - 1,
  })),

  onLoss: (betAmount) => set((s) => ({
    totalPnl: s.totalPnl - betAmount,
    currentAmount: s.strategy === 'martingale' ? s.currentAmount * 2 : s.baseAmount,
    roundsLeft: s.roundsLeft - 1,
  })),

  reset: () => set((s) => ({
    running: false,
    currentAmount: s.baseAmount,
    roundsLeft: s.totalRounds,
    totalPnl: 0,
  })),
}))
