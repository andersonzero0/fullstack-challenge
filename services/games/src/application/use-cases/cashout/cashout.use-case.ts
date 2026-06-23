import { Inject, Injectable } from '@nestjs/common'
import { EntityManager } from '@mikro-orm/core'
import { BetOrmEntity, BetStatus } from '../../../infrastructure/persistence/entities/bet.orm-entity'
import { RoundOrmEntity, RoundStatus } from '../../../infrastructure/persistence/entities/round.orm-entity'
import { EventPublisherService } from '../../../infrastructure/messaging/event-publisher.service'
import type { IRoundEngine } from './round-engine.interface'
import { ROUND_ENGINE } from './round-engine.interface'
import { NoBetActiveError, RoundNotRunningError } from './cashout.errors'
import { randomUUID } from 'crypto'

@Injectable()
export class CashoutUseCase {
  constructor(
    private readonly em: EntityManager,
    private readonly eventPublisher: EventPublisherService,
    @Inject(ROUND_ENGINE) private readonly roundEngine: IRoundEngine,
  ) {}

  async execute(playerId: string): Promise<{ cashoutMultiplier: number; payout: number }> {
    const roundId = this.roundEngine.getCurrentRoundId()
    if (!roundId) throw new RoundNotRunningError()

    const round = await this.em.findOne(RoundOrmEntity, { id: roundId })
    if (!round || round.status !== RoundStatus.RUNNING) throw new RoundNotRunningError()

    const bet = await this.em.findOne(BetOrmEntity, { round: { id: roundId }, playerId, status: BetStatus.ACTIVE })
    if (!bet) throw new NoBetActiveError()

    const multiplier = this.roundEngine.getCurrentMultiplier()
    const payout = Math.floor(bet.amount * multiplier)

    bet.status = BetStatus.CASHED_OUT
    bet.cashoutMultiplier = multiplier
    bet.payout = payout
    bet.cashedOutAt = new Date()

    await this.em.flush()

    this.eventPublisher.publish('wallet.credit.requested', {
      idempotencyKey: randomUUID(),
      betId: bet.id,
      playerId,
      amount: payout,
    })

    return { cashoutMultiplier: multiplier, payout }
  }
}
