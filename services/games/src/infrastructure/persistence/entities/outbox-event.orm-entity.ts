import { Entity, PrimaryKey, Property } from '@mikro-orm/core'
import { randomUUID } from 'crypto'

@Entity({ tableName: 'outbox_events' })
export class OutboxEventOrmEntity {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID()

  @Property()
  eventType!: string

  @Property({ type: 'json' })
  payload!: Record<string, unknown>

  @Property()
  idempotencyKey!: string

  @Property({ default: false })
  sent: boolean = false

  @Property({ onCreate: () => new Date() })
  createdAt: Date = new Date()
}
