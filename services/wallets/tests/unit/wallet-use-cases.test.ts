import { describe, it, expect, mock, beforeAll } from 'bun:test'

mock.module('@nestjs/common', () => ({ Controller: () => () => {}, Injectable: () => () => {}, Inject: () => () => {}, Post: () => () => {}, Get: () => () => {}, UseGuards: () => () => {}, HttpCode: () => () => {}, HttpStatus: { OK: 200, ACCEPTED: 202 }, NotFoundException: class NotFoundException extends Error {}, Module: () => () => {}, Logger: class Logger { log() {} error() {} }, createParamDecorator: () => () => {}, ExecutionContext: class {}, MiddlewareConsumer: class {} }))
mock.module('@mikro-orm/core', () => ({ EntityManager: class {} }))
mock.module('../../src/infrastructure/persistence/entities/wallet.orm-entity', () => ({
  WalletOrmEntity: class WalletOrmEntity {},
}))

let CreateWalletUseCase: typeof import('../../src/application/use-cases/create-wallet/create-wallet.use-case').CreateWalletUseCase
let GetWalletUseCase: typeof import('../../src/application/use-cases/get-wallet/get-wallet.use-case').GetWalletUseCase
let WalletNotFoundError: typeof import('../../src/application/use-cases/get-wallet/wallet-not-found.error').WalletNotFoundError

beforeAll(async () => {
  const createMod = await import('../../src/application/use-cases/create-wallet/create-wallet.use-case')
  CreateWalletUseCase = createMod.CreateWalletUseCase
  const getMod = await import('../../src/application/use-cases/get-wallet/get-wallet.use-case')
  GetWalletUseCase = getMod.GetWalletUseCase
  const errMod = await import('../../src/application/use-cases/get-wallet/wallet-not-found.error')
  WalletNotFoundError = errMod.WalletNotFoundError
})

function makeExistingWallet() {
  return { id: 'wallet-1', playerId: 'player-1', balance: 5000 }
}

function makeEm(existing: unknown) {
  const persisted: unknown[] = []
  return {
    findOne: async () => existing,
    persist: (e: unknown) => persisted.push(e),
    flush: async () => {},
    _persisted: persisted,
  }
}

describe('CreateWalletUseCase', () => {
  it('creates new wallet with balance 0 when none exists', async () => {
    const em = makeEm(null)
    const useCase = new CreateWalletUseCase(em as any)
    const result = await useCase.execute('player-new')
    expect(result.balance).toBe(0)
    expect(result.id).toBeTruthy()
    expect(em._persisted).toHaveLength(1)
  })

  it('returns existing wallet without creating new (idempotent)', async () => {
    const em = makeEm(makeExistingWallet())
    const useCase = new CreateWalletUseCase(em as any)
    const result = await useCase.execute('player-1')
    expect(result.id).toBe('wallet-1')
    expect(result.balance).toBe(5000)
    expect(em._persisted).toHaveLength(0)
  })
})

describe('GetWalletUseCase', () => {
  it('returns wallet when found', async () => {
    const em = makeEm(makeExistingWallet())
    const useCase = new GetWalletUseCase(em as any)
    const result = await useCase.execute('player-1')
    expect(result.id).toBe('wallet-1')
    expect(result.balance).toBe(5000)
  })

  it('throws WalletNotFoundError when not found', async () => {
    const em = makeEm(null)
    const useCase = new GetWalletUseCase(em as any)
    await expect(useCase.execute('unknown')).rejects.toThrow(WalletNotFoundError)
  })
})
