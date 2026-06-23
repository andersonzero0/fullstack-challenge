'use client'
import { useCallback, useRef } from 'react'

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  return new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
}

function playTone(ctx: AudioContext, freq: number, startTime: number, duration: number, gain: number, type: OscillatorType = 'sine') {
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, startTime)
  g.gain.setValueAtTime(gain, startTime)
  g.gain.exponentialRampToValueAtTime(0.001, startTime + duration)
  osc.connect(g)
  g.connect(ctx.destination)
  osc.start(startTime)
  osc.stop(startTime + duration)
}

export function useSound() {
  const ctxRef = useRef<AudioContext | null>(null)

  const ensureCtx = useCallback(() => {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = getCtx()
    }
    return ctxRef.current
  }, [])

  const playWin = useCallback(() => {
    const ctx = ensureCtx()
    if (!ctx) return
    if (ctx.state === 'suspended') ctx.resume()
    const t = ctx.currentTime
    // ascending chime: C5 → E5 → G5
    playTone(ctx, 523, t, 0.15, 0.4)
    playTone(ctx, 659, t + 0.12, 0.15, 0.4)
    playTone(ctx, 784, t + 0.24, 0.25, 0.5)
  }, [ensureCtx])

  const playLoss = useCallback(() => {
    const ctx = ensureCtx()
    if (!ctx) return
    if (ctx.state === 'suspended') ctx.resume()
    const t = ctx.currentTime
    // descending buzz
    playTone(ctx, 300, t, 0.12, 0.35, 'sawtooth')
    playTone(ctx, 200, t + 0.10, 0.15, 0.35, 'sawtooth')
    playTone(ctx, 120, t + 0.22, 0.25, 0.3, 'sawtooth')
  }, [ensureCtx])

  return { playWin, playLoss }
}
