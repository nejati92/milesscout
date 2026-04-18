import { useState } from 'react'

const POPULAR_PROGRAMS = [
  { id: 'avios',          label: 'Avios' },
  { id: 'flyingblue',     label: 'Flying Blue' },
  { id: 'aeroplan',       label: 'Aeroplan' },
  { id: 'virginatlantic', label: 'Virgin Atlantic' },
  { id: 'emirates',       label: 'Emirates' },
  { id: 'alaska',         label: 'Alaska' },
]

interface Props {
  balances: Record<string, number>
  onChange: (b: Record<string, number>) => void
}

export function PointsContext({ balances, onChange }: Props) {
  const [expanded, setExpanded] = useState(false)
  const count = Object.keys(balances).length

  function update(id: string, value: string) {
    const num = parseInt(value.replace(/,/g, ''), 10)
    if (!value || isNaN(num)) {
      const next = { ...balances }; delete next[id]; onChange(next)
    } else {
      onChange({ ...balances, [id]: num })
    }
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-sm cursor-pointer hover:bg-white/5 transition"
      >
        <span className="text-white/50 flex items-center gap-2">
          Points balances
          {count > 0 && (
            <span className="bg-indigo-500/20 text-indigo-300 text-xs px-2 py-0.5 rounded-full font-medium">
              {count} added
            </span>
          )}
        </span>
        <span className="text-white/25 text-xs">{expanded ? '▲' : '▼ optional — improves advice'}</span>
      </button>
      {expanded && (
        <div className="px-4 pb-4 border-t border-white/5">
          <p className="text-xs text-white/25 mt-3 mb-3">Helps the advisor reason about affordability and transfer options.</p>
          <div className="grid grid-cols-2 gap-2">
            {POPULAR_PROGRAMS.map((prog) => (
              <div key={prog.id} className="flex items-center gap-2">
                <label className="text-xs text-white/40 w-24 shrink-0">{prog.label}</label>
                <input
                  type="text"
                  placeholder="0"
                  value={balances[prog.id] ? balances[prog.id].toLocaleString() : ''}
                  onChange={(e) => update(prog.id, e.target.value)}
                  className="flex-1 min-w-0 text-xs px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/20 outline-none focus:border-indigo-500/50 transition"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
