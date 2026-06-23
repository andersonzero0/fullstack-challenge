import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { Transport } from '@nestjs/microservices'
import { AppModule } from './app.module'

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule)

  app.connectMicroservice({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL ?? 'amqp://localhost:5672'],
      queue: 'wallet-commands',
      queueOptions: { durable: true },
    },
  })

  await app.startAllMicroservices()

  const port = Number(process.env.PORT) || 4002
  await app.listen(port, '0.0.0.0')
  console.log(`Wallets service running on port ${port}`)
}

bootstrap()
