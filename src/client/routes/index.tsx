import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useAuth, SignInButton } from '@clerk/clerk-react'
import { DemoAnimation } from '../components/DemoAnimation'
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
  'Business class London to Tokyo in March',
  'Cheapest Aeroplan to Bangkok',
  'London → New York October, no Gulf carriers',
  'First class Singapore, 150k Virgin points',
]

function LandingPage() {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-3xl flex flex-col items-center">

        {/* Badge */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium text-white/50"
            style={{ background: 'var(--card-bg)', boxShadow: 'var(--card-shadow)', border: '1px solid var(--card-border)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Real-time award availability · AI-powered reasoning
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-5xl sm:text-6xl font-black text-center text-white tracking-tight leading-[1.08] mb-4">
          Find your best
          <br />
          <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
            award flight
          </span>
        </h1>
        <p className="text-white/40 text-center text-base mb-10 max-w-md mx-auto leading-relaxed">
          Describe your trip in plain English. MileScout searches real availability across every major points program and tells you exactly what to book.
        </p>

        {/* Animated demo */}
        <div className="w-full mb-10 overflow-hidden"
          style={{ borderRadius: '20px', boxShadow: 'var(--card-shadow)', border: '1px solid var(--card-border)' }}>
          <DemoAnimation />
        </div>

        {/* CTAs */}
        <div className="flex items-center gap-3">
          <SignInButton mode="modal">
            <button className="text-sm font-bold px-8 py-3 rounded-xl text-white transition cursor-pointer"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 4px 20px rgba(99,102,241,0.4)' }}>
              Sign in →
            </button>
          </SignInButton>
        </div>

        {/* Feature pills */}
        <div className="mt-10 flex flex-wrap gap-2 justify-center">
          {['Avios', 'Flying Blue', 'Aeroplan', 'Emirates Skywards', 'Virgin Points', 'Chase UR', 'Amex MR'].map((p) => (
            <span key={p} className="text-xs text-white/30 px-3 py-1.5 rounded-full"
              style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
              {p}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function SearchPage() {
  const [query, setQuery] = useState('')
  const [pointsBalances, setPointsBalances] = useState<Record<string, number>>({})
  const navigate = useNavigate()
  const voice = useVoice((text) => setQuery((q) => q ? q + ' ' + text : text))

  function submit(q = query) {
    if (!q.trim()) return
    const params: Record<string, string> = { q: q.trim() }
    if (Object.keys(pointsBalances).length > 0) params.points = JSON.stringify(pointsBalances)
    navigate({ to: '/results', search: params as { q: string; points?: string } })
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center px-4 py-16">
      <div className="relative w-full max-w-2xl">
        {/* Badge */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium text-white/50"
            style={{ background: 'var(--card-bg)', boxShadow: 'var(--card-shadow)', border: '1px solid var(--card-border)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Real-time award availability · AI-powered reasoning
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-5xl sm:text-6xl font-black text-center text-white tracking-tight leading-[1.08] mb-4">
          Find your best
          <br />
          <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
            award flight
          </span>
        </h1>
        <p className="text-white/40 text-center text-base mb-10 max-w-md mx-auto leading-relaxed">
          Describe your trip in plain English. MileScout searches real availability and tells you exactly what to book.
        </p>

        {/* Points */}
        <div className="mb-4">
          <PointsContext balances={pointsBalances} onChange={setPointsBalances} />
        </div>

        {/* Search card */}
        <div
          className="overflow-hidden transition-all"
          style={{
            background: 'var(--card-bg)',
            boxShadow: voice.listening ? '0 0 0 2px #6366f1, var(--card-shadow)' : 'var(--card-shadow)',
            border: '1px solid var(--card-border)',
            borderRadius: '20px',
          }}
        >
          {voice.listening && voice.stream ? (
            <div className="flex items-center gap-3 px-5 py-5">
              <WaveformVisualizer stream={voice.stream} height={52} />
              <button onClick={voice.cancel} className="w-9 h-9 flex items-center justify-center rounded-xl text-white/40 hover:text-white/80 hover:bg-white/8 transition cursor-pointer text-xl leading-none">×</button>
              <button onClick={voice.stop} className="w-9 h-9 flex items-center justify-center rounded-xl bg-indigo-500/25 hover:bg-indigo-500/40 text-indigo-300 transition cursor-pointer text-lg font-bold">✓</button>
            </div>
          ) : voice.transcribing ? (
            <div className="flex items-center gap-3 px-5 py-5 h-[88px]">
              <span className="flex gap-1">{[0,100,200].map(d => <span key={d} className="w-1.5 h-1.5 rounded-full bg-indigo-400/60 animate-bounce" style={{ animationDelay: `${d}ms` }} />)}</span>
              <span className="text-sm text-indigo-400/60">Transcribing…</span>
            </div>
          ) : (
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Business class London to Tokyo in March, Avios or Flying Blue"
              rows={3}
              className="w-full bg-transparent px-5 pt-5 pb-3 text-white placeholder:text-white/25 text-base resize-none outline-none"
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit() }}
            />
          )}

          {!voice.listening && !voice.transcribing && (
            <div className="flex items-center justify-between px-4 pb-4 gap-2">
              <span className="text-white/20 text-xs hidden sm:block">⌘↵ to search</span>
              <div className="flex items-center gap-2 ml-auto">
                {voice.supported && (
                  <button
                    type="button"
                    onClick={voice.start}
                    className={`flex items-center justify-center w-8 h-8 rounded-xl transition cursor-pointer ${voice.error ? 'text-amber-400/70' : 'text-white/30 hover:text-white/70 hover:bg-white/8'}`}
                    title={voice.error ?? 'Search by voice'}
                  >
                    <MicIcon />
                  </button>
                )}
                <button
                  onClick={() => submit()}
                  disabled={!query.trim()}
                  className="text-sm font-bold px-5 py-2.5 rounded-xl transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-30"
                  style={{ background: query.trim() ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : undefined, color: query.trim() ? 'white' : undefined }}
                >
                  Search →
                </button>
              </div>
            </div>
          )}
        </div>

        {voice.error && !voice.listening && (
          <p className="mt-2 text-xs text-amber-400/70 text-center">{voice.error}</p>
        )}

        {/* Examples */}
        {!voice.listening && !voice.transcribing && (
          <div className="mt-6 flex flex-wrap gap-2 justify-center">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => submit(ex)}
                className="text-xs text-white/40 hover:text-white/80 px-3.5 py-2 rounded-full transition cursor-pointer"
                style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--card-shadow)' }}
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

function HomePage() {
  const { isSignedIn, isLoaded } = useAuth()

  if (!isLoaded) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-indigo-500/40 border-t-indigo-400 animate-spin" />
      </div>
    )
  }

  return isSignedIn ? <SearchPage /> : <LandingPage />
}
