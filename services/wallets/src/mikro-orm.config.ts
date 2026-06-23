import { defineConfig } from '@mikro-orm/postgresql'
import { Migrator } from '@mikro-orm/migrations'
import { WalletOrmEntity } from './infrastructure/persistence/entities/wallet.orm-entity'
import { InboxEventOrmEntity } from './infrastructure/persistence/entities/inbox-event.orm-entity'

export default defineConfig({
  clientUrl: process.env.DATABASE_URL,
  entities: [WalletOrmEntity, InboxEventOrmEntity],
  migrations: {
    path: './src/migrations',
    glob: '!(*.d).{js,ts}',
  },
  extensions: [Migrator],
  debug: process.env.NODE_ENV === 'development',
})
