'use client'
import { useEffect, useRef } from 'react'
import { Howl } from 'howler'
import { useGameStore } from '../stores/gameStore'

function createSound(src: string): Howl {
  return new Howl({ src: [src], volume: 0.5, preload: true, onloaderror: () => {} })
}

export function useSounds() {
  const phase = useGameStore(s => s.phase)
  const prevPhase = useRef<string>('IDLE')
  const sounds = useRef<Record<string, Howl> | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    sounds.current = {
      crash: createSound('/sounds/crash.mp3'),
      cashout: createSound('/sounds/cashout.mp3'),
      bet_placed: createSound('/sounds/bet_placed.mp3'),
      countdown: createSound('/sounds/countdown.mp3'),
    }
    return () => {
      Object.values(sounds.current ?? {}).forEach(s => s.unload())
    }
  }, [])

  useEffect(() => {
    if (!sounds.current) return
    const s = sounds.current

    if (phase === 'CRASHED' && prevPhase.current === 'RUNNING') {
      try { s.crash.play() } catch {}
    }
    if (phase === 'BETTING') {
      try { s.countdown.play() } catch {}
    }
    if (phase !== 'BETTING') {
      try { s.countdown.stop() } catch {}
    }

    prevPhase.current = phase
  }, [phase])

  return {
    playBetPlaced: () => { try { sounds.current?.bet_placed.play() } catch {} },
    playCashout: () => { try { sounds.current?.cashout.play() } catch {} },
  }
}
