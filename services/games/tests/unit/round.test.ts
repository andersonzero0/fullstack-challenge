import { describe, it, expect } from 'bun:test'
import { Round, RoundStatus } from '../../src/domain/round/round.entity'
import { Bet, BetStatus } from '../../src/domain/bet/bet.entity'

function makeRound(status?: RoundStatus): Round {
  const now = new Date()
  const later = new Date(now.getTime() + 5000)
  const round = new Round(
    'round-1',
    'server-seed',
    'server-seed-hash',
    2.5,
    0.00006,
    now,
    later,
  )
  if (status === RoundStatus.RUNNING) {
    round.startRound()
  } else if (status === RoundStatus.CRASHED) {
    round.startRound()
    round.crash()
  }
  return round
}

function makeBet(playerId = 'player-1'): Bet {
  return new Bet('bet-1', playerId, 'Alice', 1000)
}

describe('Round', () => {
  describe('startRound()', () => {
    it('transitions BETTING → RUNNING and sets startedAt', () => {
      const round = makeRound()
      expect(round.startedAt).toBeNull()
      round.startRound()
      expect(round.status).toBe(RoundStatus.RUNNING)
      expect(round.startedAt).toBeInstanceOf(Date)
    })

    it('throws when status is RUNNING', () => {
      const round = makeRound(RoundStatus.RUNNING)
      expect(() => round.startRound()).toThrow('Cannot start round in status RUNNING')
    })

    it('throws when status is CRASHED', () => {
      const round = makeRound(RoundStatus.CRASHED)
      expect(() => round.startRound()).toThrow('Cannot start round in status CRASHED')
    })
  })

  describe('crash()', () => {
    it('transitions RUNNING → CRASHED and sets crashedAt', () => {
      const round = makeRound(RoundStatus.RUNNING)
      expect(round.crashedAt).toBeNull()
      round.crash()
      expect(round.status).toBe(RoundStatus.CRASHED)
      expect(round.crashedAt).toBeInstanceOf(Date)
    })

    it('throws when status is BETTING', () => {
      const round = makeRound()
      expect(() => round.crash()).toThrow('Cannot crash round in status BETTING')
    })
  })

  describe('addBet()', () => {
    it('adds bet when status is BETTING', () => {
      const round = makeRound()
      const bet = makeBet()
      round.addBet(bet)
      expect(round.bets).toHaveLength(1)
      expect(round.bets[0]).toBe(bet)
    })

    it('throws when status is RUNNING', () => {
      const round = makeRound(RoundStatus.RUNNING)
      expect(() => round.addBet(makeBet())).toThrow('Round is not in betting phase')
    })

    it('throws when same playerId already exists', () => {
      const round = makeRound()
      round.addBet(makeBet('player-1'))
      expect(() => round.addBet(makeBet('player-1'))).toThrow('Player already has a bet in this round')
    })
  })

  describe('getActiveBets()', () => {
    it('returns only ACTIVE bets', () => {
      const round = makeRound()
      const activeBet = new Bet('bet-1', 'player-1', 'Alice', 1000)
      activeBet.activate()
      const pendingBet = new Bet('bet-2', 'player-2', 'Bob', 1000)
      round.addBet(activeBet)
      round.addBet(pendingBet)
      const active = round.getActiveBets()
      expect(active).toHaveLength(1)
      expect(active[0].status).toBe(BetStatus.ACTIVE)
    })
  })
})
