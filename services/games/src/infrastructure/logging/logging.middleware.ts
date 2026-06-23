import { Injectable, NestMiddleware, Logger } from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP')

  use(req: Request, res: Response, next: NextFunction): void {
    const start = Date.now()
    res.on('finish', () => {
      this.logger.log(JSON.stringify({
        method: req.method,
        url: req.url,
        status: res.statusCode,
        ms: Date.now() - start,
      }))
    })
    next()
  }
}
