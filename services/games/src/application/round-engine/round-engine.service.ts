import { Injectable, OnApplicationBootstrap, Optional } from '@nestjs/common'
import { EntityManager } from '@mikro-orm/core'
import { randomUUID } from 'crypto'
import { generateServerSeed, computeServerSeedHash, computeCrashPoint } from '../../domain/provably-fair/crash-point'
import { RoundOrmEntity, RoundStatus } from '../../infrastructure/persistence/entities/round.orm-entity'
import { BetOrmEntity, BetStatus } from '../../infrastructure/persistence/entities/bet.orm-entity'
import { EventPublisherService } from '../../infrastructure/messaging/event-publisher.service'
import { IRoundEngine } from '../use-cases/cashout/round-engine.interface'
import { BETTING_DURATION_MS, GROWTH_RATE, POST_CRASH_DELAY_MS } from './round-engine.constants'
import { GameGateway } from '../../presentation/gateways/game.gateway'

@Injectable()
export class RoundEngineService implements IRoundEngine, OnApplicationBootstrap {
  private currentRoundId: string | null = null
  private runningStartedAt: number | null = null
  private crashTimerHandle: ReturnType<typeof setTimeout> | null = null
  private autoCashoutTimers: Map<string, ReturnType<typeof setTimeout>> = new Map()

  constructor(
    private readonly em: EntityManager,
    private readonly eventPublisher: EventPublisherService,
    @Optional() private readonly gateway: GameGateway | null,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const existing = await this.em.fork().findOne(RoundOrmEntity, {
      status: { $in: [RoundStatus.BETTING, RoundStatus.RUNNING] },
    })

    if (existing) {
      this.currentRoundId = existing.id
      if (existing.status === RoundStatus.RUNNING && existing.startedAt) {
        this.runningStartedAt = existing.startedAt.getTime()
        const elapsed = Date.now() - this.runningStartedAt
        const crashTimeMs = (Math.log(existing.crashPoint) / GROWTH_RATE) * 1000
        const remaining = Math.max(0, crashTimeMs - elapsed)
        this.crashTimerHandle = setTimeout(() => this.crashRound(existing.id), remaining)
        this.scheduleAutoCashouts(existing.id, existing.crashPoint)
      } else if (existing.status === RoundStatus.BETTING) {
        const remaining = Math.max(0, existing.bettingEndsAt.getTime() - Date.now())
        setTimeout(() => this.startRunningPhase(existing.id, existing.crashPoint), remaining)
      }
    } else {
      this.startBettingPhase()
    }
  }

  getCurrentMultiplier(): number {
    if (this.runningStartedAt === null) return 1.0
    const elapsed = (Date.now() - this.runningStartedAt) / 1000
    return Math.exp(elapsed * GROWTH_RATE)
  }

  getCurrentRoundId(): string | null {
    return this.currentRoundId
  }

  private startBettingPhase(): void {
    const serverSeed = generateServerSeed()
    const roundId = randomUUID()
    const serverSeedHash = computeServerSeedHash(serverSeed)
    const crashPoint = computeCrashPoint(serverSeed, roundId)
    const now = new Date()
    const bettingEndsAt = new Date(now.getTime() + BETTING_DURATION_MS)

    const round = new RoundOrmEntity()
    round.id = roundId
    round.serverSeed = serverSeed
    round.serverSeedHash = serverSeedHash
    round.crashPoint = crashPoint
    round.growthRate = GROWTH_RATE
    round.bettingStartsAt = now
    round.bettingEndsAt = bettingEndsAt
    round.status = RoundStatus.BETTING

    const fork = this.em.fork()
    fork
      .persist(round)
      .flush()
      .then(() => {
        this.currentRoundId = roundId
        this.gateway?.emitRoundBetting({
          roundId,
          serverSeedHash,
          bettingEndsAt: bettingEndsAt.toISOString(),
        })
        setTimeout(() => this.startRunningPhase(roundId, crashPoint), BETTING_DURATION_MS)
      })
  }

