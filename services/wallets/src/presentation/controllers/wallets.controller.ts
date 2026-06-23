import { Controller, Post, Get, UseGuards, HttpCode, HttpStatus, NotFoundException } from '@nestjs/common'
import { JwtAuthGuard } from '../../infrastructure/auth/jwt-auth.guard'
import { CurrentUser } from '../../infrastructure/auth/current-user.decorator'
import { CreateWalletUseCase } from '../../application/use-cases/create-wallet/create-wallet.use-case'
import { GetWalletUseCase } from '../../application/use-cases/get-wallet/get-wallet.use-case'
import { WalletNotFoundError } from '../../application/use-cases/get-wallet/wallet-not-found.error'
import { EntityManager } from '@mikro-orm/core'

@Controller()
export class WalletsController {
  constructor(
    private readonly createWallet: CreateWalletUseCase,
    private readonly getWallet: GetWalletUseCase,
    private readonly em: EntityManager,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(@CurrentUser() user: { id: string; username: string }) {
    return this.createWallet.execute(user.id)
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser() user: { id: string; username: string }) {
    try {
      return await this.getWallet.execute(user.id)
    } catch (err) {
      if (err instanceof WalletNotFoundError) throw new NotFoundException('WALLET_NOT_FOUND')
      throw err
    }
  }

  @Get('health')
  async health(): Promise<{ status: string; db: string; timestamp: string }> {
    try {
      await this.em.getConnection().execute('SELECT 1')
      return { status: 'ok', db: 'ok', timestamp: new Date().toISOString() }
    } catch {
      return { status: 'degraded', db: 'error', timestamp: new Date().toISOString() }
    }
  }
}
