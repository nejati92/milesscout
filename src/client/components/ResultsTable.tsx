import { useMemo, useState, useEffect } from 'react'
import type { AvailabilityResult, Recommendation } from '../../shared/types'
import { getBookingUrl } from '../utils/bookingLinks'
import { trpc } from '../trpc'

const AIRLINE_NAMES: Record<string, string> = {
  EK: 'Emirates', QR: 'Qatar Airways', EY: 'Etihad Airways', SQ: 'Singapore Airlines',
  BA: 'British Airways', AF: 'Air France', KL: 'KLM', LH: 'Lufthansa',
  QF: 'Qantas', CX: 'Cathay Pacific', TG: 'Thai Airways', NH: 'ANA',
  JL: 'Japan Airlines', TK: 'Turkish Airlines', UA: 'United Airlines',
  AA: 'American Airlines', DL: 'Delta Air Lines', AC: 'Air Canada',
  VS: 'Virgin Atlantic', IB: 'Iberia', MH: 'Malaysia Airlines',
  AI: 'Air India', MS: 'EgyptAir', RJ: 'Royal Jordanian',
  GF: 'Gulf Air', FZ: 'flydubai', WY: 'Oman Air', SV: 'Saudia',
  ET: 'Ethiopian Airlines', KE: 'Korean Air', OZ: 'Asiana Airlines',
  CI: 'China Airlines', BR: 'EVA Air', MU: 'China Eastern',
  CA: 'Air China', CZ: 'China Southern', LX: 'Swiss', OS: 'Austrian',
  SK: 'SAS', AY: 'Finnair', TP: 'TAP Air Portugal', UX: 'Air Europa',
}

export type SortKey = 'pointsCost' | 'date' | 'taxesCashGbp'
export type SortDir = 'asc' | 'desc'

export interface TableFilters {
  program: string | null
  airline: string | null
  cabin: string | null
  directOnly: boolean
  dateFrom: string | null
  dateTo: string | null
  sort: SortKey
  sortDir: SortDir
  highlighted: string[]
  expanded: string | null
}

export const DEFAULT_FILTERS: TableFilters = {
  program: null, airline: null, cabin: null, directOnly: false,
  dateFrom: null, dateTo: null,
  sort: 'pointsCost', sortDir: 'asc', highlighted: [], expanded: null,
}

const PAGE_SIZE = 10

const VERDICT_GLOW = {
  recommended: '0 0 8px rgba(52,211,153,0.7)',
  consider:    '0 0 8px rgba(251,191,36,0.7)',
  avoid:       '0 0 8px rgba(248,113,113,0.7)',
}
const VERDICT_DOT  = { recommended: 'bg-emerald-400', consider: 'bg-amber-400', avoid: 'bg-red-400' }
const VERDICT_TEXT = { recommended: 'text-emerald-400', consider: 'text-amber-400', avoid: 'text-red-400' }
const VERDICT_LABEL = { recommended: 'Recommended', consider: 'Consider', avoid: 'Avoid' }
const FLAG_STYLE: Record<string, string> = {
  sweet_spot:          'bg-indigo-500/10 text-indigo-300 border-indigo-500/20',
  routing_risk:        'bg-orange-500/10 text-orange-300 border-orange-500/20',
  codeshare_risk:      'bg-red-500/10 text-red-300 border-red-500/20',
  fuel_surcharge:      'bg-yellow-500/10 text-yellow-300 border-yellow-500/20',
  transfer_bonus:      'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  exclusion_violation: 'bg-red-500/20 text-red-300 border-red-500/30',
}
const FLAG_ICON: Record<string, string> = {
  sweet_spot: '★', routing_risk: '⚠', codeshare_risk: '⚠',
  fuel_surcharge: '£', transfer_bonus: '↑', exclusion_violation: '✕',
}

function fmtTime(iso: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })
}

