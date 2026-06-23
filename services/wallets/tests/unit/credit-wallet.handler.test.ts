import { describe, it, expect, mock, beforeAll } from 'bun:test'

// Must be before dynamic imports — stubs ORM/NestJS decorators that crash without reflect-metadata
mock.module('@nestjs/common', () => ({ Controller: () => () => {}, Injectable: () => () => {}, Inject: () => () => {}, Post: () => () => {}, Get: () => () => {}, UseGuards: () => () => {}, HttpCode: () => () => {}, HttpStatus: { OK: 200, ACCEPTED: 202 }, NotFoundException: class NotFoundException extends Error {}, Module: () => () => {}, Logger: class Logger { log() {} error() {} }, createParamDecorator: () => () => {}, ExecutionContext: class {}, MiddlewareConsumer: class {} }))
mock.module('@nestjs/microservices', () => ({ MessagePattern: () => () => {}, Payload: () => () => {}, ClientProxy: class ClientProxy {} }))
mock.module('@mikro-orm/core', () => ({ EntityManager: class {} }))
mock.module('../../src/infrastructure/persistence/entities/wallet.orm-entity', () => ({
  WalletOrmEntity: class WalletOrmEntity {},
}))
mock.module('../../src/infrastructure/persistence/entities/inbox-event.orm-entity', () => ({
  InboxEventOrmEntity: class InboxEventOrmEntity {},
}))

let CreditWalletHandler: typeof import('../../src/application/event-handlers/credit-wallet.handler').CreditWalletHandler

beforeAll(async () => {
  const mod = await import('../../src/application/event-handlers/credit-wallet.handler')
  CreditWalletHandler = mod.CreditWalletHandler
})

const payload = {
  idempotencyKey: 'idem-credit-1',
  betId: 'bet-1',
  playerId: 'player-1',
  amount: 2500,
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

describe('CreditWalletHandler', () => {
  it('credits wallet balance and persists inbox', async () => {
    const wallet = { id: 'w-1', playerId: 'player-1', balance: 1000 }
    const em = makeEm({ inbox: null, wallet })
    const publisher = makePublisher()
    const handler = new CreditWalletHandler(em as any, publisher as any)
    await handler.handle(payload)
    expect(wallet.balance).toBe(3500)
    // no reply needed — frontend fetches balance on phase transition
    expect(publisher.events).toHaveLength(0)
    expect(em._persisted).toHaveLength(1)
  })

  it('skips if idempotency key already processed', async () => {
    const em = makeEm({ inbox: { idempotencyKey: 'idem-credit-1' } })
    const publisher = makePublisher()
    const handler = new CreditWalletHandler(em as any, publisher as any)
    await handler.handle(payload)
    expect(publisher.events).toHaveLength(0)
    expect(em._persisted).toHaveLength(0)
  })

  it('credits zero-balance wallet correctly', async () => {
    const wallet = { id: 'w-1', playerId: 'player-1', balance: 0 }
    const em = makeEm({ inbox: null, wallet })
    const publisher = makePublisher()
    const handler = new CreditWalletHandler(em as any, publisher as any)
    await handler.handle({ ...payload, amount: 5000 })
    expect(wallet.balance).toBe(5000)
  })

  it('does nothing when wallet not found', async () => {
    const em = makeEm({ inbox: null, wallet: null })
    const publisher = makePublisher()
    const handler = new CreditWalletHandler(em as any, publisher as any)
    await handler.handle(payload)
    expect(publisher.events).toHaveLength(0)
    expect(em._persisted).toHaveLength(0)
  })
})
