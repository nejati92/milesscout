import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { useEffect, useRef, useState } from 'react'
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
  const { q, points } = Route.useSearch()
  const navigate = useNavigate()
  const pointsBalances = points ? (JSON.parse(points) as Record<string, number>) : undefined
  const search = trpc.search.search.useMutation()
  // useMutation clears .data on each new call — keep last successful result so the
  // UI never flashes back to the loading spinner during a follow-up search
  const lastData = useRef(search.data)
  if (search.data) lastData.current = search.data
  const data = search.data ?? lastData.current

  const [tableFilters, setTableFilters] = useState<TableFilters>(DEFAULT_FILTERS)
  const [currentQuery, setCurrentQuery] = useState(q)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])

  useEffect(() => {
    if (q) {
      search.mutate({ text: q, pointsBalances })
      setCurrentQuery(q)
      setTableFilters(DEFAULT_FILTERS)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, points])

  function handleNewSearch(newQuery: string) {
    setTableFilters(DEFAULT_FILTERS)
    setCurrentQuery(newQuery)
    navigate({ to: '/results', search: { q: newQuery, ...(points ? { points } : {}) } })
  }

  const isFirstLoad = search.isPending && !data

  return (
    <div className="min-h-[calc(100vh-3rem)] flex flex-col">
      {/* Top bar */}
      <div className="border-b border-white/5 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <Link to="/" className="text-white/30 hover:text-white/60 text-sm transition no-underline shrink-0">←</Link>
          <div className="flex-1 text-sm text-white/40 truncate">{currentQuery}</div>
          {search.isPending && data && (
            <span className="text-xs text-indigo-400/60 animate-pulse shrink-0">Searching…</span>
          )}
          {data && !search.isPending && (
            <div className="flex items-center gap-3 shrink-0">
              {data.cacheHit && <span className="text-xs text-white/20 bg-white/5 px-2 py-1 rounded-full">cached</span>}
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                data.parsed.parseConfidence === 'high' ? 'bg-emerald-500/10 text-emerald-400' :
                data.parsed.parseConfidence === 'medium' ? 'bg-amber-500/10 text-amber-400' :
                'bg-red-500/10 text-red-400'
              }`}>{data.parsed.parseConfidence} confidence</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 space-y-8">

        {/* First-load spinner — only when no data yet */}
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

        {/* Error */}
        {search.isError && (
          <div className="flex flex-col items-center py-24 gap-4">
            <div className="text-4xl">⚠</div>
            <p className="text-white/50">{search.error.message}</p>
            <Link to="/" className="text-sm text-indigo-400 hover:text-indigo-300 no-underline">Try again →</Link>
          </div>
        )}

        {/* Chat — always visible once we have data, stays mounted across new searches */}
        {data && (
          <AdvisorChat
            searchData={data}
            isRefreshing={search.isPending && !!data}
            originalQuery={currentQuery}
            filters={tableFilters}
            onFiltersChange={setTableFilters}
            onNewSearch={handleNewSearch}
            messages={chatMessages}
            setMessages={setChatMessages}
          />
        )}

        {/* Results */}
        {data && !isFirstLoad && (
          <>
            {/* Parsed pill */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-white font-bold font-mono text-lg">
                {data.parsed.originAirports.join(' / ')}
              </span>
              <span className="text-white/20 text-lg">→</span>
              <span className="text-white font-bold font-mono text-lg">
                {data.parsed.destinationAirports.join(' / ')}
              </span>
              <span className="text-white/20 mx-1">·</span>
              <span className="text-white/50 text-sm">{data.parsed.departureDateFrom} – {data.parsed.departureDateTo}</span>
              <span className="text-white/20">·</span>
              <span className="text-white/50 text-sm capitalize">{data.parsed.cabin}</span>
              {data.parsed.exclusions.map((ex) => (
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

            {/* Clarification */}
            {data.parsed.parseConfidence === 'low' && data.parsed.clarificationNeeded && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-sm text-amber-300">
                <p className="font-semibold mb-1">Could you clarify?</p>
                <p className="text-amber-400/70">{data.parsed.clarificationNeeded}</p>
              </div>
            )}

            {/* No results */}
            {data.rawResults.length === 0 && !data.parsed.clarificationNeeded && (
              <div className="flex flex-col items-center py-20 gap-3">
                <p className="text-white/40 font-semibold">No award availability found</p>
                <p className="text-white/20 text-sm">Try different dates, more programs, or alternative airports</p>
              </div>
            )}

            {/* Results table */}
            {data.rawResults.length > 0 && (
              <ResultsTable
                results={data.rawResults}
                recommendations={data.recommendations}
                filters={tableFilters}
                onFiltersChange={setTableFilters}
              />
            )}

            {/* Strategic advice */}
            {data.advice && data.rawResults.length > 0 && (
              <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-5">
                <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-3">Strategic Advice</p>
                <p className="text-sm text-white/50 leading-relaxed">{data.advice}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
