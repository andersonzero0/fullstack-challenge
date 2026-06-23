import { Module } from '@nestjs/common'
import { ClientsModule, Transport } from '@nestjs/microservices'
import { EventPublisherService } from './event-publisher.service'

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'GAME_EVENTS',
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL ?? 'amqp://localhost:5672'],
          queue: 'game-events',
          queueOptions: { durable: true },
        },
      },
    ]),
  ],
  providers: [EventPublisherService],
  exports: [EventPublisherService],
})
export class MessagingModule {}
