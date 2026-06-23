import { Module, MiddlewareConsumer } from '@nestjs/common'
import { LoggingMiddleware } from './infrastructure/logging/logging.middleware'
import { MikroOrmModule } from '@mikro-orm/nestjs'
import mikroOrmConfig from './mikro-orm.config'
import { AuthModule } from './infrastructure/auth/auth.module'
import { MessagingModule } from './infrastructure/messaging/messaging.module'
import { GatewayModule } from './presentation/gateways/gateway.module'
import { RoundEngineService } from './application/round-engine/round-engine.service'
import { PlaceBetUseCase } from './application/use-cases/place-bet/place-bet.use-case'
import { CashoutUseCase } from './application/use-cases/cashout/cashout.use-case'
import { ROUND_ENGINE } from './application/use-cases/cashout/round-engine.interface'
import { RoundsController } from './presentation/controllers/rounds.controller'
import { BetsController } from './presentation/controllers/bets.controller'

@Module({
  imports: [
    MikroOrmModule.forRoot(mikroOrmConfig),
    AuthModule,
    MessagingModule,
    GatewayModule,
  ],
  controllers: [RoundsController, BetsController],
  providers: [
    RoundEngineService,
    { provide: ROUND_ENGINE, useExisting: RoundEngineService },
    PlaceBetUseCase,
    CashoutUseCase,
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(LoggingMiddleware).forRoutes('*')
  }
}
