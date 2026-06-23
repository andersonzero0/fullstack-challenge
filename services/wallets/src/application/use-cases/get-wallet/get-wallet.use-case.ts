import { Injectable } from '@nestjs/common'
import { EntityManager } from '@mikro-orm/core'
import { WalletOrmEntity } from '../../../infrastructure/persistence/entities/wallet.orm-entity'
import { WalletNotFoundError } from './wallet-not-found.error'

@Injectable()
export class GetWalletUseCase {
  constructor(private readonly em: EntityManager) {}

  async execute(playerId: string): Promise<{ id: string; balance: number }> {
    const wallet = await this.em.findOne(WalletOrmEntity, { playerId })

    if (!wallet) throw new WalletNotFoundError(playerId)

    return { id: wallet.id, balance: wallet.balance }
  }
}
