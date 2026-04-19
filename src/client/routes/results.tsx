import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { trpc } from '../trpc'
import { ResultsTable, DEFAULT_FILTERS, type TableFilters } from '../components/ResultsTable'
import { AdvisorChat, type ChatMessage } from '../components/AdvisorChat'

const searchParamsSchema = z.object({
  q: z.string(),
  points: z.string().optional(),
})

export const Route = createFileRoute('/results')({
  validateSearch: searchParamsSchema,
  component: ResultsPage,
})

function ResultsPage() {
  const { isSignedIn, isLoaded } = useAuth()
  const { q, points } = Route.useSearch()
  const navigate = useNavigate()

  useEffect(() => {
    if (isLoaded && !isSignedIn) navigate({ to: '/' })
  }, [isLoaded, isSignedIn, navigate])

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-indigo-500/40 border-t-indigo-400 animate-spin" />
      </div>
    )
  }
  const pointsBalances = points ? (JSON.parse(points) as Record<string, number>) : undefined
  const search = trpc.search.search.useMutation()
  const reason = trpc.search.reason.useMutation()
  const reasonInbound = trpc.search.reason.useMutation()

  const lastSearchData = useRef(search.data)
  if (search.data) lastSearchData.current = search.data
  const searchData = search.data ?? lastSearchData.current

  const lastReasonData = useRef(reason.data)
  if (reason.data) lastReasonData.current = reason.data
  const reasonData = search.isPending ? undefined : (reason.data ?? lastReasonData.current)

  const lastReasonInboundData = useRef(reasonInbound.data)
  if (reasonInbound.data) lastReasonInboundData.current = reasonInbound.data
  const reasonInboundData = search.isPending ? undefined : (reasonInbound.data ?? lastReasonInboundData.current)

  const [tableFilters, setTableFilters] = useState<TableFilters>(DEFAULT_FILTERS)
  const [inboundFilters, setInboundFilters] = useState<TableFilters>(DEFAULT_FILTERS)
  const [activeTab, setActiveTab] = useState<'outbound' | 'inbound'>('outbound')
  const [currentQuery, setCurrentQuery] = useState(q)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])

  const isReturn = !!(searchData?.inboundResults)

  useEffect(() => {
    if (q) {
      lastReasonData.current = undefined
      lastReasonInboundData.current = undefined
      setActiveTab('outbound')
      search.mutate({ text: q, pointsBalances }, {
        onSuccess(result) {
          if (result.rawResults.length > 0) {
            reason.mutate({ parsed: result.parsed, rawResults: result.rawResults, pointsBalances })
          }
          if (result.inboundResults && result.inboundResults.length > 0) {
            reasonInbound.mutate({ parsed: result.parsed, rawResults: result.inboundResults, pointsBalances })
          }
        },
      })
      setCurrentQuery(q)
      setTableFilters(DEFAULT_FILTERS)
      setInboundFilters(DEFAULT_FILTERS)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, points])

  function handleNewSearch(newQuery: string) {
    setTableFilters(DEFAULT_FILTERS)
    setInboundFilters(DEFAULT_FILTERS)
    setCurrentQuery(newQuery)
    navigate({ to: '/results', search: { q: newQuery, ...(points ? { points } : {}) } })
  }

  const isFirstLoad = search.isPending && !searchData
  const isReasoning = !search.isPending && !!searchData && (reason.isPending || (isReturn && reasonInbound.isPending))

  const activeResults = activeTab === 'inbound' ? (searchData?.inboundResults ?? []) : (searchData?.rawResults ?? [])
  const activeReasonData = activeTab === 'inbound' ? reasonInboundData : reasonData
  const activeFilters = activeTab === 'inbound' ? inboundFilters : tableFilters
  const setActiveFilters = activeTab === 'inbound' ? setInboundFilters : setTableFilters

  const chatSearchData = reasonData ? { ...searchData!, ...reasonData } : null

  return (
    <div className="min-h-[calc(100vh-3rem)] flex flex-col">
      <div className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-5">

        {/* Top bar — floating card */}
        <div className="flex items-center gap-3 px-4 py-3 overflow-hidden" style={{ background: 'var(--card-bg)', boxShadow: 'var(--card-shadow)', border: '1px solid var(--card-border)', borderRadius: '16px' }}>
          <Link to="/" className="text-white/30 hover:text-white/70 text-sm transition no-underline shrink-0 font-bold">←</Link>
          <div className="flex-1 text-sm text-white/50 truncate font-medium">{currentQuery}</div>
          {search.isPending && searchData && (
            <span className="text-xs text-indigo-400/60 animate-pulse shrink-0">Searching…</span>
          )}
          {isReasoning && (
            <span className="text-xs text-lime-400/70 animate-pulse shrink-0">Analysing…</span>
          )}
          {searchData && !search.isPending && (
            <div className="flex items-center gap-2 shrink-0">
              {searchData.cacheHit && <span className="text-xs text-white/20 bg-white/5 px-2 py-1 rounded-full">cached</span>}
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                searchData.parsed.parseConfidence === 'high' ? 'bg-emerald-500/15 text-emerald-400' :
                searchData.parsed.parseConfidence === 'medium' ? 'bg-amber-500/15 text-amber-400' :
                'bg-red-500/15 text-red-400'
              }`}>{searchData.parsed.parseConfidence} confidence</span>
            </div>
          )}
        </div>

        {isFirstLoad && (
          <div className="flex flex-col items-center justify-center py-32 gap-6">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20 animate-ping" />
              <div className="absolute inset-2 rounded-full border-2 border-indigo-500/40 animate-ping" style={{ animationDelay: '300ms' }} />
              <div className="absolute inset-4 rounded-full bg-indigo-500/20 animate-pulse" />
            </div>
            <div className="text-center">
              <p className="text-white/60 font-semibold mb-1">Searching award availability</p>
              <p className="text-white/25 text-sm">Parsing request · Checking programs · AI analysis</p>
            </div>
          </div>
        )}

        {search.isError && (
          <div className="flex flex-col items-center py-24 gap-4">
            <div className="text-4xl">⚠</div>
            <p className="text-white/50">{search.error.message}</p>
            <Link to="/" className="text-sm text-indigo-400 hover:text-indigo-300 no-underline">Try again →</Link>
          </div>
        )}

        {searchData && (
          <AdvisorChat
            searchData={chatSearchData}
            isRefreshing={search.isPending && !!searchData}
            originalQuery={currentQuery}
            filters={tableFilters}
            onFiltersChange={setTableFilters}
            onNewSearch={handleNewSearch}
            messages={chatMessages}
            setMessages={setChatMessages}
          />
        )}

        {searchData && !isFirstLoad && (
          <>
            {/* Route pill */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-white font-bold font-mono text-lg">
                {searchData.parsed.originAirports.join(' / ')}
              </span>
              <span className="text-white/20 text-lg">{isReturn ? '⇄' : '→'}</span>
              <span className="text-white font-bold font-mono text-lg">
                {searchData.parsed.destinationAirports.join(' / ')}
              </span>
              <span className="text-white/20 mx-1">·</span>
              <span className="text-white/50 text-sm">{searchData.parsed.departureDateFrom} – {searchData.parsed.departureDateTo}</span>
              {isReturn && searchData.parsed.returnDateFrom && (
                <>
                  <span className="text-white/20">·</span>
                  <span className="text-white/50 text-sm">return {searchData.parsed.returnDateFrom} – {searchData.parsed.returnDateTo}</span>
                </>
              )}
              <span className="text-white/20">·</span>
              <span className="text-white/50 text-sm capitalize">{searchData.parsed.cabin}</span>
              {searchData.parsed.exclusions.map((ex) => (
                <span key={ex.raw} className="text-xs bg-red-500/10 border border-red-500/20 text-red-400 px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
                  <span>✕</span> {ex.raw}
                </span>
              ))}
              {pointsBalances && Object.entries(pointsBalances).map(([prog, bal]) => (
                <span key={prog} className="text-xs bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-2.5 py-1 rounded-full font-medium">
                  {prog} {bal.toLocaleString()}
                </span>
              ))}
            </div>

            {searchData.parsed.parseConfidence === 'low' && searchData.parsed.clarificationNeeded && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-sm text-amber-300">
                <p className="font-semibold mb-1">Could you clarify?</p>
                <p className="text-amber-400/70">{searchData.parsed.clarificationNeeded}</p>
              </div>
            )}

            {/* Tabs — only for return searches */}
            {isReturn && (
              <div className="flex gap-1 p-1 w-fit" style={{ background: 'var(--filter-inactive-bg)', border: '1px solid var(--filter-inactive-border)', borderRadius: '14px' }}>
                <button
                  onClick={() => setActiveTab('outbound')}
                  className="px-5 py-2 rounded-xl text-sm font-bold transition cursor-pointer"
                  style={activeTab === 'outbound'
                    ? { background: 'var(--filter-active-bg)', color: '#ffffff' }
                    : { color: 'var(--filter-inactive-text)' }}
                >
                  ↗ Outbound
                  <span className="ml-2 text-xs opacity-60">{searchData.rawResults.length}</span>
                </button>
                <button
                  onClick={() => setActiveTab('inbound')}
                  className="px-5 py-2 rounded-xl text-sm font-bold transition cursor-pointer"
                  style={activeTab === 'inbound'
                    ? { background: 'var(--filter-active-bg)', color: '#ffffff' }
                    : { color: 'var(--filter-inactive-text)' }}
                >
                  ↙ Return
                  {reasonInbound.isPending
                    ? <span className="ml-2 text-xs opacity-60 animate-pulse">…</span>
                    : <span className="ml-2 text-xs opacity-60">{searchData.inboundResults?.length ?? 0}</span>
                  }
                </button>
              </div>
            )}

            {activeResults.length === 0 && !searchData.parsed.clarificationNeeded && (
              <div className="flex flex-col items-center py-20 gap-3">
                <p className="text-white/40 font-semibold">No award availability found</p>
                <p className="text-white/20 text-sm">Try different dates, more programs, or alternative airports</p>
              </div>
            )}

            {activeResults.length > 0 && activeReasonData?.advice && (
              <div className="p-5" style={{ background: 'var(--card-bg)', boxShadow: 'var(--card-shadow)', border: '1px solid var(--card-border)', borderRadius: '20px' }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-lime-400" style={{ boxShadow: '0 0 6px rgba(163,230,53,0.8)' }} />
                  <p className="text-xs font-bold text-lime-400 uppercase tracking-wider">AI Analysis</p>
                </div>
                <p className="text-sm text-white/60 leading-relaxed">{activeReasonData.advice}</p>
              </div>
            )}

            {activeResults.length > 0 && (
              <ResultsTable
                results={activeResults}
                recommendations={activeReasonData?.recommendations}
                filters={activeFilters}
                onFiltersChange={setActiveFilters}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}
