import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { passportJwtSecret } from 'jwks-rsa'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `${process.env.KEYCLOAK_URL}/realms/crash-game/protocol/openid-connect/certs`,
      }),
      issuer: `${process.env.KEYCLOAK_PUBLIC_URL ?? process.env.KEYCLOAK_URL}/realms/crash-game`,
      algorithms: ['RS256'],
    })
  }

  validate(payload: { sub: string; preferred_username: string }) {
    return { id: payload.sub, username: payload.preferred_username }
  }
}
