import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { EntityManager } from '@mikro-orm/core'
import { RoundOrmEntity, RoundStatus } from '../../infrastructure/persistence/entities/round.orm-entity'

@WebSocketGateway({
  cors: { origin: process.env.ALLOWED_ORIGINS?.split(',') ?? '*' },
  namespace: '/',
})
export class GameGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server

  constructor(private readonly em: EntityManager) {}

  async handleConnection(client: Socket): Promise<void> {
    const fork = this.em.fork()
    const round = await fork.findOne(
      RoundOrmEntity,
      { status: { $in: [RoundStatus.BETTING, RoundStatus.RUNNING] } },
      { populate: ['bets'] },
    )

    if (!round) return

    const bets = round.bets.getItems().map(b => ({
      playerId: b.playerId,
      playerName: b.playerName,
      amount: b.amount,
      status: b.status,
      cashoutMultiplier: b.cashoutMultiplier,
    }))

    if (round.status === RoundStatus.BETTING) {
      client.emit('round:betting', {
        roundId: round.id,
        serverSeedHash: round.serverSeedHash,
        bettingEndsAt: round.bettingEndsAt?.toISOString(),
        bets,
      })
    } else if (round.status === RoundStatus.RUNNING) {
      client.emit('round:started', {
        roundId: round.id,
        startTimestamp: round.startedAt?.getTime(),
        growthRate: round.growthRate,
        bets,
      })
    }
  }

  emitRoundBetting(data: { roundId: string; serverSeedHash: string; bettingEndsAt: string }): void {
    this.server.emit('round:betting', data)
  }

  emitRoundStarted(data: { roundId: string; startTimestamp: number; growthRate: number }): void {
    this.server.emit('round:started', data)
  }

  emitRoundCrashed(data: { roundId: string; crashPoint: number }): void {
    this.server.emit('round:crashed', data)
  }

  emitBetPlaced(data: { playerId: string; playerName: string; amount: number }): void {
    this.server.emit('bet:placed', data)
  }

  emitBetCashout(data: { playerId: string; cashoutMultiplier: number; payout: number }): void {
    this.server.emit('bet:cashout', data)
  }
}
