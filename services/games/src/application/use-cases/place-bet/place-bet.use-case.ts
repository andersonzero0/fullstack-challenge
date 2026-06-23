import { Injectable } from '@nestjs/common'
import { EntityManager } from '@mikro-orm/core'
import { RoundOrmEntity, RoundStatus } from '../../../infrastructure/persistence/entities/round.orm-entity'
import { BetOrmEntity, BetStatus } from '../../../infrastructure/persistence/entities/bet.orm-entity'
import { OutboxPublisherService } from '../../../infrastructure/messaging/outbox-publisher.service'
import { PlaceBetDto } from './place-bet.dto'
import { RoundNotInBettingPhaseError, DuplicateBetError, RoundNotFoundError } from './place-bet.errors'
import { randomUUID } from 'crypto'

@Injectable()
export class PlaceBetUseCase {
  constructor(
    private readonly em: EntityManager,
    private readonly outboxPublisher: OutboxPublisherService,
  ) {}

  async execute(dto: PlaceBetDto): Promise<{ betId: string }> {
    const round = await this.em.findOne(RoundOrmEntity, { id: dto.roundId }, { populate: ['bets'] })

    if (!round) throw new RoundNotFoundError()
    if (round.status !== RoundStatus.BETTING) throw new RoundNotInBettingPhaseError()

    const existingBet = round.bets.getItems().find(b => b.playerId === dto.playerId)
    if (existingBet) throw new DuplicateBetError()

    const bet = new BetOrmEntity()
    bet.id = randomUUID()
    bet.playerId = dto.playerId
    bet.playerName = dto.playerName
    bet.amount = dto.amount
    bet.autoCashoutAt = dto.autoCashoutAt ?? null
    bet.status = BetStatus.PENDING
    bet.round = round

    this.em.persist(bet)
    await this.outboxPublisher.writeEvent(this.em, 'wallet.debit.requested', {
      idempotencyKey: bet.id,
      betId: bet.id,
      playerId: dto.playerId,
      amount: dto.amount,
    }, bet.id)
    await this.em.flush()

    return { betId: bet.id }
  }
}
