'use client'
import { useAutoBet } from '../../hooks/useAutoBet'
import { useAutoBetStore } from '../../stores/autoBetStore'

export function AutoBetForm() {
  const store = useAutoBetStore()
  const { running, setRunning } = useAutoBet()

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs mb-1 block" style={{ color: '#94a3b8' }}>Valor base (R$)</label>
          <input
            type="number"
            value={store.baseAmount / 100}
            onChange={e => store.setBaseAmount(Math.round(parseFloat(e.target.value) * 100) || 1000)}
            min="1"
            disabled={running}
            className="w-full px-2 py-1.5 rounded text-sm text-white"
            style={{ backgroundColor: '#1a1a2e', border: '1px solid #2a2a3e' }}
          />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: '#94a3b8' }}>Auto sacar em</label>
          <input
            type="number"
            value={store.autoCashoutAt}
            onChange={e => store.setAutoCashoutAt(parseFloat(e.target.value) || 2)}
            min="1.01"
            step="0.01"
            disabled={running}
            className="w-full px-2 py-1.5 rounded text-sm text-white"
            style={{ backgroundColor: '#1a1a2e', border: '1px solid #2a2a3e' }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs mb-1 block" style={{ color: '#94a3b8' }}>Rodadas</label>
          <input
            type="number"
            value={store.totalRounds}
            onChange={e => store.setTotalRounds(parseInt(e.target.value) || 10)}
            min="1"
            disabled={running}
            className="w-full px-2 py-1.5 rounded text-sm text-white"
            style={{ backgroundColor: '#1a1a2e', border: '1px solid #2a2a3e' }}
          />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: '#94a3b8' }}>Estratégia</label>
          <select
            value={store.strategy}
            onChange={e => store.setStrategy(e.target.value as 'fixed' | 'martingale')}
            disabled={running}
            className="w-full px-2 py-1.5 rounded text-sm text-white"
            style={{ backgroundColor: '#1a1a2e', border: '1px solid #2a2a3e' }}
          >
            <option value="fixed">Fixo</option>
            <option value="martingale">Martingale</option>
          </select>
        </div>
      </div>

      {running && (
        <div className="text-xs py-2 px-3 rounded" style={{ backgroundColor: '#1a1a2e', color: '#94a3b8' }}>
          Rodadas: {store.roundsLeft} | PnL: {store.totalPnl >= 0 ? '+' : ''}R${(store.totalPnl / 100).toFixed(2)}
        </div>
      )}

      <button
        onClick={() => running ? store.reset() : store.setRunning(true)}
        className="w-full py-3 rounded-lg font-bold transition-opacity"
        style={{ backgroundColor: running ? '#ff4444' : '#8b5cf6', color: '#fff' }}
      >
        {running ? 'PARAR' : 'INICIAR AUTO BET'}
      </button>
    </div>
  )
}
