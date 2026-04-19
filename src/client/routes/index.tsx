import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { PointsContext } from '../components/PointsContext'
import { useVoice } from '../hooks/useVoice'
import { WaveformVisualizer } from '../components/WaveformVisualizer'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function MicIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
      <line x1="12" y1="19" x2="12" y2="22"/>
    </svg>
  )
}

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
  const voice = useVoice((text) => setQuery((q) => q ? q + ' ' + text : text))

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

        {/* Search box */}
        <div className={`relative border rounded-2xl overflow-hidden transition-all shadow-2xl shadow-black/50 ${
          voice.listening
            ? 'bg-indigo-950/40 border-indigo-500/40 shadow-indigo-500/10'
            : 'bg-white/5 border-white/10 focus-within:border-indigo-500/50 focus-within:bg-white/[0.07]'
        }`}>
          {voice.listening && voice.stream ? (
            /* Waveform recording UI */
            <div className="flex items-center gap-3 px-5 py-5">
              <WaveformVisualizer stream={voice.stream} height={52} />
              <button
                onClick={voice.cancel}
                className="w-9 h-9 flex items-center justify-center rounded-xl text-white/40 hover:text-white/80 hover:bg-white/8 transition cursor-pointer shrink-0 text-xl leading-none"
                title="Cancel"
              >
                ×
              </button>
              <button
                onClick={voice.stop}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-indigo-500/25 hover:bg-indigo-500/40 text-indigo-300 hover:text-indigo-200 transition cursor-pointer shrink-0 text-lg font-bold"
                title="Done — transcribe"
              >
                ✓
              </button>
            </div>
          ) : voice.transcribing ? (
            /* Transcribing state */
            <div className="flex items-center gap-3 px-5 py-5 h-[92px]">
              <div className="flex-1 flex items-center gap-2">
                <span className="flex gap-1">
                  {[0, 100, 200].map((d) => (
                    <span key={d} className="w-1.5 h-1.5 rounded-full bg-indigo-400/60 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </span>
                <span className="text-sm text-indigo-400/60">Transcribing…</span>
              </div>
            </div>
          ) : (
            /* Normal textarea */
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Business class London to Tokyo in March, Avios or Flying Blue, avoid Middle East"
              rows={3}
              className="w-full bg-transparent px-5 py-4 text-white placeholder:text-white/25 text-base resize-none outline-none"
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit() }}
            />
          )}

          {/* Bottom bar — hidden while recording or transcribing */}
          {!voice.listening && !voice.transcribing && (
            <div className="flex items-center justify-between px-4 pb-3 gap-2">
              <span className="text-white/20 text-xs hidden sm:block">⌘ + ↵ to search</span>
              {voice.supported && (
                <button
                  type="button"
                  onClick={voice.start}
                  className={`flex items-center justify-center w-8 h-8 rounded-lg transition cursor-pointer shrink-0 ${
                    voice.error ? 'text-amber-400/70' : 'text-white/30 hover:text-white/60 hover:bg-white/8'
                  }`}
                  title={voice.error ?? 'Search by voice'}
                >
                  <MicIcon />
                </button>
              )}
              <button
                onClick={() => submit()}
                disabled={!query.trim()}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-white/10 disabled:text-white/20 text-white text-sm font-semibold px-5 py-2 rounded-xl transition cursor-pointer disabled:cursor-not-allowed ml-auto"
              >
                Search →
              </button>
            </div>
          )}
        </div>

        {/* Error message */}
        {voice.error && !voice.listening && (
          <p className="mt-2 text-xs text-amber-400/70 text-center">{voice.error}</p>
        )}

        {/* Examples */}
        {!voice.listening && !voice.transcribing && (
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
        )}
      </div>
    </div>
  )
}
