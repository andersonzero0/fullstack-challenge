import { describe, it, expect, mock, beforeAll } from 'bun:test'
import { RoundNotInBettingPhaseError, DuplicateBetError, RoundNotFoundError } from '../../src/application/use-cases/place-bet/place-bet.errors'

mock.module('../../src/infrastructure/persistence/entities/round.orm-entity', () => ({
  RoundStatus: { BETTING: 'BETTING', RUNNING: 'RUNNING', CRASHED: 'CRASHED' },
  RoundOrmEntity: class RoundOrmEntity {},
}))

mock.module('../../src/infrastructure/persistence/entities/bet.orm-entity', () => ({
  BetStatus: { PENDING: 'PENDING', ACTIVE: 'ACTIVE', CASHED_OUT: 'CASHED_OUT', LOST: 'LOST', REJECTED: 'REJECTED' },
  BetOrmEntity: class BetOrmEntity {},
}))

mock.module('../../src/infrastructure/messaging/event-publisher.service', () => ({
  EventPublisherService: class EventPublisherService {},
}))

mock.module('../../src/infrastructure/messaging/outbox-publisher.service', () => ({
  OutboxPublisherService: class OutboxPublisherService {},
}))

const RoundStatus = { BETTING: 'BETTING', RUNNING: 'RUNNING', CRASHED: 'CRASHED' } as const
type RoundStatus = typeof RoundStatus[keyof typeof RoundStatus]

function makeRound(status: RoundStatus, bets: Array<{ playerId: string }> = []) {
  return {
    id: 'round-1',
    status,
    bets: { getItems: () => bets },
  }
}

function makeDeps(round: unknown) {
  const published: Array<{ pattern: string; payload: unknown }> = []
  const persisted: unknown[] = []

  const em = {
    findOne: async (_entity: unknown, _where: unknown, _opts: unknown) => round,
    persist: (entity: unknown) => { persisted.push(entity) },
    flush: async () => {},
  }

  const outboxPublisher = {
    writeEvent: (_em: unknown, pattern: string, payload: Record<string, unknown>) => {
      published.push({ pattern, payload })
    },
  }

  return { em, outboxPublisher, published, persisted }
}

describe('PlaceBetUseCase', () => {
  let PlaceBetUseCase: any

  beforeAll(async () => {
    const mod = await import('../../src/application/use-cases/place-bet/place-bet.use-case')
    PlaceBetUseCase = mod.PlaceBetUseCase
  })

  const dto = { roundId: 'round-1', playerId: 'player-1', playerName: 'Alice', amount: 1000 }

  it('places bet and publishes event', async () => {
    const { em, outboxPublisher, published } = makeDeps(makeRound(RoundStatus.BETTING))
    const useCase = new PlaceBetUseCase(em, outboxPublisher)
    const result = await useCase.execute(dto)
    expect(result.betId).toBeTruthy()
    expect(published).toHaveLength(1)
    expect(published[0].pattern).toBe('wallet.debit.requested')
    expect((published[0].payload as any).playerId).toBe('player-1')
    expect((published[0].payload as any).amount).toBe(1000)
  })

  it('throws RoundNotFoundError when round is null', async () => {
    const { em, outboxPublisher } = makeDeps(null)
    const useCase = new PlaceBetUseCase(em, outboxPublisher)
    await expect(useCase.execute(dto)).rejects.toThrow(RoundNotFoundError)
  })

  it('throws RoundNotInBettingPhaseError when RUNNING', async () => {
    const { em, outboxPublisher } = makeDeps(makeRound(RoundStatus.RUNNING))
    const useCase = new PlaceBetUseCase(em, outboxPublisher)
    await expect(useCase.execute(dto)).rejects.toThrow(RoundNotInBettingPhaseError)
  })

  it('throws DuplicateBetError when player already bet', async () => {
    const { em, outboxPublisher } = makeDeps(makeRound(RoundStatus.BETTING, [{ playerId: 'player-1' }]))
    const useCase = new PlaceBetUseCase(em, outboxPublisher)
    await expect(useCase.execute(dto)).rejects.toThrow(DuplicateBetError)
  })
})
