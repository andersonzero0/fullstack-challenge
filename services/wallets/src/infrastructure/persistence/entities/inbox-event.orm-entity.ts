import { Entity, PrimaryKey, Property } from '@mikro-orm/core'

@Entity({ tableName: 'inbox_events' })
export class InboxEventOrmEntity {
  @PrimaryKey()
  idempotencyKey!: string

  @Property()
  eventType!: string

  @Property({ type: 'json' })
  payload!: Record<string, unknown>

  @Property({ onCreate: () => new Date() })
  processedAt: Date = new Date()
}
