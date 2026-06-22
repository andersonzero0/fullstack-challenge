import { Module } from '@nestjs/common'
import { MikroOrmModule } from '@mikro-orm/nestjs'
import { GamesController } from './presentation/controllers/games.controller'
import { RoundOrmEntity } from './infrastructure/persistence/entities/round.orm-entity'
import { BetOrmEntity } from './infrastructure/persistence/entities/bet.orm-entity'
import { OutboxEventOrmEntity } from './infrastructure/persistence/entities/outbox-event.orm-entity'

@Module({
  imports: [
    MikroOrmModule.forRoot({
      clientUrl: process.env.DATABASE_URL,
      entities: [RoundOrmEntity, BetOrmEntity, OutboxEventOrmEntity],
      migrations: {
        path: './src/migrations',
        glob: '!(*.d).{js,ts}',
      },
    }),
  ],
  controllers: [GamesController],
})
export class AppModule {}
