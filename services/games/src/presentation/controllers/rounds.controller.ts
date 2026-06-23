import { Controller, Get, Param, Query, NotFoundException } from '@nestjs/common'
import { EntityManager } from '@mikro-orm/core'
import { RoundOrmEntity, RoundStatus } from '../../infrastructure/persistence/entities/round.orm-entity'
import { createHash } from 'crypto'

@Controller('rounds')
export class RoundsController {
  constructor(private readonly em: EntityManager) {}

  @Get('current')
  async getCurrent() {
    const fork = this.em.fork()
    const round = await fork.findOne(
      RoundOrmEntity,
      { status: { $in: [RoundStatus.BETTING, RoundStatus.RUNNING] } },
      { populate: ['bets'] },
    )
    if (!round) return { phase: 'IDLE' }

    const bets = round.bets.getItems().map(b => ({
      playerId: b.playerId,
      playerName: b.playerName,
      amount: b.amount,
      status: b.status,
      cashoutMultiplier: b.cashoutMultiplier,
    }))

    if (round.status === RoundStatus.BETTING) {
      return {
        phase: RoundStatus.BETTING,
        roundId: round.id,
        serverSeedHash: round.serverSeedHash,
        bettingEndsAt: round.bettingEndsAt?.toISOString(),
        bets,
      }
    }

    return {
      phase: RoundStatus.RUNNING,
      roundId: round.id,
      startTimestamp: round.startedAt?.getTime(),
      growthRate: round.growthRate,
      bets,
    }
  }

  @Get('history')
  async getHistory(@Query('page') page = '1', @Query('limit') limit = '20') {
    const fork = this.em.fork()
    const pageNum = Math.max(1, parseInt(page, 10))
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)))
    const offset = (pageNum - 1) * limitNum

    const [rounds, total] = await fork.findAndCount(
      RoundOrmEntity,
      { status: RoundStatus.CRASHED },
      { orderBy: { crashedAt: 'DESC' }, limit: limitNum, offset },
    )

    return {
      data: rounds.map(r => ({
        id: r.id,
        crashPoint: r.crashPoint,
        crashedAt: r.crashedAt?.toISOString(),
        serverSeedHash: r.serverSeedHash,
      })),
      total,
      page: pageNum,
      limit: limitNum,
    }
  }

  @Get('leaderboard')
  async getLeaderboard(@Query('limit') limit = '10'): Promise<{ playerId: string; playerName: string; totalPayout: number; wins: number }[]> {
    const cap = Math.min(Math.max(1, parseInt(limit, 10) || 10), 50)
    const em = this.em.fork()
    const rows = await em.getConnection().execute(`
      SELECT player_id as "playerId", player_name as "playerName",
             SUM(payout) as "totalPayout", COUNT(*) as wins
      FROM bets
      WHERE status = 'CASHED_OUT' AND payout IS NOT NULL
      GROUP BY player_id, player_name
      ORDER BY "totalPayout" DESC
      LIMIT ${cap}
    `)
    return (rows as Record<string, unknown>[]).map(r => ({
      playerId: String(r.playerId),
      playerName: String(r.playerName),
      totalPayout: Number(r.totalPayout),
      wins: Number(r.wins),
    }))
  }

  @Get(':id/verify')
  async verify(@Param('id') id: string) {
    const fork = this.em.fork()
    const round = await fork.findOne(RoundOrmEntity, { id, status: RoundStatus.CRASHED })
    if (!round) throw new NotFoundException('Round not found or not yet crashed')

    const computedHash = createHash('sha256').update(round.serverSeed).digest('hex')

    return {
      roundId: round.id,
      serverSeed: round.serverSeed,
      serverSeedHash: round.serverSeedHash,
      crashPoint: round.crashPoint,
      verified: computedHash === round.serverSeedHash,
    }
  }
}
