'use client'
import { useState, useEffect, useRef } from 'react'

export function useMultiplier(startTimestamp: number | null, growthRate: number): number {
  const [multiplier, setMultiplier] = useState(1.0)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (startTimestamp === null) {
      setMultiplier(1.0)
      return
    }

    function tick() {
      const elapsed = (Date.now() - startTimestamp!) / 1000
      setMultiplier(Math.exp(elapsed * growthRate))
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [startTimestamp, growthRate])

  return multiplier
}
