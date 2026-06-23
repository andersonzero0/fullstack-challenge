import { describe, it, expect, mock, beforeAll } from 'bun:test'

// Stub NestJS decorators — @HttpCode / @Controller etc. crash without reflect-metadata
mock.module('@nestjs/common', () => ({
  Controller: () => () => {},
  Post: () => () => {},
  Get: () => () => {},
  UseGuards: () => () => {},
  HttpCode: () => () => {},
  HttpStatus: { ACCEPTED: 202, OK: 200 },
  Body: () => () => {},
  Query: () => () => {},
  ConflictException: class ConflictException extends Error { constructor(m?: string) { super(m) } },
  UnprocessableEntityException: class UnprocessableEntityException extends Error { constructor(m?: string) { super(m) } },
}))

mock.module('../../src/infrastructure/auth/jwt-auth.guard', () => ({
  JwtAuthGuard: class JwtAuthGuard {},
}))
mock.module('../../src/infrastructure/auth/current-user.decorator', () => ({
  CurrentUser: () => () => {},
}))

mock.module('../../src/infrastructure/persistence/entities/bet.orm-entity', () => ({
  BetOrmEntity: class BetOrmEntity {},
  BetStatus: { PENDING: 'PENDING', ACTIVE: 'ACTIVE', CASHED_OUT: 'CASHED_OUT', LOST: 'LOST' },
}))

mock.module('../../src/infrastructure/persistence/entities/round.orm-entity', () => ({
  RoundOrmEntity: class RoundOrmEntity {},
  RoundStatus: { BETTING: 'BETTING', RUNNING: 'RUNNING', CRASHED: 'CRASHED' },
}))

let BetsController: typeof import('../../src/presentation/controllers/bets.controller').BetsController

beforeAll(async () => {
  const mod = await import('../../src/presentation/controllers/bets.controller')
  BetsController = mod.BetsController
})

function makeUser() {
  return { id: 'player-1', username: 'alice' }
}

function makeGateway() {
  const calls: unknown[] = []
  return {
    emitBetPlaced: (d: unknown) => calls.push({ type: 'bet:placed', d }),
    emitBetCashout: (d: unknown) => calls.push({ type: 'bet:cashout', d }),
    calls,
  }
}

describe('BetsController — cashout endpoint', () => {
  it('emits bet:cashout via gateway after successful cashout', async () => {
    const cashoutResult = { cashoutMultiplier: 2.5, payout: 2500 }
    const cashoutUseCase = { execute: async () => cashoutResult }
    const gateway = makeGateway()

    const controller = new BetsController(
      {} as any,              // placeBet
      cashoutUseCase as any,  // cashout
      {} as any,              // roundEngine
      {} as any,              // em
      gateway as any,         // gateway
    )

    const result = await controller.cashoutEndpoint(makeUser())

    expect(result).toEqual(cashoutResult)
    expect(gateway.calls).toHaveLength(1)
    expect((gateway.calls[0] as any).type).toBe('bet:cashout')
    expect((gateway.calls[0] as any).d.playerId).toBe('player-1')
    expect((gateway.calls[0] as any).d.cashoutMultiplier).toBe(2.5)
    expect((gateway.calls[0] as any).d.payout).toBe(2500)
  })

  it('does NOT emit bet:cashout when cashout throws', async () => {
    const { NoBetActiveError } = await import('../../src/application/use-cases/cashout/cashout.errors')
    const cashoutUseCase = { execute: async () => { throw new NoBetActiveError() } }
    const gateway = makeGateway()

    const controller = new BetsController(
      {} as any,
      cashoutUseCase as any,
      {} as any,
      {} as any,
      gateway as any,
    )

    await expect(controller.cashoutEndpoint(makeUser())).rejects.toBeDefined()
    expect(gateway.calls).toHaveLength(0)
  })
})

describe('BetsController — place bet endpoint', () => {
  it('emits bet:placed via gateway after successful bet', async () => {
    const betResult = { betId: 'bet-1' }
    const placeBetUseCase = { execute: async () => betResult }
    const gateway = makeGateway()
    const roundEngine = { getCurrentRoundId: () => 'round-1' }

    const controller = new BetsController(
      placeBetUseCase as any,
      {} as any,
      roundEngine as any,
      {} as any,
      gateway as any,
    )

    const result = await controller.placeBetEndpoint({ amount: 1000 }, makeUser())

    expect(result).toEqual(betResult)
    expect(gateway.calls).toHaveLength(1)
    expect((gateway.calls[0] as any).type).toBe('bet:placed')
    expect((gateway.calls[0] as any).d.playerId).toBe('player-1')
    expect((gateway.calls[0] as any).d.amount).toBe(1000)
  })

  it('returns 422 when no active round', async () => {
    const { UnprocessableEntityException } = await import('@nestjs/common')
    const gateway = makeGateway()
    const roundEngine = { getCurrentRoundId: () => null }

    const controller = new BetsController(
      {} as any,
      {} as any,
      roundEngine as any,
      {} as any,
      gateway as any,
    )

    await expect(controller.placeBetEndpoint({ amount: 1000 }, makeUser())).rejects.toBeInstanceOf(UnprocessableEntityException)
    expect(gateway.calls).toHaveLength(0)
  })
})
