'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useGameStore } from '../../stores/gameStore'
import { useMultiplier } from '../../hooks/useMultiplier'

const W = 600
const H = 320
const PAD = { top: 24, right: 24, bottom: 40, left: 52 }
const INNER_W = W - PAD.left - PAD.right
const INNER_H = H - PAD.top - PAD.bottom

function multToY(m: number, maxM: number): number {
  const ratio = (m - 1) / Math.max(maxM - 1, 0.01)
  return PAD.top + INNER_H * (1 - ratio)
}

function timeToX(t: number, maxT: number): number {
  const ratio = t / Math.max(maxT, 0.01)
  return PAD.left + INNER_W * ratio
}

interface Point { t: number; m: number }

export function CrashGraph() {
  const { phase, startTimestamp, growthRate, lastCrashPoint, bettingEndsAt } = useGameStore()
  const multiplier = useMultiplier(phase === 'RUNNING' ? startTimestamp : null, growthRate)

  const [points, setPoints] = useState<Point[]>([])
  const [crashed, setCrashed] = useState(false)
  const rafRef = useRef<number | null>(null)

  const collect = useCallback(() => {
    if (!startTimestamp) return
    const t = (Date.now() - startTimestamp) / 1000
    const m = Math.exp(t * growthRate)
    setPoints(prev => [...prev, { t, m }])
    rafRef.current = requestAnimationFrame(collect)
  }, [startTimestamp, growthRate])

  useEffect(() => {
    if (phase === 'RUNNING') {
      setPoints([])
      setCrashed(false)
      rafRef.current = requestAnimationFrame(collect)
    } else if (phase === 'CRASHED') {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      setCrashed(true)
    } else {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      setPoints([])
      setCrashed(false)
    }
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [phase, collect])

  const displayValue = phase === 'CRASHED'
    ? lastCrashPoint?.toFixed(2)
    : phase === 'RUNNING'
    ? multiplier.toFixed(2)
    : null

  const allPoints = points.length > 1 ? points : []
  const maxT = allPoints.length > 0 ? Math.max(allPoints[allPoints.length - 1].t * 1.05, 5) : 5
  const maxM = allPoints.length > 0 ? Math.max(allPoints[allPoints.length - 1].m * 1.15, 2) : 2

  const pathD = allPoints.length > 1
    ? allPoints.map((p, i) => {
        const x = timeToX(p.t, maxT)
        const y = multToY(p.m, maxM)
        return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`
      }).join(' ')
    : ''

  const lastPt = allPoints[allPoints.length - 1]
  const dotX = lastPt ? timeToX(lastPt.t, maxT) : null
  const dotY = lastPt ? multToY(lastPt.m, maxM) : null

  const glowColor = crashed ? '#ff4444' : '#00ff88'
  const yAxisTicks = [1, Math.ceil(maxM / 2), Math.ceil(maxM)]

  return (
    <div
      className="relative rounded-2xl overflow-hidden"
      style={{
        backgroundColor: '#080810',
        border: `1px solid ${crashed ? '#ff444433' : '#1a1a2e'}`,
        transition: 'border-color 0.3s',
        height: '100%',
      }}
    >
      {/* Background grid */}
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="block"
        style={{ minHeight: 200 }}
      >
        <defs>
          <linearGradient id="curveGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={glowColor} stopOpacity="0.3" />
            <stop offset="100%" stopColor={glowColor} stopOpacity="0.02" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <clipPath id="graphClip">
            <rect x={PAD.left} y={PAD.top} width={INNER_W} height={INNER_H} />
          </clipPath>
        </defs>

        {/* Grid lines */}
        {[0.25, 0.5, 0.75, 1].map(r => (
          <line
            key={`h-${r}`}
            x1={PAD.left} y1={PAD.top + INNER_H * r}
            x2={PAD.left + INNER_W} y2={PAD.top + INNER_H * r}
            stroke="#ffffff08" strokeWidth="1"
          />
        ))}
        {[0.25, 0.5, 0.75].map(r => (
          <line
            key={`v-${r}`}
            x1={PAD.left + INNER_W * r} y1={PAD.top}
            x2={PAD.left + INNER_W * r} y2={PAD.top + INNER_H}
            stroke="#ffffff06" strokeWidth="1"
          />
        ))}

        {/* Y axis ticks */}
        {yAxisTicks.map((tick, i) => {
          const y = multToY(tick, maxM)
          return (
            <text key={`tick-${i}`} x={PAD.left - 8} y={y + 4} textAnchor="end"
              fill="#ffffff30" fontSize="10" fontFamily="monospace">
              {tick.toFixed(0)}x
            </text>
          )
        })}

        {/* Curve fill */}
        {pathD && (
          <path
            d={`${pathD} L ${timeToX(lastPt!.t, maxT)} ${PAD.top + INNER_H} L ${PAD.left} ${PAD.top + INNER_H} Z`}
            fill="url(#curveGrad)"
            clipPath="url(#graphClip)"
          />
        )}

        {/* Curve line */}
        {pathD && (
          <path
            d={pathD}
            fill="none"
            stroke={glowColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#glow)"
            clipPath="url(#graphClip)"
          />
        )}

        {/* Live dot */}
        {dotX !== null && dotY !== null && !crashed && (
          <>
            <circle cx={dotX} cy={dotY} r="6" fill={glowColor} opacity="0.3" />
            <circle cx={dotX} cy={dotY} r="3.5" fill={glowColor} filter="url(#glow)" />
          </>
        )}

        {/* Axes */}
        <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + INNER_H} stroke="#ffffff15" strokeWidth="1" />
        <line x1={PAD.left} y1={PAD.top + INNER_H} x2={PAD.left + INNER_W} y2={PAD.top + INNER_H} stroke="#ffffff15" strokeWidth="1" />
      </svg>

      {/* Multiplier overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {phase === 'BETTING' && (
          <BettingCountdown bettingEndsAt={bettingEndsAt} />
        )}
        {(phase === 'RUNNING' || phase === 'CRASHED') && (
          <div className="text-center" style={{ animation: crashed ? 'crashShake 0.4s ease' : undefined }}>
            <div
              className="font-black tabular-nums leading-none"
              style={{
                fontSize: 'clamp(3rem, 8vw, 5.5rem)',
                color: glowColor,
                textShadow: `0 0 60px ${glowColor}88, 0 0 120px ${glowColor}33`,
                animation: !crashed ? 'multiplierPulse 1s ease-in-out infinite' : undefined,
              }}
            >
              {displayValue}x
            </div>
            {crashed && (
              <div
                className="mt-2 text-base font-black tracking-widest uppercase"
                style={{ color: '#ff4444', letterSpacing: '0.2em' }}
              >
                CRASH!
              </div>
            )}
          </div>
        )}
        {phase === 'IDLE' && (
          <div className="text-sm" style={{ color: '#4a5568' }}>Aguardando rodada...</div>
        )}
      </div>

      <style>{`
        @keyframes multiplierPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.85; }
        }
        @keyframes crashShake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  )
}

