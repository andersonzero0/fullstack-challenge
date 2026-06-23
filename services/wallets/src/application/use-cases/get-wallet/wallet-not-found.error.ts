export class WalletNotFoundError extends Error {
  constructor(playerId: string) {
    super(`WALLET_NOT_FOUND: ${playerId}`)
    this.name = 'WalletNotFoundError'
  }
}
