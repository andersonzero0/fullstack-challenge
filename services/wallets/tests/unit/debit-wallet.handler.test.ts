import { describe, it, expect, mock, beforeAll } from 'bun:test'

mock.module('@nestjs/common', () => ({ Controller: () => () => {}, Injectable: () => () => {}, Inject: () => () => {}, Post: () => () => {}, Get: () => () => {}, UseGuards: () => () => {}, HttpCode: () => () => {}, HttpStatus: { OK: 200, ACCEPTED: 202 }, NotFoundException: class NotFoundException extends Error {}, Module: () => () => {}, Logger: class Logger { log() {} error() {} }, createParamDecorator: () => () => {}, ExecutionContext: class {}, MiddlewareConsumer: class {} }))
mock.module('@nestjs/microservices', () => ({ MessagePattern: () => () => {}, Payload: () => () => {}, ClientProxy: class ClientProxy {} }))
mock.module('@mikro-orm/core', () => ({ EntityManager: class {} }))
mock.module('../../src/infrastructure/persistence/entities/wallet.orm-entity', () => ({
  WalletOrmEntity: class WalletOrmEntity {},
}))
mock.module('../../src/infrastructure/persistence/entities/inbox-event.orm-entity', () => ({
  InboxEventOrmEntity: class InboxEventOrmEntity {},
}))

let DebitWalletHandler: typeof import('../../src/application/event-handlers/debit-wallet.handler').DebitWalletHandler

beforeAll(async () => {
  const mod = await import('../../src/application/event-handlers/debit-wallet.handler')
  DebitWalletHandler = mod.DebitWalletHandler
})

const payload = {
  idempotencyKey: 'idem-1',
  betId: 'bet-1',
  playerId: 'player-1',
  amount: 1000,
}

function makeEm(opts: { inbox?: object | null; wallet?: object | null }) {
  const persisted: unknown[] = []
  const fork = {
    findOne: async (_entity: unknown, where: Record<string, unknown>) => {
      if ('idempotencyKey' in where) return opts.inbox ?? null
      if ('playerId' in where) return opts.wallet ?? null
      return null
    },
    persist: (e: unknown) => { persisted.push(e); return fork },
    flush: async () => {},
  }
  return {
    fork: () => fork,
    _persisted: persisted,
  }
}

function makePublisher() {
  const events: Array<{ pattern: string; payload: unknown }> = []
  return {
    publish: (pattern: string, p: Record<string, unknown>) => events.push({ pattern, payload: p }),
    events,
  }
}

describe('DebitWalletHandler', () => {
  it('debits wallet balance and persists inbox', async () => {
    const wallet = { id: 'w-1', playerId: 'player-1', balance: 5000 }
    const em = makeEm({ inbox: null, wallet })
    const publisher = makePublisher()
    const handler = new DebitWalletHandler(em as any, publisher as any)
    await handler.handle(payload)
    expect(wallet.balance).toBe(4000)
    // no reply needed — games activates bets on round start
    expect(publisher.events).toHaveLength(0)
    expect(em._persisted).toHaveLength(1)
  })

  it('skips if idempotency key already processed', async () => {
    const em = makeEm({ inbox: { idempotencyKey: 'idem-1' } })
    const publisher = makePublisher()
    const handler = new DebitWalletHandler(em as any, publisher as any)
    await handler.handle(payload)
    expect(publisher.events).toHaveLength(0)
    expect(em._persisted).toHaveLength(0)
  })

  it('publishes wallet.debit.failed with WALLET_NOT_FOUND when wallet missing', async () => {
    const em = makeEm({ inbox: null, wallet: null })
    const publisher = makePublisher()
    const handler = new DebitWalletHandler(em as any, publisher as any)
    await handler.handle(payload)
    expect(publisher.events[0].pattern).toBe('wallet.debit.failed')
    expect((publisher.events[0].payload as any).reason).toBe('WALLET_NOT_FOUND')
  })

  it('publishes wallet.debit.failed with INSUFFICIENT_BALANCE', async () => {
    const wallet = { id: 'w-1', playerId: 'player-1', balance: 500 }
    const em = makeEm({ inbox: null, wallet })
    const publisher = makePublisher()
    const handler = new DebitWalletHandler(em as any, publisher as any)
    await handler.handle({ ...payload, amount: 1000 })
    expect(publisher.events[0].pattern).toBe('wallet.debit.failed')
    expect((publisher.events[0].payload as any).reason).toBe('INSUFFICIENT_BALANCE')
  })

  it('does not persist inbox on failure', async () => {
    const wallet = { id: 'w-1', playerId: 'player-1', balance: 500 }
    const em = makeEm({ inbox: null, wallet })
    const publisher = makePublisher()
    const handler = new DebitWalletHandler(em as any, publisher as any)
    await handler.handle({ ...payload, amount: 1000 })
    expect(em._persisted).toHaveLength(0)
  })
})
