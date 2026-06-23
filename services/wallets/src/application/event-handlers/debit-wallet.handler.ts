import { Controller } from '@nestjs/common'
import { MessagePattern, Payload } from '@nestjs/microservices'
import { EntityManager } from '@mikro-orm/core'
import { WalletOrmEntity } from '../../infrastructure/persistence/entities/wallet.orm-entity'
import { InboxEventOrmEntity } from '../../infrastructure/persistence/entities/inbox-event.orm-entity'
import { Wallet } from '../../domain/wallet/wallet.entity'
import { InsufficientBalanceError } from '../../domain/wallet/insufficient-balance.error'
import { EventPublisherService } from '../../infrastructure/messaging/event-publisher.service'

interface DebitRequestedPayload {
  idempotencyKey: string
  betId: string
  playerId: string
  amount: number
}

@Controller()
export class DebitWalletHandler {
  constructor(
    private readonly em: EntityManager,
    private readonly eventPublisher: EventPublisherService,
  ) {}

  @MessagePattern('wallet.debit.requested')
  async handle(@Payload() payload: DebitRequestedPayload): Promise<void> {
    const fork = this.em.fork()
    const existing = await fork.findOne(InboxEventOrmEntity, { idempotencyKey: payload.idempotencyKey })
    if (existing) return

    const walletOrm = await fork.findOne(WalletOrmEntity, { playerId: payload.playerId })

    if (!walletOrm) {
      this.eventPublisher.publish('wallet.debit.failed', {
        betId: payload.betId,
        playerId: payload.playerId,
        reason: 'WALLET_NOT_FOUND',
      })
      return
    }

    const wallet = new Wallet(walletOrm.id, walletOrm.playerId, walletOrm.balance)

    try {
      wallet.debit(payload.amount)
    } catch (err) {
      if (err instanceof InsufficientBalanceError) {
        this.eventPublisher.publish('wallet.debit.failed', {
          betId: payload.betId,
          playerId: payload.playerId,
          reason: 'INSUFFICIENT_BALANCE',
        })
        return
      }
      throw err
    }

    walletOrm.balance = wallet.balance

    const inbox = new InboxEventOrmEntity()
    inbox.idempotencyKey = payload.idempotencyKey
    inbox.eventType = 'wallet.debit.requested'
    inbox.payload = payload as unknown as Record<string, unknown>

    fork.persist(inbox)
    await fork.flush()

    // debit confirmed — games activates bets on round start, no reply needed
  }
}
