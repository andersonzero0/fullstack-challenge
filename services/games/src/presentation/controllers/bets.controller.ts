import {
  Controller, Post, Get, Body, UseGuards,
  HttpCode, HttpStatus, ConflictException, UnprocessableEntityException, Query,
} from '@nestjs/common'
import { JwtAuthGuard } from '../../infrastructure/auth/jwt-auth.guard'
import { CurrentUser } from '../../infrastructure/auth/current-user.decorator'
import { PlaceBetUseCase } from '../../application/use-cases/place-bet/place-bet.use-case'
import { CashoutUseCase } from '../../application/use-cases/cashout/cashout.use-case'
import { RoundNotInBettingPhaseError, DuplicateBetError, RoundNotFoundError } from '../../application/use-cases/place-bet/place-bet.errors'
import { NoBetActiveError, RoundNotRunningError } from '../../application/use-cases/cashout/cashout.errors'
import { EntityManager } from '@mikro-orm/core'
import { BetOrmEntity } from '../../infrastructure/persistence/entities/bet.orm-entity'
import { RoundEngineService } from '../../application/round-engine/round-engine.service'
import { GameGateway } from '../gateways/game.gateway'

interface PlaceBetBody {
  amount: number
  autoCashoutAt?: number
}

@Controller()
export class BetsController {
  constructor(
    private readonly placeBet: PlaceBetUseCase,
    private readonly cashout: CashoutUseCase,
    private readonly roundEngine: RoundEngineService,
    private readonly em: EntityManager,
    private readonly gateway: GameGateway,
  ) {}

  @Post('bet')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.ACCEPTED)
  async placeBetEndpoint(
    @Body() body: PlaceBetBody,
    @CurrentUser() user: { id: string; username: string },
  ) {
    const roundId = this.roundEngine.getCurrentRoundId()
    if (!roundId) throw new UnprocessableEntityException('ROUND_NOT_IN_BETTING_PHASE')

    try {
      const result = await this.placeBet.execute({
        roundId,
        playerId: user.id,
        playerName: user.username,
        amount: body.amount,
        autoCashoutAt: body.autoCashoutAt,
      })
      this.gateway.emitBetPlaced({ playerId: user.id, playerName: user.username, amount: body.amount })
      return result
    } catch (err) {
      if (err instanceof RoundNotInBettingPhaseError) throw new UnprocessableEntityException('ROUND_NOT_IN_BETTING_PHASE')
      if (err instanceof DuplicateBetError) throw new ConflictException('DUPLICATE_BET')
      if (err instanceof RoundNotFoundError) throw new UnprocessableEntityException('ROUND_NOT_FOUND')
      throw err
    }
  }

  @Post('bet/cashout')
  @UseGuards(JwtAuthGuard)
  async cashoutEndpoint(@CurrentUser() user: { id: string; username: string }) {
    try {
      const result = await this.cashout.execute(user.id)
      this.gateway.emitBetCashout({ playerId: user.id, cashoutMultiplier: result.cashoutMultiplier, payout: result.payout })
      return result
    } catch (err) {
      if (err instanceof RoundNotRunningError) throw new UnprocessableEntityException('ROUND_NOT_RUNNING')
      if (err instanceof NoBetActiveError) throw new ConflictException('NO_BET_ACTIVE')
      throw err
    }
  }

  @Get('bets/me/active')
  @UseGuards(JwtAuthGuard)
  async getActiveBet(@CurrentUser() user: { id: string; username: string }) {
    const roundId = this.roundEngine.getCurrentRoundId()
    if (!roundId) return null

    const fork = this.em.fork()
    const bet = await fork.findOne(
      BetOrmEntity,
      { playerId: user.id, round: roundId, status: { $in: ['PENDING', 'ACTIVE'] } },
    )
    if (!bet) return null

    return {
      playerId: user.id,
      playerName: user.username,
      amount: bet.amount,
      status: bet.status,
      cashoutMultiplier: bet.cashoutMultiplier,
      autoCashoutAt: bet.autoCashoutAt,
    }
  }

  @Get('bets/me')
  @UseGuards(JwtAuthGuard)
  async getMyBets(
    @CurrentUser() user: { id: string; username: string },
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const fork = this.em.fork()
    const pageNum = Math.max(1, parseInt(page, 10))
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)))
    const offset = (pageNum - 1) * limitNum

    const [bets, total] = await fork.findAndCount(
      BetOrmEntity,
      { playerId: user.id },
      { orderBy: { createdAt: 'DESC' }, limit: limitNum, offset, populate: ['round'] },
    )

    return {
      data: bets.map(b => ({
        id: b.id,
        amount: b.amount,
        status: b.status,
        cashoutMultiplier: b.cashoutMultiplier,
        payout: b.payout,
        createdAt: b.createdAt.toISOString(),
        roundCrashPoint: b.round?.crashPoint ?? null,
      })),
      total,
      page: pageNum,
      limit: limitNum,
    }
  }

  @Get('health')
  async health(): Promise<{ status: string; db: string; timestamp: string }> {
    try {
      await this.em.getConnection().execute('SELECT 1')
      return { status: 'ok', db: 'ok', timestamp: new Date().toISOString() }
    } catch {
      return { status: 'degraded', db: 'error', timestamp: new Date().toISOString() }
    }
  }
}
