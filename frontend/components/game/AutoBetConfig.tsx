'use client'
import { useState, useEffect } from 'react'
import { useAutoBet } from '../../hooks/useAutoBet'
import { useAutoBetStore } from '../../stores/autoBetStore'

function NumericInput({
  label,
  value,
  onChange,
  onBlur,
  disabled,
  min,
  step,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  onBlur: (v: string) => void
  disabled?: boolean
  min?: string
  step?: string
}) {
  return (
    <div>
      <label className="text-xs mb-1 block" style={{ color: '#94a3b8' }}>{label}</label>
      <input
        type="number"
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={e => onBlur(e.target.value)}
        min={min}
        step={step}
        disabled={disabled}
        className="w-full px-2 py-1.5 rounded text-sm text-white disabled:opacity-50"
        style={{ backgroundColor: '#1a1a2e', border: '1px solid #2a2a3e', outline: 'none' }}
      />
    </div>
  )
}

export function AutoBetConfig() {
  const store = useAutoBetStore()
  const { running } = useAutoBet()

  const [baseStr, setBaseStr] = useState(String(store.baseAmount / 100))
  const [cashoutStr, setCashoutStr] = useState(String(store.autoCashoutAt))
  const [roundsStr, setRoundsStr] = useState(String(store.totalRounds))

  // Sync display when store resets
  useEffect(() => {
    if (!running) {
      setBaseStr(String(store.baseAmount / 100))
      setCashoutStr(String(store.autoCashoutAt))
      setRoundsStr(String(store.totalRounds))
    }
  }, [running])  // eslint-disable-line react-hooks/exhaustive-deps

  function commitBase(v: string) {
    const n = parseFloat(v)
    if (!isNaN(n) && n >= 1) {
      store.setBaseAmount(Math.round(n * 100))
      setBaseStr(String(n))
    } else {
      setBaseStr(String(store.baseAmount / 100))
    }
  }

  function commitCashout(v: string) {
    const n = parseFloat(v)
    if (!isNaN(n) && n >= 1.01) {
      store.setAutoCashoutAt(n)
      setCashoutStr(String(n))
    } else {
      setCashoutStr(String(store.autoCashoutAt))
    }
  }

  function commitRounds(v: string) {
    const n = parseInt(v)
    if (!isNaN(n) && n >= 1) {
      store.setTotalRounds(n)
      setRoundsStr(String(n))
    } else {
      setRoundsStr(String(store.totalRounds))
    }
  }

  return (
    <div className="space-y-3 mt-2">
      <div className="grid grid-cols-2 gap-2">
        <NumericInput
          label="Valor base (R$)"
          value={baseStr}
          onChange={setBaseStr}
          onBlur={commitBase}
          disabled={running}
          min="1"
        />
        <NumericInput
          label="Auto sacar em"
          value={cashoutStr}
          onChange={setCashoutStr}
          onBlur={commitCashout}
          disabled={running}
          min="1.01"
          step="0.01"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <NumericInput
          label="Rodadas"
          value={roundsStr}
          onChange={setRoundsStr}
          onBlur={commitRounds}
          disabled={running}
          min="1"
        />
        <div>
          <label className="text-xs mb-1 block" style={{ color: '#94a3b8' }}>Estratégia</label>
          <select
            value={store.strategy}
            onChange={e => store.setStrategy(e.target.value as 'fixed' | 'martingale')}
            disabled={running}
            className="w-full px-2 py-1.5 rounded text-sm text-white disabled:opacity-50"
            style={{ backgroundColor: '#1a1a2e', border: '1px solid #2a2a3e', outline: 'none' }}
          >
            <option value="fixed">Fixo</option>
            <option value="martingale">Martingale</option>
          </select>
        </div>
      </div>

      <button
        onClick={() => running ? store.reset() : store.setRunning(true)}
        className="w-full py-3 rounded-lg font-bold transition-all"
        style={{
          backgroundColor: running ? '#ff4444' : '#8b5cf6',
          color: '#fff',
          boxShadow: running ? 'none' : '0 0 16px #8b5cf644',
        }}
      >
        {running ? 'PARAR AUTO BET' : 'INICIAR AUTO BET'}
      </button>
    </div>
  )
}
