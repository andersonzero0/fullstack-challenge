import { defineConfig } from '@mikro-orm/postgresql'
import { Migrator } from '@mikro-orm/migrations'
import { RoundOrmEntity } from './infrastructure/persistence/entities/round.orm-entity'
import { BetOrmEntity } from './infrastructure/persistence/entities/bet.orm-entity'
import { OutboxEventOrmEntity } from './infrastructure/persistence/entities/outbox-event.orm-entity'

export default defineConfig({
  clientUrl: process.env.DATABASE_URL,
  entities: [RoundOrmEntity, BetOrmEntity, OutboxEventOrmEntity],
  migrations: {
    path: './src/migrations',
    glob: '!(*.d).{js,ts}',
  },
  extensions: [Migrator],
  debug: process.env.NODE_ENV === 'development',
})
