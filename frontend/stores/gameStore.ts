import { create } from 'zustand'

export type GamePhase = 'IDLE' | 'BETTING' | 'RUNNING' | 'CRASHED'

export interface BetEntry {
  playerId: string
  playerName: string
  amount: number
  status: string
  cashoutMultiplier: number | null
}

export interface BetResult {
  type: 'WIN' | 'LOSS'
  amount: number
  multiplier?: number
  betAmount?: number
}

interface GameState {
  phase: GamePhase
  roundId: string | null
  serverSeedHash: string | null
  bettingEndsAt: string | null
  startTimestamp: number | null
  growthRate: number
  currentBets: BetEntry[]
  lastCrashPoint: number | null
  recentCrashPoints: number[]
  myBet: BetEntry | null
  result: BetResult | null

  setRoundBetting: (data: { roundId: string; serverSeedHash: string; bettingEndsAt: string; bets?: BetEntry[] }) => void
  setRoundStarted: (data: { roundId: string; startTimestamp: number; growthRate: number; bets?: BetEntry[] }) => void
  setRoundCrashed: (data: { roundId: string; crashPoint: number }) => void
  addBet: (bet: BetEntry) => void
  updateBetCashout: (data: { playerId: string; cashoutMultiplier: number; payout: number }) => void
  setMyBet: (bet: BetEntry | null) => void
  clearResult: () => void
  initHistory: (points: number[]) => void
}

export const useGameStore = create<GameState>((set, get) => ({
  phase: 'IDLE',
  roundId: null,
  serverSeedHash: null,
  bettingEndsAt: null,
  startTimestamp: null,
  growthRate: 0.06,
  currentBets: [],
  lastCrashPoint: null,
  recentCrashPoints: [],
  myBet: null,
  result: null,

  setRoundBetting: (data) => set({
    phase: 'BETTING',
    roundId: data.roundId,
    serverSeedHash: data.serverSeedHash,
    bettingEndsAt: data.bettingEndsAt,
    startTimestamp: null,
    currentBets: data.bets ?? [],
    myBet: null,
  }),

  setRoundStarted: (data) => set((state) => ({
    phase: 'RUNNING',
    roundId: data.roundId,
    startTimestamp: data.startTimestamp,
    growthRate: data.growthRate,
    currentBets: data.bets ?? state.currentBets,
    myBet: state.myBet ? { ...state.myBet, status: 'ACTIVE' } : null,
  })),

  setRoundCrashed: (data) => set((state) => ({
    phase: 'CRASHED',
    lastCrashPoint: data.crashPoint,
    recentCrashPoints: [data.crashPoint, ...state.recentCrashPoints].slice(0, 20),
    currentBets: state.currentBets.map(b =>
      b.status === 'ACTIVE' ? { ...b, status: 'LOST' } : b
    ),
    result: state.myBet?.status === 'ACTIVE'
      ? { type: 'LOSS' as const, amount: state.myBet.amount }
      : state.result,
  })),

  addBet: (bet) => set((state) => ({
    currentBets: [...state.currentBets, bet],
  })),

  updateBetCashout: (data) => set((state) => {
    const isMyBet = state.myBet?.playerId === data.playerId
    return {
      currentBets: state.currentBets.map(b =>
        b.playerId === data.playerId
          ? { ...b, status: 'CASHED_OUT', cashoutMultiplier: data.cashoutMultiplier }
          : b
      ),
      myBet: isMyBet
        ? { ...state.myBet!, status: 'CASHED_OUT', cashoutMultiplier: data.cashoutMultiplier }
        : state.myBet,
      result: isMyBet
        ? { type: 'WIN' as const, amount: data.payout, multiplier: data.cashoutMultiplier, betAmount: state.myBet!.amount }
        : state.result,
    }
  }),

  setMyBet: (bet) => set({ myBet: bet }),
  clearResult: () => set({ result: null }),

  initHistory: (points) => set((state) => ({
    recentCrashPoints: points.length > 0 ? points : state.recentCrashPoints,
  })),
}))
