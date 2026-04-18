import type { Recommendation } from '../../shared/types'
import { getBookingUrl } from '../utils/bookingLinks'

const VERDICT_STYLES = {
  recommended: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  consider: 'bg-amber-50 text-amber-700 border-amber-200',
  avoid: 'bg-red-50 text-red-700 border-red-200',
}

const VERDICT_LABELS = {
  recommended: '✓ Recommended',
  consider: '~ Consider',
  avoid: '✕ Avoid',
}

const FLAG_STYLES: Record<string, string> = {
  sweet_spot:          'bg-indigo-50 text-indigo-700',
  routing_risk:        'bg-orange-50 text-orange-700',
  codeshare_risk:      'bg-red-50 text-red-700',
  fuel_surcharge:      'bg-yellow-50 text-yellow-700',
  transfer_bonus:      'bg-emerald-50 text-emerald-700',
  exclusion_violation: 'bg-red-100 text-red-800',
}

const FLAG_ICONS: Record<string, string> = {
  sweet_spot:          '★',
  routing_risk:        '⚠',
  codeshare_risk:      '⚠',
  fuel_surcharge:      '£',
  transfer_bonus:      '↑',
  exclusion_violation: '✕',
}

interface Props {
  rec: Recommendation
}

export function RecommendationCard({ rec }: Props) {
  const { result } = rec
  const bookingUrl = getBookingUrl(result.source)

  return (
    <div className={`bg-white border border-gray-200 rounded-xl overflow-hidden transition hover:shadow-md ${rec.verdict === 'avoid' ? 'opacity-70' : ''}`}>
      {/* Coloured top stripe by verdict */}
      <div className={`h-1 w-full ${rec.verdict === 'recommended' ? 'bg-emerald-400' : rec.verdict === 'consider' ? 'bg-amber-400' : 'bg-red-400'}`} />

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-400 font-semibold">#{rec.rank}</span>
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${VERDICT_STYLES[rec.verdict]}`}>
                {VERDICT_LABELS[rec.verdict]}
              </span>
            </div>
            <p className="text-sm font-semibold text-gray-700">{result.programName}</p>
          </div>

          {/* Points cost */}
          <div className="text-right shrink-0 bg-gray-50 rounded-lg px-3 py-2">
            <div className="text-xl font-bold text-gray-900 tabular-nums">{result.pointsCost.toLocaleString()}</div>
            <div className="text-xs text-gray-400">points</div>
            {result.taxesCashGbp != null && (
              <div className="text-xs font-medium text-gray-600 mt-0.5">+ £{result.taxesCashGbp} taxes</div>
            )}
          </div>
        </div>

        {/* Flight detail block */}
        <div className="bg-gray-50 rounded-lg px-4 py-3 mb-4">
          {/* Route */}
          <div className="flex items-center gap-3 mb-2">
            <div className="text-center">
              <div className="text-xl font-bold font-mono text-gray-900">{result.originAirport}</div>
            </div>
            <div className="flex-1 flex items-center gap-1">
              <div className="flex-1 h-px bg-gray-300" />
              <span className="text-xs text-gray-400 px-1">
                {result.stops === 0 ? 'direct' : `${result.stops} stop${result.stops > 1 ? 's' : ''}`}
              </span>
              <div className="flex-1 h-px bg-gray-300" />
            </div>
            <div className="text-center">
              <div className="text-xl font-bold font-mono text-gray-900">{result.destinationAirport}</div>
            </div>
          </div>

          {/* Date + cabin + seats */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <span>{result.date}</span>
              <span className="text-gray-300">·</span>
              <span className="capitalize">{result.cabin}</span>
            </div>
            {result.remainingSeats != null && (
              <span className={`font-medium ${result.remainingSeats <= 2 ? 'text-amber-600' : 'text-gray-400'}`}>
                {result.remainingSeats} seat{result.remainingSeats !== 1 ? 's' : ''} left
              </span>
            )}
          </div>

          {/* Operating airlines */}
          {result.airlines.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-gray-200">
              <span className="text-xs text-gray-400">Operated by</span>
              {result.airlines.map((a) => (
                <span key={a} className="text-xs font-mono font-semibold bg-white border border-gray-200 text-gray-700 px-1.5 py-0.5 rounded">
                  {a}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Headline + explanation */}
        <p className="text-sm font-semibold text-gray-800 mb-1">{rec.headline}</p>
        <p className="text-sm text-gray-600 leading-relaxed mb-3">{rec.explanation}</p>

        {/* Flags */}
        {rec.flags.length > 0 && (
          <div className="space-y-1.5 mb-4">
            {rec.flags.map((flag, i) => (
              <div key={i} className={`flex gap-2 text-xs px-2.5 py-1.5 rounded-lg ${FLAG_STYLES[flag.type] ?? 'bg-gray-50 text-gray-600'}`}>
                <span className="shrink-0 font-semibold">{FLAG_ICONS[flag.type] ?? '•'}</span>
                <span>{flag.message}</span>
              </div>
            ))}
          </div>
        )}

        {/* Footer: CPP + book button */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          {rec.cppGbp != null ? (
            <div className="text-xs text-gray-400">
              Value: <span className="font-semibold text-gray-600">{(rec.cppGbp * 100).toFixed(1)}p / point</span>
              {rec.estimatedCashValueGbp != null && (
                <span className="ml-2 text-gray-400">(≈ £{rec.estimatedCashValueGbp.toLocaleString()} cash)</span>
              )}
            </div>
          ) : <div />}

          {bookingUrl && (
            <a
              href={bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg transition no-underline"
            >
              Book via {result.programName.split(' ').slice(-1)[0]} →
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
