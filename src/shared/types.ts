import { z } from 'zod'

export const RawQuery = z.object({
  text: z.string(),
  pointsBalances: z.record(z.string(), z.number()).optional(),
  preferences: z.object({
    cabinPreference: z.enum(['economy', 'business', 'first']).optional(),
    maxStops: z.number().optional(),
    flexibleDates: z.boolean().default(false),
  }).optional(),
})

export const ParsedQuery = z.object({
  originAirports: z.array(z.string()),
  destinationAirports: z.array(z.string()),
  departureDateFrom: z.string(),
  departureDateTo: z.string(),
  returnDateFrom: z.string().optional(),
  returnDateTo: z.string().optional(),
  cabin: z.enum(['economy', 'premium_economy', 'business', 'first']),
  adults: z.number().default(1),
  programsToSearch: z.array(z.string()),
  exclusions: z.array(z.object({
    raw: z.string(),
    type: z.enum(['region', 'country', 'airport', 'airline', 'airspace', 'alliance']),
    normalised: z.array(z.string()),
  })),
  pointsContext: z.string(),
  parseConfidence: z.enum(['high', 'medium', 'low']),
  clarificationNeeded: z.string().optional(),
})

export const AvailabilityResult = z.object({
  id: z.string(),
  source: z.string(),
  programName: z.string(),
  originAirport: z.string(),
  destinationAirport: z.string(),
  date: z.string(),
  cabin: z.string(),
  pointsCost: z.number(),
  taxesCashGbp: z.number().optional(),
  remainingSeats: z.number().optional(),
  airlines: z.array(z.string()),
  stops: z.number(),
  duration: z.string().optional(),
  bookingUrl: z.string().optional(),
  rawTrips: z.any().optional(),
})

export const Recommendation = z.object({
  rank: z.number(),
  result: AvailabilityResult,
  verdict: z.enum(['recommended', 'consider', 'avoid']),
  headline: z.string(),
  explanation: z.string(),
  flags: z.array(z.object({
    type: z.enum(['sweet_spot', 'routing_risk', 'codeshare_risk', 'fuel_surcharge', 'transfer_bonus', 'exclusion_violation']),
    message: z.string(),
  })),
  estimatedCashValueGbp: z.number().optional(),
  cppGbp: z.number().optional(),
})

export const SearchResponse = z.object({
  parsed: ParsedQuery,
  rawResults: z.array(AvailabilityResult),
  recommendations: z.array(Recommendation),
  filteredCount: z.number(),
  advice: z.string(),
  cacheHit: z.boolean(),
})

export type RawQuery = z.infer<typeof RawQuery>
export type ParsedQuery = z.infer<typeof ParsedQuery>
export type AvailabilityResult = z.infer<typeof AvailabilityResult>
export type Recommendation = z.infer<typeof Recommendation>
export type SearchResponse = z.infer<typeof SearchResponse>
