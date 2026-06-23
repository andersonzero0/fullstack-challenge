import { Injectable, Inject, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common'
import { EntityManager } from '@mikro-orm/core'
import { ClientProxy } from '@nestjs/microservices'
import { OutboxEventOrmEntity } from '../persistence/entities/outbox-event.orm-entity'

@Injectable()
export class OutboxPublisherService implements OnApplicationBootstrap, OnApplicationShutdown {
  private timer: ReturnType<typeof setInterval> | null = null

  constructor(
    private readonly em: EntityManager,
    @Inject('WALLET_COMMANDS') private readonly client: ClientProxy,
  ) {}

  onApplicationBootstrap(): void {
    this.timer = setInterval(() => this.publishPending(), 5000)
  }

  onApplicationShutdown(): void {
    if (this.timer) clearInterval(this.timer)
  }

  async publishPending(): Promise<void> {
    const fork = this.em.fork()
    const events = await fork.find(OutboxEventOrmEntity, { sent: false }, { limit: 50, orderBy: { createdAt: 'ASC' } })
    for (const event of events) {
      try {
        await this.client.emit(event.eventType, event.payload).toPromise()
        event.sent = true
        await fork.flush()
      } catch {
        // retry next tick
      }
    }
  }

  async writeEvent(
    em: EntityManager,
    eventType: string,
    payload: Record<string, unknown>,
    idempotencyKey: string,
  ): Promise<void> {
    const event = new OutboxEventOrmEntity()
    event.eventType = eventType
    event.payload = payload
    event.idempotencyKey = idempotencyKey
    em.persist(event)
  }
}
