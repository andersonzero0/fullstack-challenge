export interface IRoundEngine {
  getCurrentMultiplier(): number
  getCurrentRoundId(): string | null
}
export const ROUND_ENGINE = 'ROUND_ENGINE'
