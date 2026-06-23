import { Injectable } from '@nestjs/common'
import { EntityManager } from '@mikro-orm/core'
import { WalletOrmEntity } from '../../../infrastructure/persistence/entities/wallet.orm-entity'
import { randomUUID } from 'crypto'

@Injectable()
export class CreateWalletUseCase {
  constructor(private readonly em: EntityManager) {}

  async execute(playerId: string): Promise<{ id: string; balance: number }> {
    const existing = await this.em.findOne(WalletOrmEntity, { playerId })

    if (existing) {
      return { id: existing.id, balance: existing.balance }
    }

    const wallet = new WalletOrmEntity()
    wallet.id = randomUUID()
    wallet.playerId = playerId
    wallet.balance = Number(process.env.SEED_INITIAL_BALANCE ?? 0)

    this.em.persist(wallet)
    await this.em.flush()

    return { id: wallet.id, balance: wallet.balance }
  }
}
