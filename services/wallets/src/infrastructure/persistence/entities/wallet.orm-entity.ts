import { Entity, PrimaryKey, Property, Unique } from '@mikro-orm/core'
import { randomUUID } from 'crypto'

@Entity({ tableName: 'wallets' })
export class WalletOrmEntity {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID()

  @Property()
  @Unique()
  playerId!: string

  @Property({ type: 'bigint' })
  balance: number = 0

  @Property({ onCreate: () => new Date() })
  createdAt: Date = new Date()

  @Property({ onUpdate: () => new Date() })
  updatedAt: Date = new Date()
}