function BettingCountdown({ bettingEndsAt }: { bettingEndsAt: string | null }) {
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [pct, setPct] = useState(1)
  const totalRef = useRef<number | null>(null)

  useEffect(() => {
    if (!bettingEndsAt) return
    const end = new Date(bettingEndsAt).getTime()
    if (totalRef.current === null) totalRef.current = Math.ceil((end - Date.now()) / 1000)
    const iv = setInterval(() => {
      const diff = Math.max(0, end - Date.now())
      setSecondsLeft(Math.ceil(diff / 1000))
      setPct(diff / ((totalRef.current ?? 10) * 1000))
    }, 100)
    return () => clearInterval(iv)
  }, [bettingEndsAt])

  const r = 36
  const circ = 2 * Math.PI * r

  return (
    <div className="text-center flex flex-col items-center gap-3">
      <div className="relative flex items-center justify-center" style={{ width: 96, height: 96 }}>
        <svg width="96" height="96" className="absolute inset-0 -rotate-90">
          <circle cx="48" cy="48" r={r} fill="none" stroke="#1a1a2e" strokeWidth="4" />
          <circle
            cx="48" cy="48" r={r}
            fill="none"
            stroke="#00ff88"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - pct)}
            style={{ transition: 'stroke-dashoffset 0.1s linear', filter: 'drop-shadow(0 0 6px #00ff88)' }}
          />
        </svg>
        <div className="relative text-center">
          <div className="text-3xl font-black tabular-nums" style={{ color: '#00ff88' }}>{secondsLeft}</div>
          <div className="text-xs" style={{ color: '#4a5568' }}>seg</div>
        </div>
      </div>
      <div className="text-sm font-semibold tracking-wider" style={{ color: '#94a3b8' }}>
        APOSTAS ABERTAS
      </div>
    </div>
  )
}
