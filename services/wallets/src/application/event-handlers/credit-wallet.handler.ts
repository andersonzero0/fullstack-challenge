import { Controller } from '@nestjs/common'
import { MessagePattern, Payload } from '@nestjs/microservices'
import { EntityManager } from '@mikro-orm/core'
import { WalletOrmEntity } from '../../infrastructure/persistence/entities/wallet.orm-entity'
import { InboxEventOrmEntity } from '../../infrastructure/persistence/entities/inbox-event.orm-entity'
import { Wallet } from '../../domain/wallet/wallet.entity'
import { EventPublisherService } from '../../infrastructure/messaging/event-publisher.service'

interface CreditRequestedPayload {
  idempotencyKey: string
  betId: string
  playerId: string
  amount: number
}

@Controller()
export class CreditWalletHandler {
  constructor(
    private readonly em: EntityManager,
    private readonly eventPublisher: EventPublisherService,
  ) {}

  @MessagePattern('wallet.credit.requested')
  async handle(@Payload() payload: CreditRequestedPayload): Promise<void> {
    const fork = this.em.fork()
    const existing = await fork.findOne(InboxEventOrmEntity, { idempotencyKey: payload.idempotencyKey })
    if (existing) return

    const walletOrm = await fork.findOne(WalletOrmEntity, { playerId: payload.playerId })
    if (!walletOrm) return

    const wallet = new Wallet(walletOrm.id, walletOrm.playerId, walletOrm.balance)
    wallet.credit(payload.amount)
    walletOrm.balance = wallet.balance

    const inbox = new InboxEventOrmEntity()
    inbox.idempotencyKey = payload.idempotencyKey
    inbox.eventType = 'wallet.credit.requested'
    inbox.payload = payload as unknown as Record<string, unknown>

    fork.persist(inbox)
    await fork.flush()
  }
}
