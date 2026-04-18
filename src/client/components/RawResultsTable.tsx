import { useState, useMemo } from 'react'
import type { AvailabilityResult } from '../../shared/types'
import { getBookingUrl } from '../utils/bookingLinks'

type SortKey = 'pointsCost' | 'date' | 'taxesCashGbp'

interface Props {
  results: AvailabilityResult[]
}

export function RawResultsTable({ results }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('pointsCost')
  const [collapsed, setCollapsed] = useState(false)
  const [programFilter, setProgramFilter] = useState<string | null>(null)
  const [airlineFilter, setAirlineFilter] = useState<string | null>(null)
  const [cabinFilter, setCabinFilter] = useState<string | null>(null)

  // Unique filter options derived from results
  const programs = useMemo(() => [...new Set(results.map((r) => r.source))].sort(), [results])
  const airlines = useMemo(() => [...new Set(results.flatMap((r) => r.airlines))].filter(Boolean).sort(), [results])
  const cabins = useMemo(() => [...new Set(results.map((r) => r.cabin))].sort(), [results])

  const filtered = results.filter((r) => {
    if (programFilter && r.source !== programFilter) return false
    if (airlineFilter && !r.airlines.includes(airlineFilter)) return false
    if (cabinFilter && r.cabin !== cabinFilter) return false
    return true
  })

  const sorted = [...filtered].sort((a, b) => {
    if (sortKey === 'date') return a.date.localeCompare(b.date)
    if (sortKey === 'taxesCashGbp') return (a.taxesCashGbp ?? 9999) - (b.taxesCashGbp ?? 9999)
    return a.pointsCost - b.pointsCost
  })

  const hasFilters = programFilter || airlineFilter || cabinFilter

  function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
    return (
      <button
        onClick={onClick}
        className={`text-xs px-2.5 py-1 rounded-full border transition cursor-pointer ${
          active
            ? 'bg-indigo-600 text-white border-indigo-600 font-semibold'
            : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
        }`}
      >
        {label}
      </button>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700">All results</span>
          <span className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full">{filtered.length}</span>
          {hasFilters && (
            <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full font-medium">filtered</span>
          )}
        </div>
        <span className="text-gray-400 text-xs">{collapsed ? '▼ show' : '▲ hide'}</span>
      </div>

      {!collapsed && (
        <>
          {/* Filters + sort bar */}
          <div className="px-4 py-3 border-t border-gray-100 space-y-2">
            {/* Sort */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-gray-400 font-medium mr-1">Sort</span>
              {(['pointsCost', 'date', 'taxesCashGbp'] as SortKey[]).map((k) => (
                <button
                  key={k}
                  onClick={() => setSortKey(k)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition cursor-pointer ${
                    sortKey === k
                      ? 'bg-gray-900 text-white border-gray-900 font-semibold'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                  }`}
                >
                  {k === 'pointsCost' ? 'Points' : k === 'date' ? 'Date' : 'Taxes'}
                </button>
              ))}
            </div>

            {/* Program filter */}
            {programs.length > 1 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-gray-400 font-medium mr-1">Program</span>
                {programs.map((p) => {
                  const label = results.find((r) => r.source === p)?.programName ?? p
                  return (
                    <FilterChip
                      key={p}
                      label={label}
                      active={programFilter === p}
                      onClick={() => setProgramFilter(programFilter === p ? null : p)}
                    />
                  )
                })}
              </div>
            )}

            {/* Airline filter */}
            {airlines.length > 1 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-gray-400 font-medium mr-1">Airline</span>
                {airlines.map((a) => (
                  <FilterChip
                    key={a}
                    label={a}
                    active={airlineFilter === a}
                    onClick={() => setAirlineFilter(airlineFilter === a ? null : a)}
                  />
                ))}
              </div>
            )}

            {/* Cabin filter */}
            {cabins.length > 1 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-gray-400 font-medium mr-1">Cabin</span>
                {cabins.map((c) => (
                  <FilterChip
                    key={c}
                    label={c.charAt(0).toUpperCase() + c.slice(1)}
                    active={cabinFilter === c}
                    onClick={() => setCabinFilter(cabinFilter === c ? null : c)}
                  />
                ))}
              </div>
            )}

            {/* Clear filters */}
            {hasFilters && (
              <button
                onClick={() => { setProgramFilter(null); setAirlineFilter(null); setCabinFilter(null) }}
                className="text-xs text-indigo-600 hover:underline cursor-pointer"
              >
                Clear all filters ({results.length - filtered.length} hidden)
              </button>
            )}
          </div>

          {/* Table */}
          {sorted.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">No results match the current filters.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 text-gray-400 uppercase tracking-wide text-left border-t border-gray-100">
                    <th className="px-4 py-2.5 font-medium">Program</th>
                    <th className="px-4 py-2.5 font-medium">Route</th>
                    <th className="px-4 py-2.5 font-medium">Date</th>
                    <th className="px-4 py-2.5 font-medium">Cabin</th>
                    <th className="px-4 py-2.5 font-medium text-right">Points</th>
                    <th className="px-4 py-2.5 font-medium text-right">Taxes</th>
                    <th className="px-4 py-2.5 font-medium">Airlines</th>
                    <th className="px-4 py-2.5 font-medium text-right">Seats</th>
                    <th className="px-4 py-2.5 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sorted.map((r) => {
                    const bookingUrl = getBookingUrl(r.source)
                    return (
                      <tr key={r.id} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-2.5 font-medium text-gray-700 max-w-[130px]">
                          <div className="truncate">{r.programName}</div>
                        </td>
                        <td className="px-4 py-2.5 font-mono font-semibold text-gray-800">
                          {r.originAirport} → {r.destinationAirport}
                        </td>
                        <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{r.date}</td>
                        <td className="px-4 py-2.5 capitalize text-gray-500">{r.cabin}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-gray-800 tabular-nums">
                          {r.pointsCost.toLocaleString()}
                        </td>
                        <td className="px-4 py-2.5 text-right text-gray-500 tabular-nums">
                          {r.taxesCashGbp != null ? `£${r.taxesCashGbp}` : '—'}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex gap-1 flex-wrap">
                            {r.airlines.map((a) => (
                              <span key={a} className="font-mono text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                                {a}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className={`px-4 py-2.5 text-right font-medium ${r.remainingSeats != null && r.remainingSeats <= 2 ? 'text-amber-600' : 'text-gray-400'}`}>
                          {r.remainingSeats ?? '—'}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {bookingUrl && (
                            <a
                              href={bookingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium no-underline whitespace-nowrap"
                            >
                              Book →
                            </a>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
