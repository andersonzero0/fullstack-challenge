import { describe, it, expect } from 'bun:test'
import { Bet, BetStatus } from '../../src/domain/bet/bet.entity'

function makeBet(amount = 1000): Bet {
  return new Bet('bet-1', 'player-1', 'Alice', amount)
}

describe('Bet', () => {
  describe('constructor', () => {
    it('throws when amount < 100', () => {
      expect(() => new Bet('b', 'p', 'Alice', 99)).toThrow('Minimum bet is 100 cents')
    })

    it('throws when amount > 10000000', () => {
      expect(() => new Bet('b', 'p', 'Alice', 10_000_001)).toThrow('Maximum bet is 10000000 cents')
    })
  })

  describe('activate()', () => {
    it('transitions PENDING → ACTIVE', () => {
      const bet = makeBet()
      bet.activate()
      expect(bet.status).toBe(BetStatus.ACTIVE)
    })

    it('throws when already ACTIVE', () => {
      const bet = makeBet()
      bet.activate()
      expect(() => bet.activate()).toThrow('Cannot activate bet in status ACTIVE')
    })
  })

  describe('cashout()', () => {
    it('sets payout = Math.floor(amount * multiplier) for 2.5', () => {
      const bet = makeBet(1000)
      bet.activate()
      bet.cashout(2.5)
      expect(bet.payout).toBe(2500)
    })

    it('truncates payout for multiplier 1.337', () => {
      const bet = makeBet(1000)
      bet.activate()
      bet.cashout(1.337)
      expect(bet.payout).toBe(1337)
    })

    it('truncates payout for multiplier 1.999 (not 2000)', () => {
      const bet = makeBet(1000)
      bet.activate()
      bet.cashout(1.999)
      expect(bet.payout).toBe(1999)
    })

    it('throws when status is PENDING', () => {
      const bet = makeBet()
      expect(() => bet.cashout(2)).toThrow('Cannot cashout bet in status PENDING')
    })

    it('sets cashoutMultiplier and cashedOutAt', () => {
      const bet = makeBet(1000)
      bet.activate()
      bet.cashout(2.5)
      expect(bet.cashoutMultiplier).toBe(2.5)
      expect(bet.cashedOutAt).toBeInstanceOf(Date)
      expect(bet.status).toBe(BetStatus.CASHED_OUT)
    })
  })

  describe('lose()', () => {
    it('transitions ACTIVE → LOST', () => {
      const bet = makeBet()
      bet.activate()
      bet.lose()
      expect(bet.status).toBe(BetStatus.LOST)
    })

    it('throws when PENDING', () => {
      const bet = makeBet()
      expect(() => bet.lose()).toThrow('Cannot lose bet in status PENDING')
    })
  })

  describe('reject()', () => {
    it('transitions PENDING → REJECTED', () => {
      const bet = makeBet()
      bet.reject()
      expect(bet.status).toBe(BetStatus.REJECTED)
    })

    it('throws when ACTIVE', () => {
      const bet = makeBet()
      bet.activate()
      expect(() => bet.reject()).toThrow('Cannot reject bet in status ACTIVE')
    })
  })
})
