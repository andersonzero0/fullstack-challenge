export class InsufficientBalanceError extends Error {
  constructor(balance: number, amount: number) {
    super(`Insufficient balance: ${balance} < ${amount}`)
    this.name = 'InsufficientBalanceError'
  }
}
