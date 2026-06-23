import {
  Entity,
  PrimaryKey,
  Property,
  Enum,
  ManyToOne,
  Unique,
} from '@mikro-orm/core'
import { randomUUID } from 'crypto'
import type { RoundOrmEntity } from './round.orm-entity'

export enum BetStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  CASHED_OUT = 'CASHED_OUT',
  LOST = 'LOST',
  REJECTED = 'REJECTED',
}

@Entity({ tableName: 'bets' })
@Unique({ properties: ['round', 'playerId'] })
export class BetOrmEntity {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID()

  @ManyToOne({ entity: 'RoundOrmEntity' })
  round!: RoundOrmEntity

  @Property()
  playerId!: string

  @Property()
  playerName!: string

  @Property({ type: 'bigint' })
  amount!: number

  @Enum(() => BetStatus)
  status: BetStatus = BetStatus.PENDING

  @Property({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  cashoutMultiplier: number | null = null

  @Property({ type: 'bigint', nullable: true })
  payout: number | null = null

  @Property({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  autoCashoutAt: number | null = null

  @Property({ onCreate: () => new Date() })
  createdAt: Date = new Date()

  @Property({ nullable: true })
  cashedOutAt: Date | null = null
}
