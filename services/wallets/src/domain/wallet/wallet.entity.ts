import { InsufficientBalanceError } from './insufficient-balance.error'

export class Wallet {
  constructor(
    public readonly id: string,
    public readonly playerId: string,
    public balance: number,
  ) {}

  debit(amount: number): void {
    if (this.balance < amount) {
      throw new InsufficientBalanceError(this.balance, amount)
    }
    this.balance -= amount
  }

  credit(amount: number): void {
    this.balance += amount
  }
}
