import { Inject, Injectable } from '@nestjs/common'
import { ClientProxy } from '@nestjs/microservices'

@Injectable()
export class EventPublisherService {
  constructor(@Inject('GAME_EVENTS') private readonly client: ClientProxy) {}

  publish(pattern: string, payload: Record<string, unknown>): void {
    this.client.emit(pattern, payload)
  }
}
