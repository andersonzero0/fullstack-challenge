import { Module } from '@nestjs/common'
import { ClientsModule, Transport } from '@nestjs/microservices'
import { EventPublisherService } from './event-publisher.service'
import { OutboxPublisherService } from './outbox-publisher.service'

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'WALLET_COMMANDS',
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL ?? 'amqp://localhost:5672'],
          queue: 'wallet-commands',
          queueOptions: { durable: true },
        },
      },
    ]),
  ],
  providers: [EventPublisherService, OutboxPublisherService],
  exports: [EventPublisherService, OutboxPublisherService],
})
export class MessagingModule {}
