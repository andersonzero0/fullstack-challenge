import { describe, it, expect, beforeAll, mock } from 'bun:test'
import { RoundNotRunningError, NoBetActiveError } from '../../src/application/use-cases/cashout/cashout.errors'

mock.module('../../src/infrastructure/persistence/entities/round.orm-entity', () => ({
  RoundOrmEntity: class RoundOrmEntity {},
  RoundStatus: { BETTING: 'BETTING', RUNNING: 'RUNNING', CRASHED: 'CRASHED' },
}))

mock.module('../../src/infrastructure/persistence/entities/bet.orm-entity', () => ({
  BetOrmEntity: class BetOrmEntity {},
  BetStatus: { PENDING: 'PENDING', ACTIVE: 'ACTIVE', CASHED_OUT: 'CASHED_OUT', LOST: 'LOST', REJECTED: 'REJECTED' },
}))

let CashoutUseCase: typeof import('../../src/application/use-cases/cashout/cashout.use-case').CashoutUseCase

beforeAll(async () => {
  const mod = await import('../../src/application/use-cases/cashout/cashout.use-case')
  CashoutUseCase = mod.CashoutUseCase
})

function makeRoundEngine(multiplier = 2.5, roundId: string | null = 'round-1') {
  return { getCurrentMultiplier: () => multiplier, getCurrentRoundId: () => roundId }
}

function makeEm(round: unknown, bet: unknown) {
  return {
    findOne: async (_entity: unknown, where: Record<string, unknown>) => {
      if ('playerId' in where) return bet
      return round
    },
    flush: async () => {},
  }
}

function makePublisher() {
  const events: Array<{ pattern: string; payload: unknown }> = []
  return {
    publish: (pattern: string, payload: Record<string, unknown>) => events.push({ pattern, payload }),
    events,
  }
}

describe('CashoutUseCase', () => {
  const runningRound = { id: 'round-1', status: 'RUNNING' }
  const activeBet = { id: 'bet-1', playerId: 'player-1', amount: 1000, status: 'ACTIVE', cashoutMultiplier: null, payout: null, cashedOutAt: null }

  it('cashes out and publishes credit event', async () => {
    const publisher = makePublisher()
    const em = makeEm(runningRound, activeBet)
    const useCase = new CashoutUseCase(em as any, publisher as any, makeRoundEngine(2.5))
    const result = await useCase.execute('player-1')
    expect(result.payout).toBe(2500)
    expect(result.cashoutMultiplier).toBe(2.5)
    expect(publisher.events[0].pattern).toBe('wallet.credit.requested')
  })

  it('truncates payout (Math.floor, not round)', async () => {
    const publisher = makePublisher()
    const em = makeEm(runningRound, { ...activeBet, amount: 1000 })
    const useCase = new CashoutUseCase(em as any, publisher as any, makeRoundEngine(1.999))
    const result = await useCase.execute('player-1')
    expect(result.payout).toBe(1999)
  })

  it('throws RoundNotRunningError when no active round', async () => {
    const em = makeEm(null, null)
    const useCase = new CashoutUseCase(em as any, makePublisher() as any, makeRoundEngine(2.5, null))
    await expect(useCase.execute('player-1')).rejects.toThrow(RoundNotRunningError)
  })

  it('throws RoundNotRunningError when round not RUNNING', async () => {
    const em = makeEm({ ...runningRound, status: 'BETTING' }, activeBet)
    const useCase = new CashoutUseCase(em as any, makePublisher() as any, makeRoundEngine())
    await expect(useCase.execute('player-1')).rejects.toThrow(RoundNotRunningError)
  })

  it('throws NoBetActiveError when no active bet', async () => {
    const em = makeEm(runningRound, null)
    const useCase = new CashoutUseCase(em as any, makePublisher() as any, makeRoundEngine())
    await expect(useCase.execute('player-1')).rejects.toThrow(NoBetActiveError)
  })
})
