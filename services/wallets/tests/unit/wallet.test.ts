import { describe, it, expect } from 'bun:test'
import { Wallet } from '../../src/domain/wallet/wallet.entity'
import { InsufficientBalanceError } from '../../src/domain/wallet/insufficient-balance.error'

describe('Wallet', () => {
  describe('debit', () => {
    it('deducts amount from balance', () => {
      const wallet = new Wallet('1', 'player-1', 1000)
      wallet.debit(500)
      expect(wallet.balance).toBe(500)
    })

    it('allows debiting exact balance', () => {
      const wallet = new Wallet('1', 'player-1', 1000)
      wallet.debit(1000)
      expect(wallet.balance).toBe(0)
    })

    it('throws InsufficientBalanceError when amount exceeds balance', () => {
      const wallet = new Wallet('1', 'player-1', 1000)
      expect(() => wallet.debit(1001)).toThrow(InsufficientBalanceError)
    })

    it('throws InsufficientBalanceError when balance is 0', () => {
      const wallet = new Wallet('1', 'player-1', 0)
      expect(() => wallet.debit(1)).toThrow(InsufficientBalanceError)
    })
  })

  describe('credit', () => {
    it('adds amount to zero balance', () => {
      const wallet = new Wallet('1', 'player-1', 0)
      wallet.credit(500)
      expect(wallet.balance).toBe(500)
    })

    it('adds amount to existing balance', () => {
      const wallet = new Wallet('1', 'player-1', 1000)
      wallet.credit(500)
      expect(wallet.balance).toBe(1500)
    })
  })

  describe('integer integrity', () => {
    it('balance stays integer after multiple credit ops', () => {
      const wallet = new Wallet('1', 'player-1', 0)
      wallet.credit(1)
      wallet.credit(2)
      expect(wallet.balance).toBe(3)
    })
  })

  describe('InsufficientBalanceError', () => {
    it('is an instance of Error', () => {
      const err = new InsufficientBalanceError(100, 200)
      expect(err).toBeInstanceOf(Error)
    })
  })
})
