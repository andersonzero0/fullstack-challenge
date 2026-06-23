import { Module, MiddlewareConsumer } from '@nestjs/common'
import { LoggingMiddleware } from './infrastructure/logging/logging.middleware'
import { MikroOrmModule } from '@mikro-orm/nestjs'
import mikroOrmConfig from './mikro-orm.config'
import { WalletsController } from './presentation/controllers/wallets.controller'
import { AuthModule } from './infrastructure/auth/auth.module'
import { MessagingModule } from './infrastructure/messaging/messaging.module'
import { CreateWalletUseCase } from './application/use-cases/create-wallet/create-wallet.use-case'
import { GetWalletUseCase } from './application/use-cases/get-wallet/get-wallet.use-case'
import { DebitWalletHandler } from './application/event-handlers/debit-wallet.handler'
import { CreditWalletHandler } from './application/event-handlers/credit-wallet.handler'

@Module({
  imports: [
    MikroOrmModule.forRoot(mikroOrmConfig),
    AuthModule,
    MessagingModule,
  ],
  controllers: [WalletsController, DebitWalletHandler, CreditWalletHandler],
  providers: [CreateWalletUseCase, GetWalletUseCase],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(LoggingMiddleware).forRoutes('*')
  }
}
