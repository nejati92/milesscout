import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { PointsContext } from '../components/PointsContext'

export const Route = createFileRoute('/')({
  component: HomePage,
})

const EXAMPLES = [
  'Business class London to Tokyo in March, Avios or Flying Blue',
  'Cheapest Aeroplan redemption to Bangkok, avoid Middle East',
  'London to New York October, nothing via Gulf carriers',
  'Best value first class to Singapore with 150k Virgin points',
]

function HomePage() {
  const [query, setQuery] = useState('')
  const [pointsBalances, setPointsBalances] = useState<Record<string, number>>({})
  const navigate = useNavigate()

  function submit(q = query) {
    if (!q.trim()) return
    const params: Record<string, string> = { q: q.trim() }
    if (Object.keys(pointsBalances).length > 0) params.points = JSON.stringify(pointsBalances)
    navigate({ to: '/results', search: params })
  }

  return (
    <div className="min-h-[calc(100vh-3rem)] flex flex-col items-center justify-center px-4 py-16">
      {/* Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative w-full max-w-2xl">
        {/* Badge */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 text-white/60 text-xs px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Real-time award availability · AI-powered reasoning
          </div>
        </div>

        <h1 className="text-5xl sm:text-6xl font-black text-center text-white tracking-tight leading-[1.05] mb-3">
          Find your best<br />
          <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
            award flight
          </span>
        </h1>
        <p className="text-white/40 text-center text-lg mb-10">
          Describe your trip. MileScout searches real inventory and tells you exactly what to book.
        </p>

        {/* Points */}
        <div className="mb-4">
          <PointsContext balances={pointsBalances} onChange={setPointsBalances} />
        </div>

        {/* Search */}
        <div className="relative bg-white/5 border border-white/10 rounded-2xl overflow-hidden focus-within:border-indigo-500/50 focus-within:bg-white/[0.07] transition-all shadow-2xl shadow-black/50">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. Business class London to Tokyo in March, Avios or Flying Blue, avoid Middle East"
            rows={3}
            className="w-full bg-transparent px-5 py-4 text-white placeholder:text-white/25 text-base resize-none outline-none"
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit() }}
          />
          <div className="flex items-center justify-between px-4 pb-3">
            <span className="text-white/20 text-xs">⌘ + ↵ to search</span>
            <button
              onClick={() => submit()}
              disabled={!query.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-white/10 disabled:text-white/20 text-white text-sm font-semibold px-5 py-2 rounded-xl transition cursor-pointer disabled:cursor-not-allowed"
            >
              Search →
            </button>
          </div>
        </div>

        {/* Examples */}
        <div className="mt-5 flex flex-wrap gap-2 justify-center">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => submit(ex)}
              className="text-xs text-white/40 hover:text-white/80 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15 px-3 py-1.5 rounded-full transition cursor-pointer"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
