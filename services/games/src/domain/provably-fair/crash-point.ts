import { randomBytes, createHash, createHmac } from 'crypto'

export function generateServerSeed(): string {
  return randomBytes(32).toString('hex')
}

export function computeServerSeedHash(serverSeed: string): string {
  return createHash('sha256').update(serverSeed).digest('hex')
}

export function computeCrashPoint(serverSeed: string, roundId: string): number {
  const hmac = createHmac('sha256', serverSeed)
  hmac.update(roundId)
  const hex = hmac.digest('hex')
  const h = parseInt(hex.slice(0, 8), 16)

  if (h === 0) return 1.00

  const e = 2 ** 32
  return Math.floor((100 * e - h) / (e - h)) / 100
}
