import {
  Entity,
  PrimaryKey,
  Property,
  Enum,
  OneToMany,
  Collection,
  Cascade,
} from '@mikro-orm/core'
import { randomUUID } from 'crypto'
import { BetOrmEntity } from './bet.orm-entity'

export enum RoundStatus {
  BETTING = 'BETTING',
  RUNNING = 'RUNNING',
  CRASHED = 'CRASHED',
}

@Entity({ tableName: 'rounds' })
export class RoundOrmEntity {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID()

  @Enum(() => RoundStatus)
  status: RoundStatus = RoundStatus.BETTING

  @Property()
  serverSeed!: string

  @Property()
  serverSeedHash!: string

  @Property({ type: 'decimal', precision: 10, scale: 2 })
  crashPoint!: number

  @Property({ type: 'decimal', precision: 10, scale: 4 })
  growthRate!: number

  @Property()
  bettingStartsAt!: Date

  @Property()
  bettingEndsAt!: Date

  @Property({ nullable: true })
  startedAt: Date | null = null

  @Property({ nullable: true })
  crashedAt: Date | null = null

  @OneToMany(() => BetOrmEntity, (bet) => bet.round, { cascade: [Cascade.ALL] })
  bets = new Collection<BetOrmEntity>(this)

  @Property({ onCreate: () => new Date() })
  createdAt: Date = new Date()
}
