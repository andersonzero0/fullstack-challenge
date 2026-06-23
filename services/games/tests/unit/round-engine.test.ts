import { describe, it, expect, mock, beforeAll, afterAll } from 'bun:test'

mock.module('../../src/infrastructure/persistence/entities/round.orm-entity', () => ({
  RoundOrmEntity: class RoundOrmEntity {
    id = ''; serverSeed = ''; serverSeedHash = ''; crashPoint = 2.0
    growthRate = 0.06; bettingStartsAt = new Date(); bettingEndsAt = new Date()
    status = 'BETTING'; startedAt = null; crashedAt = null
    bets = { getItems: () => [] }
  },
  RoundStatus: { BETTING: 'BETTING', RUNNING: 'RUNNING', CRASHED: 'CRASHED' },
}))

mock.module('../../src/infrastructure/persistence/entities/bet.orm-entity', () => ({
  BetOrmEntity: class BetOrmEntity {},
  BetStatus: { PENDING: 'PENDING', ACTIVE: 'ACTIVE', CASHED_OUT: 'CASHED_OUT', LOST: 'LOST', REJECTED: 'REJECTED' },
}))

mock.module('../../src/domain/provably-fair/crash-point', () => ({
  generateServerSeed: () => 'a'.repeat(64),
  computeServerSeedHash: () => 'b'.repeat(64),
  computeCrashPoint: () => 2.0,
}))

let RoundEngineService: typeof import('../../src/application/round-engine/round-engine.service').RoundEngineService
let GROWTH_RATE: number
let BETTING_DURATION_MS: number

beforeAll(async () => {
  const mod = await import('../../src/application/round-engine/round-engine.service')
  RoundEngineService = mod.RoundEngineService
  const constants = await import('../../src/application/round-engine/round-engine.constants')
  GROWTH_RATE = constants.GROWTH_RATE
  BETTING_DURATION_MS = constants.BETTING_DURATION_MS
})

function makeBet(status: string, opts: Record<string, unknown> = {}) {
  return { id: `bet-${Math.random()}`, playerId: 'p1', playerName: 'Alice', amount: 1000, status, autoCashoutAt: null, ...opts }
}

function makeRound(status: string, bets: unknown[] = [], opts: Record<string, unknown> = {}) {
  return {
    id: 'round-1',
    status,
    crashPoint: 2.0,
    growthRate: GROWTH_RATE,
    startedAt: null,
    crashedAt: null,
    bettingEndsAt: new Date(Date.now() + 10000),
    bets: { getItems: () => bets },
    ...opts,
  }
}

function makeEm(round: unknown = null) {
  const forks: Record<string, unknown>[] = []
  return {
    fork: () => {
      const fork: Record<string, unknown> = {
        findOne: async () => round,
        find: async () => [],
        persist: function (e: unknown) { forks.push(e as Record<string, unknown>); return this },
        flush: async () => {},
      }
      return fork
    },
    _forks: forks,
  }
}

describe('RoundEngineService — basic state', () => {
  it('getCurrentMultiplier returns 1.0 when not running', () => {
    const service = new RoundEngineService(makeEm() as any, { publish: () => {} } as any, null)
    expect(service.getCurrentMultiplier()).toBe(1.0)
  })

  it('getCurrentRoundId returns null initially', () => {
    const service = new RoundEngineService(makeEm() as any, { publish: () => {} } as any, null)
    expect(service.getCurrentRoundId()).toBeNull()
  })

  it('getCurrentMultiplier grows exponentially over time', () => {
    const service = new RoundEngineService(makeEm() as any, { publish: () => {} } as any, null)
    ;(service as any).runningStartedAt = Date.now() - 1000
    const m = service.getCurrentMultiplier()
    expect(m).toBeGreaterThan(1.0)
    expect(m).toBeCloseTo(Math.exp(1 * GROWTH_RATE), 2)
  })

  it('GROWTH_RATE is 0.06', () => {
    expect(GROWTH_RATE).toBe(0.06)
  })
})

describe('RoundEngineService — startRunningPhase (PENDING → ACTIVE)', () => {
  it('updates PENDING bets to ACTIVE and emits round:started', async () => {
    const pendingBet = makeBet('PENDING')
    const round = makeRound('BETTING', [pendingBet])

    const emitted: unknown[] = []
    const gateway = { emitRoundStarted: (d: unknown) => emitted.push(d) }
    const service = new RoundEngineService(makeEm(round) as any, { publish: () => {} } as any, gateway as any)

    await (service as any).startRunningPhase('round-1', 2.0)

    expect(pendingBet.status).toBe('ACTIVE')
    expect(emitted).toHaveLength(1)
    expect((emitted[0] as any).roundId).toBe('round-1')
  })

  it('does NOT change CASHED_OUT or LOST bets', async () => {
    const cashedOut = makeBet('CASHED_OUT')
    const lost = makeBet('LOST')
    const round = makeRound('BETTING', [cashedOut, lost])

    const service = new RoundEngineService(makeEm(round) as any, { publish: () => {} } as any, null)
    await (service as any).startRunningPhase('round-1', 2.0)

    expect(cashedOut.status).toBe('CASHED_OUT')
    expect(lost.status).toBe('LOST')
  })

  it('sets runningStartedAt', async () => {
    const round = makeRound('BETTING', [])
    const service = new RoundEngineService(makeEm(round) as any, { publish: () => {} } as any, null)
    await (service as any).startRunningPhase('round-1', 2.0)

    expect((service as any).runningStartedAt).toBeGreaterThan(0)
  })
})