function fmtDuration(mins: number) {
  if (!mins) return ''
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

function ExpandedRow({ result, rec }: { result: EnrichedResult; rec: ReturnType<typeof result['recommendation']> }) {
  const { data, isLoading } = trpc.search.tripDetails.useQuery({ id: result.id, cabin: result.cabin, source: result.source }, { staleTime: 10 * 60 * 1000 })

  const trips = data?.trips ?? []

  return (
    <div className="space-y-4">
      {/* Flight segments */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-xs text-white/25 animate-pulse">
          <span className="w-3 h-3 rounded-full border border-white/20 animate-spin border-t-transparent" />
          Loading flight details…
        </div>
      ) : trips.length > 0 ? (
        <div className="space-y-3">
          {trips.map((trip, ti) => {
            const segments = Array.isArray(trip?.AvailabilitySegments) ? trip.AvailabilitySegments : []
            return (
              <div key={trip?.ID ?? ti} className="space-y-1.5">
                {trips.length > 1 && (
                  <p className="text-xs text-white/25 font-medium uppercase tracking-wider">Option {ti + 1}</p>
                )}
                <div className="flex flex-col gap-1">
                  {segments.map((seg, si) => {
                    const prev = si > 0 ? segments[si - 1] : null
                    const layoverMins = prev
                      ? Math.round((new Date(seg.DepartsAt).getTime() - new Date(prev.ArrivesAt).getTime()) / 60000)
                      : 0
                    return (
                      <div key={si}>
                        {si > 0 && layoverMins > 0 && (
                          <div className="flex items-center gap-2 py-1 pl-2">
                            <div className="w-px h-4 bg-white/10" />
                            <span className="text-xs text-white/25">Layover {seg.DestinationAirport} · {fmtDuration(layoverMins)}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-3 bg-white/[0.03] border border-white/8 rounded-xl px-4 py-3">
                          <span className="text-xs font-mono font-bold text-indigo-300 w-16 shrink-0">{seg.FlightNumber}</span>
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div className="text-right shrink-0">
                              <div className="text-sm font-mono font-bold text-white">{seg.OriginAirport}</div>
                              <div className="text-xs text-white/30">{fmtTime(seg.DepartsAt)}</div>
                            </div>
                            <span className="flex-1 border-t border-dashed border-white/10 mx-2" />
                            {seg.Duration > 0 && <span className="text-xs text-white/25 shrink-0">{fmtDuration(seg.Duration)}</span>}
                            <span className="flex-1 border-t border-dashed border-white/10 mx-2" />
                            <div className="text-left shrink-0">
                              <div className="text-sm font-mono font-bold text-white">{seg.DestinationAirport}</div>
                              <div className="text-xs text-white/30">{fmtTime(seg.ArrivesAt)}</div>
                            </div>
                          </div>
                          {seg.AircraftName && (
                            <span className="text-xs text-white/20 shrink-0 hidden sm:block">{seg.AircraftName}</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-xs text-white/20">No flight details available</p>
      )}

      {/* AI analysis */}
      {rec && (
        <div className="space-y-2 pt-1 border-t border-white/5">
          <p className="text-sm font-semibold text-white/80">{rec.headline}</p>
          <p className="text-sm text-white/50 leading-relaxed">{rec.explanation}</p>
          {rec.flags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {rec.flags.map((flag, i) => (
                <div key={i} className={`flex gap-1.5 text-xs px-3 py-1.5 rounded-lg border ${FLAG_STYLE[flag.type] ?? 'bg-white/5 text-white/40 border-white/10'}`}>
                  <span className="font-bold shrink-0">{FLAG_ICON[flag.type] ?? '•'}</span>
                  <span>{flag.message}</span>
                </div>
              ))}
            </div>
          )}
          {rec.cppGbp != null && (
            <span className="text-xs text-white/25">
              {(rec.cppGbp * 100).toFixed(1)}p/pt
              {rec.estimatedCashValueGbp != null && <span className="ml-2">≈ £{rec.estimatedCashValueGbp.toLocaleString()} cash</span>}
            </span>
          )}
        </div>
      )}

      {/* Booking links */}
      {!isLoading && (data?.relevant || data?.others?.length) && (
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/5">
          {data.relevant && (
            <a href={data.relevant.link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
              className="text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg transition no-underline">
              {data.relevant.label} →
            </a>
          )}
          {data.others?.map((b, i) => (
            <a key={i} href={b.link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
              className="text-xs text-white/40 hover:text-white/70 bg-white/5 hover:bg-white/10 px-3 py-2 rounded-lg transition no-underline border border-white/8">
              {b.label}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

interface EnrichedResult extends AvailabilityResult {
  recommendation?: Recommendation
}

interface Props {
  results: AvailabilityResult[]
  recommendations?: Recommendation[]
  filters: TableFilters
  onFiltersChange: (f: TableFilters) => void
}

export function ResultsTable({ results, recommendations, filters, onFiltersChange }: Props) {
  const [page, setPage] = useState(0)

  // Reset to page 0 whenever filters or sort changes
  useEffect(() => { setPage(0) }, [
    filters.program, filters.airline, filters.cabin, filters.directOnly,
    filters.dateFrom, filters.dateTo, filters.sort, filters.sortDir,
  ])

  const update = (patch: Partial<TableFilters>) => onFiltersChange({ ...filters, ...patch })

  function handleSortClick(k: SortKey) {
    if (filters.sort === k) {
      update({ sortDir: filters.sortDir === 'asc' ? 'desc' : 'asc' })
    } else {
      update({ sort: k, sortDir: 'asc' })
    }
  }

  const enriched: EnrichedResult[] = useMemo(() => {
    const recMap = new Map((recommendations ?? []).map((r) => [r.result.id, r]))
    return results.map((r) => ({ ...r, recommendation: recMap.get(r.id) }))
  }, [results, recommendations])

  const programs = useMemo(() => [...new Set(enriched.map((r) => r.source))].sort(), [enriched])
  const airlines  = useMemo(() => [...new Set(enriched.flatMap((r) => r.airlines))].filter(Boolean).sort(), [enriched])
  const cabins    = useMemo(() => [...new Set(enriched.map((r) => r.cabin))].sort(), [enriched])

  const filtered = enriched.filter((r) => {
    if (filters.program && r.source !== filters.program) return false
    if (filters.airline && !r.airlines.includes(filters.airline)) return false
    if (filters.cabin && r.cabin !== filters.cabin) return false
    if (filters.directOnly && r.stops !== 0) return false
    if (filters.dateFrom && r.date < filters.dateFrom) return false
    if (filters.dateTo && r.date > filters.dateTo) return false
    return true
  })

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0
    if (filters.sort === 'date') {
      cmp = a.date.localeCompare(b.date)
    } else if (filters.sort === 'taxesCashGbp') {
      cmp = (a.taxesCashGbp ?? 9999) - (b.taxesCashGbp ?? 9999)
    } else {
      // pointsCost: secondary sort by verdict
      const verdictOrder = { recommended: 0, consider: 1, avoid: 2 }
      const av = a.recommendation?.verdict, bv = b.recommendation?.verdict
      if (av !== bv) {
        cmp = (verdictOrder[av as keyof typeof verdictOrder] ?? 3) - (verdictOrder[bv as keyof typeof verdictOrder] ?? 3)
      } else {
        cmp = a.pointsCost - b.pointsCost
      }
    }
    return filters.sortDir === 'desc' ? -cmp : cmp
  })

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE)
  const paginated = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const hasFilters = filters.program || filters.airline || filters.cabin || filters.directOnly || filters.dateFrom || filters.dateTo

  function SortTh({ label, k, className = '' }: { label: string; k: SortKey; className?: string }) {
    const active = filters.sort === k
    const arrow = active ? (filters.sortDir === 'asc' ? '↑' : '↓') : ''
    return (
      <th
        className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer select-none transition whitespace-nowrap ${active ? 'text-white' : 'text-white/25 hover:text-white/50'} ${className}`}
        onClick={() => handleSortClick(k)}
      >
        {label}{active ? ` ${arrow}` : ''}
      </th>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        {programs.map((p) => {
          const label = enriched.find((r) => r.source === p)?.programName ?? p
          const active = filters.program === p
          return (
            <button key={p} onClick={() => update({ program: active ? null : p })}
              className={`text-xs px-3 py-1.5 rounded-lg border transition cursor-pointer font-medium ${active ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300' : 'bg-white/5 border-white/10 text-white/40 hover:text-white/70 hover:border-white/20'}`}>
              {label}
            </button>
          )
        })}

        {airlines.length > 1 && <>
          <div className="w-px h-4 bg-white/10" />
          {airlines.map((a) => {
            const active = filters.airline === a
            return (
              <span key={a} className="relative group/chip">
                <button onClick={() => update({ airline: active ? null : a })}
                  className={`text-xs px-2.5 py-1.5 rounded-lg border font-mono transition cursor-pointer font-semibold ${active ? 'bg-violet-500/20 border-violet-500/40 text-violet-300' : 'bg-white/5 border-white/10 text-white/30 hover:text-white/60 hover:border-white/20'}`}>
                  {a}
                </button>
                {AIRLINE_NAMES[a] && (
                  <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 text-xs bg-[#1a1a2e] border border-white/10 text-white/80 rounded-lg whitespace-nowrap opacity-0 group-hover/chip:opacity-100 transition-opacity duration-150 z-20 shadow-lg">
                    {AIRLINE_NAMES[a]}
                  </span>
                )}
              </span>
            )
          })}
        </>}

        {cabins.length > 1 && <>
          <div className="w-px h-4 bg-white/10" />
          {cabins.map((c) => {
            const active = filters.cabin === c
            return (
              <button key={c} onClick={() => update({ cabin: active ? null : c })}
                className={`text-xs px-2.5 py-1.5 rounded-lg border transition cursor-pointer capitalize ${active ? 'bg-fuchsia-500/20 border-fuchsia-500/40 text-fuchsia-300' : 'bg-white/5 border-white/10 text-white/30 hover:text-white/60 hover:border-white/20'}`}>
                {c}
              </button>
            )
          })}
        </>}

        <div className="w-px h-4 bg-white/10" />
        <button
          onClick={() => update({ directOnly: !filters.directOnly })}
          className={`text-xs px-2.5 py-1.5 rounded-lg border transition cursor-pointer font-medium ${filters.directOnly ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-white/5 border-white/10 text-white/30 hover:text-white/60 hover:border-white/20'}`}>
          Direct only
        </button>

        {(filters.dateFrom || filters.dateTo) && (
          <button onClick={() => update({ dateFrom: null, dateTo: null })}
            className="text-xs px-2.5 py-1.5 rounded-lg border bg-violet-500/20 border-violet-500/40 text-violet-300 transition cursor-pointer font-medium">
            {filters.dateFrom && filters.dateTo ? `${filters.dateFrom} – ${filters.dateTo}` : filters.dateFrom ?? filters.dateTo} ×
          </button>
        )}

        {hasFilters && (
          <button onClick={() => update({ program: null, airline: null, cabin: null, directOnly: false, dateFrom: null, dateTo: null })}
            className="text-xs text-white/30 hover:text-white/60 transition cursor-pointer">
            × clear filters
          </button>
        )}
        <span className="ml-auto text-xs text-white/20">{filtered.length} of {results.length}</span>
      </div>

      {/* Table */}
      <div className="bg-white/[0.03] border border-white/8 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <colgroup>
              <col className="w-8" />
              <col className="w-48" />
              <col className="w-32" />
              <col className="w-28" />
              <col className="w-24" />
              <col className="w-20" />
              <col className="w-28" />
              <col className="w-16" />
              <col className="w-8" />
            </colgroup>
            <thead>
              <tr className="border-b border-white/5">
                <th className="px-4 py-3 w-8" />
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/25">Program</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/25">Route</th>
                <SortTh label="Date" k="date" />
                <SortTh label="Points" k="pointsCost" className="text-right" />
                <SortTh label="Taxes" k="taxesCashGbp" className="text-right" />
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/25">Airlines</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-white/25">Seats</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-white/20 text-sm">No results match the current filters.</td>
                </tr>
              ) : paginated.map((r) => {
                const rec = r.recommendation
                const isExpanded = filters.expanded === r.id
                const isHighlighted = filters.highlighted.includes(r.id)

                return (
                  <>
                    <tr
                      key={r.id}
                      onClick={() => update({ expanded: isExpanded ? null : r.id })}
                      className={`border-b border-white/5 last:border-0 cursor-pointer transition-colors ${isExpanded ? 'bg-white/[0.04]' : isHighlighted ? 'bg-indigo-500/5' : 'hover:bg-white/[0.02]'}`}
                    >
                      {/* Verdict dot */}
                      <td className="px-4 py-4 w-8">
                        <div className="flex justify-center">
                          {rec ? (
                            <div className={`w-2 h-2 rounded-full shrink-0 ${VERDICT_DOT[rec.verdict]}`}
                              style={{ boxShadow: VERDICT_GLOW[rec.verdict] }} />
                          ) : recommendations === undefined ? (
                            <div className="w-2 h-2 rounded-full bg-white/20 animate-pulse" />
                          ) : (
                            <div className="w-2 h-2 rounded-full bg-white/10" />
                          )}
                        </div>
                      </td>

                      {/* Program */}
                      <td className="px-4 py-4">
                        <div className="text-sm font-semibold text-white/80 truncate max-w-[180px]">{r.programName}</div>
                        {rec && <div className={`text-xs font-medium mt-0.5 ${VERDICT_TEXT[rec.verdict]}`}>{VERDICT_LABEL[rec.verdict]}</div>}
                      </td>

                      {/* Route */}
                      <td className="px-4 py-4">
                        <div className="text-sm font-mono font-bold text-white whitespace-nowrap">
                          {r.originAirport} <span className="text-white/25">→</span> {r.destinationAirport}
                        </div>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-4">
                        <div className="text-sm text-white/60 whitespace-nowrap">{r.date}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-xs text-white/25 capitalize">{r.cabin}</span>
                          <span className="text-white/15">·</span>
                          <span className={`text-xs font-medium ${r.stops === 0 ? 'text-emerald-400/70' : 'text-amber-400/70'}`}>
                            {r.stops === 0 ? 'Direct' : `${r.stops}+ stop`}
                          </span>
                        </div>
                      </td>

                      {/* Points */}
                      <td className="px-4 py-4 text-right">
                        <div className="text-sm font-bold text-white tabular-nums">{r.pointsCost.toLocaleString()}</div>
                        <div className="text-xs text-white/25">pts</div>
                      </td>

                      {/* Taxes */}
                      <td className="px-4 py-4 text-right">
                        <div className="text-sm font-semibold text-white/60 tabular-nums">{r.taxesCashGbp != null ? `£${r.taxesCashGbp}` : '—'}</div>
                      </td>

                      {/* Airlines */}
                      <td className="px-4 py-4">
                        <div className="flex gap-1 flex-wrap">
                          {r.airlines.map((a) => (
                            <span key={a} className="relative group/airline">
                              <span className="text-xs font-mono font-bold bg-white/8 text-white/50 px-1.5 py-0.5 rounded cursor-default">{a}</span>
                              {AIRLINE_NAMES[a] && (
                                <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 text-xs bg-[#1a1a2e] border border-white/10 text-white/80 rounded-lg whitespace-nowrap opacity-0 group-hover/airline:opacity-100 transition-opacity duration-150 z-20 shadow-lg">
                                  {AIRLINE_NAMES[a]}
                                </span>
                              )}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Seats */}
                      <td className="px-4 py-4 text-right">
                        <span className={`text-sm font-semibold ${r.remainingSeats != null && r.remainingSeats <= 2 ? 'text-amber-400' : 'text-white/25'}`}>
                          {r.remainingSeats ?? '—'}
                        </span>
                      </td>

                      {/* Expand */}
                      <td className="px-3 py-4 text-white/20 text-xs text-center">{isExpanded ? '▲' : '▼'}</td>
                    </tr>

                    {/* Expanded row */}
                    {isExpanded && (
                      <tr key={`${r.id}-expanded`} className="bg-white/[0.03] border-b border-white/5">
                        <td colSpan={9} className="px-6 py-5">
                          <ExpandedRow result={r} rec={rec} />
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-white/5 flex items-center justify-between">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="text-xs text-white/30 hover:text-white/60 disabled:text-white/10 disabled:cursor-not-allowed transition cursor-pointer px-2 py-1"
            >
              ← Prev
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i)}
                  className={`w-7 h-7 rounded-lg text-xs transition cursor-pointer ${i === page ? 'bg-indigo-500/20 text-indigo-300 font-semibold' : 'text-white/25 hover:text-white/50 hover:bg-white/5'}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className="text-xs text-white/30 hover:text-white/60 disabled:text-white/10 disabled:cursor-not-allowed transition cursor-pointer px-2 py-1"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