  private async startRunningPhase(roundId: string, crashPoint: number): Promise<void> {
    const fork = this.em.fork()
    const round = await fork.findOne(RoundOrmEntity, { id: roundId }, { populate: ['bets'] })
    if (!round) return

    round.status = RoundStatus.RUNNING
    round.startedAt = new Date()
    await fork.flush()

    this.runningStartedAt = round.startedAt.getTime()

    const bets = round.bets.getItems()
    for (const bet of bets) {
      if (bet.status === BetStatus.PENDING) {
        bet.status = BetStatus.ACTIVE
      }
    }
    await fork.flush()

    this.gateway?.emitRoundStarted({
      roundId,
      startTimestamp: this.runningStartedAt,
      growthRate: GROWTH_RATE,
    })

    const crashTimeMs = (Math.log(crashPoint) / GROWTH_RATE) * 1000
    this.crashTimerHandle = setTimeout(() => this.crashRound(roundId), crashTimeMs)

    this.scheduleAutoCashouts(roundId, crashPoint)
  }

  private scheduleAutoCashouts(roundId: string, crashPoint: number): void {
    const fork = this.em.fork()
    fork
      .find(BetOrmEntity, { round: { id: roundId }, status: BetStatus.ACTIVE, autoCashoutAt: { $ne: null } })
      .then(bets => {
        for (const bet of bets) {
          if (bet.autoCashoutAt === null) continue
          const targetMultiplier = bet.autoCashoutAt
          if (targetMultiplier >= crashPoint) continue
          const t = Math.log(targetMultiplier) / GROWTH_RATE
          const elapsed = this.runningStartedAt !== null ? (Date.now() - this.runningStartedAt) / 1000 : 0
          const delay = Math.max(0, (t - elapsed) * 1000)
          const handle = setTimeout(() => this.triggerAutoCashout(bet.id, targetMultiplier), delay)
          this.autoCashoutTimers.set(bet.id, handle)
        }
      })
  }

  private clearAutoCashoutTimers(): void {
    for (const handle of this.autoCashoutTimers.values()) {
      clearTimeout(handle)
    }
    this.autoCashoutTimers.clear()
  }

  private triggerAutoCashout(betId: string, multiplier: number): void {
    this.autoCashoutTimers.delete(betId)
    const fork = this.em.fork()
    fork
      .findOne(BetOrmEntity, { id: betId, status: BetStatus.ACTIVE })
      .then(bet => {
        if (!bet) return
        const payout = Math.floor(bet.amount * multiplier)
        bet.status = BetStatus.CASHED_OUT
        bet.cashoutMultiplier = multiplier
        bet.payout = payout
        bet.cashedOutAt = new Date()
        return fork.flush().then(() => {
          this.eventPublisher.publish('wallet.credit.requested', {
            idempotencyKey: randomUUID(),
            betId: bet.id,
            playerId: bet.playerId,
            amount: payout,
          })
          this.gateway?.emitBetCashout({ playerId: bet.playerId, cashoutMultiplier: multiplier, payout })
        })
      })
  }

  private async crashRound(roundId: string): Promise<void> {
    this.crashTimerHandle = null
    this.clearAutoCashoutTimers()
    const fork = this.em.fork()
    const round = await fork.findOne(RoundOrmEntity, { id: roundId }, { populate: ['bets'] })
    if (!round || round.status !== RoundStatus.RUNNING) return

    round.status = RoundStatus.CRASHED
    round.crashedAt = new Date()

    const bets = round.bets.getItems()
    for (const bet of bets) {
      if (bet.status === BetStatus.ACTIVE) {
        bet.status = BetStatus.LOST
      }
    }

    await fork.flush()

    this.runningStartedAt = null
    this.currentRoundId = null

    this.gateway?.emitRoundCrashed({
      roundId,
      crashPoint: round.crashPoint,
    })

    setTimeout(() => this.startBettingPhase(), POST_CRASH_DELAY_MS)
  }
}
