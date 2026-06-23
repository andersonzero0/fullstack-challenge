export class RoundNotInBettingPhaseError extends Error {
  constructor() {
    super('ROUND_NOT_IN_BETTING_PHASE')
    this.name = 'RoundNotInBettingPhaseError'
  }
}

export class DuplicateBetError extends Error {
  constructor() {
    super('DUPLICATE_BET')
    this.name = 'DuplicateBetError'
  }
}

export class RoundNotFoundError extends Error {
  constructor() {
    super('ROUND_NOT_FOUND')
    this.name = 'RoundNotFoundError'
  }
}
