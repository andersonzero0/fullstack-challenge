export class NoBetActiveError extends Error {
  constructor() { super('NO_BET_ACTIVE'); this.name = 'NoBetActiveError' }
}
export class RoundNotRunningError extends Error {
  constructor() { super('ROUND_NOT_RUNNING'); this.name = 'RoundNotRunningError' }
}
