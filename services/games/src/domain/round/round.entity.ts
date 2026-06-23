import { Bet, BetStatus } from '../bet/bet.entity'

export enum RoundStatus {
  BETTING = 'BETTING',
  RUNNING = 'RUNNING',
  CRASHED = 'CRASHED',
}

export class Round {
  constructor(
    public readonly id: string,
    public readonly serverSeed: string,
    public readonly serverSeedHash: string,
    public readonly crashPoint: number,
    public readonly growthRate: number,
    public readonly bettingStartsAt: Date,
    public readonly bettingEndsAt: Date,
    public status: RoundStatus = RoundStatus.BETTING,
    public startedAt: Date | null = null,
    public crashedAt: Date | null = null,
    public readonly bets: Bet[] = [],
  ) {}

  startRound(): void {
    if (this.status !== RoundStatus.BETTING) {
      throw new Error(`Cannot start round in status ${this.status}`)
    }
    this.status = RoundStatus.RUNNING
    this.startedAt = new Date()
  }

  crash(): void {
    if (this.status !== RoundStatus.RUNNING) {
      throw new Error(`Cannot crash round in status ${this.status}`)
    }
    this.status = RoundStatus.CRASHED
    this.crashedAt = new Date()
  }

  addBet(bet: Bet): void {
    if (this.status !== RoundStatus.BETTING) {
      throw new Error('Round is not in betting phase')
    }
    if (this.bets.some(b => b.playerId === bet.playerId)) {
      throw new Error('Player already has a bet in this round')
    }
    this.bets.push(bet)
  }

  getActiveBets(): Bet[] {
    return this.bets.filter(b => b.status === BetStatus.ACTIVE)
  }
}
