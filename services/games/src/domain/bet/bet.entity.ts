export enum BetStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  CASHED_OUT = 'CASHED_OUT',
  LOST = 'LOST',
  REJECTED = 'REJECTED',
}

export class Bet {
  public cashoutMultiplier: number | null = null
  public payout: number | null = null
  public cashedOutAt: Date | null = null

  constructor(
    public readonly id: string,
    public readonly playerId: string,
    public readonly playerName: string,
    public readonly amount: number,
    public readonly autoCashoutAt: number | null = null,
    public status: BetStatus = BetStatus.PENDING,
  ) {
    if (amount < 100) throw new Error('Minimum bet is 100 cents')
    if (amount > 100_000_00) throw new Error('Maximum bet is 10000000 cents')
  }

  activate(): void {
    if (this.status !== BetStatus.PENDING) {
      throw new Error(`Cannot activate bet in status ${this.status}`)
    }
    this.status = BetStatus.ACTIVE
  }

  cashout(multiplier: number): void {
    if (this.status !== BetStatus.ACTIVE) {
      throw new Error(`Cannot cashout bet in status ${this.status}`)
    }
    this.payout = Math.floor(this.amount * multiplier)
    this.cashoutMultiplier = multiplier
    this.cashedOutAt = new Date()
    this.status = BetStatus.CASHED_OUT
  }

  lose(): void {
    if (this.status !== BetStatus.ACTIVE) {
      throw new Error(`Cannot lose bet in status ${this.status}`)
    }
    this.status = BetStatus.LOST
  }

  reject(): void {
    if (this.status !== BetStatus.PENDING) {
      throw new Error(`Cannot reject bet in status ${this.status}`)
    }
    this.status = BetStatus.REJECTED
  }
}
