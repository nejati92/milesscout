import type { ParsedQuery, AvailabilityResult } from '../../../shared/types.js'
import type { TransferPartner } from '../../data/transferPartners.js'
import type { SweetSpot } from '../../data/sweetSpots.js'
import type { RoutingRule } from '../../data/routingRules.js'
import type { Program } from '../../data/programs.js'

interface PromptRules {
  transferPartners: TransferPartner[]
  sweetSpots: SweetSpot[]
  routingRules: RoutingRule[]
  programs: Program[]
}

function formatTransferPartners(partners: TransferPartner[]): string {
  return partners.map((p) => {
    const lines = p.airlinePartners.map(
      (ap) => `  • ${ap.program} at ${ap.ratio}${ap.bonus ? ` (${ap.bonus})` : ''}`
    )
    return `${p.creditProgram}:\n${lines.join('\n')}`
  }).join('\n\n')
}

function formatSweetSpots(spots: SweetSpot[]): string {
  return spots.map((s) =>
    `[${s.program.toUpperCase()}] ${s.description} — ${s.note}${s.typicalPoints ? ` (~${s.typicalPoints.toLocaleString()} pts)` : ''}`
  ).join('\n')
}

function formatRoutingRules(rules: RoutingRule[]): string {
  return rules.map((r) =>
    `[${r.risk.toUpperCase()}] ${r.trigger}: ${r.message} (${r.affectedRoutes.join(', ')})`
  ).join('\n')
}

function formatPointsBalances(balances?: Record<string, number>): string {
  if (!balances || Object.keys(balances).length === 0) return 'Not provided'
  return Object.entries(balances).map(([p, b]) => `${p}: ${b.toLocaleString()}`).join(', ')
}

function formatResults(results: AvailabilityResult[]): string {
  if (results.length === 0) return 'No results found.'
  return results.map((r, i) =>
    `[${i}] ${r.programName} | ${r.originAirport}→${r.destinationAirport} | ${r.date} | ${r.cabin} | ${r.stops === 0 ? 'direct' : `${r.stops}+stop`} | ${r.pointsCost.toLocaleString()}pts${r.taxesCashGbp != null ? ` + £${r.taxesCashGbp}` : ''} | ${r.airlines.join(',')}${r.remainingSeats != null ? ` | ${r.remainingSeats}seats` : ''}`
  ).join('\n')
}

const OUTPUT_SCHEMA = `{"recommendations":[{"rank":1,"resultIndex":0,"verdict":"recommended"|"consider"|"avoid","headline":"one line","explanation":"2-3 sentences","flags":[{"type":"sweet_spot"|"routing_risk"|"codeshare_risk"|"fuel_surcharge"|"transfer_bonus"|"exclusion_violation","message":"..."}],"estimatedCashValueGbp":800,"cppGbp":0.014}],"advice":"1-2 sentences of strategic advice."}`

/** Static knowledge-base section — pass this with cache_control: ephemeral */
export function buildStaticPrompt(rules: PromptRules): string {
  return `You are an expert award travel advisor. Analyse award availability and recommend the best 3 options. Return ONLY valid JSON, no markdown.

TRANSFER PARTNERS:
${formatTransferPartners(rules.transferPartners)}

SWEET SPOTS:
${formatSweetSpots(rules.sweetSpots)}

ROUTING GOTCHAS:
${formatRoutingRules(rules.routingRules)}

OUTPUT SCHEMA (match exactly):
${OUTPUT_SCHEMA}`
}

/** Dynamic per-request section — not cached */
export function buildDynamicPrompt(
  parsed: ParsedQuery,
  rawResults: AvailabilityResult[],
  pointsBalances?: Record<string, number>
): string {
  const exclusions = parsed.exclusions.length === 0
    ? 'None'
    : parsed.exclusions.map((e) => `"${e.raw}" → ${e.normalised.join(',')}`).join('; ')

  return `TRIP: ${parsed.originAirports.join('/')} → ${parsed.destinationAirports.join('/')} | ${parsed.departureDateFrom}–${parsed.departureDateTo} | ${parsed.cabin} | ${parsed.adults} adult(s)
POINTS: ${formatPointsBalances(pointsBalances)}
EXCLUSIONS: ${exclusions}

RESULTS (${rawResults.length}):
${formatResults(rawResults)}

Rank the top 3. Flag exclusion violations. Explain the why. Be direct and specific.`
}

/** Legacy combined export — kept for compatibility */
export function buildReasoningPrompt(
  parsed: ParsedQuery,
  rawResults: AvailabilityResult[],
  pointsBalances: Record<string, number> | undefined,
  rules: PromptRules
): string {
  return buildStaticPrompt(rules) + '\n\n' + buildDynamicPrompt(parsed, rawResults, pointsBalances)
}