describe('RoundEngineService — triggerAutoCashout', () => {
  it('emits bet:cashout via gateway after auto cashout', async () => {
    const bet = makeBet('ACTIVE', { autoCashoutAt: 2.0 })
    const emitted: unknown[] = []
    const gateway = { emitBetCashout: (d: unknown) => emitted.push(d) }

    const fork = {
      findOne: async () => bet,
      flush: async () => {},
    }
    const em = { fork: () => fork }
    const publisher = { publish: () => {} }
    const service = new RoundEngineService(em as any, publisher as any, gateway as any)
    ;(service as any).runningStartedAt = Date.now() - 5000

    ;(service as any).triggerAutoCashout(bet.id, 2.0)
    await new Promise(r => setTimeout(r, 20))

    expect(emitted).toHaveLength(1)
    expect((emitted[0] as any).playerId).toBe('p1')
    expect((emitted[0] as any).cashoutMultiplier).toBe(2.0)
  })
})

describe('RoundEngineService — crashRound (ACTIVE → LOST)', () => {
  it('marks ACTIVE bets as LOST and emits round:crashed', async () => {
    const activeBet = makeBet('ACTIVE')
    const round = makeRound('RUNNING', [activeBet], { startedAt: new Date() })

    const emitted: unknown[] = []
    const gateway = { emitRoundCrashed: (d: unknown) => emitted.push(d) }
    const service = new RoundEngineService(makeEm(round) as any, { publish: () => {} } as any, gateway as any)
    ;(service as any).currentRoundId = 'round-1'
    ;(service as any).runningStartedAt = Date.now() - 1000

    await (service as any).crashRound('round-1')

    expect(activeBet.status).toBe('LOST')
    expect(emitted).toHaveLength(1)
    expect((emitted[0] as any).crashPoint).toBe(2.0)
  })

  it('does NOT mark CASHED_OUT bets as LOST', async () => {
    const cashedOut = makeBet('CASHED_OUT')
    const round = makeRound('RUNNING', [cashedOut], { startedAt: new Date() })

    const service = new RoundEngineService(makeEm(round) as any, { publish: () => {} } as any, null)
    ;(service as any).currentRoundId = 'round-1'

    await (service as any).crashRound('round-1')

    expect(cashedOut.status).toBe('CASHED_OUT')
  })

  it('resets currentRoundId and runningStartedAt after crash', async () => {
    const round = makeRound('RUNNING', [], { startedAt: new Date() })
    const service = new RoundEngineService(makeEm(round) as any, { publish: () => {} } as any, null)
    ;(service as any).currentRoundId = 'round-1'
    ;(service as any).runningStartedAt = Date.now()

    await (service as any).crashRound('round-1')

    expect(service.getCurrentRoundId()).toBeNull()
    expect((service as any).runningStartedAt).toBeNull()
  })
})

describe('RoundEngineService — bootstrap recovery', () => {
  it('schedules crash timer for RUNNING round on bootstrap', async () => {
    const startedAt = new Date(Date.now() - 2000) // 2s ago
    const runningRound = makeRound('RUNNING', [], { startedAt, status: 'RUNNING' })

    const service = new RoundEngineService(makeEm(runningRound) as any, { publish: () => {} } as any, null)
    await service.onApplicationBootstrap()

    expect((service as any).currentRoundId).toBe('round-1')
    expect((service as any).runningStartedAt).toBe(startedAt.getTime())
    expect((service as any).crashTimerHandle).not.toBeNull()
  })

  it('schedules betting→running timer for BETTING round on bootstrap', async () => {
    const bettingEndsAt = new Date(Date.now() + 5000)
    const bettingRound = makeRound('BETTING', [], { bettingEndsAt, status: 'BETTING' })

    const service = new RoundEngineService(makeEm(bettingRound) as any, { publish: () => {} } as any, null)
    await service.onApplicationBootstrap()

    expect((service as any).currentRoundId).toBe('round-1')
  })

  it('starts new betting phase when no active round', async () => {
    const emitted: unknown[] = []
    const gateway = { emitRoundBetting: (d: unknown) => emitted.push(d) }
    const service = new RoundEngineService(makeEm(null) as any, { publish: () => {} } as any, gateway as any)
    await service.onApplicationBootstrap()

    // Flush the fork().persist().flush() promise
    await new Promise(r => setTimeout(r, 50))

    expect(emitted).toHaveLength(1)
    expect((emitted[0] as any).roundId).toBeTruthy()
  })
})

afterAll(() => { mock.restore() })
